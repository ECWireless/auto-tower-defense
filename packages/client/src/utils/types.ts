import { Entity } from '@latticexyz/recs';
import { Address } from 'viem';

export type AudioSettings = {
  musicEnabled: boolean;
  musicVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
};

export type Castle = {
  id: Entity;
  currentHealth: number;
  maxHealth: number;
  x: number;
  y: number;
};

export type Game = {
  id: Entity;
  actionCount: number;
  endTimestamp: bigint;
  level: bigint;
  player1Address: Address;
  player1Username: string;
  player2Address: Address;
  player2Username: string;
  roundCount: number;
  startTimestamp: bigint;
  turn: Address;
  winner: Address;
};

export type SavedModification = {
  id: Entity;
  author: string;
  bytecode: string;
  description: string;
  name: string;
  size: string;
  sourceCode: string;
  timestamp: bigint;
  useCount: number;
};

export type Tower = {
  id: Entity;
  currentHealth: number;
  maxHealth: number;
  owner: Address;
  projectileLogicAddress: Address;
  projectileTrajectory: { x: number; y: number }[];
  x: number;
  y: number;
};
