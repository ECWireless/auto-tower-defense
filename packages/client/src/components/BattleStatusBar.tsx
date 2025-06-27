import { useComponentValue } from '@latticexyz/react';
import { Entity } from '@latticexyz/recs';
import { Zap } from 'lucide-react';
import { GiCastle } from 'react-icons/gi';
import { zeroHash } from 'viem';

import { Badge } from '@/components/ui/badge';
import { useMUD } from '@/hooks/useMUD';
import { formatWattHours } from '@/utils/helpers';
import { type Battle, Castle } from '@/utils/types';

type BattleStatusBarProps = {
  battle: Battle;
  enemyCastlePosition?: Castle;
  myCastlePosition?: Castle;
  stakedBalance: bigint;
};

export const BattleStatusBar: React.FC<BattleStatusBarProps> = ({
  battle,
  enemyCastlePosition,
  myCastlePosition,
  stakedBalance,
}) => {
  const {
    components: { LoadedKingdomActions, SavedKingdom },
  } = useMUD();

  const savedKingdomId =
    useComponentValue(LoadedKingdomActions, battle.id)?.savedKingdomId ??
    zeroHash;

  const savedKingdomBalance =
    useComponentValue(SavedKingdom, savedKingdomId as Entity)
      ?.electricityBalance ?? BigInt(0);

  return (
    <div className="bg-gray-900 border border-purple-900/50 grid grid-cols-7 items-center mb-1 p-2 rounded-t-md sm:p-4 text-center">
      {/* Player 1 */}
      <div className="col-span-2 sm:col-span-2 text-left pl-1 sm:pl-4">
        <div className="flex items-center">
          <div className="sm:text-sm text-[10px] text-purple-300">
            {battle.player1Username}
          </div>
          {battle.turn === battle.player1Id && (
            <Badge
              className="border-purple-500 flex-shrink-0 h-4 ml-1 px-1 sm:h-5 sm:ml-2 sm:text-xs text-[8px] text-purple-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
        </div>
        <div className="flex gap-1 items-center mt-1">
          <Zap className="h-2 sm:h-3 sm:w-3 text-yellow-400 w-2" />
          <div className="sm:text-xs text-yellow-300 text-[8px]">
            Staked: {formatWattHours(stakedBalance)}
          </div>
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

      {/* Battle Info - Desktop */}
      <div className="col-span-3 hidden justify-around pl-[20px] sm:flex">
        <div>
          <div className="text-cyan-300 text-xs">LEVEL</div>
          <div className="font-medium text-cyan-400 text-lg">
            {battle.level.toString()}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-cyan-300 text-xs">ROUND</div>
          <div className="font-medium text-cyan-400 text-lg">
            {battle.roundCount}
          </div>
        </div>
        <div>
          <div className="text-cyan-300 text-xs">ACTIONS</div>
          <div className="font-medium text-cyan-400 text-lg">
            {battle.actionCount}
          </div>
        </div>
      </div>

      {/* Battle Info - Mobile */}
      <div className="col-span-3 flex justify-around pl-[20px] sm:hidden">
        <div>
          <div className="text-[8px] text-cyan-300">LVL</div>
          <div className="font-medium text-cyan-400 text-xs">
            {battle.level.toString()}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[8px] text-cyan-300">ROUND</div>
          <div className="font-medium text-cyan-400 text-xs">
            {battle.roundCount}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-cyan-300">ACTIONS</div>
          <div className="font-medium text-cyan-400 text-xs">
            {battle.actionCount}
          </div>
        </div>
      </div>

      {/* Player 2 */}
      <div className="col-span-2 pr-1 sm:col-span-2 sm:pr-4 text-right">
        <div className="flex items-center justify-end">
          {battle.turn === battle.player2Id && (
            <Badge
              className="border-pink-500 flex-shrink-0 h-4 mr-1 px-1 sm:h-5 sm:mr-2 sm:text-xs text-[8px] text-pink-400"
              variant="outline"
            >
              Turn
            </Badge>
          )}
          <div className="sm:text-sm text-[10px] text-pink-300">
            {battle.player2Username}
          </div>
        </div>
        <div className="flex gap-1 items-center justify-end mt-1">
          <div className="sm:text-xs text-yellow-300 text-[8px]">
            Staked: {formatWattHours(savedKingdomBalance)}
          </div>
          <Zap className="h-2 sm:h-3 sm:w-3 text-yellow-400 w-2" />
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
