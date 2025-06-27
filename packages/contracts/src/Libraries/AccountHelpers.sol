// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { AddressToPlayerId, PlayerCount, PlayerIdToAddress, Username, UsernameTaken } from "../codegen/index.sol";
import { BatteryHelpers } from "./BatteryHelpers.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { MAX_PLAYERS } from "../../constants.sol";

/**
 * @title AccountHelpers
 * @notice This library contains account-related helper functions for other systems
 */
library AccountHelpers {
  function registerPlayer(address playerAddress, string memory username) public returns (bytes32) {
    uint256 playerCount = PlayerCount.get();
    require(playerCount < MAX_PLAYERS, "AccountHelpers: max players reached");
    PlayerCount.set(playerCount + 1);

    // Register the player
    bytes32 globalPlayerId = keccak256(abi.encodePacked(username, playerAddress, block.timestamp));
    AddressToPlayerId.set(EntityHelpers.addressToKey(playerAddress), globalPlayerId);
    PlayerIdToAddress.set(globalPlayerId, playerAddress);

    // Validate username
    require(bytes(username).length > 0, "AccountHelpers: username is empty");
    require(bytes(username).length <= 20, "AccountHelpers: username is too long");
    bytes32 usernameBytes = keccak256(abi.encodePacked(username));
    require(!UsernameTaken.get(usernameBytes), "AccountHelpers: username is taken");

    // Store the username
    Username.set(globalPlayerId, username);
    UsernameTaken.set(usernameBytes, true);

    // Grant player a fully charged battery
    BatteryHelpers.grantBattery(globalPlayerId);

    return globalPlayerId;
  }
}
