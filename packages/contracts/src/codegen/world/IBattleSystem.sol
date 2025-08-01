// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/* Autogenerated file. Do not edit manually. */

/**
 * @title IBattleSystem
 * @author MUD (https://mud.dev) by Lattice (https://lattice.xyz)
 * @dev This interface is automatically generated from the corresponding system contract. Do not edit manually.
 */
interface IBattleSystem {
  function app__createBattle(string memory username, bool resetLevel) external returns (bytes32);

  function app__forfeitRun() external;

  function app__nextTurn(bytes32 battleId) external;

  function app__endStaleBattles(bytes32[] memory battleIds) external;

  function app___endStaleBattle(bytes32 battleId) external;
}
