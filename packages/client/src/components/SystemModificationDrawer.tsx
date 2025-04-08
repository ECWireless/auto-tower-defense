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
import {
  FileText,
  Info,
  Loader2,
  Pencil,
  Rocket,
  Scroll,
  Trash2,
} from 'lucide-react';
import { format } from 'prettier/standalone';
import solidityPlugin from 'prettier-plugin-solidity/standalone';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { zeroAddress, zeroHash } from 'viem';

import { SystemsList } from '@/components/SystemsList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NO_ACTIONS_ERROR, useGame } from '@/contexts/GameContext';
import { useSettings } from '@/contexts/SettingsContext';
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
    systemCalls: {
      deleteModification,
      editModification,
      getContractSize,
      modifyTowerSystem,
      saveModification,
    },
  } = useMUD();
  const { game, isPlayer1, refreshGame, setIsNoActionsDialogOpen } = useGame();
  const { playSfx } = useSettings();

  const [savedModifications, setSavedModifications] = useState<
    SavedModification[]
  >([]);
  const [selectedModification, setSelectedModification] =
    useState<SavedModification | null>(null);
  const [tooltipSelection, setTooltipSelection] = useState<string | null>(null);

  const [isSemiTransparent, setIsSemiTransparent] = useState<boolean>(false);
  const [sizeLimit, setSizeLimit] = useState<bigint>(BigInt(0));
  const [sourceCode, setSourceCode] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const [showSaveSystemModal, setShowSaveSystemModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<
    {
      field: string;
      message: string;
    }[]
  >([]);

  const [showDeleteSystemModal, setShowDeleteSystemModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        (a, b) => Number(b.useCount) - Number(a.useCount),
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

  const onRefreshSystemList = useCallback((): SavedModification[] => {
    try {
      if (!game) return [];
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
            setSelectedModification(newModification);
          }
          setSizeLimit(projectile.sizeLimit);
          setSourceCode(formattedSourceCode.trim());
        });
      } else {
        setSourceCode('');
      }

      const savedModWithDummy = [newModification, ..._savedModifications];
      setSavedModifications(savedModWithDummy);
      return savedModWithDummy;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error refreshing system list:', error);
      toast.error('Error Refreshing System List', {
        description: (error as Error).message,
      });
      return [];
    }
  }, [fetchSavedModifications, game, Projectile, tower.id]);

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
      playSfx('click3');
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

      refreshGame();
      setIsSystemDrawerOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      if (error instanceof Error && error.message === NO_ACTIONS_ERROR) {
        setIsSystemDrawerOpen(false);
        setIsNoActionsDialogOpen(true);
      } else {
        toast.error('Error Deploying System', {
          description: (error as Error).message,
        });
      }
    } finally {
      setIsDeploying(false);
    }
  }, [
    getContractSize,
    modifyTowerSystem,
    onCompileCode,
    playSfx,
    refreshGame,
    setIsNoActionsDialogOpen,
    setIsSystemDrawerOpen,
    sizeLimit,
    sourceCode,
    tower,
  ]);

  const getHasError = useCallback(() => {
    if (!name) {
      setFormErrors(prev => [
        ...(prev || []),
        { field: 'system-name', message: 'Name is required' },
      ]);
      return true;
    }

    if (!description) {
      setFormErrors(prev => [
        ...prev,
        { field: 'system-description', message: 'Description is required' },
      ]);
      return true;
    }

    if (name.length > 32) {
      setFormErrors(prev => [
        ...(prev || []),
        {
          field: 'system-name',
          message: 'Name must be 32 characters or less',
        },
      ]);
      return true;
    }

    if (description.length > 256) {
      setFormErrors(prev => [
        ...prev,
        {
          field: 'system-description',
          message: 'Description must be 256 characters or less',
        },
      ]);
      return true;
    }

    if (
      savedModifications.some(s => s.name === name) &&
      selectedModification?.name !== name
    ) {
      setFormErrors(prev => [
        ...(prev || []),
        { field: 'system-name', message: 'Name already exists' },
      ]);
      return true;
    }

    return false;
  }, [
    description,
    name,
    savedModifications,
    selectedModification,
    setFormErrors,
  ]);

  const onSaveModification = useCallback(async () => {
    try {
      setIsSaving(true);

      const hasError = getHasError();
      if (hasError) return;

      const bytecode = await onCompileCode();
      if (!bytecode) {
        setIsSaving(false);
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

      const { error, success } = await saveModification(
        bytecode,
        description,
        name,
        sourceCode.replace(/\s+/g, ' ').trim(),
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('System Saved!');

      setShowSaveSystemModal(false);
      setName('');
      setDescription('');
      const _savedModifications = onRefreshSystemList();

      const matchingModification = _savedModifications.find(
        s => s.sourceCode === sourceCode.replace(/\s+/g, ' ').trim(),
      );
      if (matchingModification) {
        onSelectSavedModification(matchingModification);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Saving System', {
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    description,
    getContractSize,
    getHasError,
    onCompileCode,
    name,
    onRefreshSystemList,
    onSelectSavedModification,
    saveModification,
    sizeLimit,
    sourceCode,
  ]);

  const onEditModification = useCallback(async () => {
    try {
      setIsSaving(true);

      const hasError = getHasError();
      if (hasError) return;

      if (
        name === selectedModification?.name &&
        description === selectedModification?.description
      ) {
        throw new Error('No changes made to the system');
      }

      if (!selectedModification) {
        throw new Error('No modification selected');
      }

      const { error, success } = await editModification(
        selectedModification.id,
        description,
        name,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('System Saved!');

      setShowSaveSystemModal(false);
      const _savedModifications = onRefreshSystemList();

      const matchingModification = _savedModifications.find(
        s => s.sourceCode === sourceCode.replace(/\s+/g, ' ').trim(),
      );
      if (matchingModification) {
        onSelectSavedModification(matchingModification);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Editing System', {
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    description,
    editModification,
    getHasError,
    name,
    onRefreshSystemList,
    onSelectSavedModification,
    selectedModification,
    sourceCode,
  ]);

  const onDeleteModification = useCallback(async () => {
    try {
      setIsDeleting(true);

      if (!selectedModification) {
        throw new Error('No modification selected');
      }

      const { error, success } = await deleteModification(
        selectedModification.id,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('System Deleted!');

      setShowDeleteSystemModal(false);
      const _savedModifications = onRefreshSystemList();

      onSelectSavedModification(_savedModifications[0]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Deleting System', {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [
    deleteModification,
    onRefreshSystemList,
    onSelectSavedModification,
    selectedModification,
  ]);

  useEffect(() => {
    setFormErrors([]);
  }, [description, name]);

  const isMyTower = useMemo(() => {
    if (!isPlayer1) return false;
    if (!game) return false;
    return game.player1Address === tower.owner;
  }, [game, isPlayer1, tower.owner]);

  const isSystemSaved = useMemo(() => {
    if (!sourceCode) return false;
    const flattenedSourceCode = sourceCode.replace(/\s+/g, ' ').trim();

    return savedModifications
      .slice(1)
      .some(s => s.sourceCode === flattenedSourceCode);
  }, [savedModifications, sourceCode]);

  const canEditSystem = useMemo(() => {
    if (!(game && selectedModification)) return false;
    if (selectedModification.bytecode === zeroHash) return false;
    if (selectedModification.author === 'Template') return false;
    return selectedModification?.author === game.player1Username;
  }, [game, selectedModification]);

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
        <div className="mt-6 overflow-y-auto pb-[100px]">
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
              <Tooltip open={tooltipSelection === 'systemsTooltip'}>
                <TooltipTrigger
                  className="h-6 hover:cursor-pointer hover:text-white text-gray-400 w-6"
                  onClick={() => setTooltipSelection('systemsTooltip')}
                  onMouseEnter={() => setTooltipSelection('systemsTooltip')}
                  onMouseLeave={() => setTooltipSelection(null)}
                >
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

          <div className="flex flex-col gap-3 mb-6 mt-6 sm:flex-row">
            <div className="flex gap-3">
              {isMyTower && (
                <Button
                  className="bg-cyan-950/30 border-cyan-500 hover:bg-cyan-900/50 hover:text-cyan-300 text-cyan-400"
                  disabled={isDeploying}
                  onClick={onModifyTowerSystem}
                  variant="outline"
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
                className="border-purple-500 hover:bg-purple-950/50 hover:text-purple-300 text-purple-400"
                onMouseEnter={() => setIsSemiTransparent(true)}
                onMouseLeave={() => setIsSemiTransparent(false)}
                variant="outline"
              >
                View Board
              </Button>
            </div>
            {isMyTower && (!isSystemSaved || canEditSystem) && (
              <div className="flex gap-3">
                <Button
                  className="border-pink-500 hover:bg-pink-950/50 hover:text-pink-300 text-pink-400"
                  onClick={() => {
                    setShowSaveSystemModal(true);

                    if (canEditSystem && selectedModification) {
                      setName(selectedModification.name);
                      setDescription(selectedModification.description);
                    }
                  }}
                  variant="outline"
                >
                  {isSystemSaved ? (
                    <Pencil className="h-4 mr-2 w-4" />
                  ) : (
                    <FileText className="h-4 mr-2 w-4" />
                  )}
                  {isSystemSaved ? 'Edit' : 'Save'} System
                </Button>
                {canEditSystem && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          aria-label="Delete System"
                          className="border-pink-500 hover:bg-pink-950/50 hover:text-pink-300 text-pink-400"
                          onClick={() => setShowDeleteSystemModal(true)}
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete System</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>

          {/* SAVE AND EDIT DIALOG */}
          <Dialog
            open={showSaveSystemModal}
            onOpenChange={setShowSaveSystemModal}
          >
            <DialogContent className="bg-gray-900/95 border border-pink-900/50 text-white">
              <DialogHeader>
                <DialogTitle className="font-bold text-pink-400 text-2xl">
                  {canEditSystem ? 'Edit' : 'Save'} System
                </DialogTitle>
                <DialogDescription className="mt-2 text-gray-300">
                  {canEditSystem
                    ? 'Edit your custom projectile system.'
                    : 'Save your custom projectile system for future use.'}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="system-name">
                    System Name
                  </Label>
                  <Input
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={isSaving}
                    id="system-name"
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter a name for your system"
                    type="text"
                    value={name}
                  />
                  {formErrors?.find(e => e.field === 'system-name') && (
                    <p className="text-red-500 text-sm">
                      {
                        formErrors?.find(e => e.field === 'system-name')
                          ?.message
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="system-description">
                    Description
                  </Label>
                  <Textarea
                    className="bg-gray-800 border border-gray-700 h-24 p-2 rounded-md text-white text-sm w-full"
                    disabled={isSaving}
                    id="system-description"
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what your system does"
                    value={description}
                  />
                  {formErrors?.find(e => e.field === 'system-description') && (
                    <p className="text-red-500 text-sm">
                      {
                        formErrors?.find(e => e.field === 'system-description')
                          ?.message
                      }
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  className="border-gray-700 text-gray-400"
                  disabled={isSaving}
                  onClick={() => setShowSaveSystemModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-pink-800 hover:bg-pink-700 text-white"
                  onClick={
                    canEditSystem ? onEditModification : onSaveModification
                  }
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : canEditSystem ? (
                    'Save Changes'
                  ) : (
                    'Save System'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* DELETE DIALOG */}
          <Dialog
            open={showDeleteSystemModal}
            onOpenChange={setShowDeleteSystemModal}
          >
            <DialogContent
              aria-describedby={undefined}
              className="bg-gray-900/95 border border-pink-900/50 text-white"
            >
              <DialogHeader>
                <DialogTitle className="font-bold text-pink-400 text-2xl">
                  Delete System
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="mt-2 text-gray-300">
                Are you sure you want to delete this system?{' '}
                <strong>This action cannot be undone.</strong>
              </DialogDescription>
              <DialogFooter className="mt-6">
                <Button
                  className="border-gray-700 text-gray-400"
                  disabled={isDeleting}
                  onClick={() => setShowSaveSystemModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-pink-800 hover:bg-pink-700 text-white"
                  onClick={onDeleteModification}
                >
                  {isDeleting ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : (
                    'Delete System'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="bg-black/50 border border-cyan-900/50 relative rounded-lg">
            {!isMyTower && (
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
              onMount={onRefreshSystemList}
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
