// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Action, ActionData, Position, Projectile, SavedBattle, SavedBattleData } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT } from "../../constants.sol";

/**
 * @title ActionStorageHelpers
 * @notice This library contains helper functions for action storage
 */
library ActionStorageHelpers {
  function storeSkipAction(bytes32 battleId) public {
    ActionData memory skipAction = ActionData({
      actionType: ActionType.Skip,
      newX: 0,
      newY: 0,
      oldX: 0,
      oldY: 0,
      projectile: false
    });

    bytes32[] memory savedBattleActionIds = SavedBattle.getActions(battleId);
    bytes32[] memory newSavedBattleActionIds = new bytes32[](savedBattleActionIds.length + 1);

    for (uint256 i = 0; i < savedBattleActionIds.length; i++) {
      newSavedBattleActionIds[i] = savedBattleActionIds[i];
    }

    newSavedBattleActionIds[newSavedBattleActionIds.length - 1] = keccak256(
      abi.encodePacked(
        skipAction.actionType,
        skipAction.newX,
        skipAction.newY,
        skipAction.oldX,
        skipAction.oldY,
        skipAction.projectile
      )
    );
    Action.set(newSavedBattleActionIds[newSavedBattleActionIds.length - 1], skipAction);
    SavedBattle.setActions(battleId, newSavedBattleActionIds);
  }

  function storeInstallTowerAction(
    bytes32 battleId,
    bytes32 globalPlayerId,
    int16 newX,
    int16 newY,
    bool hasProjectile
  ) public {
    ActionData[] memory actions = new ActionData[](1);
    actions[0] = ActionData({
      actionType: ActionType.Install,
      newX: newX,
      newY: newY,
      oldX: 0,
      oldY: 0,
      projectile: hasProjectile
    });

    bytes32[] memory savedBattleActionIds = SavedBattle.getActions(battleId);
    bytes32[] memory newSavedBattleActionIds = new bytes32[](savedBattleActionIds.length + actions.length);

    for (uint256 i = 0; i < savedBattleActionIds.length; i++) {
      newSavedBattleActionIds[i] = savedBattleActionIds[i];
    }

    for (uint256 i = 0; i < actions.length; i++) {
      newSavedBattleActionIds[savedBattleActionIds.length + i] = keccak256(
        abi.encodePacked(
          actions[i].actionType,
          actions[i].newX,
          actions[i].newY,
          actions[i].oldX,
          actions[i].oldY,
          actions[i].projectile
        )
      );
      Action.set(newSavedBattleActionIds[savedBattleActionIds.length + i], actions[i]);
    }

    SavedBattleData memory savedBattle = SavedBattleData({ winner: globalPlayerId, actions: newSavedBattleActionIds });

    SavedBattle.set(battleId, savedBattle);
  }

  function storeMoveTowerAction(
    bytes32 battleId,
    bytes32 towerId,
    int16 oldX,
    int16 oldY,
    int16 newX,
    int16 newY
  ) public {
    bool hasProjectile = Projectile.getLogicAddress(towerId) != address(0);

    ActionData[] memory actions = new ActionData[](1);
    actions[0] = ActionData({
      actionType: ActionType.Move,
      newX: newX,
      newY: newY,
      oldX: oldX,
      oldY: oldY,
      projectile: hasProjectile
    });

    bytes32[] memory savedBattleActionIds = SavedBattle.getActions(battleId);
    bytes32[] memory newSavedBattleActionIds = new bytes32[](savedBattleActionIds.length + actions.length);

    for (uint256 i = 0; i < savedBattleActionIds.length; i++) {
      newSavedBattleActionIds[i] = savedBattleActionIds[i];
    }

    for (uint256 i = 0; i < actions.length; i++) {
      newSavedBattleActionIds[savedBattleActionIds.length + i] = keccak256(
        abi.encodePacked(
          actions[i].actionType,
          actions[i].newX,
          actions[i].newY,
          actions[i].oldX,
          actions[i].oldY,
          actions[i].projectile
        )
      );
      Action.set(newSavedBattleActionIds[savedBattleActionIds.length + i], actions[i]);
    }

    SavedBattle.setActions(battleId, newSavedBattleActionIds);
  }

  function storeModifyTowerAction(
    bytes32 battleId,
    bytes32 towerId,
    bytes memory bytecode,
    address systemAddress,
    string memory sourceCode
  ) public {
    (int16 oldX, int16 oldY) = Position.get(towerId);
    bool hasProjectile = Projectile.getLogicAddress(towerId) != address(0);

    ActionData[] memory actions = new ActionData[](1);
    actions[0] = ActionData({
      actionType: ActionType.Modify,
      newX: oldX,
      newY: oldY,
      oldX: oldX,
      oldY: oldY,
      projectile: hasProjectile
    });

    bytes32[] memory savedBattleActionIds = SavedBattle.getActions(battleId);
    bytes32[] memory newSavedBattleActionIds = new bytes32[](savedBattleActionIds.length + actions.length);

    for (uint256 i = 0; i < savedBattleActionIds.length; i++) {
      newSavedBattleActionIds[i] = savedBattleActionIds[i];
    }

    for (uint256 i = 0; i < actions.length; i++) {
      newSavedBattleActionIds[savedBattleActionIds.length + i] = keccak256(
        abi.encodePacked(
          actions[i].actionType,
          actions[i].newX,
          actions[i].newY,
          actions[i].oldX,
          actions[i].oldY,
          actions[i].projectile
        )
      );
      Action.set(newSavedBattleActionIds[savedBattleActionIds.length + i], actions[i]);

      _setActionProjectile(
        newSavedBattleActionIds[savedBattleActionIds.length + i],
        systemAddress,
        bytecode,
        sourceCode
      );
    }

    SavedBattle.setActions(battleId, newSavedBattleActionIds);
  }

  function _setActionProjectile(
    bytes32 actionId,
    address systemAddress,
    bytes memory bytecode,
    string memory sourceCode
  ) internal {
    Projectile.set(actionId, systemAddress, DEFAULT_LOGIC_SIZE_LIMIT, bytecode, sourceCode);
  }
}
