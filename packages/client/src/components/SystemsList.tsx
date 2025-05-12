import { getComponentValue } from '@latticexyz/recs';
import { User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zeroHash } from 'viem';

import { Button } from '@/components/ui/button';
import { useMUD } from '@/hooks/useMUD';
import { cn } from '@/lib/utils';
import { formatDateFromTimestamp, shortenAddress } from '@/utils/helpers';
import { type SavedModification } from '@/utils/types';

type SystemsListProps = {
  onSelectSavedModification: (modification: SavedModification) => void;
  savedModifications: SavedModification[];
  selectedModification: SavedModification;
};

export const SystemsList: React.FC<SystemsListProps> = ({
  onSelectSavedModification,
  savedModifications,
  selectedModification,
}) => {
  const {
    components: { Username },
    network: { playerEntity },
  } = useMUD();

  const [systemsTab, setSystemsTab] = useState<'your' | 'other'>('your');
  const innerRef = useRef(null);
  const rowRefs = useRef([]) as React.MutableRefObject<HTMLDivElement[]>;

  const myUsername = useMemo(() => {
    if (!playerEntity) return '';
    return getComponentValue(Username, playerEntity)?.value ?? '';
  }, [playerEntity, Username]);

  const mySavedModifications = useMemo(() => {
    return savedModifications.filter(
      s => s.author === myUsername || s.author === 'Template',
    );
  }, [myUsername, savedModifications]);

  const otherSavedModifications = useMemo(() => {
    return savedModifications.filter(
      s => s.author !== myUsername && s.author !== 'Template',
    );
  }, [myUsername, savedModifications]);

  const scrollToRow = useCallback(() => {
    const index = savedModifications.findIndex(
      s => s.id === selectedModification.id,
    );
    const container = innerRef.current as unknown as HTMLDivElement;
    const row = rowRefs.current[index];
    if (container && row) {
      // compute the row's position relative to the container
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const offset = rowRect.top - containerRect.top + container.scrollTop;

      container.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }
  }, [savedModifications, selectedModification, rowRefs]);

  useEffect(() => {
    scrollToRow();
  }, [scrollToRow]);

  useEffect(() => {
    if (mySavedModifications.find(s => s.id === selectedModification.id)) {
      setSystemsTab('your');
    }
    if (otherSavedModifications.find(s => s.id === selectedModification.id)) {
      setSystemsTab('other');
    }
  }, [selectedModification, mySavedModifications, otherSavedModifications]);

  return (
    <div className="mb-6 sm:mr-2">
      <div className="flex flex-col gap-2 items-start justify-between mb-3 sm:flex-row sm:gap-0 sm:items-end">
        <div className="flex space-x-2">
          <Button
            className={cn(
              'text-sm',
              'hover:bg-cyan-900/50 hover:text-cyan-300',
              systemsTab === 'your'
                ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400'
                : 'border-gray-700 text-gray-400 hover:text-gray-300',
            )}
            onClick={() => setSystemsTab('your')}
            size="sm"
            variant="outline"
          >
            Your Systems
          </Button>
          <Button
            className={cn(
              'text-sm',
              'hover:bg-cyan-900/50 hover:text-cyan-300',
              systemsTab === 'other'
                ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400'
                : 'border-gray-700 text-gray-400 hover:text-gray-300',
            )}
            onClick={() => setSystemsTab('other')}
            size="sm"
            variant="outline"
          >
            Other Systems
          </Button>
        </div>
        <div className="text-gray-400 text-xs">
          <span className="font-medium">
            #
            {systemsTab === 'your'
              ? mySavedModifications.findIndex(
                  s => s.id === selectedModification.id,
                ) + 1
              : otherSavedModifications.findIndex(
                  s => s.id === selectedModification.id,
                ) + 1 || 0}
          </span>{' '}
          of{' '}
          {systemsTab === 'your'
            ? mySavedModifications.length
            : otherSavedModifications.length}{' '}
          selected
        </div>
      </div>

      <div
        className="bg-black/30 border border-gray-800 h-[240px] overflow-y-auto pr-1 rounded-md systems-scrollbar"
        ref={innerRef}
      >
        <div className="p-1 space-y-1">
          {(systemsTab === 'your'
            ? mySavedModifications
            : otherSavedModifications
          ).map((system, i) => (
            <div
              key={system.id}
              className={cn(
                'border-l-2 cursor-pointer flex gap-2 items-start py-2 px-3 rounded transition-all',
                selectedModification.id === system.id
                  ? 'bg-cyan-950/30 border-l-cyan-500'
                  : 'bg-gray-900/50 border-l-transparent hover:bg-gray-900/80 hover:border-l-gray-700',
              )}
              onClick={() => onSelectSavedModification(system)}
              ref={el => (el ? (rowRefs.current[i] = el) : null)}
            >
              <div className="flex h-4 items-center mt-0.5">
                <input
                  type="radio"
                  checked={selectedModification.id === system.id}
                  onChange={() => onSelectSavedModification(system)}
                  className="bg-gray-900 border-gray-700 focus:ring-cyan-600 h-3.5 text-cyan-400 w-3.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium max-w-[150px] text-sm text-white truncate">
                    {system.name}
                  </h3>
                  <span className="flex-shrink-0 ml-2 text-gray-400 text-xs">
                    {system.useCount} uses
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex gap-1 items-center">
                    <User className="flex-shrink-0 h-3 text-gray-400 w-3" />
                    <span
                      className={`max-w-[100px] text-xs ${system.author === 'Template' ? 'text-purple-400' : 'text-cyan-400'} truncate`}
                    >
                      {system.author}
                    </span>
                  </div>
                  <span className="font-mono text-white text-xs truncate">
                    {shortenAddress(system.id)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-lg text-white">
          {selectedModification.name}
        </h3>
        {selectedModification.id !== zeroHash && (
          <div className="text-gray-400 text-[10px]">
            Created {formatDateFromTimestamp(selectedModification.timestamp)}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-md text-white">Description</h3>
        <div className="mt-1 text-white text-xs">
          {selectedModification.description}
        </div>
      </div>
    </div>
  );
};
