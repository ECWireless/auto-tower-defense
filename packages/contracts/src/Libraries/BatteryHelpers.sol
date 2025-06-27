// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Action, BatteryDetails, BatteryDetailsData, ExpenseReceipt, ExpenseReceiptData, KingdomsByLevel, LoadedKingdomActions, Patent, Projectile, RevenueReceipt, RevenueReceiptData, SavedBattle, SavedKingdom, SavedKingdomData, TopLevel, WinStreak } from "../codegen/index.sol";
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
   * Called by validateCreateBattle in Battle when a new username is registered
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
   * Called by initializeBattle in BattleHelpers
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
   * Called by endBattle in ProjectileHelpers when player 1 wins a battle
   * @param battleId The ID of the battle
   * @param globalPlayer1Id The global ID of the winning player (player 1)
   */
  function winStake(bytes32 battleId, bytes32 globalPlayer1Id) public {
    // Get SaveKingdomId from LoadedKingdomActions using battleId; then get electricitybalance from SavedKingdom
    bytes32 savedKingdomId = LoadedKingdomActions.getSavedKingdomId(battleId);
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

    // Get all the towers used in the battle
    bytes32[] memory allPatentees = _getAllKingdomTowerPatentees(battleId, true);

    // If there are no patentees, give the player the rest of the winningPot
    if (allPatentees.length == 0) {
      activeBalanceEarnings += activeBalanceEarnings;
    }

    activeBalance += activeBalanceEarnings;

    // If activeBalance == BATTERY_STORAGE_LIMIT, then reserveBalance is filled
    if (activeBalance > BATTERY_STORAGE_LIMIT) {
      reserveBalance += activeBalance - BATTERY_STORAGE_LIMIT;
      activeBalance = BATTERY_STORAGE_LIMIT;
    }
    BatteryDetails.setActiveBalance(globalPlayer1Id, activeBalance);
    BatteryDetails.setReserveBalance(globalPlayer1Id, reserveBalance);
    winningPot -= activeBalanceEarnings;

    _processPotentialStakeReturn(globalPlayer1Id);
    _distributeRoyalties(allPatentees, winningPot);
    _storeExpenseReceipt(savedKingdomId, battleId, stakedEarnings, activeBalanceEarnings, allPatentees);
  }

  function _storeExpenseReceipt(
    bytes32 savedKingdomId,
    bytes32 battleId,
    uint256 amountToKingdom,
    uint256 amountToBattery,
    bytes32[] memory patentees
  ) internal {
    ExpenseReceiptData memory expenseReceipt = ExpenseReceiptData({
      amountToBattery: amountToBattery,
      amountToKingdom: amountToKingdom,
      battleId: battleId,
      playerId: SavedKingdom.getAuthor(savedKingdomId),
      savedKingdomId: savedKingdomId,
      timestamp: block.timestamp,
      patentees: patentees
    });
    ExpenseReceipt.set(keccak256(abi.encodePacked(savedKingdomId, block.timestamp)), expenseReceipt);
  }

  /**
   * Distributes the winning pot when a player loses a battle
   * Called by endBattle in ProjectileHelpers when player 1 loses a battle
   * @param battleId The ID of the battle
   * @param globalPlayer1Id The global ID of the losing player (player 1)
   */
  function loseStake(bytes32 battleId, bytes32 globalPlayer1Id) public {
    bytes32 savedKingdomId = LoadedKingdomActions.getSavedKingdomId(battleId);
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

    // Get all the towers used in the battle
    bytes32[] memory allPatentees = _getAllKingdomTowerPatentees(battleId, false);

    // If there are no patentees, give the player2Address the rest of the winningPot
    if (allPatentees.length == 0) {
      opponentReserveEarnings += opponentReserveEarnings;
    }
    uint256 opponentReserveBalance = BatteryDetails.getReserveBalance(savedKingdom.author);
    opponentReserveBalance += opponentReserveEarnings;
    BatteryDetails.setReserveBalance(savedKingdom.author, opponentReserveBalance);
    winningPot -= opponentReserveEarnings;

    _distributeRoyalties(allPatentees, winningPot);
    _storeRevenueReceipt(savedKingdomId, battleId, opponentSavedKingdomEarnings, opponentReserveEarnings, allPatentees);
  }

  function _distributeRoyalties(bytes32[] memory allPatentees, uint256 winningPot) internal {
    // Move remaining winningPot to patentees (their reserveBalance) of all the tower patents used by winner (player 2)
    if (allPatentees.length == 0) return;

    uint256 royalty = winningPot / allPatentees.length;
    for (uint256 i = 0; i < allPatentees.length; i++) {
      bytes32 patenteeId = allPatentees[i];
      uint256 patenteeReserveBalance = BatteryDetails.getReserveBalance(patenteeId);
      patenteeReserveBalance += royalty;
      BatteryDetails.setReserveBalance(patenteeId, patenteeReserveBalance);
    }
  }

  function _storeRevenueReceipt(
    bytes32 savedKingdomId,
    bytes32 battleId,
    uint256 amountToKingdom,
    uint256 amountToReserve,
    bytes32[] memory patentees
  ) internal {
    RevenueReceiptData memory revenueReceipt = RevenueReceiptData({
      amountToKingdom: amountToKingdom,
      amountToReserve: amountToReserve,
      battleId: battleId,
      playerId: SavedKingdom.getAuthor(savedKingdomId),
      savedKingdomId: savedKingdomId,
      timestamp: block.timestamp,
      patentees: patentees
    });
    RevenueReceipt.set(keccak256(abi.encodePacked(savedKingdomId, block.timestamp)), revenueReceipt);
  }

  /**
   * Get all the patentees of the tower patents on one side of the board
   * @param battleId The ID of the battle
   * @param player1Kingdom Boolean for scanning left or right side of the board
   */
  function _getAllKingdomTowerPatentees(
    bytes32 battleId,
    bool player1Kingdom
  ) internal view returns (bytes32[] memory) {
    // If player1Kingdom is true, get all actions from SavedBattle
    // If player1Kingdom is false, get all actions from LoadedKingdomActions
    bytes32[] memory savedBattleActionIds = player1Kingdom
      ? SavedBattle.getActions(battleId)
      : LoadedKingdomActions.getActions(battleId);
    bytes32[] memory modifyActions = new bytes32[](savedBattleActionIds.length);

    // Get actionType from ActionData, then filter by actionType == Modify
    // Resize the modifyActions array to the actual number of Modify actions
    uint256 modifyCount = 0;
    for (uint256 i = 0; i < savedBattleActionIds.length; i++) {
      ActionType actionType = Action.getActionType(savedBattleActionIds[i]);
      if (actionType == ActionType.Modify) {
        modifyActions[modifyCount] = savedBattleActionIds[i];
        modifyCount++;
      }
    }
    bytes32[] memory resizedModifyActions = new bytes32[](modifyCount);
    for (uint256 i = 0; i < modifyCount; i++) {
      resizedModifyActions[i] = modifyActions[i];
    }
    modifyActions = resizedModifyActions;

    // Use the actionId to get the bytes from Projectile
    // Use Patent with keccak256(abi.encodePacked(bytecode)) to get all the patentees of the tower patents used in the battle
    bytes32[] memory patentees = new bytes32[](modifyActions.length);
    for (uint256 i = 0; i < modifyActions.length; i++) {
      bytes32 actionId = modifyActions[i];
      bytes32 bytecodeHash = keccak256(abi.encodePacked(Projectile.getBytecode(actionId)));
      bytes32 patentee = Patent.getPatentee(bytecodeHash);
      patentees[i] = patentee;
    }

    // Remove all empty bytes32 from the patentees array
    uint256 count = 0;
    for (uint256 i = 0; i < patentees.length; i++) {
      if (patentees[i] != bytes32(0)) {
        count++;
      }
    }
    bytes32[] memory nonEmptyPatentees = new bytes32[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < patentees.length; i++) {
      if (patentees[i] != bytes32(0)) {
        nonEmptyPatentees[index] = patentees[i];
        index++;
      }
    }

    return nonEmptyPatentees;
  }

  /**
   * Checks if the player is the top player in the battle
   * If they are, return their stake to active and reserve balance
   * @param globalPlayer1Id The global ID of the player
   */
  function _processPotentialStakeReturn(bytes32 globalPlayer1Id) internal {
    if (!arePlayableKingdoms(globalPlayer1Id)) {
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

  /**
   * Checks if any kingdoms are playable between the current level and the top level
   * Only kingdoms that are not authored by the player can be played
   * @param globalPlayerId The global ID of the player
   * @return bool True if there are playable kingdoms, false otherwise
   */
  function arePlayableKingdoms(bytes32 globalPlayerId) public view returns (bool) {
    uint256 startingLevel = WinStreak.get(globalPlayerId);
    uint256 topLevel = TopLevel.get();
    for (uint256 i = startingLevel; i <= topLevel; i++) {
      if (_arePlayableKingdomsInLevel(globalPlayerId, i)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if any kingdoms in a given level are playable
   * Only kingdoms that are not authored by the player can be played
   * @param globalPlayerId The global ID of the player
   * @param level level to check for playable kingdoms
   * @return bool True if there are playable kingdoms, false otherwise
   */
  function _arePlayableKingdomsInLevel(bytes32 globalPlayerId, uint256 level) internal view returns (bool) {
    bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(level);
    for (uint256 i = 0; i < kingdomsByLevel.length; i++) {
      bytes32 kingdomId = kingdomsByLevel[i];
      if (SavedKingdom.getAuthor(kingdomId) != globalPlayerId) {
        return true; // Found a playable kingdom
      }
    }
    return false; // No playable kingdoms found
  }
}
