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
import { UserOperationExecutionError } from 'viem/account-abstraction';
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

  if (error instanceof UserOperationExecutionError) {
    const errorMessage = error.cause.shortMessage;
    if (
      errorMessage.includes('sufficient funds') ||
      errorMessage.includes('UserOperation reverted during simulation')
    ) {
      return 'Insufficient funds. Please top up your account.';
    }
    return (
      error.cause.shortMessage ?? 'An error occurred calling the contract.'
    );
  }
  return 'An error occurred calling the contract.';
};

export const useMUD = (): {
  components: typeof components;
  network: { globalPlayerId: Entity | undefined };
  systemCalls: {
    amendPatent: (
      patentId: string,
      description: string,
      name: string,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    buyElectricity: (electricityAmount: bigint) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    claimRecharge: () => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    completeTutorialStep: (step: number) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    createBattle: (
      username: string,
      resetLevel: boolean,
    ) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    disclaimPatent: (patentId: string) => Promise<{
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
    nextTurn: (battleId: string) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    registerPatent: (
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
    transferAccount: (newOwner: `0x${string}`) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    undoAction: () => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
    updateUsername: (newUsername: string) => Promise<{
      error: string | undefined;
      success: boolean;
    }>;
  };
} => {
  const { address: playerAddress } = useAccount();
  const sync = useSync();
  const worldContract = useWorldContract();

  const globalPlayerId = (useComponentValue(
    components.AddressToPlayerId,
    playerAddress
      ? encodeEntity(
          {
            address: 'address',
          },
          {
            address: playerAddress as `0x${string}`,
          },
        )
      : undefined,
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

  const amendPatent = async (
    patentId: string,
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
        args: [patentId as `0x${string}`, description, name],
        functionName: 'app__amendPatent',
      });

      const tx = await worldContract.write.app__amendPatent([
        patentId as `0x${string}`,
        description,
        name,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to amend patent.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

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

  const completeTutorialStep = async (step: number) => {
    try {
      type StepFunctionName =
        | 'app__completeTutorialStep1'
        | 'app__completeTutorialStep2'
        | 'app__completeTutorialStep3'
        | 'app__completeTutorialStep4'
        | 'app__completeTutorialStep5';

      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }
      const stepFunctions: Record<number, string> = {
        1: 'app__completeTutorialStep1',
        2: 'app__completeTutorialStep2',
        3: 'app__completeTutorialStep3',
        4: 'app__completeTutorialStep4',
        5: 'app__completeTutorialStep5',
      };
      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [],
        functionName: stepFunctions[step] as StepFunctionName,
      });
      const tx =
        await worldContract.write[stepFunctions[step] as StepFunctionName]();
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';
      return {
        error: success
          ? undefined
          : `Failed to complete tutorial step ${step}.`,
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const createBattle = async (username: string, resetLevel: boolean) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [username, resetLevel],
        functionName: 'app__createBattle',
      });

      const tx = await worldContract.write.app__createBattle(
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
        error: success ? undefined : 'Failed to create battle.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const disclaimPatent = async (patentId: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [patentId as `0x${string}`],
        functionName: 'app__disclaimPatent',
      });

      const tx = await worldContract.write.app__disclaimPatent([
        patentId as `0x${string}`,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to disclaim patent.',
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

  const nextTurn = async (battleId: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [battleId as `0x${string}`],
        functionName: 'app__nextTurn',
      });

      const tx = await worldContract.write.app__nextTurn([
        battleId as `0x${string}`,
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

  const registerPatent = async (
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
        functionName: 'app__registerPatent',
      });

      const tx = await worldContract.write.app__registerPatent([
        bytecode as `0x${string}`,
        description,
        name,
        sourceCode,
      ]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to register patent.',
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

  const transferAccount = async (newOwner: `0x${string}`) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [newOwner],
        functionName: 'app__transferAccount',
      });

      const tx = await worldContract.write.app__transferAccount([newOwner]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to transfer account.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const undoAction = async () => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [],
        functionName: 'app__undoAction',
      });

      const tx = await worldContract.write.app__undoAction();
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to undo action.',
        success,
      };
    } catch (error) {
      return {
        error: getContractError(error as BaseError),
        success: false,
      };
    }
  };

  const updateUsername = async (newUsername: string) => {
    try {
      if (!(worldContract && sync.data)) {
        throw new Error('World contract or sync data not found');
      }

      await publicClient.simulateContract({
        abi: worldContract.abi,
        account: playerAddress,
        address: worldContract.address,
        args: [newUsername],
        functionName: 'app__updateUsername',
      });

      const tx = await worldContract.write.app__updateUsername([newUsername]);
      const txResult = await sync.data.waitForTransaction(tx);
      const { status } = txResult;
      const success = status === 'success';

      return {
        error: success ? undefined : 'Failed to update username.',
        success,
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
    amendPatent,
    buyElectricity,
    claimRecharge,
    completeTutorialStep,
    createBattle,
    disclaimPatent,
    forfeitRun,
    getContractSize,
    installTower,
    modifyTowerSystem,
    moveTower,
    nextTurn,
    registerPatent,
    sellElectricity,
    sellElectricityThroughRelay,
    transferAccount,
    undoAction,
    updateUsername,
  };
  return { components, network, systemCalls };
};
