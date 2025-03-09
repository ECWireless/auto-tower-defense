import { Entity, getComponentValue } from '@latticexyz/recs';
// eslint-disable-next-line import/no-named-as-default
import Editor, { loader } from '@monaco-editor/react';
import { Loader2, Rocket } from 'lucide-react';
import { format } from 'prettier/standalone';
import solidityPlugin from 'prettier-plugin-solidity/standalone';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
// import SystemList from '@/components/SystemList';
import { useGame } from '@/contexts/GameContext';
import { useMUD } from '@/MUDContext';
import { type Tower } from '@/utils/types';

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
    components: { Projectile },
    systemCalls: { getContractSize, modifyTowerSystem },
  } = useMUD();
  const { isPlayer1, refreshGame } = useGame();

  const [isSemiTransparent, setIsSemiTransparent] = useState<boolean>(false);
  const [sizeLimit, setSizeLimit] = useState<bigint>(BigInt(0));
  const [sourceCode, setSourceCode] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

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

      toast('Error Compiling Code', {
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
          `Contract size of ${currentContractSize} exceeds limit of ${sizeLimit}`,
        );
      }

      const { error, success } = await modifyTowerSystem(
        tower.id,
        bytecode,
        sourceCode,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast('System Deployed!');

      setIsSystemDrawerOpen(false);
      refreshGame();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast('Error Deploying System', {
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
        className={`bg-gray-900/95 border-l border-cyan-900/50 max-w-none md:w-[800px] p-4 ${isSemiTransparent ? 'opacity-10' : 'opacity-100'} w-[90%]`}
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="font-bold text-cyan-400 text-2xl">
            SYSTEM MODIFICATION
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 overflow-y-auto">
          <h3 className="font-semibold mb-4 text-white text-xl">Rules</h3>
          <ul className="space-y-4 text-gray-300">
            <li className="flex gap-2">
              <span>•</span>
              <span>
                Modify the <span className="text-cyan-400">Solidity</span> code
                to change the behavior of the projectile. The projectile will be
                deployed as a smart contract.
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                Projectiles move at a speed of x &quot;pixels&quot; per tick.
                However,
                <span className="font-semibold text-pink-400">
                  {' '}
                  x can never exceed 10 per tick{' '}
                </span>
                (each tile has a resolution of 10x10 pixels).
                <span className="font-semibold text-cyan-400">
                  {' '}
                  There are 28 ticks{' '}
                </span>
                when the round results run. The recommended speed is 5 pixels
                per tick.
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                The size limit of the projectile logic code is{' '}
                <span className="font-semibold text-cyan-400">1000 bytes</span>.
              </span>
            </li>
          </ul>

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
              onChange={value => setSourceCode(value ?? '')}
              onMount={() => {
                const projectile = getComponentValue(
                  Projectile,
                  tower.id as Entity,
                );

                if (projectile) {
                  format(projectile.sourceCode, {
                    parser: 'solidity-parse',
                    plugins: [solidityPlugin],
                  }).then(formattedSourceCode => {
                    setSizeLimit(projectile.sizeLimit);
                    setSourceCode(formattedSourceCode.trim());
                  });
                } else {
                  setSourceCode('');
                }
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
