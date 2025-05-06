// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { CurrentGame, Game, GamesByLevel, Level, KingdomsByLevel, SavedKingdom, SavedKingdomData, WinStreak } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import "forge-std/console.sol";

contract AdminTest is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);

  function endGame(address player, bytes32 gameId) public {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);

    // Need to go through 8 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
  }

  function testAddSavedKingdomRow() public {
    // create at least 1 SavedGame
    vm.prank(aliceAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    endGame(aliceAddress, gameId);

    // Get the savedGameId from GamesByLevel
    bytes32[] memory savedGameIds = GamesByLevel.get(1);
    assert(savedGameIds.length > 0);
    bytes32 savedGameId = savedGameIds[0];
    assert(savedGameId != bytes32(0));

    // Add savedGameId to SavedKingdom table
    uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
    address admin = vm.addr(adminPrivateKey);
    vm.prank(admin);
    IWorld(worldAddress).app__addSavedKingdomRow(savedGameId, 1);

    // Check if the savedGameId exists in KingdomsByLevel
    bytes32[] memory savedKingdomIds = KingdomsByLevel.get(1);
    assert(savedKingdomIds.length > 0);
    bytes32 savedKingdomId = savedKingdomIds[0];

    // Check if the savedGameId exists in SavedKingdom
    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    assert(savedKingdom.author != address(0));

    // Make sure savedKingdomId has a level
    uint256 level = Level.get(savedKingdomId);
    assert(level == 1);
  }

  // Revert if not admin
  function testRevertAddSavedKingdomRowNotAdmin() public {
    // create at least 1 SavedGame
    vm.prank(bobAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Bob", true);
    endGame(bobAddress, gameId);

    // Get the savedGameId from GamesByLevel
    bytes32[] memory savedGameIds = GamesByLevel.get(1);
    assert(savedGameIds.length > 0);
    bytes32 savedGameId = savedGameIds[0];
    assert(savedGameId != bytes32(0));

    // Should revert if not admin
    vm.prank(aliceAddress);
    vm.expectRevert();
    IWorld(worldAddress).app__addSavedKingdomRow(savedGameId, 1);
  }

  // Copying should be skipped if the savedKingdomId already exists
  function testAddSavedKingdomRowDuplicateId() public {
    // create at least 1 SavedGame
    vm.prank(aliceAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    endGame(aliceAddress, gameId);

    // Get the savedGameId from GamesByLevel
    bytes32[] memory savedGameIds = GamesByLevel.get(1);
    assert(savedGameIds.length > 0);
    bytes32 savedGameId = savedGameIds[0];
    assert(savedGameId != bytes32(0));

    // Add savedGameId to SavedKingdom table
    uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
    address admin = vm.addr(adminPrivateKey);
    vm.prank(admin);
    bool copied = IWorld(worldAddress).app__addSavedKingdomRow(savedGameId, 1);
    assert(copied == true);

    // Try to add the same savedGameId again
    vm.prank(admin);
    copied = IWorld(worldAddress).app__addSavedKingdomRow(savedGameId, 1);
    assert(copied == false);
  }
}
