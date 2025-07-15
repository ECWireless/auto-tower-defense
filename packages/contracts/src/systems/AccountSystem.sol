// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressToPlayerId, PlayerIdToAddress, Username, UsernameTaken } from "../codegen/index.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";

contract AccountSystem is System {
  function transferAccount(address newAddress) public {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "AccountSystem: player not registered");
    require(PlayerIdToAddress.get(globalPlayerId) == _msgSender(), "AccountSystem: not the account owner");
    require(newAddress != address(0), "AccountSystem: cannot transfer to zero address");

    // Update the account address
    PlayerIdToAddress.set(globalPlayerId, newAddress);
    AddressToPlayerId.set(EntityHelpers.addressToKey(newAddress), globalPlayerId);
    AddressToPlayerId.set(EntityHelpers.addressToKey(_msgSender()), bytes32(0));
  }

  function updateUsername(string memory newUsername) external {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "AccountSystem: player not registered");

    // Validate username
    require(bytes(newUsername).length > 0, "AccountHelpers: username is empty");
    require(bytes(newUsername).length <= 20, "AccountHelpers: username is too long");

    string memory oldUsername = Username.get(globalPlayerId);
    bytes32 oldUsernameBytes = keccak256(abi.encodePacked(oldUsername));
    bytes32 newUsernameBytes = keccak256(abi.encodePacked(newUsername));
    require(oldUsernameBytes != newUsernameBytes, "AccountSystem: new username is the same as the current one");
    require(!UsernameTaken.get(newUsernameBytes), "AccountSystem: username is already taken");
  
    Username.set(globalPlayerId, newUsername);
    UsernameTaken.set(oldUsernameBytes, false);
    UsernameTaken.set(newUsernameBytes, true);
  }
}
