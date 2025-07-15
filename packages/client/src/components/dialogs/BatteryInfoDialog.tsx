import { Battery, Loader2, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettings } from '@/contexts/SettingsContext';
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';

type BatteryInfoDialogProps = {
  isBatteryInfoDialogOpen: boolean;
  setIsBatteryInfoDialogOpen: (show: boolean) => void;
  showSolarFarmDialogPrompt: boolean;
};

export const BatteryInfoDialog: React.FC<BatteryInfoDialogProps> = ({
  isBatteryInfoDialogOpen,
  setIsBatteryInfoDialogOpen,
  showSolarFarmDialogPrompt,
}) => {
  const {
    systemCalls: { completeTutorialStep },
  } = useMUD();
  const { setIsSolarFarmDialogOpen } = useSolarFarm();
  const { playSfx } = useSettings();

  const [isCompleting, setIsCompleting] = useState(false);

  const onCompleteBatteryTutorial = useCallback(async () => {
    try {
      setIsCompleting(true);
      playSfx('click2');

      const { error, success } = await completeTutorialStep(2);

      if (error && !success) {
        throw new Error(error);
      }
      setIsBatteryInfoDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Completing Battery Tutorial', {
        description: (error as Error).message,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [completeTutorialStep, playSfx, setIsBatteryInfoDialogOpen]);

  return (
    <Dialog
      onOpenChange={setIsBatteryInfoDialogOpen}
      open={isBatteryInfoDialogOpen}
    >
      <DialogContent className="bg-gray-900/95 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white">
        <DialogHeader>
          <DialogTitle className="font-bold text-cyan-400 text-2xl">
            Energy System
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-300">
            Understanding your battery and power reserve
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-6">
          <div className="bg-cyan-950/30 border border-cyan-800/50 flex gap-4 items-start p-4 rounded-lg">
            <div className="mt-1">
              <Battery className="h-8 text-green-400 w-8" />
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-green-400 text-lg">
                Battery System
              </h3>
              <p className="text-gray-200">
                Your battery has a capacity of 24 kWh ($0.12). Each battle run
                costs{' '}
                <span className="font-semibold text-white">8 kWh ($0.04)</span>{' '}
                to run. The battery naturally recharges over time.
              </p>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/50 flex gap-4 items-start p-4 rounded-lg">
            <div className="mt-1">
              <Zap className="h-8 text-yellow-400 w-8" />
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-lg text-yellow-400">
                Power Reserve
              </h3>
              <p className="text-gray-200">
                Your Power Reserve stores any energy overflow from your battery.
                If your battery runs low, you can pull energy from your reserve
                to continue playing.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-lg text-white">
              When Your Battery Runs Low:
            </h3>
            <ul className="space-y-3 text-gray-200">
              <li className="flex gap-2 items-start">
                <div className="mt-1 text-yellow-400">•</div>
                <p>
                  <span className="font-semibold text-yellow-400">
                    Pull from Reserve:
                  </span>{' '}
                  Reserve energy is automatically pulled if your battery is too
                  low to start a run
                </p>
              </li>
              <li className="flex gap-2 items-start">
                <div className="mt-1 text-green-400">•</div>
                <p>
                  <span
                    className="font-semibold hover:cursor-pointer hover:underline text-green-400"
                    onClick={() => {
                      setIsBatteryInfoDialogOpen(false);
                      setIsSolarFarmDialogOpen(true);
                    }}
                  >
                    Buy More:
                  </span>{' '}
                  Purchase additional energy from the Solar Farm
                </p>
              </li>
              <li className="flex gap-2 items-start">
                <div className="mt-1 text-cyan-400">•</div>
                <p>
                  <span className="font-semibold text-cyan-400">
                    Wait to Recharge:
                  </span>{' '}
                  Your battery naturally recharges over time
                </p>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="bg-cyan-800 hover:bg-cyan-700 text-white w-full"
            disabled={isCompleting}
            onClick={() =>
              showSolarFarmDialogPrompt
                ? onCompleteBatteryTutorial()
                : setIsBatteryInfoDialogOpen(false)
            }
          >
            {isCompleting && <Loader2 className="animate-spin h-6 w-6" />}
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
