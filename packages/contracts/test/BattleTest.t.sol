// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { getKeysWithValue } from "@latticexyz/world-modules/src/modules/keyswithvalue/getKeysWithValue.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { CurrentBattle, Battle, BattleData, Level, Username, UsernameTaken, WinStreak } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import { ROB_ID } from "../constants.sol";

contract BattleTest is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);

  bytes constant BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101ef8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60028461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea2646970667358221220b6537f6bf1ca7ac4afafd7133c251d6b0b155b45a5576490f217e48fef76c3fe64736f6c634300081c0033";
  bytes constant AUTHORED_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101ef8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea26469706673582212200f36ce47d179e4a4274b65916ffd491b33285775935ab7ab90dc53e854837fdb64736f6c634300081c0033";

  function _beatTutorial(address player, string memory username) internal {
    vm.startPrank(player);
    bytes32 battleId = IWorld(worldAddress).app__createBattle(username, true);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);

    // Need to go through 1 turn to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);

    vm.warp(block.timestamp + 1 hours);

    battleId = IWorld(worldAddress).app__createBattle(username, false);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 55, 15);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, AUTHORED_BYTECODE, "");

    // Need to go through 3 turns to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);

    vm.stopPrank();
    vm.warp(block.timestamp + 1 hours);
  }

  function _endBattle(address player, bytes32 battleId) internal {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);

    // Need to go through 3 turns to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();
  }

  function testCreateBattle() public {
    vm.prank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);

    bytes32 aliceCurrentBattle = CurrentBattle.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    bytes32 robCurrentBattle = CurrentBattle.get(ROB_ID);

    assertEq(aliceCurrentBattle, battleId);
    assertEq(robCurrentBattle, 0);
  }

  function testUsernameNotTaken() public {
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    string memory username = Username.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(username, "Alice");

    bytes32 usernameBytes = keccak256(abi.encodePacked(username));
    bool taken = UsernameTaken.get(usernameBytes);
    assertTrue(taken);
  }

  function testUsernameCannotChange() public {
    vm.prank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    _endBattle(aliceAddress, battleId);

    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Bob", true);

    string memory username = Username.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(username, "Alice");
  }

  function testRevertMaxPlayers() public {
    uint8 dummyPlayersCount = 100;
    for (uint8 i = 0; i < dummyPlayersCount; i++) {
      vm.prank(address(uint160(i + 1)));
      IWorld(worldAddress).app__createBattle(string(abi.encodePacked("Player", i)), true);
    }

    vm.prank(address(101));
    vm.expectRevert(bytes("AccountHelpers: max players reached"));
    IWorld(worldAddress).app__createBattle(string(abi.encodePacked("Player", uint8(101))), true);
  }

  function testRevertUsernameEmpty() public {
    vm.prank(aliceAddress);
    vm.expectRevert(bytes("AccountHelpers: username is empty"));
    IWorld(worldAddress).app__createBattle("", true);
  }

  function testRevertUsernameTooLong() public {
    string memory longUsername = "ThisUsernameIsWayTooL";
    vm.prank(aliceAddress);
    vm.expectRevert(bytes("AccountHelpers: username is too long"));
    IWorld(worldAddress).app__createBattle(longUsername, true);
  }

  function testRevertUsernameTaken() public {
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    vm.expectRevert(bytes("AccountHelpers: username is taken"));
    vm.prank(bobAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
  }

  function testRevertBattleOngoing() public {
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    vm.expectRevert(bytes("BattleSystem: player1 has an ongoing battle"));
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);
  }

  function testForfeitRun() public {
    vm.startPrank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);

    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(battleId);

    IWorld(worldAddress).app__forfeitRun();

    BattleData memory battle = Battle.get(battleId);
    assertTrue(battle.endTimestamp > 0);
    assertEq(battle.winner, ROB_ID);
  }

  function testRevertForfeitBattleAlreadyEnded() public {
    vm.prank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    _endBattle(aliceAddress, battleId);

    vm.expectRevert(bytes("BattleSystem: battle has ended"));
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__forfeitRun();
  }

  function testNextTurn() public {
    vm.startPrank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();

    BattleData memory battle = Battle.get(battleId);
    assertEq(battle.actionCount, 2);
    assertEq(battle.turn, ROB_ID);
    assertEq(battle.roundCount, 2);
  }

  function testNextRound() public {
    vm.startPrank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);

    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();

    BattleData memory battle = Battle.get(battleId);
    assertEq(battle.actionCount, 2);
    assertEq(battle.turn, EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(battle.roundCount, 2);
  }

  function testWinFirstBattle() public {
    vm.prank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    _endBattle(aliceAddress, battleId);

    uint256 endTimestamp = Battle.get(battleId).endTimestamp;
    assert(endTimestamp > 0);

    bytes32 winnerAddress = Battle.get(battleId).winner;
    assertEq(winnerAddress, EntityHelpers.addressToGlobalPlayerId(aliceAddress));
  }

  function testNextLevel() public {
    vm.prank(bobAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Bob", true);
    _endBattle(bobAddress, battleId);

    vm.prank(aliceAddress);
    battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    battleId = IWorld(worldAddress).app__createBattle("Alice", false);

    uint256 winStreak = WinStreak.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(winStreak, 1);

    uint256 level = Level.get(battleId);
    assertEq(level, 1);
  }

  function testWinSecondBattle() public {
    _beatTutorial(bobAddress, "Bob");
    _beatTutorial(aliceAddress, "Alice");

    vm.startPrank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();

    uint256 endTimestamp = Battle.get(battleId).endTimestamp;
    assert(endTimestamp > 0);

    bytes32 winnerAddress = Battle.get(battleId).winner;
    assertEq(winnerAddress, EntityHelpers.addressToGlobalPlayerId(aliceAddress));

    uint256 winStreak = WinStreak.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(winStreak, 3);
  }

  function testLoseSecondBattle() public {
    _beatTutorial(bobAddress, "Bob");

    _beatTutorial(aliceAddress, "Alice");
    vm.startPrank(aliceAddress);
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", false);
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();

    uint256 endTimestamp = Battle.get(battleId).endTimestamp;
    assert(endTimestamp > 0);

    bytes32 winnerAddress = Battle.get(battleId).winner;
    assertEq(winnerAddress, EntityHelpers.addressToGlobalPlayerId(bobAddress));

    uint256 winStreak = WinStreak.get(EntityHelpers.addressToGlobalPlayerId(aliceAddress));
    assertEq(winStreak, 0);
  }
}
