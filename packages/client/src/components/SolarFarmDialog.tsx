import { useSessionClient } from '@latticexyz/entrykit/internal';
import { observer } from '@latticexyz/explorer/observer';
import { useComponentValue } from '@latticexyz/react';
import { getComponentValue } from '@latticexyz/recs';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import {
  ArrowRightLeft,
  CircleAlert,
  DollarSign,
  Loader2,
  StoreIcon as BuildingStore,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  getContract,
  http,
  parseUnits,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';

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
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';
import {
  API_ENDPOINT,
  BUY_ESCROW_TX_KEY,
  BUY_RECEIVER_ABI,
  ESCROW_ABI,
  ESCROW_ADDRESSES,
  SELL_EMITTER_ABI,
  SELL_EMITTER_TX_KEY,
  USDC_ADDRESSES,
} from '@/utils/constants';
import {
  formatWattHours,
  getChain,
  getChainLogo,
  getGameChain,
} from '@/utils/helpers';

const CANCELLED_TX_ERROR = 'User rejected the request';

export const SolarFarmDialog: React.FC = () => {
  const { address: playerAddress, chainId } = useAccount();
  const { isPending: isSwitchingChains, switchChain } = useSwitchChain();
  const {
    components: { AddressBook, BatteryDetails, SolarFarmDetails },
    network: { playerEntity },
    systemCalls: {
      buyElectricity,
      sellElectricity,
      sellElectricityThroughRelay,
    },
  } = useMUD();
  const { data: walletClient } = useWalletClient();
  const { data: sessionClient } = useSessionClient();
  const { playSfx } = useSettings();
  const { isSolarFarmDialogOpen, setIsSolarFarmDialogOpen } = useSolarFarm();

  const [isBuying, setIsBuying] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [electricityAmount, setElectricityAmount] = useState<string>('1.92');
  const [isThereExistingRelayTx, setIsThereExistingRelayTx] = useState(false);

  const [playerUSDCBalance, setPlayerUSDCBalance] = useState<bigint>(BigInt(0));

  const batteryDetails = useComponentValue(BatteryDetails, playerEntity);
  const solarFarmDetails = useComponentValue(SolarFarmDetails, singletonEntity);

  useEffect(() => {
    const existingBuyEscrowTx = localStorage.getItem(BUY_ESCROW_TX_KEY);
    const existingSellEmitterTx = localStorage.getItem(SELL_EMITTER_TX_KEY);

    if (!solarFarmDetails) return;
    if (existingBuyEscrowTx) {
      const parsedTx = JSON.parse(existingBuyEscrowTx);
      const { txHash } = parsedTx;

      // Use logs to get the amount
      const externalChain = getChain(chainId);
      if (!externalChain) return;
      if (!ESCROW_ADDRESSES[externalChain.id]) return;
      const publicClient = createPublicClient({
        batch: { multicall: false },
        chain: externalChain,
        transport: http(),
      });
      publicClient
        .getTransactionReceipt({ hash: txHash })
        .then(txResult => {
          const eventLog = txResult.logs.find(
            log =>
              log.address.toLowerCase() ===
              ESCROW_ADDRESSES[externalChain.id].toLowerCase(),
          );
          if (eventLog) {
            const parsedLog = decodeEventLog({
              abi: ESCROW_ABI,
              data: eventLog.data,
              topics: eventLog.topics,
            });
            if (parsedLog) {
              const { args } = parsedLog;
              const { amount: usdcAmount } = args as unknown as {
                amount: bigint;
              };
              const amountInCents = usdcAmount / BigInt(10000);
              const electricityAmount =
                amountInCents * solarFarmDetails?.whPerCentPrice;
              setElectricityAmount(formatUnits(electricityAmount, 3));
              setIsThereExistingRelayTx(true);
              setIsBuying(true);
            }
          }
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.error(`Error fetching transaction receipt: ${error}`);
        });
    } else if (existingSellEmitterTx) {
      const parsedTx = JSON.parse(existingSellEmitterTx);
      const { txHash } = parsedTx;

      // Use logs to get the amount
      const gameChain = getGameChain();
      const { sellEmitterAddress } =
        getComponentValue(AddressBook, singletonEntity) ?? {};
      if (!sellEmitterAddress) return;
      const publicClient = createPublicClient({
        batch: { multicall: false },
        chain: gameChain,
        transport: http(),
      });
      publicClient
        .getTransactionReceipt({ hash: txHash })
        .then(txResult => {
          const eventLog = txResult.logs.find(
            log =>
              log.address.toLowerCase() === sellEmitterAddress.toLowerCase(),
          );
          if (eventLog) {
            const parsedLog = decodeEventLog({
              abi: SELL_EMITTER_ABI,
              data: eventLog.data,
              topics: eventLog.topics,
            });
            if (parsedLog) {
              const { args } = parsedLog;
              const { receiveAmount } = args as unknown as {
                receiveAmount: bigint;
              };
              const amountInCents = receiveAmount / BigInt(10000);
              const electricityAmount =
                amountInCents * solarFarmDetails?.whPerCentPrice;
              setElectricityAmount(formatUnits(electricityAmount, 3));
              setIsThereExistingRelayTx(true);
              setIsBuying(false);
            }
          }
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.error(`Error fetching transaction receipt: ${error}`);
        });
    } else {
      setElectricityAmount('1.92');
      setIsThereExistingRelayTx(false);
      setIsBuying(true);
    }
  }, [AddressBook, chainId, isSolarFarmDialogOpen, solarFarmDetails]);

  const getUsdcBalance = useCallback(async () => {
    try {
      if (!chainId) {
        throw new Error('Chain ID not found');
      }

      const externalChain = getChain(chainId);
      if (!externalChain) {
        throw new Error('External chain not found');
      }

      const usdcAddress = USDC_ADDRESSES[externalChain.id];
      if (!usdcAddress) {
        throw new Error('USDC address not found');
      }

      const publicClient = createPublicClient({
        batch: { multicall: false },
        chain: externalChain,
        transport: http(),
      });

      if (!publicClient) {
        return BigInt(0);
      }

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
  }, [chainId, playerAddress]);

  useEffect(() => {
    const fetchUsdcBalance = async () => {
      const usdcBalance = await getUsdcBalance();
      setPlayerUSDCBalance(usdcBalance);
    };

    if (isSolarFarmDialogOpen) {
      fetchUsdcBalance();
    }
  }, [getUsdcBalance, isSolarFarmDialogOpen]);

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

  const isBridgeRequired = useMemo(() => {
    const externalChain = getChain(chainId);
    if (!externalChain) {
      return false;
    }
    return externalChain.id !== getGameChain().id;
  }, [chainId]);

  const onApprove = useCallback(async () => {
    const { solarFarmAddress } =
      getComponentValue(AddressBook, singletonEntity) ?? {};

    if (!solarFarmAddress) {
      throw new Error('Solar farm address not found');
    }

    if (!walletClient) {
      throw new Error('Wallet client not found');
    }

    const externalChain = getChain(chainId);
    if (!externalChain) {
      throw new Error('External chain not found');
    }

    const usdcAddress = USDC_ADDRESSES[externalChain.id];
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    const buyEscrowAddress = ESCROW_ADDRESSES[externalChain.id];
    if (isBridgeRequired && !buyEscrowAddress) {
      throw new Error('Buy escrow address not found');
    }

    const publicClient = createPublicClient({
      batch: { multicall: false },
      chain: externalChain,
      transport: http(),
    });

    const spendAmount = parseUnits(calculateTransactionCost().toString(), 6);
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
      args: [
        isBridgeRequired ? buyEscrowAddress : solarFarmAddress,
        spendAmount,
      ],
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
  }, [
    AddressBook,
    calculateTransactionCost,
    chainId,
    isBridgeRequired,
    walletClient,
  ]);

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
      setElectricityAmount('1.92');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      if ((error as Error).message.includes(CANCELLED_TX_ERROR)) {
        toast.error('Transaction cancelled');
        return;
      }
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

  const onHandleRelayTransaction = useCallback(async () => {
    try {
      setIsProcessing(true);
      playSfx('click2');

      if (!walletClient) {
        throw new Error('Wallet client not found');
      }

      if (!sessionClient) {
        throw new Error('Session client not found');
      }

      const externalChain = getChain(chainId);
      if (!externalChain) {
        throw new Error('External chain not found');
      }

      const { buyReceiverAddress, sellEmitterAddress } =
        getComponentValue(AddressBook, singletonEntity) ?? {};
      const buyEscrowAddress = ESCROW_ADDRESSES[externalChain.id];

      if (!(buyEscrowAddress && buyReceiverAddress && sellEmitterAddress)) {
        throw new Error('Buy escrow or receiver address not found');
      }

      const externalPublicClient = createPublicClient({
        batch: { multicall: false },
        chain: externalChain,
        transport: http(),
      });
      const gamePublicClient = createPublicClient({
        batch: { multicall: false },
        chain: getGameChain(),
        transport: http(),
      });

      let txHash: `0x${string}` | null = null;

      if (isBuying) {
        // Check if there is already a send USDC to escrow tx in local storage
        const existingTx = localStorage.getItem(BUY_ESCROW_TX_KEY);
        if (existingTx) {
          const parsedTx = JSON.parse(existingTx);
          txHash = parsedTx.txHash as `0x${string}`;
        } else {
          await onApprove();

          // Send USDC to escrow contract
          const buyEscrowArgs = {
            address: buyEscrowAddress as `0x${string}`,
            abi: ESCROW_ABI,
            functionName: 'buyElectricity',
            args: [parseUnits(calculateTransactionCost().toString(), 6)],
          };

          txHash = await walletClient.writeContract(buyEscrowArgs);
          if (txHash) {
            localStorage.setItem(
              BUY_ESCROW_TX_KEY,
              JSON.stringify({ txHash, timestamp: Date.now() }),
            );
          }
        }
        if (!txHash) {
          throw new Error('Transaction hash not found');
        }

        let txResult = await externalPublicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        let success = txResult.status === 'success';
        if (!success) {
          throw new Error('Smart contract error occurred');
        }

        // Get signature from API
        const eventLog = txResult.logs.find(
          log => log.address.toLowerCase() === buyEscrowAddress.toLowerCase(),
        );

        if (!eventLog) {
          throw new Error('Event log not found');
        }

        const parsedLog = decodeEventLog({
          abi: ESCROW_ABI,
          data: eventLog.data,
          topics: eventLog.topics,
        });

        if (!parsedLog) {
          throw new Error('Parsed log not found');
        }

        const { amount, nonce } = parsedLog.args as unknown as {
          amount: bigint;
          nonce: bigint;
        };

        const res = await fetch(`${API_ENDPOINT}/buy-validator-signature`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toString(),
            buyer: playerAddress,
            nonce: BigInt(nonce).toString(),
            txHash,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to get validator signature');
        }

        const { signature } = await res.json();

        // Call receiver contract and pass the signature
        const buyReceiverArgs = {
          address: buyReceiverAddress as `0x${string}`,
          abi: BUY_RECEIVER_ABI,
          functionName: 'handleElectricityPurchase',
          args: [playerAddress, amount, nonce, signature],
        };

        await gamePublicClient.simulateContract(buyReceiverArgs);
        const buyReceiverContract = getContract({
          abi: BUY_RECEIVER_ABI,
          address: buyReceiverAddress as `0x${string}`,
          client: {
            public: gamePublicClient,
            wallet: sessionClient.extend(observer()),
          },
        });

        txHash = await buyReceiverContract.write.handleElectricityPurchase(
          buyReceiverArgs.args,
        );
        txResult = await gamePublicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        success = txResult.status === 'success';
        if (!success) {
          throw new Error('Smart contract error occurred');
        }

        // Remove the buyEscrowTx from local storage
        localStorage.removeItem(BUY_ESCROW_TX_KEY);
        setIsThereExistingRelayTx(false);
      } else {
        // Check if there is already a send USDC to escrow tx in local storage
        const existingTx = localStorage.getItem(SELL_EMITTER_TX_KEY);
        if (existingTx) {
          const parsedTx = JSON.parse(existingTx);
          txHash = parsedTx.txHash as `0x${string}`;
        } else {
          // Call world contract to emit electricity sale event
          const sellThroughRelayResult = await sellElectricityThroughRelay(
            parseUnits(electricityAmount, 3), // Convert kWh to watt-hours
          );

          const { error } = sellThroughRelayResult;
          txHash = sellThroughRelayResult.txHash ?? null;

          if (error) {
            throw new Error(error);
          }
        }
        if (!txHash) {
          throw new Error('Transaction hash not found');
        }

        // Get signature from API
        let txResult = await gamePublicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        const eventLog = txResult.logs.find(
          log => log.address.toLowerCase() === sellEmitterAddress.toLowerCase(),
        );

        if (!eventLog) {
          throw new Error('Event log not found');
        }

        const parsedLog = decodeEventLog({
          abi: SELL_EMITTER_ABI,
          data: eventLog.data,
          topics: eventLog.topics,
        });

        if (!parsedLog) {
          throw new Error('Parsed log not found');
        }

        const { receiveAmount, nonce } = parsedLog.args as unknown as {
          receiveAmount: bigint;
          nonce: bigint;
        };

        const res = await fetch(`${API_ENDPOINT}/sell-validator-signature`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: receiveAmount.toString(),
            nonce: BigInt(nonce).toString(),
            seller: playerAddress,
            txHash,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to get validator signature');
        }

        const { signature } = await res.json();

        // Call escrow contract and pass the signature to claim USDC
        const sellEscrowArgs = {
          address: buyEscrowAddress as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'sellElectricity',
          args: [playerAddress, receiveAmount, nonce, signature],
        };

        txHash = await walletClient.writeContract(sellEscrowArgs);
        txResult = await externalPublicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        const success = txResult.status === 'success';
        if (!success) {
          throw new Error('Smart contract error occurred');
        }

        // Remove the sellEmitterTx from local storage
        localStorage.removeItem(SELL_EMITTER_TX_KEY);
        setIsThereExistingRelayTx(false);
      }

      toast.success(
        `${
          isBuying ? 'Bought' : 'Sold'
        } ${electricityAmount} kWh of electricity!`,
      );
      const usdcBalance = await getUsdcBalance();
      setPlayerUSDCBalance(usdcBalance);
      setElectricityAmount('1.92');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      if ((error as Error).message.includes(CANCELLED_TX_ERROR)) {
        toast.error('Transaction cancelled');
        return;
      }
      toast.error('Error Buying Electricity', {
        description: (error as Error).message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    AddressBook,
    calculateTransactionCost,
    chainId,
    electricityAmount,
    getUsdcBalance,
    isBuying,
    onApprove,
    playerAddress,
    playSfx,
    sellElectricityThroughRelay,
    sessionClient,
    walletClient,
  ]);

  const disabledMessage = useMemo(() => {
    if (Number(electricityAmount) < 1.92) {
      return 'Amount must be greater than 1.92 kWh';
    }

    if (isBuying) {
      const bigIntTxCost = parseUnits(calculateTransactionCost().toString(), 6);
      const externalChain = getChain(chainId);
      if (bigIntTxCost > playerUSDCBalance) {
        return externalChain
          ? `Insufficient ${externalChain.name} USDC balance`
          : 'Unsupported chain';
      }
      if (
        parseUnits(electricityAmount, 3) >
        (solarFarmDetails?.electricityBalance ?? BigInt(0))
      ) {
        return 'Not enough electricity available in Solar Farm';
      }
    } else {
      if (
        parseUnits(electricityAmount, 3) >
        (batteryDetails?.reserveBalance ?? BigInt(0))
      ) {
        return 'Not enough electricity in your reserve';
      }
    }
    return '';
  }, [
    batteryDetails,
    calculateTransactionCost,
    chainId,
    electricityAmount,
    isBuying,
    playerUSDCBalance,
    solarFarmDetails,
  ]);

  const lowElectricityBalanceMessage = useMemo(() => {
    const activeBalance = batteryDetails?.activeBalance ?? BigInt(0);
    const reserveBalance = batteryDetails?.reserveBalance ?? BigInt(0);
    const totalBalance = activeBalance + reserveBalance;
    const requiredAmount = BigInt(8000) - activeBalance;

    if (totalBalance < BigInt(8000)) {
      return `You do not have enough electricity to start a new battle run. Please purchase at least ${formatWattHours(
        requiredAmount,
      )} of electricity.`;
    }
    return '';
  }, [batteryDetails]);

  return (
    <>
      {/* Solar Farm dialog button */}
      <div className="bottom-4 fixed right-4 z-10">
        <Button
          aria-label="Solar Farm"
          className="bg-gray-900/80 border-yellow-500 h-10 hover:bg-yellow-950/80 hover:text-yellow-300 rounded-full text-yellow-400 w-10"
          onClick={() => setIsSolarFarmDialogOpen(true)}
          size="icon"
          variant="outline"
        >
          <BuildingStore className="h-5 w-5" />
        </Button>
      </div>

      {/* Solar Farm dialog */}
      <Dialog
        open={isSolarFarmDialogOpen}
        onOpenChange={setIsSolarFarmDialogOpen}
      >
        <DialogContent className="bg-gray-900/95 border border-yellow-900/50 max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="font-bold text-yellow-400 text-2xl">
              Solar Farm
            </DialogTitle>
            <div className="flex flex-col-reverse items-center justify-between sm:flex-row">
              <DialogDescription className="flex items-center justify-between mt-2 text-gray-300">
                Buy or sell electricity for USDC
              </DialogDescription>
              <div
                className={`${getChain(chainId) ? 'bg-blue-950/30 border border-blue-900/50' : 'bg-gray-600 border border-gray-200'} flex gap-2 items-center px-2 py-1 rounded-full`}
              >
                <div
                  className={`${getChain(chainId) ? 'bg-white' : 'bg-gray-600'} flex h-4 items-center justify-center rounded-full w-4`}
                >
                  {getChain(chainId) ? (
                    <img src={getChainLogo(chainId)} className="h-2.5 w-2.5" />
                  ) : (
                    <CircleAlert className="h-2.5 w-2.5 text-gray-200" />
                  )}
                </div>
                <span
                  className={`font-medium ${getChain(chainId) ? 'text-blue-300' : 'text-gray-200'} text-xs`}
                >
                  {getChain(chainId)?.name ?? 'Unsupported Chain'}
                </span>
              </div>
            </div>
          </DialogHeader>

          {lowElectricityBalanceMessage && (
            <div className="bg-red-900/20 border border-red-800/30 p-4 rounded-lg mb-4">
              <p className="text-red-400 text-sm">
                {lowElectricityBalanceMessage}
              </p>
            </div>
          )}

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
                    className={`font-medium ${isThereExistingRelayTx ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} px-4 py-1.5 rounded-full text-sm transition-colors ${
                      isBuying
                        ? 'bg-green-800 text-green-100'
                        : 'hover:text-white text-gray-400'
                    }`}
                    disabled={isProcessing || isThereExistingRelayTx}
                    onClick={() => setIsBuying(true)}
                  >
                    Buy
                  </button>
                  <button
                    className={`font-medium ${isThereExistingRelayTx ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} px-4 py-1.5 rounded-full text-sm transition-colors ${
                      !isBuying
                        ? 'bg-red-800 text-red-100'
                        : 'hover:text-white text-gray-400'
                    }`}
                    disabled={isProcessing || isThereExistingRelayTx}
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
                    disabled={isProcessing || isThereExistingRelayTx}
                    id="electricity-amount"
                    onChange={handleElectricityAmountChange}
                    type="number"
                    value={electricityAmount}
                  />
                  <span className="ml-2 text-gray-400 text-sm">kWh</span>
                </div>
                {!!disabledMessage && !isThereExistingRelayTx && (
                  <p className="text-red-500 text-xs mt-1">{disabledMessage}</p>
                )}
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

          <DialogFooter className="flex sm:flex-col">
            {isThereExistingRelayTx && (
              <p className="text-gray-400 text-orange-500 text-right text-xs">
                You have an incomplete {isBuying ? 'purchase' : 'sale'}. Click
                &quot;Continue&quot; to proceed.
              </p>
            )}
            <div className="flex flex-row gap-2 justify-end">
              <Button
                className="border-gray-700 text-gray-400"
                onClick={() => setIsSolarFarmDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              {getChain(chainId) ? (
                <Button
                  className={
                    isBuying
                      ? 'bg-green-800 hover:bg-green-700 text-white'
                      : 'bg-red-800 hover:bg-red-700 text-white'
                  }
                  disabled={
                    isProcessing ||
                    (!!disabledMessage && !isThereExistingRelayTx)
                  }
                  onClick={() =>
                    isBridgeRequired
                      ? onHandleRelayTransaction()
                      : onHandleTransaction()
                  }
                >
                  {isProcessing && <Loader2 className="animate-spin h-6 w-6" />}
                  {isThereExistingRelayTx
                    ? 'Continue'
                    : isBuying
                      ? 'Buy Electricity'
                      : 'Sell Electricity'}
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSwitchingChains}
                  onClick={() => switchChain({ chainId: baseSepolia.id })}
                >
                  <CircleAlert className="h-6 w-6" />
                  Switch to {baseSepolia.name}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
