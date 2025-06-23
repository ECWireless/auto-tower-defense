import { useComponentValue } from '@latticexyz/react';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import { useMemo } from 'react';

import { useBattle } from '@/contexts/BattleContext';
import { useMUD } from '@/hooks/useMUD';
import { Patent, Tower } from '@/utils/types';

export enum TutorialSteps {
  NONE = 'none',
  ONE = '1',
  TWO = '2',
  THREE_ONE = '3.1', // Tower selection
  THREE_TWO = '3.2', // Install tower
  THREE_THREE = '3.3', // Next turn
  FOUR_ONE = '4.1', // Tower selection
  FOUR_TWO = '4.2', // Install tower
  FOUR_THREE = '4.3', // Select tower to modify
  FOUR_FOUR = '4.4', // Click modify button
  FOUR_FIVE = '4.5', // Select patent in assembly drawer
  FOUR_SIX = '4.6', // Click deploy button
  FOUR_SEVEN = '4.7', // Next turn
}

export const useTutorialIndicator = (
  assemblyDrawerTower?: Tower,
  selectedPatent?: Patent | null,
): { tutorialStep: TutorialSteps } => {
  const {
    components: { DefaultLogic, TutorialProgress },
    network: { globalPlayerId },
  } = useMUD();
  const { activeTowerId, battle, towers } = useBattle();
  const tutorialProgress = useComponentValue(TutorialProgress, globalPlayerId);
  const defaultLogicAddress = useComponentValue(
    DefaultLogic,
    singletonEntity,
  )?.value;

  const tutorialStep = useMemo((): TutorialSteps => {
    if (!tutorialProgress || !tutorialProgress.step1Completed)
      return TutorialSteps.ONE;
    if (!tutorialProgress.step2Completed) return TutorialSteps.TWO;
    if (
      !activeTowerId &&
      towers.length === 0 &&
      !tutorialProgress.step3Completed
    ) {
      return TutorialSteps.THREE_ONE; // Tower selection
    }
    if (
      activeTowerId &&
      activeTowerId === 'tower1' &&
      towers.length === 0 &&
      !tutorialProgress.step3Completed
    ) {
      return TutorialSteps.THREE_TWO; // Install tower
    }
    if (towers.length > 0 && !tutorialProgress.step3Completed) {
      return TutorialSteps.THREE_THREE; // Next turn
    }

    const modifyTower = towers.find(tower => tower.x === 65 && tower.y === 5);
    const isModifyTowerActive = modifyTower?.id === activeTowerId;
    const isUnmodified =
      modifyTower?.projectileLogicAddress === defaultLogicAddress ||
      !modifyTower?.projectileLogicAddress;

    if (
      !activeTowerId &&
      !modifyTower &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_ONE; // Tower selection
    }
    if (
      activeTowerId &&
      activeTowerId === 'tower1' &&
      !modifyTower &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_TWO; // Install tower
    }
    if (
      modifyTower &&
      !isModifyTowerActive &&
      !assemblyDrawerTower &&
      isUnmodified &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_THREE; // Select tower to modify
    }
    if (
      modifyTower &&
      isModifyTowerActive &&
      !assemblyDrawerTower &&
      isUnmodified &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_FOUR; // Click modify button
    }
    if (
      modifyTower &&
      isUnmodified &&
      assemblyDrawerTower &&
      selectedPatent &&
      selectedPatent.name !== '45 Degrees Down' &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_FIVE; // Select patent in assembly drawer
    }
    if (
      modifyTower &&
      isUnmodified &&
      assemblyDrawerTower &&
      selectedPatent &&
      selectedPatent.name === '45 Degrees Down' &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_SIX; // Click deploy button
    }
    if (
      modifyTower &&
      !tutorialProgress.step4Completed &&
      battle?.level === BigInt(1)
    ) {
      return TutorialSteps.FOUR_SEVEN; // Next turn
    }
    return TutorialSteps.NONE;
  }, [
    activeTowerId,
    assemblyDrawerTower,
    battle,
    defaultLogicAddress,
    selectedPatent,
    towers,
    tutorialProgress,
  ]);

  return { tutorialStep };
};
