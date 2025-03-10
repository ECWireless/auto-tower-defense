import { User } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/utils/helpers';

const SYSTEMS_LIST = [
  {
    id: '0x0000000000000000',
    name: 'New System',
    author: 'You',
    description: 'This is a new system',
    size: '0 MB',
    selected: true,
  },
  {
    id: '0x7f454c4602010100',
    name: 'Angled Shot',
    author: 'Template',
    description: 'Shoots at an angle',
    size: '2.4 MB',
    selected: false,
  },
  {
    id: '0x89504e470d0a1a0a',
    name: 'Curved Shot',
    author: 'Template',
    description: 'Shoots a curved shot',
    size: '4.1 MB',
    selected: false,
  },
  {
    id: '0x636f6e73742061757',
    name: 'Upward Angle',
    author: 'You',
    description: 'Shoots at an angle',
    size: '156 KB',
    selected: false,
  },
];

const OTHER_SYSTEMS_LIST = [
  {
    id: '0x8a7b6c5d4e3f2a1b',
    name: 'Parabolic Arc',
    author: 'Wei Zhang',
    description: 'Shoots a curved shot',
    size: '3.7 MB',
    selected: false,
  },
  {
    id: '0x1c2d3e4f5a6b7c8d',
    name: 'Spiral Shot',
    author: 'Priya Patel',
    description: 'Shoots a spiral shot',
    size: '2.8 MB',
    selected: false,
  },
  {
    id: '0x9d8c7b6a5f4e3d2c',
    name: 'Gravity Well',
    author: 'Marcus Johnson',
    description: 'Shoots a gravity shot',
    size: '5.2 MB',
    selected: false,
  },
  {
    id: '0x2b3c4d5e6f7a8b9c',
    name: 'Quantum Leap',
    author: 'Sophia Chen',
    description: 'Shoots a crazy shot!',
    size: '4.3 MB',
    selected: false,
  },
];

export default function SystemList(): JSX.Element {
  const [selectedSystem, setSelectedSystem] = useState(SYSTEMS_LIST[0]);
  const [systemsTab, setSystemsTab] = useState<'your' | 'other'>('your');

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
              ? SYSTEMS_LIST.findIndex(s => s.id === selectedSystem.id) + 1
              : OTHER_SYSTEMS_LIST.findIndex(s => s.id === selectedSystem.id) +
                  1 || 0}
          </span>{' '}
          of{' '}
          {systemsTab === 'your'
            ? SYSTEMS_LIST.length
            : OTHER_SYSTEMS_LIST.length}{' '}
          selected
        </div>
      </div>

      <div className="bg-black/30 border border-gray-800 h-[240px] overflow-y-auto pr-1 rounded-md systems-scrollbar">
        <div className="p-1 space-y-1">
          {(systemsTab === 'your' ? SYSTEMS_LIST : OTHER_SYSTEMS_LIST).map(
            system => (
              <div
                key={system.id}
                onClick={() => setSelectedSystem(system)}
                className={cn(
                  'border-l-2 cursor-pointer flex gap-2 items-start py-2 px-3 rounded transition-all',
                  selectedSystem.id === system.id
                    ? 'bg-cyan-950/30 border-l-cyan-500'
                    : 'bg-gray-900/50 border-l-transparent hover:bg-gray-900/80 hover:border-l-gray-700',
                )}
              >
                <div className="flex h-4 items-center mt-0.5">
                  <input
                    type="radio"
                    checked={selectedSystem.id === system.id}
                    onChange={() => setSelectedSystem(system)}
                    className="bg-gray-900 border-gray-700 focus:ring-cyan-600 h-3.5 text-cyan-400 w-3.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium max-w-[150px] text-sm text-white truncate">
                      {system.name}
                    </h3>
                    <span className="flex-shrink-0 ml-2 text-gray-400 text-xs">
                      {system.size}
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
            ),
          )}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-md text-white">Description</h3>
        <div className="mt-1 text-white text-xs">
          {selectedSystem.description}
        </div>
      </div>
    </div>
  );
}
