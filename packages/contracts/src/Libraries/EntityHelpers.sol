// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { AddressToPlayerId } from "../codegen/index.sol";

/**
 * @title EntityHelpers
 * @notice This library contains helper functions for converting certain data types into bytes32 entities
 */
library EntityHelpers {
  // Converts an address to a bytes32 entity ID
  function addressToKey(address addr) public pure returns (bytes32) {
    return bytes32(uint256(uint160(addr)));
  }

  // ID of the player entity outside of a specific game
  function addressToGlobalPlayerId(address addr) public view returns (bytes32) {
    return AddressToPlayerId.get(addressToKey(addr));
  }

  // ID of the player entity within a specific game
  function globalToLocalPlayerId(bytes32 globalPlayerId, bytes32 gameId) public pure returns (bytes32) {
    return keccak256(abi.encode(globalPlayerId, gameId));
  }

  function positionToEntityKey(bytes32 gameId, int16 x, int16 y) public pure returns (bytes32) {
    return keccak256(abi.encode(gameId, x, y));
  }
}
