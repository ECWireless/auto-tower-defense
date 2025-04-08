import { GiCastle } from 'react-icons/gi';

import { Badge } from '@/components/ui/badge';
import { Castle, type Game } from '@/utils/types';

type GameStatusBarProps = {
  enemyCastlePosition?: Castle;
  game: Game;
  myCastlePosition?: Castle;
};

export const GameStatusBar: React.FC<GameStatusBarProps> = ({
  enemyCastlePosition,
  game,
  myCastlePosition,
}) => {
  return (
    <div className="bg-gray-900 border border-purple-900/50 grid grid-cols-7 items-center mb-1 p-2 rounded-t-md sm:p-4 text-center">
      {/* Player 1 */}
      <div className="col-span-2 sm:col-span-2 text-left pl-1 sm:pl-4">
        <div className="flex items-center">
          <div className="sm:text-sm text-[10px] text-purple-300">
            {game.player1Username}
          </div>
          {game.turn === game.player1Address && (
            <Badge
              className="border-purple-500 flex-shrink-0 h-4 ml-1 px-1 sm:h-5 sm:ml-2 sm:text-xs text-[8px] text-purple-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <GiCastle className="h-4 sm:h-4 sm:w-4 w-4 text-purple-400" />
          <div className="font-medium sm:text-lg text-purple-400 text-xs">
            {myCastlePosition?.currentHealth ?? 0} HP
          </div>
        </div>
        <div className="bg-gray-800 h-2 rounded-full sm:h-2 mt-1 overflow-hidden w-full">
          <div
            className="bg-purple-500 h-full rounded-full"
            style={{
              width: `${((myCastlePosition?.currentHealth ?? 1) / (myCastlePosition?.maxHealth ?? 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Game Info - Desktop */}
      <div className="col-span-3 hidden justify-around pl-[20px] sm:flex">
        <div>
          <div className="text-cyan-300 text-xs">LEVEL</div>
          <div className="font-medium text-cyan-400 text-lg">
            {game.level.toString()}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-cyan-300 text-xs">ROUND</div>
          <div className="font-medium text-cyan-400 text-lg">
            {game.roundCount}
          </div>
        </div>
        <div>
          <div className="text-cyan-300 text-xs">ACTIONS</div>
          <div className="font-medium text-cyan-400 text-lg">
            {game.actionCount}
          </div>
        </div>
      </div>

      {/* Game Info - Mobile */}
      <div className="col-span-3 flex justify-around pl-[20px] sm:hidden">
        <div>
          <div className="text-[8px] text-cyan-300">LVL</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.level.toString()}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[8px] text-cyan-300">ROUND</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.roundCount}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-cyan-300">ACTIONS</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.actionCount}
          </div>
        </div>
      </div>

      {/* Player 2 */}
      <div className="col-span-2 pr-1 sm:col-span-2 sm:pr-4 text-right">
        <div className="flex items-center justify-end">
          {game.turn === game.player2Address && (
            <Badge
              className="border-pink-500 flex-shrink-0 h-4 mr-1 px-1 sm:h-5 sm:mr-2 sm:text-xs text-[8px] text-pink-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
          <div className="sm:text-sm text-[10px] text-pink-300">
            {game.player2Username}
          </div>
        </div>
        <div className="flex gap-2 items-center justify-end">
          <div className="font-medium sm:text-lg text-pink-400 text-xs">
            {enemyCastlePosition?.currentHealth ?? 0} HP
          </div>
          <GiCastle className="h-4 sm:h-4 sm:w-4 text-pink-400 w-4" />
        </div>
        <div className="bg-gray-800 h-2 mt-1 overflow-hidden sm:h-2 rounded-full w-full">
          <div
            className="bg-pink-500 h-full rounded-full"
            style={{
              width: `${((enemyCastlePosition?.currentHealth ?? 1) / (enemyCastlePosition?.maxHealth ?? 1)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
