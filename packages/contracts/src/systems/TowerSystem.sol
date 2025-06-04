// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Action, ActionData, Battle, BattleData, CurrentBattle, DefaultLogic, EntityAtPosition, OwnerTowers, Position, Projectile, ProjectileData, SavedBattle } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { TowerHelpers } from "../Libraries/TowerHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT } from "../../constants.sol";

// TOWER ID
// bytes32 towerId = keccak256(abi.encodePacked(currentBattleId, playerAddress, timestamp));

contract TowerSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "TowerSystem: player not registered");
    _;
  }

  function playerInstallTower(bool projectile, int16 x, int16 y) external onlyRegisteredPlayer returns (bytes32) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 battleId = CurrentBattle.get(globalPlayerId);
    return TowerHelpers.installTower(globalPlayerId, battleId, projectile, x, y);
  }

  function playerMoveTower(bytes32 towerId, int16 x, int16 y) external onlyRegisteredPlayer returns (bytes32) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 battleId = CurrentBattle.get(globalPlayerId);
    return TowerHelpers.moveTower(globalPlayerId, battleId, towerId, x, y);
  }

  function playerModifyTowerSystem(
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external onlyRegisteredPlayer returns (address projectileLogicAddress) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 battleId = CurrentBattle.get(globalPlayerId);
    return TowerHelpers.modifyTowerSystem(globalPlayerId, battleId, towerId, bytecode, sourceCode);
  }

  function undoAction() external onlyRegisteredPlayer returns (bytes32) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 battleId = CurrentBattle.get(globalPlayerId);
    BattleData memory battleData = Battle.get(battleId);

    require(battleData.endTimestamp == 0, "TowerSystem: battle not active");
    require(battleData.player1Id == globalPlayerId, "TowerSystem: not player1");
    require(battleData.turn == globalPlayerId, "TowerSystem: not player's turn");
    require(battleData.actionCount < 2, "TowerSystem: no actions used this turn");

    bytes32[] memory savedBattleActionIds = SavedBattle.getActions(battleId);
    bytes32 latestActionId = savedBattleActionIds[savedBattleActionIds.length - 1];
    ActionData memory actionData = Action.get(latestActionId);
    bytes32 affectedTowerId = EntityAtPosition.get(
      EntityHelpers.positionToEntityKey(battleId, actionData.newX, actionData.newY)
    );

    if (actionData.actionType == ActionType.Install) {
      EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, actionData.newX, actionData.newY), 0);
      Position.set(affectedTowerId, -1, -1);

      bytes32 localPlayerId = EntityHelpers.globalToLocalPlayerId(globalPlayerId, battleId);
      bytes32[] memory playerTowers = OwnerTowers.get(localPlayerId);
      bytes32[] memory updatedTowers = new bytes32[](playerTowers.length - 1);
      for (uint256 i = 0; i < playerTowers.length; i++) {
        updatedTowers[i] = playerTowers[i];
      }
      updatedTowers[playerTowers.length] = affectedTowerId;
      OwnerTowers.set(localPlayerId, updatedTowers);
    }

    if (actionData.actionType == ActionType.Move) {
      EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, actionData.newX, actionData.newY), 0);
      Position.set(affectedTowerId, actionData.oldX, actionData.oldY);
    }

    if (actionData.actionType == ActionType.Modify) {
      // We need to loop through all previous actions to see if a previous ActionType.Modify exists for the affected tower
      bytes32 previousModifyActionId = bytes32(0);
      for (uint256 i = 0; i < savedBattleActionIds.length - 1; i++) {
        ActionData memory prevActionData = Action.get(savedBattleActionIds[i]);
        if (
          prevActionData.actionType == ActionType.Modify &&
          prevActionData.newX == actionData.newX &&
          prevActionData.newY == actionData.newY
        ) {
          previousModifyActionId = savedBattleActionIds[i];
          break;
        }
      }
      if (previousModifyActionId != bytes32(0)) {
        // If previousModifyActionId, revert to that bytecode, systemAddress, and sourceCode
        ProjectileData memory savedProjectileAction = Projectile.get(previousModifyActionId);
        Projectile.set(
          affectedTowerId,
          savedProjectileAction.logicAddress,
          DEFAULT_LOGIC_SIZE_LIMIT,
          savedProjectileAction.bytecode,
          savedProjectileAction.sourceCode
        );
      } else {
        // If no previousModifyActionId, revert to default bytecode, systemAddress, and sourceCode
        address defaultProjectileLogicAddress = DefaultLogic.get();

        Projectile.set(
          affectedTowerId,
          defaultProjectileLogicAddress,
          DEFAULT_LOGIC_SIZE_LIMIT,
          new bytes(0),
          "contract DefaultProjectileLogic { function getNextProjectilePosition( int16 x, int16 y ) public pure returns (int16, int16) { return (x + 5, y); } }"
        );
      }
    }

    bytes32[] memory newSavedBattleActionIds = new bytes32[](savedBattleActionIds.length - 1);
    for (uint256 i = 0; i < savedBattleActionIds.length - 1; i++) {
      newSavedBattleActionIds[i] = savedBattleActionIds[i];
    }
    SavedBattle.setActions(battleId, newSavedBattleActionIds);
    Battle.setActionCount(battleId, battleData.actionCount + 1);

    return affectedTowerId;
  }
}
