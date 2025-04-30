// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Action, BatteryDetails, BatteryDetailsData, ExpenseReceipt, ExpenseReceiptData, KingdomsByLevel, LoadedKingdomActions, Projectile, RevenueReceipt, RevenueReceiptData, SavedGame, SavedModification, SavedKingdom, SavedKingdomData, WinStreak } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { BATTERY_STORAGE_LIMIT } from "../../constants.sol";
import { EntityHelpers } from "./EntityHelpers.sol";

/**
 * @title BatteryHelpers
 * @notice This library contains battery-related helper functions for other systems
 */
library BatteryHelpers {
  /**
   * Gives fully charged active battery and empty reserve to any new player
   * Called by validateCreateGame in GameHelpers when a new username is registered
   * @param globalPlayerId The global ID of the player
   */
  function grantBattery(bytes32 globalPlayerId) public {
    BatteryDetailsData memory batteryDetails = BatteryDetails.get(globalPlayerId);
    require(batteryDetails.lastRechargeTimestamp == 0, "BatteryHelpers: player already has a battery");

    // Set active and reserve balance to BATTERY_STORAGE_LIMIT
    BatteryDetailsData memory newBatteryDetails = BatteryDetailsData({
      activeBalance: BATTERY_STORAGE_LIMIT,
      lastRechargeTimestamp: block.timestamp,
      reserveBalance: 0,
      stakedBalance: 0
    });
    BatteryDetails.set(globalPlayerId, newBatteryDetails);
  }

  /**
   * Stakes 8kWh of electricity when a new battle run is initiated
   * Called by initializeGame in GameHelpers
   * @param globalPlayerId The global ID of the player
   */
  function stakeElectricity(bytes32 globalPlayerId) public {
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    uint256 totalElectricity = activeBalance + reserveBalance;
    require(totalElectricity >= 8000, "BatteryHelpers: not enough electricity to stake");

    // If activeBalance is less than 8kWh, fill it with reserveBalance up to 8kWh
    if (activeBalance < 8000) {
      uint256 reserveToFill = 8000 - activeBalance;
      activeBalance = 8000;
      reserveBalance -= reserveToFill;
    } else {
      // If activeBalance is already 8kWh or more, just use it
      activeBalance -= 8000;
    }

    // Move 8kWh from activeBalance to stakedBalance
    BatteryDetails.setActiveBalance(globalPlayerId, activeBalance);
    BatteryDetails.setReserveBalance(globalPlayerId, reserveBalance);
    BatteryDetails.setStakedBalance(globalPlayerId, 8000);
  }

  /**
   * Distributes the winning pot when a player wins a battle
   * Called by endGame in ProjectileHelpers when player 1 wins a battle
   * @param gameId The ID of the game
   * @param globalPlayer1Id The global ID of the winning player (player 1)
   */
  function winStake(bytes32 gameId, bytes32 globalPlayer1Id) public {
    // Get SaveKingdomId from LoadedKingdomActions using gameId; then get electricitybalance from SavedKingdom
    bytes32 savedKingdomId = LoadedKingdomActions.getSavedKingdomId(gameId);
    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    SavedKingdom.setLosses(savedKingdomId, savedKingdom.losses + 1);

    // If electricitybalance is less than 1.92kWh, do nothing; this balance is too small to be meaningful
    if (savedKingdom.electricityBalance < 1920) {
      _processPotentialStakeReturn(globalPlayer1Id);
      return;
    }

    // Define winningPot as 50% of electricitybalance
    uint256 winningPot = savedKingdom.electricityBalance / 2;
    SavedKingdom.setElectricityBalance(savedKingdomId, savedKingdom.electricityBalance - winningPot);

    // Move 50% of winningPot to stakedBalance
    uint256 stakedEarnings = winningPot / 2;
    uint256 stakedBalance = BatteryDetails.getStakedBalance(globalPlayer1Id);
    BatteryDetails.setStakedBalance(globalPlayer1Id, stakedBalance + stakedEarnings);
    winningPot -= stakedEarnings;

    // Move 50% of remaining winningPot to activeBalance
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayer1Id);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayer1Id);
    uint256 activeBalanceEarnings = winningPot / 2;
    activeBalance += activeBalanceEarnings;

    // Get all the towers used in the game
    address[] memory allAuthors = _getAllKingdomTowerAuthors(gameId, true);

    // If there are no authors, give the player the rest of the winningPot
    if (allAuthors.length == 0) {
      activeBalance += activeBalanceEarnings;
    }

    // If activeBalance == BATTERY_STORAGE_LIMIT, then reserveBalance is filled
    if (activeBalance > BATTERY_STORAGE_LIMIT) {
      reserveBalance += activeBalance - BATTERY_STORAGE_LIMIT;
      activeBalance = BATTERY_STORAGE_LIMIT;
    }
    BatteryDetails.setActiveBalance(globalPlayer1Id, activeBalance);
    BatteryDetails.setReserveBalance(globalPlayer1Id, reserveBalance);
    winningPot -= activeBalanceEarnings;

    _processPotentialStakeReturn(globalPlayer1Id);

    // Move remaining winningPot to authors (their reserveBalance) of all the towers used by winner (player 1)
    if (allAuthors.length == 0) return;

    uint256 authorEarnings = winningPot / allAuthors.length;
    for (uint256 i = 0; i < allAuthors.length; i++) {
      bytes32 authorId = EntityHelpers.globalAddressToKey(allAuthors[i]);
      uint256 authorReserveBalance = BatteryDetails.getReserveBalance(authorId);
      authorReserveBalance += authorEarnings;
      BatteryDetails.setReserveBalance(authorId, authorReserveBalance);
    }

    ExpenseReceiptData memory expenseReceipt = ExpenseReceiptData({
      amount: winningPot,
      playerAddress: SavedKingdom.getAuthor(savedKingdomId)
    });
    ExpenseReceipt.set(savedKingdomId, block.timestamp, expenseReceipt);
  }

  /**
   * Distributes the winning pot when a player loses a battle
   * Called by endGame in ProjectileHelpers when player 1 loses a battle
   * @param gameId The ID of the game
   * @param globalPlayer1Id The global ID of the losing player (player 1)
   */
  function loseStake(bytes32 gameId, bytes32 globalPlayer1Id) public {
    bytes32 savedKingdomId = LoadedKingdomActions.getSavedKingdomId(gameId);
    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    SavedKingdom.setWins(savedKingdomId, savedKingdom.wins + 1);

    // Put 50% of stakedBalance in winningPot, and the other 50% is unstaked to activeBalance
    // Any overflow goes to reserveBalance
    uint256 stakedBalance = BatteryDetails.getStakedBalance(globalPlayer1Id);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayer1Id);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayer1Id);

    if (stakedBalance < 1920) {
      return;
    }

    // Define winningPot as 50% of stakedBalance
    uint256 winningPot = stakedBalance / 2;
    uint256 unstakedBalance = stakedBalance - winningPot;

    activeBalance += unstakedBalance;
    if (activeBalance > BATTERY_STORAGE_LIMIT) {
      reserveBalance += activeBalance - BATTERY_STORAGE_LIMIT;
      activeBalance = BATTERY_STORAGE_LIMIT;
    }
    BatteryDetails.setActiveBalance(globalPlayer1Id, activeBalance);
    BatteryDetails.setReserveBalance(globalPlayer1Id, reserveBalance);
    BatteryDetails.setStakedBalance(globalPlayer1Id, 0);

    // Put 50% of winningPot in opponent's SavedKingdom electricityBalance
    uint256 opponentSavedKingdomEarnings = winningPot / 2;
    savedKingdom.electricityBalance += opponentSavedKingdomEarnings;
    SavedKingdom.setElectricityBalance(savedKingdomId, savedKingdom.electricityBalance);
    winningPot -= opponentSavedKingdomEarnings;

    // Put 50% of remaining winningPot in opponent's reserveBalance
    uint256 opponentReserveEarnings = winningPot / 2;

    // Get all the towers used in the game
    address[] memory allAuthors = _getAllKingdomTowerAuthors(gameId, false);

    // If there are no authors, give the player2Address the rest of the winningPot
    if (allAuthors.length == 0) {
      opponentReserveEarnings += opponentReserveEarnings;
    }
    address player2Address = SavedKingdom.getAuthor(savedKingdomId);
    bytes32 globalPlayer2Id = EntityHelpers.globalAddressToKey(player2Address);
    uint256 opponentReserveBalance = BatteryDetails.getReserveBalance(globalPlayer2Id);
    opponentReserveBalance += opponentReserveEarnings;
    BatteryDetails.setReserveBalance(globalPlayer2Id, opponentReserveBalance);
    winningPot -= opponentReserveEarnings;

    // Move remaining winningPot to authors (their reserveBalance) of all the towers used by winner (player 2)
    if (allAuthors.length == 0) return;

    uint256 authorEarnings = winningPot / allAuthors.length;
    for (uint256 i = 0; i < allAuthors.length; i++) {
      bytes32 authorId = EntityHelpers.globalAddressToKey(allAuthors[i]);
      uint256 authorReserveBalance = BatteryDetails.getReserveBalance(authorId);
      authorReserveBalance += authorEarnings;
      BatteryDetails.setReserveBalance(authorId, authorReserveBalance);
    }

    RevenueReceiptData memory revenueReceipt = RevenueReceiptData({
      amountToKingdom: opponentSavedKingdomEarnings,
      amountToReserve: opponentReserveEarnings,
      playerAddress: player2Address
    });
    RevenueReceipt.set(savedKingdomId, block.timestamp, revenueReceipt);
  }

  /**
   * Get all the authors of the towers on one side of the board
   * @param gameId The ID of the game
   * @param player1Kingdom Boolean for scanning left or right side of the board
   */
  function _getAllKingdomTowerAuthors(bytes32 gameId, bool player1Kingdom) internal view returns (address[] memory) {
    // If player1Kingdom is true, get all actions from SavedGame
    // If player1Kingdom is false, get all actions from LoadedKingdomActions
    bytes32[] memory savedGameActionIds = player1Kingdom
      ? SavedGame.getActions(gameId)
      : LoadedKingdomActions.getActions(gameId);
    bytes32[] memory modifyActions = new bytes32[](savedGameActionIds.length);

    // Get actionType from ActionData, then filter by actionType == Modify
    // Resize the modifyActions array to the actual number of Modify actions
    uint256 modifyCount = 0;
    for (uint256 i = 0; i < savedGameActionIds.length; i++) {
      ActionType actionType = Action.getActionType(savedGameActionIds[i]);
      if (actionType == ActionType.Modify) {
        modifyActions[modifyCount] = savedGameActionIds[i];
        modifyCount++;
      }
    }
    bytes32[] memory resizedModifyActions = new bytes32[](modifyCount);
    for (uint256 i = 0; i < modifyCount; i++) {
      resizedModifyActions[i] = modifyActions[i];
    }
    modifyActions = resizedModifyActions;

    // Use the actionId to get the bytes from Projectile
    // Use SavedModification with keccak256(abi.encodePacked(bytecode)) to get all the authors of the towers used in the game
    address[] memory authors = new address[](modifyActions.length);
    for (uint256 i = 0; i < modifyActions.length; i++) {
      bytes32 actionId = modifyActions[i];
      bytes32 bytecodeHash = keccak256(abi.encodePacked(Projectile.getBytecode(actionId)));
      address author = SavedModification.getAuthor(bytecodeHash);
      authors[i] = author;
    }

    // Remove all empty addresses from the authors array
    uint256 count = 0;
    for (uint256 i = 0; i < authors.length; i++) {
      if (authors[i] != address(0)) {
        count++;
      }
    }
    address[] memory nonEmptyAuthors = new address[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < authors.length; i++) {
      if (authors[i] != address(0)) {
        nonEmptyAuthors[index] = authors[i];
        index++;
      }
    }

    return nonEmptyAuthors;
  }

  /**
   * Checks if the player is the top player in the game
   * If they are, return their stake to active and reserve balance
   * @param globalPlayer1Id The global ID of the player
   */
  function _processPotentialStakeReturn(bytes32 globalPlayer1Id) internal {
    uint256 winStreak = WinStreak.get(globalPlayer1Id);
    bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(winStreak);

    if (kingdomsByLevel.length == 0) {
      uint256 stakedBalance = BatteryDetails.getStakedBalance(globalPlayer1Id);
      uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayer1Id);
      uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayer1Id);

      activeBalance += stakedBalance;
      if (activeBalance > BATTERY_STORAGE_LIMIT) {
        reserveBalance += activeBalance - BATTERY_STORAGE_LIMIT;
        activeBalance = BATTERY_STORAGE_LIMIT;
      }

      BatteryDetails.setActiveBalance(globalPlayer1Id, activeBalance);
      BatteryDetails.setReserveBalance(globalPlayer1Id, reserveBalance);
      BatteryDetails.setStakedBalance(globalPlayer1Id, 0);
    }
  }
}
