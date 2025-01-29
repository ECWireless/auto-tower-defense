// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/* Autogenerated file. Do not edit manually. */

/**
 * @title IGameSystem
 * @author MUD (https://mud.dev) by Lattice (https://lattice.xyz)
 * @dev This interface is automatically generated from the corresponding system contract. Do not edit manually.
 */
interface IGameSystem {
  function app__getGameSystemAddress() external view returns (address);

  function app__createGame(string memory username, bool resetLevel) external returns (bytes32);

  function app__nextTurn(bytes32 gameId) external;
}
