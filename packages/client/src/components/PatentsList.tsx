import { getComponentValue } from '@latticexyz/recs';
import { User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zeroHash } from 'viem';

import { Button } from '@/components/ui/button';
import { useMUD } from '@/hooks/useMUD';
import { TutorialSteps } from '@/hooks/useTutorialIndicator';
import { cn } from '@/lib/utils';
import { formatDateFromTimestamp, shortenAddress } from '@/utils/helpers';
import { type Patent as PatentType } from '@/utils/types';

import { ClickIndicator } from './ClickIndicator';

type PatentsListProps = {
  onSelectPatent: (patent: PatentType) => void;
  patents: PatentType[];
  tutorialStep: TutorialSteps;
  selectedPatent: PatentType;
};

export const PatentsList: React.FC<PatentsListProps> = ({
  onSelectPatent,
  patents,
  tutorialStep,
  selectedPatent,
}) => {
  const {
    components: { Username },
    network: { globalPlayerId },
  } = useMUD();

  const [patentsTab, setPatentsTab] = useState<'your' | 'other'>('your');
  const innerRef = useRef(null);
  const rowRefs = useRef([]) as React.MutableRefObject<HTMLDivElement[]>;

  const myUsername = useMemo(() => {
    if (!globalPlayerId) return '';
    return getComponentValue(Username, globalPlayerId)?.value ?? '';
  }, [globalPlayerId, Username]);

  const myPatents = useMemo(() => {
    return patents.filter(
      s => s.patentee === myUsername || s.patentee === 'Template',
    );
  }, [myUsername, patents]);

  const otherPatents = useMemo(() => {
    return patents.filter(
      s => s.patentee !== myUsername && s.patentee !== 'Template',
    );
  }, [myUsername, patents]);

  const scrollToRow = useCallback(() => {
    const index = patents.findIndex(s => s.id === selectedPatent.id);
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
  }, [patents, rowRefs, selectedPatent]);

  useEffect(() => {
    scrollToRow();
  }, [scrollToRow]);

  useEffect(() => {
    if (myPatents.find(s => s.id === selectedPatent.id)) {
      setPatentsTab('your');
    }
    if (otherPatents.find(s => s.id === selectedPatent.id)) {
      setPatentsTab('other');
    }
  }, [myPatents, otherPatents, selectedPatent]);

  return (
    <div className="mb-6 sm:mr-2">
      <div className="flex flex-col gap-2 items-start justify-between mb-3 sm:flex-row sm:gap-0 sm:items-end">
        <div className="flex space-x-2">
          <Button
            className={cn(
              'text-sm',
              'hover:bg-cyan-900/50 hover:text-cyan-300',
              patentsTab === 'your'
                ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400'
                : 'border-gray-700 text-gray-400 hover:text-gray-300',
            )}
            onClick={() => setPatentsTab('your')}
            size="sm"
            variant="outline"
          >
            Your Patents
          </Button>
          <Button
            className={cn(
              'text-sm',
              'hover:bg-cyan-900/50 hover:text-cyan-300',
              patentsTab === 'other'
                ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400'
                : 'border-gray-700 text-gray-400 hover:text-gray-300',
            )}
            onClick={() => setPatentsTab('other')}
            size="sm"
            variant="outline"
          >
            Other Patents
          </Button>
        </div>
        <div className="text-gray-400 text-xs">
          <span className="font-medium">
            #
            {patentsTab === 'your'
              ? myPatents.findIndex(s => s.id === selectedPatent.id) + 1
              : otherPatents.findIndex(s => s.id === selectedPatent.id) + 1 ||
                0}
          </span>{' '}
          of {patentsTab === 'your' ? myPatents.length : otherPatents.length}{' '}
          selected
        </div>
      </div>

      <div
        className="bg-black/30 border border-gray-800 h-[240px] overflow-y-auto pr-1 rounded-md systems-scrollbar"
        ref={innerRef}
      >
        <div className="p-1 space-y-1">
          {(patentsTab === 'your' ? myPatents : otherPatents).map(
            (patent, i) => (
              <div
                key={patent.id}
                className={cn(
                  'border-l-2 cursor-pointer flex gap-2 items-start py-2 px-3 relative rounded transition-all',
                  selectedPatent.id === patent.id
                    ? 'bg-cyan-950/30 border-l-cyan-500'
                    : 'bg-gray-900/50 border-l-transparent hover:bg-gray-900/80 hover:border-l-gray-700',
                )}
                onClick={() => onSelectPatent(patent)}
                ref={el => (el ? (rowRefs.current[i] = el) : null)}
              >
                <div className="flex h-4 items-center mt-0.5">
                  <input
                    type="radio"
                    checked={selectedPatent.id === patent.id}
                    onChange={() => onSelectPatent(patent)}
                    className="bg-gray-900 border-gray-700 focus:ring-cyan-600 h-3.5 text-cyan-400 w-3.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium max-w-[150px] text-sm text-white truncate">
                      {patent.name}
                    </h3>
                    <span className="flex-shrink-0 ml-2 text-gray-400 text-xs">
                      {patent.useCount} uses
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex gap-1 items-center">
                      <User className="flex-shrink-0 h-3 text-gray-400 w-3" />
                      <span
                        className={`max-w-[100px] text-xs ${patent.patentee === 'Template' ? 'text-purple-400' : 'text-cyan-400'} truncate`}
                      >
                        {patent.patentee}
                      </span>
                    </div>
                    <span className="font-mono text-white text-xs truncate">
                      {shortenAddress(patent.id)}
                    </span>
                  </div>
                </div>
                {patent.name === '45 Degrees Down' &&
                  tutorialStep === TutorialSteps.FOUR_FIVE && (
                    <div className="absolute left-50 top-5">
                      <ClickIndicator />
                    </div>
                  )}
              </div>
            ),
          )}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-lg text-white">
          {selectedPatent.name}
        </h3>
        {selectedPatent.id !== zeroHash && (
          <div className="text-gray-400 text-[10px]">
            Created {formatDateFromTimestamp(selectedPatent.timestamp)}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-md text-white">Description</h3>
        <div className="mt-1 text-white text-xs">
          {selectedPatent.description}
        </div>
      </div>
    </div>
  );
};
