// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Action, ActionData, Castle, CurrentBattle, EntityAtPosition, Battle, BattleData, Health, KingdomsByLevel, Level, LoadedKingdomActions, LoadedKingdomActionsData, MapConfig, Owner, OwnerTowers, Position, Projectile, ProjectileData, SavedKingdom, TopLevel, WinStreak } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { TowerHelpers } from "./TowerHelpers.sol";
import { MAX_ACTIONS, MAX_CASTLE_HEALTH } from "../../constants.sol";
import "forge-std/console.sol";

/**
 * @title BattleHelpers
 * @notice This library contains helper functions for BattleSystem
 */
library BattleHelpers {
  function initializeBattle(
    bytes32 globalPlayer1Id,
    bytes32 globalPlayer2Id,
    bytes32 savedKingdomId
  ) public returns (bytes32) {
    uint256 timestamp = block.timestamp;
    bytes32 battleId = keccak256(abi.encodePacked(globalPlayer1Id, globalPlayer2Id, timestamp));

    BattleData memory newBattle = BattleData({
      actionCount: MAX_ACTIONS,
      endTimestamp: 0,
      player1Id: globalPlayer1Id,
      player2Id: globalPlayer2Id,
      roundCount: 1,
      startTimestamp: timestamp,
      turn: globalPlayer2Id,
      winner: bytes32(0)
    });
    Battle.set(battleId, newBattle);
    CurrentBattle.set(globalPlayer1Id, battleId);

    bytes32 castle1Id = keccak256(abi.encodePacked(battleId, globalPlayer1Id, timestamp));
    bytes32 castle2Id = keccak256(abi.encodePacked(battleId, globalPlayer2Id, timestamp));

    CurrentBattle.set(castle1Id, battleId);
    CurrentBattle.set(castle2Id, battleId);

    Owner.set(castle1Id, globalPlayer1Id);
    Owner.set(castle2Id, globalPlayer2Id);

    OwnerTowers.set(EntityHelpers.globalToLocalPlayerId(globalPlayer1Id, battleId), new bytes32[](0));
    OwnerTowers.set(EntityHelpers.globalToLocalPlayerId(globalPlayer2Id, battleId), new bytes32[](0));

    Castle.set(castle1Id, true);
    Castle.set(castle2Id, true);

    (int16 mapHeight, int16 mapWidth) = MapConfig.get();
    Position.set(castle1Id, 5, mapHeight / 2);
    Position.set(castle2Id, mapWidth - 5, mapHeight / 2);

    Health.set(castle1Id, MAX_CASTLE_HEALTH, MAX_CASTLE_HEALTH);
    Health.set(castle2Id, MAX_CASTLE_HEALTH, MAX_CASTLE_HEALTH);

    EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, 5, mapHeight / 2), castle1Id);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, mapWidth - 5, mapHeight / 2), castle2Id);

    bytes32[] memory savedKingdomActions = SavedKingdom.getActions(savedKingdomId);
    LoadedKingdomActionsData memory loadedKingdomActions = LoadedKingdomActionsData({
      savedKingdomId: savedKingdomId,
      actions: savedKingdomActions
    });
    LoadedKingdomActions.set(battleId, loadedKingdomActions);

    Level.set(battleId, WinStreak.get(globalPlayer1Id));

    for (uint256 i = 0; i < MAX_ACTIONS; i++) {
      executePlayer2Actions(battleId, globalPlayer1Id, globalPlayer2Id);
    }

    Battle.setActionCount(battleId, MAX_ACTIONS);
    Battle.setTurn(battleId, globalPlayer1Id);
    return battleId;
  }

  function nextLevel(bytes32 globalPlayer1Id) public view returns (bytes32) {
    uint256 level = WinStreak.get(globalPlayer1Id);
    uint256 topLevel = TopLevel.get();
    require(level > 0, "BattleSystem: player1 has no win streak");

    uint256 randomNumber = block.chainid == 31337 ? block.timestamp : block.prevrandao;

    // If no playable saved battle is found, go up a level
    for (uint256 i = 0; i < 10; i++) {
      bytes32 savedKingdomId = _getPlayableSavedKingdomId(globalPlayer1Id, randomNumber, level);
      if (savedKingdomId != bytes32(0)) {
        return savedKingdomId;
      }
      level++;
      if (level > topLevel) {
        break;
      }
    }

    revert("BattleSystem: no valid saved battle found");
  }

  function _getPlayableSavedKingdomId(
    bytes32 globalPlayer1Id,
    uint256 randomNumber,
    uint256 level
  ) internal view returns (bytes32) {
    bytes32[] memory savedKingdomIds = KingdomsByLevel.get(level);
    require(savedKingdomIds.length > 0, "BattleSystem: no saved kingdoms available");

    bytes32 savedKingdomId;
    bytes32 savedKingdomAuthor;

    uint256 savedKingdomsOriginalLength = savedKingdomIds.length;

    for (uint256 i = 0; i < savedKingdomsOriginalLength; i++) {
      // Pick a random saved kingdom
      uint256 index = randomNumber % savedKingdomIds.length;
      savedKingdomId = savedKingdomIds[index];
      savedKingdomAuthor = SavedKingdom.getAuthor(savedKingdomId);

      // If the author is not the player, return the saved kingdom ID
      if (savedKingdomAuthor != globalPlayer1Id) {
        return savedKingdomId;
      }

      // Remove the checked saved battle ID from the array
      savedKingdomIds[index] = savedKingdomIds[savedKingdomIds.length - 1];
      assembly {
        mstore(savedKingdomIds, sub(mload(savedKingdomIds), 1))
      }

      // Update random number for the next iteration
      randomNumber = uint256(keccak256(abi.encode(randomNumber, index)));
    }

    return bytes32(0);
  }

  function validateCreateBattle(bytes32 globalPlayer1Id) public view {
    bytes32 currentBattleId = CurrentBattle.get(globalPlayer1Id);
    if (currentBattleId != 0) {
      BattleData memory currentBattle = Battle.get(currentBattleId);
      require(currentBattle.endTimestamp != 0, "BattleSystem: player1 has an ongoing battle");
    }
  }

  function executePlayer2Actions(bytes32 battleId, bytes32 globalPlayer1Id, bytes32 globalPlayer2Id) public {
    uint8 roundCount = Battle.getRoundCount(battleId) - 1;
    uint8 actionCount = Battle.getActionCount(battleId);
    uint256 actionIdIndex = (roundCount * MAX_ACTIONS) + (MAX_ACTIONS - actionCount);

    bytes32[] memory actionIds = LoadedKingdomActions.getActions(battleId);
    if (actionIdIndex >= actionIds.length) {
      return;
    }

    ActionData memory action = Action.get(actionIds[actionIdIndex]);
    (, int16 width) = MapConfig.get();
    action.newX = width - action.newX;
    action.oldX = width - action.oldX;

    if (action.actionType == ActionType.Install) {
      TowerHelpers.installTower(
        globalPlayer2Id,
        CurrentBattle.get(globalPlayer1Id),
        action.projectile,
        action.newX,
        action.newY
      );
    } else if (action.actionType == ActionType.Move) {
      bytes32 towerEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(battleId, action.oldX, action.oldY));
      uint8 towerHealth = Health.getCurrentHealth(towerEntity);
      if (towerHealth == 0) {
        return;
      }

      TowerHelpers.moveTower(
        globalPlayer2Id,
        CurrentBattle.get(globalPlayer1Id),
        towerEntity,
        action.newX,
        action.newY
      );
    } else if (action.actionType == ActionType.Modify) {
      ProjectileData memory projectileData = Projectile.get(actionIds[actionIdIndex]);
      bytes32 towerEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(battleId, action.oldX, action.oldY));
      uint8 towerHealth = Health.getCurrentHealth(towerEntity);
      if (towerHealth == 0) {
        return;
      }

      TowerHelpers.modifyTowerSystem(
        globalPlayer2Id,
        CurrentBattle.get(globalPlayer1Id),
        towerEntity,
        projectileData.bytecode,
        projectileData.sourceCode
      );
    }
  }
}
