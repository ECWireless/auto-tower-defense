// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

uint256 constant BATTERY_STORAGE_LIMIT = 24000; // Watt-hours
uint256 constant DEFAULT_LOGIC_SIZE_LIMIT = 1000;
uint8 constant MAX_ACTIONS = 2;
uint8 constant MAX_CASTLE_HEALTH = 2;
uint8 constant MAX_HEALTH_CANNON = 2;
uint8 constant MAX_HEALTH_WALL = 5;
uint256 constant MAX_PATENT_DESCRIPTION_LENGTH = 256;
uint256 constant MAX_PATENT_NAME_LENGTH = 32;
uint256 constant MAX_PLAYERS = 100;
uint256 constant MAX_ROUNDS = 10;
uint256 constant MAX_TICKS = 28;
bytes32 constant ROB_ID = keccak256("ROB");
