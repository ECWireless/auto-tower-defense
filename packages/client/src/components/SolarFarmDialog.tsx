'use client';

import {
  ArrowRightLeft,
  DollarSign,
  StoreIcon as BuildingStore,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

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

export const SolarFarmDialog: React.FC = () => {
  const [showSolarFarmDialog, setShowSolarFarmDialog] = useState(false);
  const [isBuying, setIsBuying] = useState(true);
  const [electricityAmount, setElectricityAmount] = useState(10);

  const [playerUSDCBalance, setPlayerUSDCBalance] = useState(250.75);
  const [shopUSDCBalance, setShopUSDCBalance] = useState(10000);
  const [powerReserve, setPowerReserve] = useState(1250);

  const electricityPrice = 0.05;

  // Handle electricity amount change
  const handleElectricityAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number.parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setElectricityAmount(value);
    }
  };

  // Calculate transaction cost
  const calculateTransactionCost = () => {
    return (electricityAmount * electricityPrice).toFixed(2);
  };

  // Handle transaction (buy or sell)
  const handleTransaction = () => {
    const transactionCost = Number.parseFloat(calculateTransactionCost());

    if (isBuying) {
      // Check if player has enough USDC
      if (playerUSDCBalance >= transactionCost) {
        setPlayerUSDCBalance(prev =>
          Number.parseFloat((prev - transactionCost).toFixed(2)),
        );
        setShopUSDCBalance(prev =>
          Number.parseFloat((prev + transactionCost).toFixed(2)),
        );
        setPowerReserve(prev => prev + electricityAmount);
        // Show success message or notification
      } else {
        // Show error message - not enough funds
        alert('Not enough USDC to complete purchase');
      }
    } else {
      // Selling electricity
      // Check if player has enough electricity
      if (powerReserve >= electricityAmount) {
        setPlayerUSDCBalance(prev =>
          Number.parseFloat((prev + transactionCost).toFixed(2)),
        );
        setShopUSDCBalance(prev =>
          Number.parseFloat((prev - transactionCost).toFixed(2)),
        );
        setPowerReserve(prev => prev - electricityAmount);
        // Show success message or notification
      } else {
        // Show error message - not enough electricity
        alert('Not enough electricity in your Power Reserve');
      }
    }
  };

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
                  ${playerUSDCBalance.toFixed(2)}
                </div>
                <div className="mt-1 text-gray-400 text-xs">USDC</div>
              </div>

              <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-lg">
                <div className="flex gap-2 items-center mb-1">
                  <Zap className="h-4 text-yellow-400 w-4" />
                  <span className="text-gray-300 text-sm">Your Reserve</span>
                </div>
                <div className="font-bold text-xl text-yellow-400">
                  {powerReserve} kWh
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
                    ${shopUSDCBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-300 text-sm">Current Price:</div>
                <div className="font-medium text-sm text-white">
                  ${electricityPrice.toFixed(2)}{' '}
                  <span className="text-gray-400">per kWh</span>
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
              onClick={handleTransaction}
            >
              {isBuying ? 'Buy Electricity' : 'Sell Electricity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
