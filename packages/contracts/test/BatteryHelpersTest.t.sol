// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { BatteryDetails, KingdomsByLevel, SavedKingdom, WinStreak } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import { BATTERY_STORAGE_LIMIT } from "../constants.sol";

contract BatteryHelpersTest is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);
  address janeAddress = vm.addr(3);
  address johnAddress = vm.addr(4);

  bytes constant AUTHORED_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101ef8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea26469706673582212200f36ce47d179e4a4274b65916ffd491b33285775935ab7ab90dc53e854837fdb64736f6c634300081c0033";

  function _winGame(address player, bytes32 gameId) internal {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);

    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
    vm.warp(block.timestamp + 1 hours);
  }

  function _loseRun(address player, string memory username) internal {
    vm.prank(player);
    bytes32 gameId = IWorld(worldAddress).app__createGame(username, true);
    _winGame(player, gameId);

    vm.startPrank(player);
    gameId = IWorld(worldAddress).app__createGame(username, false);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
    vm.warp(block.timestamp + 1 hours);
  }

  function testGrantBattery() public {
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assertEq(lastRechargeTimestamp, 0);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, 0);

    // Create and end game to get a battery, and to give back stake
    vm.prank(aliceAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    _winGame(aliceAddress, gameId);

    lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assert(lastRechargeTimestamp != 0);

    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT);
  }

  function stakeElectricity() public {
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 stakedBalance = BatteryDetails.getStakedBalance(globalPlayerId);
    assertEq(stakedBalance, 0);

    // Create and end game to get a battery, and to stake electricity
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    stakedBalance = BatteryDetails.getStakedBalance(globalPlayerId);
    assertEq(stakedBalance, 8000); // 8kWh
  }

  // Test revert active balance too low to stake electricity
  function testRevertSakeActiveBalanceTooLow() public {
    // Win 1st game as Bob
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    // Lose first run as Alice
    _loseRun(aliceAddress, "Alice");
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 4000);

    // Lose to Bob 4 more times to have less than 8kWh in active balance
    _loseRun(aliceAddress, "Alice");
    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 8000);

    _loseRun(aliceAddress, "Alice");
    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 12000);

    _loseRun(aliceAddress, "Alice");
    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 16000);

    _loseRun(aliceAddress, "Alice");
    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 20000);

    vm.prank(aliceAddress);
    vm.expectRevert("BatteryHelpers: not enough electricity to stake");
    IWorld(worldAddress).app__createGame("Alice", true);
  }

  // Test winStake to fill part of active balance; no author split
  function testWinStake() public {
    // Bob should start a game and create a SavedKingdom
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Have Jane reach top spot, so that Alice's stake does not get returned to active balance later
    vm.prank(janeAddress);
    bytes32 janeGameId = IWorld(worldAddress).app__createGame("Jane", true);
    _winGame(janeAddress, janeGameId);
    vm.startPrank(janeAddress);
    janeGameId = IWorld(worldAddress).app__createGame("Jane", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    vm.stopPrank();

    // Jane should lose her 2nd run stake to Bob's SavedKingdom
    _loseRun(janeAddress, "Jane");
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 2000); // 2kWh
    uint256 bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    uint256 bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 1);

    // Alice should win the stake from Bob's SavedKingdom
    vm.prank(aliceAddress);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    _winGame(aliceAddress, aliceGameId);
    vm.startPrank(aliceAddress);
    aliceGameId = IWorld(worldAddress).app__createGame("Alice", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    // Make sure Alice's staked balance is 25% of Bob's SavedKingdom stake (500Wh)
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 8500); // 8.5kWh

    // Make sure Alice's active balance now has 25% of Bob's SavedKingdom stake (500Wh)
    // 25% because there are no tower authors to reward
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT - 8000 + 500); // 16.5kWh

    // Make sure Alice's reserve balance is 0
    uint256 aliceReserveBalance = BatteryDetails.getReserveBalance(globalAliceId);
    assertEq(aliceReserveBalance, 0);

    // Make sure Bob's SavedKingdom balance is 50% of his stake (1kWh)
    bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 1000); // 1kWh

    // Check wins and losses again
    bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 2);
  }

  // Test winStake to fill all of active balance and part of reserve balance; no author split
  function testWinStakeFillReserve() public {
    // Bob should start a game and create a SavedKingdom
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Have Jane reach top spot, so that Alice's stake does not get returned to active balance later
    vm.prank(janeAddress);
    bytes32 janeGameId = IWorld(worldAddress).app__createGame("Jane", true);
    _winGame(janeAddress, janeGameId);
    vm.startPrank(janeAddress);
    janeGameId = IWorld(worldAddress).app__createGame("Jane", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    vm.stopPrank();

    // Jane should lose her 2nd run stake to Bob's SavedKingdom
    _loseRun(janeAddress, "Jane");
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 2000); // 2kWh
    uint256 bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    uint256 bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 1);

    // John should lose his 16 times so there is 34kWh to Bob's SavedKingdom
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    vm.warp(block.timestamp + 24 hours);
    vm.prank(johnAddress);
    IWorld(worldAddress).app__claimRecharge();
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    vm.warp(block.timestamp + 24 hours);
    vm.prank(johnAddress);
    IWorld(worldAddress).app__claimRecharge();
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    vm.warp(block.timestamp + 24 hours);
    vm.prank(johnAddress);
    IWorld(worldAddress).app__claimRecharge();
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    _loseRun(johnAddress, "John");
    bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 34000); // 34kWh
    bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 17);
    bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 1);

    // Alice should win the stake from Bob's SavedKingdom
    vm.prank(aliceAddress);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    _winGame(aliceAddress, aliceGameId);
    vm.startPrank(aliceAddress);
    aliceGameId = IWorld(worldAddress).app__createGame("Alice", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    // Make sure her staked balance is 25% of Bob's SavedKingdom stake (34kWh)
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 8000 + 8500); // 8kWh + 6.5kWh

    // Make sure her active balance now has 25% of Bob's SavedKingdom stake (34kWh)
    // 25% because there are no tower authors to reward
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT); // 24kWh

    // Make sure her reserve balance is 0
    uint256 aliceReserveBalance = BatteryDetails.getReserveBalance(globalAliceId);
    assertEq(aliceReserveBalance, 500); // 0.5kWh

    // Make sure Bob's SavedKingdom balance is 50% of his stake (34kWh)
    bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 17000); // 17kWh

    // Check wins and losses again
    bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 17);
    bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 2);
  }

  // Test winStake to fill part of active balance, while also splitting with authors
  function testWinStakeAuthorSplit() public {
    // Bob should start a game and create a SavedKingdom
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Jane should lose her stake to Bob's SavedKingdom
    _loseRun(janeAddress, "Jane");
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 2000); // 2kWh
    uint256 bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    uint256 bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 0);

    // Have Jane author a system modification
    vm.prank(janeAddress);
    IWorld(worldAddress).app__saveModification(AUTHORED_BYTECODE, "My description", "Jane's System Modification", "");

    // Alice should win the stake from Bob's SavedKingdom
    vm.prank(aliceAddress);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    _winGame(aliceAddress, aliceGameId);
    vm.startPrank(aliceAddress);
    aliceGameId = IWorld(worldAddress).app__createGame("Alice", false);
    IWorld(worldAddress).app__playerInstallTower(false, 35, 35);
    bytes32 authoredTowerId = IWorld(worldAddress).app__playerInstallTower(true, 45, 15);
    // Go to next round to get more actions
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__playerModifyTowerSystem(authoredTowerId, AUTHORED_BYTECODE, "");
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    // Staked balance should be 0 since Alice is the top player (run is over)
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 0); // 0kWh

    // Make sure her active balance now has 25% of Bob's SavedKingdom stake (500Wh)
    // Another 12.5% should be included because stake is returned to active balance (250Wh)
    // The extra 37.5% will ultimately go to the reserve because of the 8kWh limit of the active balance
    // The final 12.5% should be split with the authors
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT); // 24kWh

    // Make sure her reserve balance is 750Wh (overflow from active balance)
    uint256 aliceReserveBalance = BatteryDetails.getReserveBalance(globalAliceId);
    assertEq(aliceReserveBalance, 500 + 250);

    // Make sure Bob's SavedKingdom balance is 50% of his stake (1kWh)
    bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 1000); // 1kWh

    // Make sure Jane, as the only author, got 12.5% of the stake (250Wh)
    bytes32 globalJaneId = EntityHelpers.globalAddressToKey(janeAddress);
    uint256 janeReserveBalance = BatteryDetails.getReserveBalance(globalJaneId);
    assertEq(janeReserveBalance, 250); // 0.25kWh

    // Check wins and losses again
    bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 1);
  }

  // Test winStake when opponent's SavedKingdom has less than 1.92kWh of electricity
  function testWinStakeLowKingdomBalance() public {
    // Bob should start a game and create a SavedKingdom
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Jane should lose her stake to Bob's SavedKingdom
    _loseRun(janeAddress, "Jane");

    // Jane should win some stake back in 2nd run
    vm.prank(janeAddress);
    bytes32 janeGameId = IWorld(worldAddress).app__createGame("Jane", true);
    _winGame(janeAddress, janeGameId);
    vm.startPrank(janeAddress);
    janeGameId = IWorld(worldAddress).app__createGame("Jane", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    IWorld(worldAddress).app__nextTurn(janeGameId);
    vm.stopPrank();

    // Alice should win the stake from Bob's SavedKingdom
    vm.prank(aliceAddress);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    _winGame(aliceAddress, aliceGameId);
    vm.startPrank(aliceAddress);
    aliceGameId = IWorld(worldAddress).app__createGame("Alice", false);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);
    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    // Staked balance should be 8kWh since Bob's SavedKingdom has less than 1.92kWh
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 8000); // 8kWh

    // Make sure active balance is storage limit minus 8kWh (16kWh)
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT - 8000); // 16kWh

    // Make sure her reserve balance is 0
    uint256 aliceReserveBalance = BatteryDetails.getReserveBalance(globalAliceId);
    assertEq(aliceReserveBalance, 0);

    // Make sure Bob's SavedKingdom balance still has 100% of his stake (1kWh)
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 1000); // 1kWh
  }

  // Test loseStake to increase opponent SavedKingdom balance and opponent reserve balance; no author split
  function testLoseStake() public {
    // Bob should start a game and create a SavedKingdom
    vm.prank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    _winGame(bobAddress, bobGameId);

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Alice should lose her stake to Bob's SavedKingdom
    _loseRun(aliceAddress, "Alice");

    // Make sure that Alice's stakedBalance is 0kWh
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 0); // 0kWh
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT - 8000 + 4000); // 20kWh

    // Make sure 25% of Alice's stake goes to Bob's SavedKingdom balance (2kWh)
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 2000); // 2kWh

    // Make sure 25% of Alice's stake goes to Bob's reserve balance (2kWh)
    // It would be 12.5% if there were authors
    bytes32 globalBobId = EntityHelpers.globalAddressToKey(bobAddress);
    uint256 bobReserveBalance = BatteryDetails.getReserveBalance(globalBobId);
    assertEq(bobReserveBalance, 2000); // 2kWh

    // Make sure wins and losses are correct
    uint256 bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);
    assertEq(bobSavedKingdomWins, 1);
    uint256 bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 0);
  }

  // Test loseStake to increase opponent SavedKingdom balance and part of reserve balance; while also splitting with authors
  function testLoseStakeAuthorSplit() public {
    // Have Jane save a system modification
    vm.prank(janeAddress);
    IWorld(worldAddress).app__saveModification(AUTHORED_BYTECODE, "My description", "Jane's System Modification", "");

    // Bob should start a game and create a SavedKingdom using Jane's system modification
    vm.startPrank(bobAddress);
    bytes32 bobGameId = IWorld(worldAddress).app__createGame("Bob", true);
    bytes32 authoredTowerId = IWorld(worldAddress).app__playerInstallTower(true, 45, 15);
    IWorld(worldAddress).app__playerModifyTowerSystem(authoredTowerId, AUTHORED_BYTECODE, "");
    IWorld(worldAddress).app__nextTurn(bobGameId);
    IWorld(worldAddress).app__nextTurn(bobGameId);
    IWorld(worldAddress).app__nextTurn(bobGameId);
    IWorld(worldAddress).app__nextTurn(bobGameId);
    vm.stopPrank();

    bytes32[] memory kingdoms = KingdomsByLevel.get(1);
    bytes32 bobSavedKingdomId = kingdoms[0];
    address bobSavedKingdomAuthor = SavedKingdom.getAuthor(bobSavedKingdomId);
    assertEq(bobSavedKingdomAuthor, bobAddress);

    // Alice should lose her stake to Bob's SavedKingdom
    _loseRun(aliceAddress, "Alice");

    // Make sure that Alice's stakedBalance is 0kWh
    bytes32 globalAliceId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 aliceStakedBalance = BatteryDetails.getStakedBalance(globalAliceId);
    assertEq(aliceStakedBalance, 0); // 0kWh
    uint256 aliceActiveBalance = BatteryDetails.getActiveBalance(globalAliceId);
    assertEq(aliceActiveBalance, BATTERY_STORAGE_LIMIT - 8000 + 4000); // 20kWh

    // Make sure 25% of Alice's stake goes to Bob's SavedKingdom balance (2kWh)
    uint256 bobSavedKingdomElectricityBalance = SavedKingdom.getElectricityBalance(bobSavedKingdomId);
    assertEq(bobSavedKingdomElectricityBalance, 2000); // 2kWh
    uint256 bobSavedKingdomWins = SavedKingdom.getWins(bobSavedKingdomId);

    // Make sure 12.5% of Alice's stake goes to Bob's reserve balance (1kWh)
    bytes32 globalBobId = EntityHelpers.globalAddressToKey(bobAddress);
    uint256 bobReserveBalance = BatteryDetails.getReserveBalance(globalBobId);
    assertEq(bobReserveBalance, 1000); // 1kWh

    // Make sure 12.5% of Alice's stake goes to Jane's reserve balance (1kWh)
    bytes32 globalJaneId = EntityHelpers.globalAddressToKey(janeAddress);
    uint256 janeReserveBalance = BatteryDetails.getReserveBalance(globalJaneId);
    assertEq(janeReserveBalance, 1000); // 1kWh

    // Make sure wins and losses are correct
    assertEq(bobSavedKingdomWins, 1);
    uint256 bobSavedKingdomLosses = SavedKingdom.getLosses(bobSavedKingdomId);
    assertEq(bobSavedKingdomLosses, 0);
  }
}
