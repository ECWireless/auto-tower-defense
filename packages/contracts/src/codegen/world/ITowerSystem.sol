// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/* Autogenerated file. Do not edit manually. */

/**
 * @title ITowerSystem
 * @author MUD (https://mud.dev) by Lattice (https://lattice.xyz)
 * @dev This interface is automatically generated from the corresponding system contract. Do not edit manually.
 */
interface ITowerSystem {
  function app__getTowerSystemAddress() external view returns (address);

  function app__installTower(bytes32 potentialGameId, bool projectile, int16 x, int16 y) external returns (bytes32);

  function app__moveTower(bytes32 potentialGameId, bytes32 towerId, int16 x, int16 y) external returns (bytes32);

  function app__modifyTowerSystem(
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external returns (address projectileLogicAddress);

  function app__saveModification(
    uint256 size,
    bytes memory bytecode,
    string memory description,
    string memory name,
    string memory sourceCode
  ) external returns (bytes32 savedModificationId);

  function app__getContractSize(bytes memory bytecode) external returns (uint256 size);
}
