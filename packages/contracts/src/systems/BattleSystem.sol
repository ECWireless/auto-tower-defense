// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { CurrentBattle, Battle, BattleData, HighestLevel, SavedKingdom, SavedKingdomData, WinStreak } from "../codegen/index.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { BattleHelpers } from "../Libraries/BattleHelpers.sol";
import { AccountHelpers } from "../Libraries/AccountHelpers.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { ActionStorageHelpers } from "../Libraries/ActionStorageHelpers.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { MAX_ACTIONS, ROB_ID } from "../../constants.sol";
import "forge-std/console.sol";

contract BattleSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "BattleSystem: player not registered");
    _;
  }

  function createBattle(string memory username, bool resetLevel) external returns (bytes32) {
    address player1Address = _msgSender();
    bytes32 globalPlayer1Id = EntityHelpers.addressToGlobalPlayerId(player1Address);

    if (globalPlayer1Id == bytes32(0)) {
      globalPlayer1Id = AccountHelpers.registerPlayer(player1Address, username);
    }

    BattleHelpers.validateCreateBattle(globalPlayer1Id);

    bytes32[] memory defaultActionIds = new bytes32[](0);
    bytes32 savedKingdomId = keccak256(abi.encode(defaultActionIds));
    if (resetLevel) {
      WinStreak.set(globalPlayer1Id, 2); // This allows the player to potentially skip the tutorial levels
      if (HighestLevel.get(globalPlayer1Id) > 0 && BatteryHelpers.arePlayableKingdoms(globalPlayer1Id)) {
        savedKingdomId = BattleHelpers.nextLevel(globalPlayer1Id);
      } else {
        WinStreak.set(globalPlayer1Id, 0);
      }
      // Stake 8 kWh of electricity
      BatteryHelpers.stakeElectricity(globalPlayer1Id);
    } else {
      savedKingdomId = BattleHelpers.nextLevel(globalPlayer1Id);
    }

    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    return BattleHelpers.initializeBattle(globalPlayer1Id, savedKingdom.author, savedKingdomId);
  }

  function forfeitRun() external onlyRegisteredPlayer {
    bytes32 globalPlayer1Id = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 battleId = CurrentBattle.get(globalPlayer1Id);
    require(battleId != bytes32(0), "BattleSystem: no battle found");

    BattleData memory battle = Battle.get(battleId);
    require(battle.endTimestamp == 0, "BattleSystem: battle has ended");
    require(globalPlayer1Id == battle.player1Id, "BattleSystem: not player1");

    ProjectileHelpers.endBattle(battleId, battle.player2Id);
  }

  function nextTurn(bytes32 battleId) external onlyRegisteredPlayer {
    BattleData memory battle = Battle.get(battleId);
    require(battle.endTimestamp == 0, "BattleSystem: battle has ended");

    bytes32 globalPlayer1Id = battle.player1Id;
    bytes32 globalPlayer2Id = battle.player2Id;

    if (battle.turn == globalPlayer1Id) {
      require(EntityHelpers.addressToGlobalPlayerId(_msgSender()) == globalPlayer1Id, "BattleSystem: not player1");

      // For all actions remaining, add that number of skipped actions
      uint256 skippedActions = Battle.getActionCount(battleId);
      for (uint256 i = 0; i < skippedActions; i++) {
        ActionStorageHelpers.storeSkipAction(battleId);
      }

      bytes32 localPlayer1Id = EntityHelpers.globalToLocalPlayerId(globalPlayer1Id, battleId);
      bytes32 localPlayer2Id = EntityHelpers.globalToLocalPlayerId(globalPlayer2Id, battleId);

      bytes32[] memory allTowers = ProjectileHelpers.getAllTowers(localPlayer1Id, localPlayer2Id);
      ProjectileHelpers.clearAllProjectiles(allTowers);
      Battle.setRoundCount(battleId, battle.roundCount + 1);
      ProjectileHelpers.executeRoundResults(battleId);
    }

    if (Battle.getTurn(battleId) == globalPlayer2Id) {
      for (uint256 i = 0; i < MAX_ACTIONS; i++) {
        BattleHelpers.executePlayer2Actions(battleId, globalPlayer1Id, globalPlayer2Id);
      }
    }

    Battle.setActionCount(battleId, MAX_ACTIONS);
    Battle.setTurn(battleId, battle.turn == globalPlayer1Id ? globalPlayer2Id : globalPlayer1Id);
  }
}
