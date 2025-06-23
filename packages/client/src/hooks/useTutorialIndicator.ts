import { useComponentValue } from '@latticexyz/react';
import { useMemo } from 'react';

import { useBattle } from '@/contexts/BattleContext';
import { useMUD } from '@/hooks/useMUD';

export enum TutorialSteps {
  NONE = 'none',
  ONE = '1',
  TWO = '2',
  THREE_ONE = '3.1',
  THREE_TWO = '3.2',
  THREE_THREE = '3.3',
  FOUR_ONE = '4.1',
}

export const useTutorialIndicator = (): { tutorialStep: TutorialSteps } => {
  const {
    components: { TutorialProgress },
    network: { globalPlayerId },
  } = useMUD();
  const { activeTowerId, battle, towers } = useBattle();
  const tutorialProgress = useComponentValue(TutorialProgress, globalPlayerId);

  const tutorialStep = useMemo((): TutorialSteps => {
    if (!tutorialProgress || !tutorialProgress.step1Completed)
      return TutorialSteps.ONE;
    if (!tutorialProgress.step2Completed) return TutorialSteps.TWO;
    if (
      !activeTowerId &&
      towers.length === 0 &&
      !tutorialProgress.step3Completed
    ) {
      return TutorialSteps.THREE_ONE;
    }
    if (
      activeTowerId &&
      towers.length === 0 &&
      !tutorialProgress.step3Completed
    ) {
      return TutorialSteps.THREE_TWO;
    }
    if (towers.length > 0 && !tutorialProgress.step3Completed) {
      return TutorialSteps.THREE_THREE;
    }
    if (!tutorialProgress.step4Completed && battle?.level === BigInt(1)) {
      return TutorialSteps.FOUR_ONE;
    }
    return TutorialSteps.NONE;
  }, [activeTowerId, battle, towers, tutorialProgress]);

  return { tutorialStep };
};
