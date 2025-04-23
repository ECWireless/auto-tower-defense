// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { _gameSystemAddress } from "../utils.sol";
import { Action, ActionData, Position, Projectile, SavedGame, SavedGameData } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT } from "../../constants.sol";

/**
 * @title ActionStorageHelpers
 * @notice This library contains helper functions for action storage
 */
library ActionStorageHelpers {
  function storeSkipAction(bytes32 gameId, address playerAddress) public {
    if (playerAddress != _gameSystemAddress()) {
      bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(playerAddress);
      bytes32 savedGameId = keccak256(abi.encodePacked(gameId, globalPlayerId));

      ActionData[] memory actions = new ActionData[](1);
      actions[0] = ActionData({ actionType: ActionType.Skip, newX: 0, newY: 0, oldX: 0, oldY: 0, projectile: false });

      bytes32[] memory savedGameActionIds = SavedGame.getActions(savedGameId);
      bytes32[] memory newSavedGameActionIds = new bytes32[](savedGameActionIds.length + actions.length);

      for (uint256 i = 0; i < savedGameActionIds.length; i++) {
        newSavedGameActionIds[i] = savedGameActionIds[i];
      }

      for (uint256 i = 0; i < actions.length; i++) {
        newSavedGameActionIds[savedGameActionIds.length + i] = keccak256(
          abi.encodePacked(
            actions[i].actionType,
            actions[i].newX,
            actions[i].newY,
            actions[i].oldX,
            actions[i].oldY,
            actions[i].projectile
          )
        );
        Action.set(newSavedGameActionIds[savedGameActionIds.length + i], actions[i]);
      }

      SavedGame.setActions(savedGameId, newSavedGameActionIds);
    }
  }

  function storeInstallTowerAction(
    bytes32 gameId,
    address playerAddress,
    int16 newX,
    int16 newY,
    bool hasProjectile
  ) public {
    if (playerAddress != _gameSystemAddress()) {
      bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(playerAddress);
      bytes32 savedGameId = keccak256(abi.encodePacked(gameId, globalPlayerId));

      ActionData[] memory actions = new ActionData[](1);
      actions[0] = ActionData({
        actionType: ActionType.Install,
        newX: newX,
        newY: newY,
        oldX: 0,
        oldY: 0,
        projectile: hasProjectile
      });

      bytes32[] memory savedGameActionIds = SavedGame.getActions(savedGameId);
      bytes32[] memory newSavedGameActionIds = new bytes32[](savedGameActionIds.length + actions.length);

      for (uint256 i = 0; i < savedGameActionIds.length; i++) {
        newSavedGameActionIds[i] = savedGameActionIds[i];
      }

      for (uint256 i = 0; i < actions.length; i++) {
        newSavedGameActionIds[savedGameActionIds.length + i] = keccak256(
          abi.encodePacked(
            actions[i].actionType,
            actions[i].newX,
            actions[i].newY,
            actions[i].oldX,
            actions[i].oldY,
            actions[i].projectile
          )
        );
        Action.set(newSavedGameActionIds[savedGameActionIds.length + i], actions[i]);
      }

      SavedGameData memory savedGame = SavedGameData({
        gameId: gameId,
        winner: playerAddress,
        actions: newSavedGameActionIds
      });

      SavedGame.set(savedGameId, savedGame);
    }
  }

  function storeMoveTowerAction(
    bytes32 gameId,
    address playerAddress,
    bytes32 towerId,
    int16 oldX,
    int16 oldY,
    int16 newX,
    int16 newY
  ) public {
    if (playerAddress != _gameSystemAddress()) {
      bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(playerAddress);
      bytes32 savedGameId = keccak256(abi.encodePacked(gameId, globalPlayerId));

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

      bytes32[] memory savedGameActionIds = SavedGame.getActions(savedGameId);
      bytes32[] memory newSavedGameActionIds = new bytes32[](savedGameActionIds.length + actions.length);

      for (uint256 i = 0; i < savedGameActionIds.length; i++) {
        newSavedGameActionIds[i] = savedGameActionIds[i];
      }

      for (uint256 i = 0; i < actions.length; i++) {
        newSavedGameActionIds[savedGameActionIds.length + i] = keccak256(
          abi.encodePacked(
            actions[i].actionType,
            actions[i].newX,
            actions[i].newY,
            actions[i].oldX,
            actions[i].oldY,
            actions[i].projectile
          )
        );
        Action.set(newSavedGameActionIds[savedGameActionIds.length + i], actions[i]);
      }

      SavedGame.setActions(savedGameId, newSavedGameActionIds);
    }
  }

  function storeModifyTowerAction(
    bytes32 gameId,
    address playerAddress,
    bytes32 towerId,
    bytes memory bytecode,
    address systemAddress,
    string memory sourceCode
  ) public {
    if (playerAddress != _gameSystemAddress()) {
      bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(playerAddress);
      bytes32 savedGameId = keccak256(abi.encodePacked(gameId, globalPlayerId));

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

      bytes32[] memory savedGameActionIds = SavedGame.getActions(savedGameId);
      bytes32[] memory newSavedGameActionIds = new bytes32[](savedGameActionIds.length + actions.length);

      for (uint256 i = 0; i < savedGameActionIds.length; i++) {
        newSavedGameActionIds[i] = savedGameActionIds[i];
      }

      for (uint256 i = 0; i < actions.length; i++) {
        newSavedGameActionIds[savedGameActionIds.length + i] = keccak256(
          abi.encodePacked(
            actions[i].actionType,
            actions[i].newX,
            actions[i].newY,
            actions[i].oldX,
            actions[i].oldY,
            actions[i].projectile
          )
        );
        Action.set(newSavedGameActionIds[savedGameActionIds.length + i], actions[i]);

        _setActionProjectile(newSavedGameActionIds[savedGameActionIds.length + i], systemAddress, bytecode, sourceCode);
      }

      SavedGame.setActions(savedGameId, newSavedGameActionIds);
    }
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
