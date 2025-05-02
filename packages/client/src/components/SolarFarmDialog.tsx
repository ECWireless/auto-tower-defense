import { useComponentValue } from '@latticexyz/react';
import { getComponentValue } from '@latticexyz/recs';
import { decodeEntity, singletonEntity } from '@latticexyz/store-sync/recs';
import {
  ArrowRightLeft,
  DollarSign,
  Loader2,
  StoreIcon as BuildingStore,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatUnits, parseUnits } from 'viem';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/MUDContext';
import { formatWattHours } from '@/utils/helpers';

export const SolarFarmDialog: React.FC = () => {
  const {
    components: { AddressBook, BatteryDetails, SolarFarmDetails },
    network: { playerEntity, publicClient, walletClient },
    systemCalls: { buyElectricity, sellElectricity },
  } = useMUD();
  const { playSfx } = useSettings();

  const [showSolarFarmDialog, setShowSolarFarmDialog] =
    useState<boolean>(false);
  const [isBuying, setIsBuying] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [electricityAmount, setElectricityAmount] = useState<string>('0');

  const [playerUSDCBalance, setPlayerUSDCBalance] = useState<bigint>(BigInt(0));

  const batteryDetails = useComponentValue(BatteryDetails, playerEntity);
  const solarFarmDetails = useComponentValue(SolarFarmDetails, singletonEntity);

  const getUsdcBalance = useCallback(async () => {
    try {
      const usdcAddress = getComponentValue(
        AddressBook,
        singletonEntity,
      )?.usdcAddress;

      if (!usdcAddress) {
        throw new Error('USDC address not found');
      }

      const playerAddress = decodeEntity(
        {
          address: 'address',
        },
        playerEntity,
      ).address;

      const balance = await publicClient.readContract({
        address: usdcAddress as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [playerAddress],
      });

      return balance as bigint;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Fetching USDC Balance', {
        description: (error as Error).message,
      });
      return BigInt(0);
    }
  }, [AddressBook, playerEntity, publicClient]);

  useEffect(() => {
    const fetchUsdcBalance = async () => {
      const usdcBalance = await getUsdcBalance();
      setPlayerUSDCBalance(usdcBalance);
    };

    if (showSolarFarmDialog) {
      fetchUsdcBalance();
    }
  }, [getUsdcBalance, showSolarFarmDialog]);

  const handleElectricityAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const amount = e.target.value;
      if (amount === '') {
        setElectricityAmount('');
        return;
      }
      const value = Number(e.target.value);
      if (!isNaN(value) && value >= 0) {
        setElectricityAmount(e.target.value);
      } else {
        setElectricityAmount('0');
      }
    },
    [],
  );

  const calculateTransactionCost = useCallback(() => {
    if (!electricityAmount) {
      return 0;
    }
    const whAmountNumber = Number(electricityAmount) * 1000; // Convert kWh to watt-hours
    if (whAmountNumber <= 0) {
      return 0;
    }
    const whPerCentPrice = Number(
      solarFarmDetails?.whPerCentPrice ?? BigInt(0),
    );
    const electricityPrice = 0.01 / whPerCentPrice; // Convert to price per watt-hour
    const transactionCost = whAmountNumber * electricityPrice;
    if (transactionCost < 0.01) {
      return 0;
    }
    return Number(transactionCost.toFixed(2));
  }, [electricityAmount, solarFarmDetails?.whPerCentPrice]);

  const onApprove = useCallback(async () => {
    try {
      const { solarFarmAddress, usdcAddress } =
        getComponentValue(AddressBook, singletonEntity) ?? {};

      if (!usdcAddress) {
        throw new Error('USDC address not found');
      }

      const txHash = await walletClient.writeContract({
        address: usdcAddress as `0x${string}`,
        abi: [
          {
            constant: false,
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            type: 'function',
          },
        ],
        functionName: 'approve',
        args: [solarFarmAddress, parseUnits(electricityAmount, 6)],
      });
      const txResult = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });
      const { status } = txResult;
      const success = status === 'success';
      if (!success) {
        throw new Error('Failed to approve USDC transfer');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);
      toast.error('Error approving USDC transfer', {
        description: (error as Error).message,
      });
    }
  }, [AddressBook, electricityAmount, publicClient, walletClient]);

  const onHandleTransaction = useCallback(async () => {
    try {
      setIsProcessing(true);
      playSfx('click2');

      if (isBuying) {
        await onApprove();
      }

      const { error, success } = isBuying
        ? await buyElectricity(
            parseUnits(electricityAmount, 3), // Convert kWh to watt-hours
          )
        : await sellElectricity(
            parseUnits(electricityAmount, 3), // Convert kWh to watt-hours
          );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success(
        `${
          isBuying ? 'Bought' : 'Sold'
        } ${electricityAmount} kWh of electricity!`,
      );
      const usdcBalance = await getUsdcBalance();
      setPlayerUSDCBalance(usdcBalance);
      setElectricityAmount('0');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Buying Electricity', {
        description: (error as Error).message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    buyElectricity,
    electricityAmount,
    getUsdcBalance,
    isBuying,
    onApprove,
    playSfx,
    sellElectricity,
  ]);

  return (
    <>
      {/* Solar Farm dialog button */}
      <div className="bottom-4 fixed right-4 z-10">
        <Button
          aria-label="Solar Farm"
          className="bg-gray-900/80 border-yellow-500 h-10 hover:bg-yellow-950/80 hover:text-yellow-300 rounded-full text-yellow-400 w-10"
          onClick={() => setShowSolarFarmDialog(true)}
          size="icon"
          variant="outline"
        >
          <BuildingStore className="h-5 w-5" />
        </Button>
      </div>

      {/* Solar Farm dialog */}
      <Dialog open={showSolarFarmDialog} onOpenChange={setShowSolarFarmDialog}>
        <DialogContent className="bg-gray-900/95 border border-yellow-900/50 max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="font-bold text-yellow-400 text-2xl">
              Solar Farm
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-300">
              Buy or sell electricity for USDC
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-6">
            {/* Balance Information */}
            <div className="gap-4 grid grid-cols-2">
              <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-lg">
                <div className="flex gap-2 mb-1 items-center">
                  <DollarSign className="h-4 text-green-400 w-4" />
                  <span className="text-gray-300 text-sm">Your Balance</span>
                </div>
                <div className="font-bold text-green-400 text-xl">
                  ${formatUnits(playerUSDCBalance, 6)}
                </div>
                <div className="mt-1 text-gray-400 text-xs">USDC</div>
              </div>

              <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-lg">
                <div className="flex gap-2 items-center mb-1">
                  <Zap className="h-4 text-yellow-400 w-4" />
                  <span className="text-gray-300 text-sm">Your Reserve</span>
                </div>
                <div className="font-bold text-xl text-yellow-400">
                  {formatWattHours(batteryDetails?.reserveBalance ?? BigInt(0))}
                </div>
                <div className="mt-1 text-gray-400 text-xs">Electricity</div>
              </div>
            </div>

            {/* Shop Information */}
            <div className="bg-yellow-950/20 border border-yellow-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 items-center">
                  <BuildingStore className="h-5 text-yellow-400 w-5" />
                  <span className="font-medium  text-lg text-yellow-300">
                    Solar Farm
                  </span>
                </div>
                <div className="text-gray-400 text-sm">
                  Balance:{' '}
                  <span className="text-green-400">
                    $
                    {formatUnits(solarFarmDetails?.fiatBalance ?? BigInt(0), 6)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-300 text-sm">Current Price:</div>
                <div className="font-medium text-sm text-white">
                  $0.01{' '}
                  <span className="text-gray-400">
                    per{' '}
                    {formatWattHours(
                      solarFarmDetails?.whPerCentPrice ?? BigInt(0),
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-300 text-sm">
                  Available Electricity:
                </div>
                <div className="font-medium text-sm text-yellow-300">
                  {formatWattHours(
                    solarFarmDetails?.electricityBalance ?? BigInt(0),
                  )}
                </div>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="flex justify-center mb-4">
                <div className="bg-gray-800 flex p-1 rounded-full">
                  <button
                    className={`font-medium hover:cursor-pointer px-4 py-1.5 rounded-full text-sm transition-colors ${
                      isBuying
                        ? 'bg-green-800 text-green-100'
                        : 'hover:text-white text-gray-400'
                    }`}
                    onClick={() => setIsBuying(true)}
                  >
                    Buy
                  </button>
                  <button
                    className={`font-medium hover:cursor-pointer px-4 py-1.5 rounded-full text-sm transition-colors ${
                      !isBuying
                        ? 'bg-red-800 text-red-100'
                        : 'hover:text-white text-gray-400'
                    }`}
                    onClick={() => setIsBuying(false)}
                  >
                    Sell
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4 space-y-2">
                <Label
                  className="text-gray-300 text-sm"
                  htmlFor="electricity-amount"
                >
                  {isBuying ? 'Amount to buy (kWh)' : 'Amount to sell (kWh)'}
                </Label>
                <div className="flex items-center">
                  <Input
                    className="bg-gray-800 border-gray-700 text-white"
                    id="electricity-amount"
                    min="0"
                    onChange={handleElectricityAmountChange}
                    type="number"
                    value={electricityAmount}
                  />
                  <span className="ml-2 text-gray-400 text-sm">kWh</span>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="bg-gray-800/60 mb-4 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Total Cost:</span>
                  <span className="font-medium text-lg text-white">
                    ${calculateTransactionCost()}
                  </span>
                </div>
                <div className="flex items-center justify-center mt-2 text-gray-400 text-xs">
                  <ArrowRightLeft className="h-3 mr-1 w-3" />
                  {isBuying
                    ? `${electricityAmount} kWh for $${calculateTransactionCost()}`
                    : `$${calculateTransactionCost()} for ${electricityAmount} kWh`}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              className="border-gray-700 text-gray-400"
              onClick={() => setShowSolarFarmDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className={
                isBuying
                  ? 'bg-green-800 hover:bg-green-700 text-white'
                  : 'bg-red-800 hover:bg-red-700 text-white'
              }
              disabled={
                isProcessing ||
                !electricityAmount ||
                Number(electricityAmount) <= 0 ||
                calculateTransactionCost() > Number(playerUSDCBalance)
              }
              onClick={onHandleTransaction}
            >
              {isProcessing && <Loader2 className="animate-spin h-6 w-6" />}
              {isBuying ? 'Buy Electricity' : 'Sell Electricity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
