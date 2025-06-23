import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useSessionClient } from '@latticexyz/entrykit/internal';
import { useComponentValue } from '@latticexyz/react';
import { Entity } from '@latticexyz/recs';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import { Battery, Flag, Home, Loader2, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { zeroAddress, zeroHash } from 'viem';
import { useAccount } from 'wagmi';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { BattleBoard, INSTALLABLE_TOWERS } from '@/components/BattleBoard';
import { BattleControlButtons } from '@/components/BattleControlButtons';
import { BattleStatusBar } from '@/components/BattleStatusBar';
import { ClickIndicator } from '@/components/ClickIndicator';
import { BatteryInfoDialog } from '@/components/dialogs/BatteryInfoDialog';
import { CastleHitDialog } from '@/components/dialogs/CastleHitDialog';
import { ForfeitDialog } from '@/components/dialogs/ForfeitDialog';
import { HowToPlayDialog } from '@/components/dialogs/HowToPlayDialog';
import { InstallInfoDialog } from '@/components/dialogs/InstallInfoDialog';
import { ModifyInfoDialog } from '@/components/dialogs/ModifyInfoDialog';
import { NoActionsDialog } from '@/components/dialogs/NoActionsDialog';
import { PlayAgainDialog } from '@/components/dialogs/PlayAgainDialog';
import { WelcomeDialog } from '@/components/dialogs/WelcomeDialog';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NoBattleScreen } from '@/components/NoBattleScreen';
import { TowerSelection } from '@/components/TowerSelection';
import { Button } from '@/components/ui/button';
import { BattleProvider, useBattle } from '@/contexts/BattleContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';
import {
  TutorialSteps,
  useTutorialIndicator,
} from '@/hooks/useTutorialIndicator';
import { BATTERY_STORAGE_LIMIT } from '@/utils/constants';
import { formatWattHours, getBatteryColor } from '@/utils/helpers';

const BATTERY_INFO_SEEN_KEY = 'battery-info-seen';

export const BattlePage = (): JSX.Element => {
  const { id } = useParams();
  return (
    <BattleProvider battleId={id as Entity}>
      <InnerBattlePage />
    </BattleProvider>
  );
};

export const InnerBattlePage = (): JSX.Element => {
  const navigate = useNavigate();
  const { isConnected, isReconnecting } = useAccount();
  const { data: sessionClient } = useSessionClient();
  const {
    components: { BatteryDetails, SolarFarmDetails },
    network: { globalPlayerId },
    systemCalls: { claimRecharge },
  } = useMUD();
  const {
    activeTowerId,
    battle,
    enemyCastlePosition,
    handleDragStart,
    isPlayer1,
    isRefreshing,
    myCastlePosition,
    onInstallTower,
    onMoveTower,
    towers,
  } = useBattle();
  const { playSfx } = useSettings();
  const { tutorialStep } = useTutorialIndicator();
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const sensors = useSensors(pointerSensor);

  // Add battle ID to tab title
  useEffect(() => {
    if (battle) {
      document.title = `Battle ${battle.id} - Auto Tower Defense`;
    }
  }, [battle]);

  useEffect(() => {
    if (!isReconnecting && !(isConnected && sessionClient)) {
      navigate('/');
    }
  }, [isConnected, isReconnecting, navigate, sessionClient]);

  const [isForfeitDialogOpen, setShowForfeitDialog] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isBattleOverDialogOpen, setIsBattleOverDialogOpen] = useState(false);
  const [isBatteryInfoDialogOpen, setIsBatteryInfoDialogOpen] = useState(false);
  const [isClaimingRecharge, setIsClaimingRecharge] = useState(false);

  useEffect(() => {
    if (!battle) return;
    if (battle.winner === zeroHash && battle.endTimestamp === BigInt(0)) return;
    if (globalPlayerId !== battle.player1Id) return;
    if (battle.winner === globalPlayerId) {
      playSfx('win');
    }
    setIsBattleOverDialogOpen(true);
  }, [battle, globalPlayerId, playSfx]);

  // Open Battery Info Dialog if this is the first time the user is playing a battle.
  useEffect(() => {
    const hasSeenBatteryInfo = localStorage.getItem(BATTERY_INFO_SEEN_KEY);
    if (hasSeenBatteryInfo) return;
    setIsBatteryInfoDialogOpen(true);
  }, []);

  const onChangeBatteryInfoDialog = useCallback((open: boolean) => {
    if (!open) {
      setIsBatteryInfoDialogOpen(false);
      localStorage.setItem(BATTERY_INFO_SEEN_KEY, 'true');
    } else {
      setIsBatteryInfoDialogOpen(true);
    }
  }, []);

  const onClaimRecharge = useCallback(async () => {
    try {
      setIsClaimingRecharge(true);
      playSfx('click2');

      const { error, success } = await claimRecharge();

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Recharge Claimed!');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Claiming Recharge', {
        description: (error as Error).message,
      });
    } finally {
      setIsClaimingRecharge(false);
    }
  }, [claimRecharge, playSfx]);

  const onDragStart = (event: DragStartEvent) => {
    if (!isPlayer1) return;

    const { active } = event;
    const activeTower = {
      id: '',
      type: 'offense' as 'offense' | 'defense',
    };

    const installableTower = INSTALLABLE_TOWERS.find(
      tower => tower.id === active.id,
    );

    if (installableTower) {
      activeTower.id = installableTower.id;
      activeTower.type = installableTower.type;
    } else {
      const tower = towers.find(tower => tower.id === active.id);
      if (tower) {
        activeTower.id = tower.id;
        activeTower.type =
          tower.projectileLogicAddress === zeroAddress ? 'defense' : 'offense';

        const isLeftSide = tower.x <= 65;
        if (!isLeftSide) return;
      }
    }

    if (activeTower.id) {
      handleDragStart(activeTower.id, activeTower.type);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (!over) return;

    const [row, col] = over.id.toString().split('-').map(Number);

    if (INSTALLABLE_TOWERS.some(tower => tower.id === activeTowerId)) {
      onInstallTower(row, col);
    } else {
      onMoveTower(row, col);
    }
  };

  const batteryDetails = useComponentValue(BatteryDetails, globalPlayerId);
  const solarFarmDetails = useComponentValue(SolarFarmDetails, singletonEntity);

  const batteryCharge = useMemo(() => {
    if (!batteryDetails) return 0;
    const { activeBalance } = batteryDetails;
    const percentOfStorage =
      (Number(activeBalance) / BATTERY_STORAGE_LIMIT) * 100;
    return Math.round(percentOfStorage);
  }, [batteryDetails]);

  const claimableRecharge = useMemo(() => {
    if (!(batteryDetails && solarFarmDetails)) return BigInt(0);
    const { lastRechargeTimestamp } = batteryDetails;
    const currentTime = Date.now();
    const timeSinceLastRecharge =
      currentTime - Number(lastRechargeTimestamp) * 1000;
    return BigInt(
      Math.floor(timeSinceLastRecharge / Number(solarFarmDetails.msPerWh)),
    );
  }, [batteryDetails, solarFarmDetails]);

  if (isRefreshing) {
    return <LoadingScreen width={100} />;
  }

  if (!battle) {
    return <NoBattleScreen />;
  }

  return (
    <DndContext
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      sensors={sensors}
    >
      <div className="flex flex-col min-h-screen bg-black text-white relative">
        <BackgroundAnimation />

        {/* Top Navigation */}
        <div className="fixed left-4 top-4 z-10">
          <Button
            className="border-purple-500 hover:bg-purple-950/50 hover:text-purple-300 text-purple-400"
            onClick={() => {
              navigate('/');
            }}
            size="sm"
            variant="outline"
          >
            <Home className="h-4 mr-1 w-4" />
            Home
          </Button>
        </div>
        <div className="fixed right-4 text-cyan-400 text-sm top-4 z-10">
          <Button
            className="text-gray-500 hover:text-red-400 hover:bg-red-900/10"
            onClick={() => setShowForfeitDialog(true)}
            size="sm"
            variant="ghost"
          >
            <Flag className="h-4 w-4 mr-1" />
            Forfeit
          </Button>
        </div>

        {/* Battery Information - Desktop (fixed position) */}
        {batteryDetails && (
          <div
            className="fixed flex-col hidden items-center left-1/2 sm:flex top-4 z-10"
            style={{
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="bg-gray-900/80 border border-gray-800 cursor-pointer flex gap-4 hover:bg-gray-800/80 items-center px-4 py-1.5 rounded-full transition-colors"
              onClick={() => setIsBatteryInfoDialogOpen(true)}
            >
              {/* Battery Charge */}
              <div className="flex gap-2 items-center">
                <Battery
                  className={`h-4 w-4 ${getBatteryColor(batteryCharge)}`}
                />
                <div className="flex items-center">
                  <span
                    className={`font-medium text-sm ${getBatteryColor(batteryCharge)}`}
                  >
                    {formatWattHours(batteryDetails.activeBalance)} (
                    {batteryCharge}%)
                  </span>
                  <span className="ml-1 text-gray-400 text-xs">Battery</span>
                </div>
              </div>
              <div className="bg-gray-700 h-6 w-px"></div>
              {/* Power Reserve */}
              <div className="flex gap-2 items-center">
                <Zap className="h-4 text-yellow-400 w-4" />
                <div className="flex items-center">
                  <span className="font-medium text-sm text-yellow-400">
                    {formatWattHours(batteryDetails.reserveBalance)}
                  </span>
                  <span className="ml-1 text-gray-400 text-xs">Reserve</span>
                </div>
              </div>
              {tutorialStep === TutorialSteps.TWO && <ClickIndicator />}
            </div>
            {/* Claim Recharge Button */}
            {claimableRecharge > BigInt(1_000) &&
              batteryDetails.activeBalance < BATTERY_STORAGE_LIMIT && (
                <Button
                  className="bg-green-800/80 border border-green-600/50 mt-2 hover:bg-green-700/90 shadow-green-900/20 shadow-md text-green-100 text-xs"
                  disabled={isClaimingRecharge}
                  onClick={onClaimRecharge}
                  size="sm"
                >
                  {isClaimingRecharge && (
                    <Loader2 className="animate-spin h-6 w-6" />
                  )}
                  Claim Recharge (+{formatWattHours(claimableRecharge)})
                </Button>
              )}
          </div>
        )}

        {/* Battle Container */}
        <div className="flex justify-center items-center flex-1 p-4 pt-16 z-1">
          <div className="w-full max-w-3xl">
            {/* Battery Information - Mobile (inline) */}
            {batteryDetails && (
              <div className="flex flex-col items-center mb-2 sm:hidden">
                <div
                  className="bg-gray-900/80 border border-gray-800 cursor-pointer flex gap-2 hover:bg-gray-800/80 items-center px-3 py-1.5 relative rounded-full transition-colors"
                  onClick={() => setIsBatteryInfoDialogOpen(true)}
                >
                  {/* Battery Charge */}
                  <div className="flex gap-1">
                    <Battery
                      className={`h-3 mt-1 self-start w-3 ${getBatteryColor(batteryCharge)}`}
                    />
                    <div className="flex flex-col">
                      <span
                        className={`font-medium text-xs ${getBatteryColor(batteryCharge)}`}
                      >
                        {formatWattHours(batteryDetails.activeBalance)} (
                        {batteryCharge}%)
                      </span>
                      <span className="text-gray-400 text-xs">Battery</span>
                    </div>
                  </div>
                  <div className="bg-gray-700 h-6 w-px"></div>
                  {/* Power Reserve */}
                  <div className="flex gap-1">
                    <Zap className="h-3 mt-1 self-start w-3 text-yellow-400" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-yellow-400">
                        {formatWattHours(batteryDetails.reserveBalance)}
                      </span>
                      <span className="text-gray-400 text-xs">Reserve</span>
                    </div>
                  </div>
                  {tutorialStep === TutorialSteps.TWO && <ClickIndicator />}
                </div>
                {/* Claim Recharge Button */}
                {claimableRecharge > BigInt(1_000) &&
                  batteryDetails.activeBalance < BATTERY_STORAGE_LIMIT && (
                    <Button
                      className="bg-green-800/80 border border-green-600/50 mt-2 h-7 hover:bg-green-700/90 px-3 py-1 shadow-green-900/20 shadow-md text-green-100 text-xs"
                      disabled={isClaimingRecharge}
                      onClick={onClaimRecharge}
                      size="sm"
                    >
                      {isClaimingRecharge && (
                        <Loader2 className="animate-spin h-6 w-6" />
                      )}
                      Claim Recharge (+{formatWattHours(claimableRecharge)})
                    </Button>
                  )}
              </div>
            )}
            <BattleStatusBar
              battle={battle}
              enemyCastlePosition={enemyCastlePosition}
              myCastlePosition={myCastlePosition}
              stakedBalance={batteryDetails?.stakedBalance ?? BigInt(0)}
            />

            {/* Control Buttons - Desktop */}
            <div className="hidden justify-center mb-1 sm:flex space-x-2">
              <BattleControlButtons setIsHelpDialogOpen={setIsHelpDialogOpen} />
            </div>

            <BattleBoard />

            {/* Tower Selection Row */}
            <TowerSelection />

            {/* Control Buttons - Mobile */}
            <div className="flex justify-center mt-4 sm:hidden space-x-2">
              <BattleControlButtons setIsHelpDialogOpen={setIsHelpDialogOpen} />
            </div>
          </div>
        </div>

        <WelcomeDialog />
        <InstallInfoDialog />
        <ModifyInfoDialog />
        <HowToPlayDialog
          isHelpDialogOpen={isHelpDialogOpen}
          setIsHelpDialogOpen={setIsHelpDialogOpen}
        />
        <BatteryInfoDialog
          isBatteryInfoDialogOpen={isBatteryInfoDialogOpen}
          onChangeBatteryInfoDialog={onChangeBatteryInfoDialog}
          showSolarFarmDialogPrompt={tutorialStep === TutorialSteps.TWO}
        />
        <NoActionsDialog />
        <CastleHitDialog />
        <ForfeitDialog
          isForfeitDialogOpen={isForfeitDialogOpen}
          setIsForfeitDialogOpen={setShowForfeitDialog}
        />
        <PlayAgainDialog
          isBattleOverDialogOpen={isBattleOverDialogOpen}
          setIsBattleOverDialogOpen={setIsBattleOverDialogOpen}
        />
      </div>
    </DndContext>
  );
};
