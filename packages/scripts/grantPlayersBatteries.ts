import { defineWorld } from "@latticexyz/world";
import {
  createWorld,
  getComponentValue,
  runQuery,
  Has,
  Not,
} from "@latticexyz/recs";
import { ContractWrite, transportObserver } from "@latticexyz/common";
import { SyncStep } from "@latticexyz/store-sync";
import { transactionQueue, writeObserver } from "@latticexyz/common/actions";
import { type MUDChain } from "@latticexyz/common/chains";
import { syncToRecs, singletonEntity } from "@latticexyz/store-sync/recs";
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

const grantPlayersBatteries = async () => {
  try {
    console.log("Beginning to grant players batteries...");

    const mudConfig = defineWorld({
      namespace: "app",
      deploy: {
        upgradeableWorldImplementation: true,
      },
      tables: {
        Username: "string", // ID is globalPlayerId
        BatteryDetails: {
          key: ["id"],
          schema: {
            id: "bytes32", // This is the globalPlayerId
            activeBalance: "uint256", // Electricity in watt-hours
            lastRechargeTimestamp: "uint256",
            reserveBalance: "uint256", // Electricity in watt-hours
            stakedBalance: "uint256", // Electricity in watt-hours
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
          name: "app__givePlayerBattery",
          inputs: [
            {
              name: "playerId",
              type: "bytes32",
              internalType: "bytes32",
            },
          ],
          outputs: [],
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

    const { BatteryDetails, SyncProgress, Username } = components;

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

    // Get all Username playerIds
    let playerIds = Array.from(runQuery([Has(Username), Not(BatteryDetails)]));

    // Filter out Zero Hash ID
    playerIds = playerIds.filter((playerId) => playerId !== zeroHash);

    let grantedBatteries = 0;
    // Iterate through playerIds and add grant them batteries
    for (const playerId of playerIds) {
      let retries = 0;
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          await publicClient.simulateContract({
            abi: worldContract.abi,
            account: serverWalletClient.account,
            address: worldContract.address,
            args: [playerId as Hex],
            functionName: "app__givePlayerBattery",
          });

          const tx = await worldContract.write.app__givePlayerBattery([
            playerId as Hex,
          ]);

          const { status } = await waitForTransaction(tx);

          if (status === "success") {
            console.log(`Granted battery for player ID: ${playerId}`);
            success = true;
            grantedBatteries++;
          } else {
            console.error(
              `Transaction reverted for player ID: ${playerId}. Retrying...`
            );
            retries++;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        } catch (error) {
          console.error(
            `Error granting battery for player ID: ${playerId}. Retrying...`,
            error
          );
          retries++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }

      if (!success) {
        console.error(
          `Failed to grant battery for player ID: ${playerId} after ${MAX_RETRIES} retries.`
        );
      }
    }

    console.log(`Finished granting ${grantedBatteries} batteries to players.`);
  } catch (error) {
    console.error("Error fetching players:", error);
  }
};

grantPlayersBatteries();
