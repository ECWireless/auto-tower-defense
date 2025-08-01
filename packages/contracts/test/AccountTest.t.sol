// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { AddressToPlayerId, PlayerIdToAddress, Username, UsernameTaken } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";

contract AccountTests is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);

  function testTransferAccount() public {
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
    bytes32 aliceGlobalPlayerId = AddressToPlayerId.get(EntityHelpers.addressToKey(aliceAddress));
    address aliceAccountAddress = PlayerIdToAddress.get(aliceGlobalPlayerId);
    assertEq(aliceAccountAddress, aliceAddress);

    IWorld(worldAddress).app__transferAccount(bobAddress);
    bytes32 bobGlobalPlayerId = AddressToPlayerId.get(EntityHelpers.addressToKey(bobAddress));
    assertEq(bobGlobalPlayerId, aliceGlobalPlayerId, "Bob's account ID should match Alice's old account ID");

    address bobAccountAddress = PlayerIdToAddress.get(bobGlobalPlayerId);
    assertEq(bobAccountAddress, bobAddress, "Bob's account address should now be Bob's address");
    assertEq(
      PlayerIdToAddress.get(aliceGlobalPlayerId),
      bobAddress,
      "Alice's old account should now point to Bob's address"
    );
    assertEq(
      AddressToPlayerId.get(EntityHelpers.addressToKey(aliceAddress)),
      bytes32(0),
      "Alice's address should no longer point to a global player ID"
    );
    vm.stopPrank();
  }

  function testUpdateUsername() public {
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
    string memory newUsername = "AliceNew";

    IWorld(worldAddress).app__updateUsername(newUsername);
    vm.stopPrank();

    bytes32 aliceGlobalPlayerId = AddressToPlayerId.get(EntityHelpers.addressToKey(aliceAddress));
    assertEq(
      Username.get(aliceGlobalPlayerId),
      newUsername,
      "Alice's username should be updated"
    );
    assertTrue(UsernameTaken.get(keccak256(abi.encodePacked(newUsername))), "New username should be marked as taken");
    assertFalse(
      UsernameTaken.get(keccak256(abi.encodePacked("Alice"))),
      "Old username should no longer be marked as taken"
    );
  }

  function testRevertUsernameUpdateNotRegistered() public {
    vm.startPrank(aliceAddress);
    string memory newUsername = "AliceNew";
    vm.expectRevert("AccountSystem: player not registered");
    IWorld(worldAddress).app__updateUsername(newUsername);
    vm.stopPrank();
  }

  function testRevertUsernameUpdateSameName() public {
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
    string memory currentUsername = Username.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    
    vm.expectRevert("AccountSystem: new username is the same as the current one");
    IWorld(worldAddress).app__updateUsername(currentUsername);
    vm.stopPrank();
  }

  function testRevertUsernameUpdateNameTaken() public {
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
    vm.prank(bobAddress);
    IWorld(worldAddress).app__createBattle("Bob", true);

    string memory newUsername = "Bob";
    vm.expectRevert("AccountSystem: username is already taken");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__updateUsername(newUsername);
  }
}
