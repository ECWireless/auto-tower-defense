// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { getKeysWithValue } from "@latticexyz/world-modules/src/modules/keyswithvalue/getKeysWithValue.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { Counter } from "../src/codegen/index.sol";
import { CurrentGame, Game, GameData, Username, UsernameTaken } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";

contract GameTest is MudTest {
  address alice = vm.addr(1);
  address bob = vm.addr(2);
  address rob = address(0);

  function endGame(address player, bytes32 gameId) public {
    vm.startPrank(player);
    IWorld(worldAddress).app__installTower(gameId, true, 35, 35);
    // Need to go through 8 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
  }

  function testCreateGame() public {
    vm.prank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame(rob, "Alice", false);

    bytes32 aliceCurrentGame = CurrentGame.get(EntityHelpers.addressToEntityKey(alice));
    bytes32 robCurrentGame = CurrentGame.get(EntityHelpers.addressToEntityKey(rob));

    assertEq(aliceCurrentGame, gameId);
    assertEq(robCurrentGame, 0);
  }

  function testUsernameNotTaken() public {
    vm.prank(alice);
    IWorld(worldAddress).app__createGame(rob, "Alice", false);

    string memory username = Username.get(EntityHelpers.addressToEntityKey(alice));
    assertEq(username, "Alice");

    bytes32 usernameBytes = keccak256(abi.encodePacked(username));
    bool taken = UsernameTaken.get(usernameBytes);
    assertTrue(taken);
  }

  function testUsernameCannotChange() public {
    vm.prank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame(rob, "Alice", false);
    endGame(alice, gameId);

    vm.prank(alice);
    IWorld(worldAddress).app__createGame(rob, "Bob", false);

    string memory username = Username.get(EntityHelpers.addressToEntityKey(alice));
    assertEq(username, "Alice");
  }

  function testRevertUsernameTaken() public {
    vm.prank(alice);
    IWorld(worldAddress).app__createGame(rob, "Alice", false);

    vm.expectRevert(bytes("GameSystem: username is taken"));
    vm.prank(bob);
    IWorld(worldAddress).app__createGame(rob, "Alice", false);
  }

  function testRevertGameOngoing() public {
    vm.prank(alice);
    IWorld(worldAddress).app__createGame(rob, "Alice", false);

    vm.expectRevert(bytes("GameSystem: player1 has an ongoing game"));
    vm.prank(alice);
    IWorld(worldAddress).app__createGame(alice, "Alice", false);
  }

  function testNextTurn() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame(rob, "Alice", false);

    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();

    GameData memory game = Game.get(gameId);
    assertEq(game.actionCount, 0);
    assertEq(game.turn, rob);
    assertEq(game.roundCount, 1);
  }

  function testNextRound() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame(rob, "Alice", false);

    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();

    GameData memory game = Game.get(gameId);
    assertEq(game.actionCount, 1);
    assertEq(game.turn, alice);
    assertEq(game.roundCount, 2);
  }
}
