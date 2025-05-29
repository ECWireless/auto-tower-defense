// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressToPlayerId, PlayerIdToAddress } from "../codegen/index.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";

contract AccountSystem is System {
  function transferAccount(bytes32 globalPlayerId, address newAddress) public {
    require(PlayerIdToAddress.get(globalPlayerId) == _msgSender(), "AccountSystem: not the account owner");
    require(newAddress != address(0), "AccountSystem: cannot transfer to zero address");

    // Update the account address
    PlayerIdToAddress.set(globalPlayerId, newAddress);
    AddressToPlayerId.set(EntityHelpers.addressToKey(newAddress), globalPlayerId);
  }
}
