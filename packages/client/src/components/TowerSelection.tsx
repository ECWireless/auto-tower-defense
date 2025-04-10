import { useDndContext } from '@dnd-kit/core';

import { Draggable } from '@/components/Draggable';
import { INSTALLABLE_TOWERS } from '@/components/GameBoard';
import { useGame } from '@/contexts/GameContext';

export const TowerSelection = (): JSX.Element => {
  const { activeTowerId, handleTowerSelect, isPlayer1 } = useGame();
  const { active: draggingActive } = useDndContext();

  return (
    <div className="bg-gray-900 border border-cyan-900/50 mt-1 p-2 rounded-b-md">
      <div className="mb-1 px-1 text-cyan-400 text-xs">TOWERS</div>
      <div className="flex min-w-[300px] sm:min-w-0 space-x-2">
        {INSTALLABLE_TOWERS.map(tower => (
          <Draggable
            key={tower.id}
            disabled={!isPlayer1}
            id={tower.id}
            onClick={() => handleTowerSelect(tower.id, tower.type)}
          >
            <div
              style={{
                cursor:
                  activeTowerId === tower.id && !!draggingActive
                    ? 'grabbing'
                    : 'grab',
                touchAction: 'none',
              }}
              className={`bg-gradient-to-b ${tower.color} flex flex-col items-center min-w-[60px] p-2 rounded tower-card ${activeTowerId === tower.id ? 'selected' : ''}`}
            >
              <div className="flex h-8 items-center justify-center">
                {tower.icon}
              </div>
              <span className="mt-1 text-white text-xs">{tower.name}</span>
            </div>
          </Draggable>
        ))}
      </div>
    </div>
  );
};
