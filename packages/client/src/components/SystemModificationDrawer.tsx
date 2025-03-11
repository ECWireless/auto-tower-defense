import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  Has,
  runQuery,
} from '@latticexyz/recs';
import { encodeEntity } from '@latticexyz/store-sync/recs';
// eslint-disable-next-line import/no-named-as-default
import Editor, { loader } from '@monaco-editor/react';
import { Info, Loader2, Rocket, Scroll } from 'lucide-react';
import { format } from 'prettier/standalone';
import solidityPlugin from 'prettier-plugin-solidity/standalone';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { zeroAddress, zeroHash } from 'viem';

import { SystemsList } from '@/components/SystemsList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGame } from '@/contexts/GameContext';
import { useMUD } from '@/MUDContext';
import type { SavedModification, Tower } from '@/utils/types';

import { Button } from './ui/button';

type SystemModificationDrawerProps = {
  isSystemDrawerOpen: boolean;
  setIsSystemDrawerOpen: (isOpen: boolean) => void;
  tower: Tower;
};

export const SystemModificationDrawer: React.FC<
  SystemModificationDrawerProps
> = ({ isSystemDrawerOpen, setIsSystemDrawerOpen, tower }) => {
  const {
    components: { Projectile, SavedModification, Username },
    systemCalls: { getContractSize, modifyTowerSystem },
  } = useMUD();
  const { game, isPlayer1, refreshGame } = useGame();

  const [savedModifications, setSavedModifications] = useState<
    SavedModification[]
  >([]);
  const [selectedModification, setSelectedModification] =
    useState<SavedModification | null>(null);

  const [isSemiTransparent, setIsSemiTransparent] = useState<boolean>(false);
  const [sizeLimit, setSizeLimit] = useState<bigint>(BigInt(0));
  const [sourceCode, setSourceCode] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const fetchSavedModifications = useCallback(() => {
    try {
      const _savedModifications = Array.from(
        runQuery([Has(SavedModification)]),
      ).map(entity => {
        const _savedModification = getComponentValueStrict(
          SavedModification,
          entity as Entity,
        );
        const authorEntity = encodeEntity(
          { address: 'address' },
          { address: _savedModification.author as `0x${string}` },
        );
        const authorUsername =
          getComponentValue(Username, authorEntity)?.value ?? 'Unknown';

        return {
          id: entity as Entity,
          author:
            _savedModification.author === zeroAddress
              ? 'Template'
              : authorUsername,
          bytecode: _savedModification.bytecode,
          description: _savedModification.description,
          name: _savedModification.name,
          size: `${_savedModification.size.toString()} bytes`,
          sourceCode: _savedModification.sourceCode,
          timestamp: _savedModification.timestamp,
          useCount: Number(_savedModification.useCount),
        } as SavedModification;
      });
      return _savedModifications.sort(
        (a, b) => Number(b.timestamp) - Number(a.timestamp),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching saved systems:', error);
      toast.error('Error Fetching Saved Systems', {
        description: (error as Error).message,
      });
      return [];
    }
  }, [SavedModification, Username]);

  useEffect(() => {
    if (game && isSystemDrawerOpen) {
      const _savedModifications = fetchSavedModifications();
      const newModification = {
        id: zeroHash as Entity,
        author: game.player1Username,
        bytecode: zeroHash,
        description: 'Create a new system!',
        name: 'New System',
        size: '0 bytes',
        sourceCode: '',
        timestamp: BigInt(Date.now()),
        useCount: 0,
      };

      const projectile = getComponentValue(Projectile, tower.id as Entity);

      if (projectile) {
        format(projectile.sourceCode, {
          parser: 'solidity-parse',
          plugins: [solidityPlugin],
        }).then(formattedSourceCode => {
          const flattenedSourceCode = formattedSourceCode
            .replace(/\s+/g, ' ')
            .trim();
          newModification.sourceCode = flattenedSourceCode.trim();

          const savedModificationMatch = _savedModifications.find(
            s => s.sourceCode === flattenedSourceCode,
          );

          if (savedModificationMatch) {
            setSelectedModification(savedModificationMatch);
          } else {
            setSelectedModification(_savedModifications[0]);
          }
          setSizeLimit(projectile.sizeLimit);
          setSourceCode(formattedSourceCode.trim());
        });
      } else {
        setSourceCode('');
      }

      setSavedModifications([newModification, ..._savedModifications]);
    }
  }, [fetchSavedModifications, game, isSystemDrawerOpen, Projectile, tower.id]);

  const onSelectSavedModification = useCallback(
    (modification: SavedModification) => {
      format(modification.sourceCode, {
        parser: 'solidity-parse',
        plugins: [solidityPlugin],
      }).then(formattedSourceCode => {
        setSourceCode(formattedSourceCode.trim());
        setSelectedModification(modification);
      });
    },
    [],
  );

  const onCompileCode = useCallback(async (): Promise<string | null> => {
    try {
      const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

      const res = await fetch(`${API_ENDPOINT}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode }),
      });

      if (!res.ok) {
        throw new Error('Failed to compile code');
      }

      const bytecode = await res.text();

      return `0x${bytecode}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error compiling code:', error);

      toast.error('Error Compiling Code', {
        description: (error as Error).message,
      });

      return null;
    }
  }, [sourceCode]);

  const onModifyTowerSystem = useCallback(async () => {
    try {
      setIsDeploying(true);
      const bytecode = await onCompileCode();
      if (!bytecode) {
        setIsDeploying(false);
        return;
      }

      const currentContractSize = await getContractSize(bytecode);
      if (!currentContractSize) {
        throw new Error('Failed to get contract size');
      }

      if (currentContractSize > sizeLimit) {
        throw new Error(
          `Contract size of ${currentContractSize} exceeds limit of ${sizeLimit} bytes`,
        );
      }

      const { error, success } = await modifyTowerSystem(
        tower.id,
        bytecode,
        sourceCode.replace(/\s+/g, ' ').trim(),
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('System Deployed!');

      setIsSystemDrawerOpen(false);
      refreshGame();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Deploying System', {
        description: (error as Error).message,
      });
    } finally {
      setIsDeploying(false);
    }
  }, [
    getContractSize,
    modifyTowerSystem,
    onCompileCode,
    refreshGame,
    setIsSystemDrawerOpen,
    sizeLimit,
    sourceCode,
    tower,
  ]);

  // Configure Solidity language
  loader.init().then(monacoInstance => {
    monacoInstance.languages.register({ id: 'solidity' });

    monacoInstance.languages.setMonarchTokensProvider('solidity', {
      tokenizer: {
        root: [
          [
            /\b(?:pragma|contract|function|string|public|constructor|memory|returns)\b/,
            'keyword',
          ],
          [/\b(?:uint256|string|bool|address)\b/, 'type'],
          [/["'].*["']/, 'string'],
          [/\/\/.*$/, 'comment'],
        ],
      },
    });

    monacoInstance.languages.setLanguageConfiguration('solidity', {
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
      ],
    });
  });

  return (
    <Sheet
      onOpenChange={open => setIsSystemDrawerOpen(open)}
      open={isSystemDrawerOpen}
    >
      <SheetContent
        aria-describedby={undefined}
        className={`bg-gray-900/95 border-l border-cyan-900/50 max-w-none md:w-[800px] p-4 ${isSemiTransparent ? 'opacity-10' : 'opacity-100'} w-[90%]`}
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="font-bold text-cyan-400 text-2xl">
            SYSTEM MODIFICATION
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 overflow-y-auto">
          <Dialog aria-describedby={undefined}>
            <DialogTrigger asChild>
              <Button
                className="border-purple-500 hover:text-purple-300 hover:bg-purple-950/50 text-purple-400"
                variant="outline"
              >
                <Scroll className="h-4 mr-2 w-4" />
                View Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border border-cyan-900/50 text-white">
              <DialogHeader>
                <DialogTitle className="text-cyan-400 text-xl">
                  Rules
                </DialogTitle>
              </DialogHeader>
              <ul className="space-y-4 text-gray-300">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Modify the <span className="text-cyan-400">Solidity</span>{' '}
                    code to change the behavior of the projectile. The
                    projectile will be deployed as a smart contract.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Projectiles move at a speed of x &quot;pixels&quot; per
                    tick. However,
                    <span className="font-semibold text-pink-400">
                      {' '}
                      x can never exceed 10 per tick{' '}
                    </span>
                    (each tile has a resolution of 10x10 pixels).
                    <span className="font-semibold text-cyan-400">
                      {' '}
                      There are 28 ticks{' '}
                    </span>
                    when the round results run. The recommended speed is 5
                    pixels per tick.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    The size limit of the projectile logic code is{' '}
                    <span className="font-semibold text-cyan-400">
                      1000 bytes
                    </span>
                    .
                  </span>
                </li>
              </ul>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2 items-center">
            <h3 className="font-semibold my-4 text-white text-xl">
              Saved Systems
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="h-6 hover:cursor-pointer hover:text-white text-gray-400 w-6">
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Basic templates are included in your list of systems</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {selectedModification && (
            <SystemsList
              onSelectSavedModification={onSelectSavedModification}
              savedModifications={savedModifications}
              selectedModification={selectedModification}
            />
          )}

          <div className="flex gap-3 mb-6 mt-6">
            {isPlayer1 && (
              <Button
                className="bg-cyan-950/30 border-cyan-500 hover:bg-cyan-900/50 hover:text-cyan-300 text-cyan-400"
                disabled={isDeploying}
                variant="outline"
                onClick={onModifyTowerSystem}
              >
                {isDeploying ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <Rocket className="h-4 mr-2 w-4" />
                )}
                Deploy
              </Button>
            )}
            <Button
              className="border-purple-500 hover:text-purple-300 hover:bg-purple-950/50 text-purple-400"
              onMouseEnter={() => setIsSemiTransparent(true)}
              onMouseLeave={() => setIsSemiTransparent(false)}
              variant="outline"
            >
              View Board
            </Button>
          </div>

          <div className="bg-black/50 border border-cyan-900/50 relative rounded-lg">
            {!isPlayer1 && (
              <div className="absolute bg-transparent flex h-full w-full z-1" />
            )}
            <Editor
              defaultLanguage="solidity"
              height="300px"
              onChange={value => {
                if (!value) return;
                const flattenedSourceCode = value.replace(/\s+/g, ' ').trim();

                const savedModificationMatch = savedModifications
                  .slice(1)
                  .find(s => s.sourceCode === flattenedSourceCode);

                if (savedModificationMatch) {
                  setSelectedModification(savedModificationMatch);
                } else {
                  setSelectedModification(savedModifications[0]);
                }
                setSourceCode(value ?? '');
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
              }}
              value={sourceCode}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
