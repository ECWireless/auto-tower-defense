import { garnet, pyrope } from '@latticexyz/common/chains';
import { Chain } from 'viem';
import { anvil, base, baseSepolia, redstone } from 'viem/chains';

import { CHAIN_ID, SUPPORTED_CHAINS, WORLD_ADDRESS } from './constants';

export const shortenAddress = (address: string, length = 4): string =>
  `${address.slice(0, length + 2)}...${address.slice(-length)}`;

export const formatDateFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTimeFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format duration in minutes to readable string (e.g., "1h 15m" or "45m")
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
};

export const formatWattHours = (wattHours: bigint): string => {
  if (wattHours >= BigInt(1_000_000_000)) {
    return `${(Number(wattHours) / 1_000_000_000).toFixed(2)} GWh`;
  }
  if (wattHours >= BigInt(1_000_000)) {
    return `${(Number(wattHours) / 1_000_000).toFixed(2)} MWh`;
  }
  if (wattHours >= BigInt(1_000)) {
    return `${(Number(wattHours) / 1_000).toFixed(2)} kWh`;
  }
  return `${wattHours.toString()} Wh`;
};

export const getElapsedTime = (
  startTimestamp: bigint,
  endTimestamp: bigint,
): string => {
  const startTime = new Date(Number(startTimestamp) * 1000);
  const endTime = new Date(Number(endTimestamp) * 1000);
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  return formatDuration(elapsedMinutes);
};

export const getBatteryColor = (charge: number): string => {
  if (charge >= 66) return 'text-green-500';
  if (charge >= 33) return 'text-yellow-500';
  return 'text-red-500';
};

export const getWorldAddress = (): `0x${string}` => {
  if (!WORLD_ADDRESS) {
    throw new Error(
      'No world address configured. Is the world still deploying?',
    );
  }
  return WORLD_ADDRESS;
};

export const getGameChain = (): Chain => {
  const chain = SUPPORTED_CHAINS.find(c => c.id === CHAIN_ID);
  if (!chain) {
    throw new Error(`No chain configured for chain ID ${CHAIN_ID}.`);
  }
  return chain;
};

export const getChain = (chainId: number | undefined): Chain | undefined => {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  if (!chain) {
    // eslint-disable-next-line no-console
    console.warn(`Chain with id ${chainId} cannot be used for this game.`);
  }
  return chain;
};

export const getChainLogo = (chainId?: number): string => {
  switch (chainId) {
    case anvil.id:
      return '/assets/logos/anvil.png';
    case base.id:
      return '/assets/logos/base.png';
    case baseSepolia.id:
      return '/assets/logos/base.png';
    case redstone.id:
      return '/assets/logos/redstone.png';
    case pyrope.id:
      return '/assets/logos/redstone.png';
    case garnet.id:
      return '/assets/logos/redstone.png';
    default:
      return '';
  }
};
