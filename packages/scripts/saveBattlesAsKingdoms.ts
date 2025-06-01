import { defineWorld } from "@latticexyz/world";
import { createWorld, getComponentValue } from "@latticexyz/recs";
import { ContractWrite, transportObserver } from "@latticexyz/common";
import { SyncStep } from "@latticexyz/store-sync";
import { transactionQueue, writeObserver } from "@latticexyz/common/actions";
import { type MUDChain } from "@latticexyz/common/chains";
import {
  syncToRecs,
  singletonEntity,
  encodeEntity,
} from "@latticexyz/store-sync/recs";
import { Subject } from "rxjs";
import {
  type ClientConfig,
  fallback,
  FallbackTransport,
  http,
  webSocket,
  createPublicClient,
  Hex,
  createWalletClient,
  getContract,
  zeroHash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getNetworkConfig } from "./lib/getNetworkConfig.js";

const MAX_POLL_INTERVALS = 5;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

function createViemClientConfig(chain: MUDChain): {
  readonly chain: MUDChain;
  readonly transport: FallbackTransport;
  readonly pollingInterval: 1000;
} {
  return {
    chain,
    transport: transportObserver(fallback([webSocket(), http()])),
    pollingInterval: 1000,
  } as const satisfies ClientConfig;
}

const saveBattlesAsKingdoms = async () => {
  try {
    console.log("Beginning to copy SavedBattles to SavedKingdoms...");

    const mudConfig = defineWorld({
      namespace: "app",
      deploy: {
        upgradeableWorldImplementation: true,
      },
      enums: {
        ActionType: ["Skip", "Install", "Move", "Modify"],
      },
      tables: {
        BattlesByLevel: {
          key: ["level"],
          schema: {
            level: "uint256",
            battleIds: "bytes32[]",
          },
        },
        TopLevel: {
          schema: {
            level: "uint256",
          },
          key: [],
          codegen: {
            dataStruct: false,
          },
        },
      },
    });

    const world = createWorld();

    // Set up network stuff
    const networkConfig = await getNetworkConfig();

    const clientOptions = createViemClientConfig(networkConfig.chain);
    const publicClient = createPublicClient(clientOptions);

    const write$ = new Subject<ContractWrite>();
    const serverAccount = privateKeyToAccount(networkConfig.privateKey as Hex);
    const serverWalletClient = createWalletClient({
      ...clientOptions,
      account: serverAccount,
    })
      .extend(transactionQueue())
      .extend(writeObserver({ onWrite: (write) => write$.next(write) }));

    const worldContract = getContract({
      address: networkConfig.worldAddress as Hex,
      abi: [
        {
          type: "function",
          name: "app__addSavedKingdomRow",
          inputs: [
            {
              name: "savedBattleId",
              type: "bytes32",
              internalType: "bytes32",
            },
            {
              name: "level",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [
            {
              name: "isAdmin",
              type: "bool",
              internalType: "bool",
            },
          ],
          stateMutability: "nonpayable",
        },
      ],
      client: { public: publicClient, wallet: serverWalletClient },
    });

    const { components, waitForTransaction } = await syncToRecs({
      world,
      config: mudConfig,
      address: networkConfig.worldAddress as Hex,
      publicClient,
      startBlock: BigInt(networkConfig.initialBlockNumber),
      indexerUrl: networkConfig.chain.indexerUrl,
    });

    const { BattlesByLevel, SyncProgress, TopLevel } = components;

    let syncProgress = getComponentValue(SyncProgress, singletonEntity);
    let pollIntervals = 0;

    // Wait until the world is synced
    while (syncProgress?.step !== SyncStep.LIVE) {
      if (pollIntervals >= MAX_POLL_INTERVALS) {
        console.log("Syncing took too long");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      syncProgress = getComponentValue(SyncProgress, singletonEntity);
      pollIntervals++;
    }

    // Get and format all battles by level
    const allBattlesByLevel: { [key: number]: string[] } = { 0: [zeroHash] };
    const topLevel = getComponentValue(TopLevel, singletonEntity)?.level ?? 0n;
    const topLevelAsNumber = Number(topLevel);
    if (topLevelAsNumber > 0) {
      for (let i = 1; i <= topLevelAsNumber; i++) {
        const levelAsEntity = encodeEntity(
          { level: "uint256" },
          { level: BigInt(i) ?? 0n }
        );
        const battlesByLevel = getComponentValue(BattlesByLevel, levelAsEntity);
        if (battlesByLevel) {
          allBattlesByLevel[i] = [
            ...(allBattlesByLevel[i] ?? []),
            ...battlesByLevel.battleIds,
          ];
        }
      }
    }

    // Remap allBattlesByLevel to an array of objects with level and battleId
    const allBattleIds: { level: number; battleId: string }[] = [];
    for (const [level, battleIds] of Object.entries(allBattlesByLevel)) {
      const levelAsNumber = Number(level);
      for (const battleId of battleIds) {
        allBattleIds.push({ level: levelAsNumber, battleId });
      }
    }

    let copiedBattles = 0;
    // Iterate through allBattleIds and add them to the SavedKingdoms table
    for (const savedBattle of allBattleIds) {
      const { battleId, level } = savedBattle;
      let retries = 0;
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          const { result } = await publicClient.simulateContract({
            abi: worldContract.abi,
            account: serverWalletClient.account,
            address: worldContract.address,
            args: [battleId as Hex, BigInt(level)],
            functionName: "app__addSavedKingdomRow",
          });

          if (result === false) {
            success = true; // This battle ID already exists, skip it
            continue; // This battle ID already exists, skip it
          }

          const tx = await worldContract.write.app__addSavedKingdomRow([
            battleId as Hex,
            BigInt(level),
          ]);

          const { status } = await waitForTransaction(tx);

          if (status === "success") {
            console.log(`Added saved kingdom row for battle ID: ${battleId}`);
            success = true;
            copiedBattles++;
          } else {
            console.error(
              `Transaction reverted for battle ID: ${battleId}. Retrying...`
            );
            retries++;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        } catch (error) {
          console.error(
            `Error adding saved kingdom row for battle ID: ${battleId}. Retrying...`,
            error
          );
          retries++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }

      if (!success) {
        console.error(
          `Failed to add saved kingdom row for battle ID: ${battleId} after ${MAX_RETRIES} retries.`
        );
      }
    }

    console.log(
      `Finished copying ${copiedBattles} SavedBattles to SavedKingdoms.`
    );
  } catch (error) {
    console.error("Error fetching saved battles:", error);
  }
};

saveBattlesAsKingdoms();
