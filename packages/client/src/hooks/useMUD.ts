import { useComponentValue } from '@latticexyz/react';
import { Entity } from '@latticexyz/recs';
import { useSync } from '@latticexyz/store-sync/react';
import { encodeEntity } from '@latticexyz/store-sync/recs';
import { useMemo } from 'react';
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  http,
} from 'viem';
import { useAccount } from 'wagmi';

import { components } from '@/mud/recs';
import { useWorldContract } from '@/mud/useWorldContract';
import { SELL_EMITTER_TX_KEY } from '@/utils/constants';
import { getGameChain } from '@/utils/helpers';

const getContractError = (error: BaseError): string => {
  const revertError = error.walk(
    e => e instanceof ContractFunctionRevertedError,
  );
  if (revertError instanceof ContractFunctionRevertedError) {
    const args = revertError.data?.args ?? [];
    return (args[0] as string) ?? 'An error occurred calling the contract.';
  }
  return 'An error occurred calling the contract.';
};

export const useMUD = (): {
  components: typeof components;
  network: { globalPlayerId: Entity | undefined };
  systemCalls: {
    buyElectricity: (electricityAmount: bigint) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    claimRecharge: () => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    createGame: (
      username: string,
      resetLevel: boolean,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    deleteModification: (savedModificationId: string) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    editModification: (
      savedModificationId: string,
      description: string,
      name: string,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    forfeitRun: () => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    getContractSize: (bytecode: string) => Promise<bigint | false>;
    installTower: (
      projectile: boolean,
      x: number,
      y: number,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    modifyTowerSystem: (
      towerId: string,
      bytecode: string,
      sourceCode: string,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    moveTower: (
      towerId: string,
      x: number,
      y: number,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    nextTurn: (gameId: string) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    saveModification: (
      bytecode: string,
      description: string,
      name: string,
      sourceCode: string,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    sellElectricity: (
      electricityAmount: bigint,
    ) => Promise<{ error: string | undefined; success: boolean }>;
    sellElectricityThroughRelay: (
      electricityAmount: bigint,
      originChainId: number,
      destinationChainId: number,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
      txHash?: `0x${string}`;
    }>;
  };
} => {
  const { address: playerAddress } = useAccount();
  const sync = useSync();
  const worldContract = useWorldContract();

  const globalPlayerId = (useComponentValue(
    components.AddressToPlayerId,
    encodeEntity(
      {
        address: 'address',
      },
      {
        address: playerAddress as `0x${string}`,
      },
    ),
  )?.value ?? undefined) as Entity | undefined;

  const publicClient = useMemo(
    () =>
      createPublicClient({
        batch: { multicall: false },
        chain: getGameChain(),
        transport: http(),
      }),
    [],
  );

  const buyElectricity = async (electricityAmount: bigint) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [electricityAmount],
        functionName: 'app__buyElectricity',
      });

      const tx = await worldContract.write.app__buyElectricity([
        electricityAmount,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to buy electricity.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const claimRecharge = async () => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [],
        functionName: 'app__claimRecharge',
      });

      const tx = await worldContract.write.app__claimRecharge();
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to claim recharge.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const createGame = async (username: string, resetLevel: boolean) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [username, resetLevel],
        functionName: 'app__createGame',
      });

      const tx = await worldContract.write.app__createGame(
        [username, resetLevel],
        // Because the system function uses prevrandao and a loop, automatic gas estimation can be wrong
        {
          gas: BigInt('10000000'),
        },
      );
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to create game.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const deleteModification = async (savedModificationId: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [savedModificationId as `0x${string}`],
        functionName: 'app__deleteModification',
      });

      const tx = await worldContract.write.app__deleteModification([
        savedModificationId as `0x${string}`,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to delete system.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const editModification = async (
    savedModificationId: string,
    description: string,
    name: string,
  ) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [savedModificationId as `0x${string}`, description, name],
        functionName: 'app__editModification',
      });

      const tx = await worldContract.write.app__editModification([
        savedModificationId as `0x${string}`,
        description,
        name,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to edit system.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const forfeitRun = async () => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [],
        functionName: 'app__forfeitRun',
      });

      const tx = await worldContract.write.app__forfeitRun();
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to forfeit run.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const getContractSize = async (bytecode: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      const simulatedTx = await publicClient.simulateContract({
        abi: worldContract.abi,
        address: worldContract.address,
        args: [bytecode as `0x${string}`],
        functionName: 'app__getContractSize',
      });

      const sizeLimit = simulatedTx.result;
      return sizeLimit;
    } catch (error) {
      return false;
    }
  };

  const installTower = async (projectile: boolean, x: number, y: number) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [projectile, x, y],
        functionName: 'app__playerInstallTower',
      });

      const tx = await worldContract.write.app__playerInstallTower([
        projectile,
        x,
        y,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to install tower.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const modifyTowerSystem = async (
    towerId: string,
    bytecode: string,
    sourceCode: string,
  ) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [towerId as `0x${string}`, bytecode as `0x${string}`, sourceCode],
        functionName: 'app__playerModifyTowerSystem',
      });

      const tx = await worldContract.write.app__playerModifyTowerSystem([
        towerId as `0x${string}`,
        bytecode as `0x${string}`,
        sourceCode,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to modify tower system.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const moveTower = async (towerId: string, x: number, y: number) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [towerId as `0x${string}`, x, y],
        functionName: 'app__playerMoveTower',
      });

      const tx = await worldContract.write.app__playerMoveTower([
        towerId as `0x${string}`,
        x,
        y,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to move tower.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const nextTurn = async (gameId: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [gameId as `0x${string}`],
        functionName: 'app__nextTurn',
      });

      const tx = await worldContract.write.app__nextTurn([
        gameId as `0x${string}`,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to change turn.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const saveModification = async (
    bytecode: string,
    description: string,
    name: string,
    sourceCode: string,
  ) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [bytecode as `0x${string}`, description, name, sourceCode],
        functionName: 'app__saveModification',
      });

      const tx = await worldContract.write.app__saveModification([
        bytecode as `0x${string}`,
        description,
        name,
        sourceCode,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to save modification.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const sellElectricity = async (electricityAmount: bigint) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [electricityAmount],
        functionName: 'app__sellElectricity',
      });

      const tx = await worldContract.write.app__sellElectricity([
        electricityAmount,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to sell electricity.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const sellElectricityThroughRelay = async (
    electricityAmount: bigint,
    originChainId: number,
    destinationChainId: number,
  ) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [electricityAmount],
        functionName: 'app__sellElectricityThroughRelay',
      });

      const tx = await worldContract.write.app__sellElectricityThroughRelay([
        electricityAmount,
      ]);
      // Store the tx now so SolarFarmDialog doesn't have to wait for the tx to be confirmed
      localStorage.setItem(
        SELL_EMITTER_TX_KEY,
        JSON.stringify({
          destinationChainId,
          originChainId,
          timestamp: Date.now(),
          txHash: tx,
        }),
      );
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success
          ? undefined
          : 'Failed to sell electricity through relay.',
        success,
        txHash: tx,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const network = {
    globalPlayerId,
  };

  const systemCalls = {
    buyElectricity,
    claimRecharge,
    createGame,
    deleteModification,
    editModification,
    forfeitRun,
    getContractSize,
    installTower,
    modifyTowerSystem,
    moveTower,
    nextTurn,
    saveModification,
    sellElectricity,
    sellElectricityThroughRelay,
  };
  return { components, network, systemCalls };
};
