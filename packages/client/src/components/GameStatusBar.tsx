import { Badge } from '@/components/ui/badge';
import { type Game } from '@/utils/types';

type GameStatusBarProps = {
  game: Game;
};

export const GameStatusBar: React.FC<GameStatusBarProps> = ({ game }) => {
  return (
    <div className="bg-gray-900 border border-purple-900/50 grid grid-cols-7 items-center mb-1 p-2 rounded-t-md sm:p-4 text-center">
      {/* Player 1 */}
      <div className="col-span-2 pl-1 sm:col-span-2 sm:pl-4 text-left">
        <div className="sm:text-sm text-[10px] text-purple-300">PLAYER 1</div>
        <div className="flex font-medium items-center sm:text-lg text-xs truncate pr-1">
          <span className="text-purple-400 truncate">
            {game.player1Username}
          </span>
          {game.turn === game.player1Address && (
            <Badge
              className="border-purple-500 flex-shrink-0 h-4 ml-1 px-1 sm:h-5 sm:ml-2 sm:text-xs text-[8px] text-purple-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
        </div>
      </div>

      {/* Game Info - Desktop */}
      <div className="col-span-3 hidden justify-around sm:flex">
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
      <div className="col-span-3 flex justify-around sm:hidden">
        <div>
          <div className="text-[8px] text-cyan-300">LVL</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.level.toString()}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[8px] text-cyan-300">RND</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.roundCount}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-cyan-300">ACT</div>
          <div className="font-medium text-cyan-400 text-xs">
            {game.actionCount}
          </div>
        </div>
      </div>

      {/* Player 2 */}
      <div className="col-span-2 pr-1 sm:col-span-2 sm:pr-4 text-right">
        <div className="sm:text-sm text-[10px] text-pink-300">PLAYER 2</div>
        <div className="flex font-medium items-center justify-end pl-1 sm:text-lg text-xs truncate">
          {game.turn === game.player2Address && (
            <Badge
              className="border-pink-500 flex-shrink-0 h-4 mr-1 px-1 sm:h-5 sm:mr-2 sm:text-xs text-[8px] text-pink-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
          <span className="text-pink-400 truncate">{game.player2Username}</span>
        </div>
      </div>
    </div>
  );
};
