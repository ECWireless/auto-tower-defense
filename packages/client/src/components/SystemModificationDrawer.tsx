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
} from '../components/ui/sheet';
// import SystemList from '@/components/SystemList';
import { useGame } from '../contexts/GameContext';
import { useMUD } from '../MUDContext';
import { type Tower } from '../utils/types';
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
      open={isSystemDrawerOpen}
      onOpenChange={open => setIsSystemDrawerOpen(open)}
    >
      <SheetContent
        side="right"
        className={`w-[90%] md:w-[800px] max-w-none bg-gray-900/95 border-l border-cyan-900/50 p-4 ${isSemiTransparent ? 'opacity-10' : 'opacity-100'}`}
      >
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-cyan-400">
            SYSTEM MODIFICATION
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Rules</h3>
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
                <span className="text-pink-400 font-semibold">
                  {' '}
                  x can never exceed 10 per tick{' '}
                </span>
                (each tile has a resolution of 10x10 pixels).
                <span className="text-cyan-400 font-semibold">
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
                <span className="text-cyan-400 font-semibold">1000 bytes</span>.
              </span>
            </li>
          </ul>

          <div className="flex gap-3 mt-6 mb-6">
            {isPlayer1 && (
              <Button
                variant="outline"
                disabled={isDeploying}
                className="bg-cyan-950/30 border-cyan-500 text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300"
                onClick={onModifyTowerSystem}
              >
                {isDeploying ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Deploy
              </Button>
            )}
            <Button
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-950/50 hover:text-purple-300"
              onMouseEnter={() => setIsSemiTransparent(true)}
              onMouseLeave={() => setIsSemiTransparent(false)}
            >
              View Board
            </Button>
          </div>

          <div className="relative rounded-lg border border-cyan-900/50 bg-black/50">
            {!isPlayer1 && (
              <div className="absolute h-full w-full bg-transparent flex z-1" />
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
