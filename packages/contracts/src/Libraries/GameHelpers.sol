import { Action, ActionData, Castle, CurrentGame, EntityAtPosition, Game, GamesByLevel, GameData, Health, LastGameWonInRun, Level, MapConfig, Owner, OwnerTowers, Position, Projectile, ProjectileData, SavedGame, SavedGameData, TopLevel, Username, UsernameTaken, WinStreak } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { TowerHelpers } from "./TowerHelpers.sol";
import { MAX_ACTIONS, MAX_CASTLE_HEALTH } from "../../constants.sol";
import "forge-std/console.sol";

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/**
 * @title GameHelpers
 * @notice This library contains helper functions for GameSystem
 */
library GameHelpers {
  function initializeGame(
    address player1Address,
    address player2Address,
    bytes32 savedGameId,
    bytes32 globalPlayer1
  ) public returns (bytes32) {
    uint256 timestamp = block.timestamp;
    bytes32 gameId = keccak256(abi.encodePacked(player1Address, player2Address, timestamp));

    GameData memory newGame = GameData({
      actionCount: MAX_ACTIONS,
      endTimestamp: 0,
      player1Address: player1Address,
      player2Address: player2Address,
      roundCount: 1,
      startTimestamp: timestamp,
      turn: player1Address,
      winner: address(0)
    });
    Game.set(gameId, newGame);
    CurrentGame.set(globalPlayer1, gameId);

    bytes32 castle1Id = keccak256(abi.encodePacked(gameId, player1Address, timestamp));
    bytes32 castle2Id = keccak256(abi.encodePacked(gameId, player2Address, timestamp));

    CurrentGame.set(castle1Id, gameId);
    CurrentGame.set(castle2Id, gameId);

    Owner.set(castle1Id, player1Address);
    Owner.set(castle2Id, player2Address);

    bytes32 localPlayer1 = EntityHelpers.localAddressToKey(gameId, player1Address);
    bytes32 localPlayer2 = EntityHelpers.localAddressToKey(gameId, player2Address);
    OwnerTowers.set(localPlayer1, new bytes32[](0));
    OwnerTowers.set(localPlayer2, new bytes32[](0));

    Castle.set(castle1Id, true);
    Castle.set(castle2Id, true);

    (int16 mapHeight, int16 mapWidth) = MapConfig.get();
    Position.set(castle1Id, 5, mapHeight / 2);
    Position.set(castle2Id, mapWidth - 5, mapHeight / 2);

    Health.set(castle1Id, MAX_CASTLE_HEALTH, MAX_CASTLE_HEALTH);
    Health.set(castle2Id, MAX_CASTLE_HEALTH, MAX_CASTLE_HEALTH);

    EntityAtPosition.set(EntityHelpers.positionToEntityKey(gameId, 5, mapHeight / 2), castle1Id);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(gameId, mapWidth - 5, mapHeight / 2), castle2Id);

    bytes32[] memory savedGameActions = SavedGame.getActions(savedGameId);
    SavedGameData memory loadedSavedGame = SavedGameData({
      gameId: gameId,
      winner: address(0),
      actions: savedGameActions
    });
    SavedGame.set(gameId, loadedSavedGame);

    Level.set(gameId, WinStreak.get(globalPlayer1));

    return gameId;
  }

  function nextLevel(address player1Address) public view returns (bytes32) {
    bytes32 globalPlayer1 = EntityHelpers.globalAddressToKey(player1Address);
    uint256 level = WinStreak.get(globalPlayer1);
    uint256 topLevel = TopLevel.get();
    require(level > 0, "GameSystem: player1 has no win streak");

    uint256 randomNumber = block.chainid == 31337 ? block.timestamp : block.prevrandao;

    // If no playable saved game is found, go up a level
    for (uint256 i = 0; i < 10; i++) {
      bytes32 savedGameId = _getPlayableSavedGameId(player1Address, randomNumber, level);
      if (savedGameId != bytes32(0)) {
        return savedGameId;
      }
      level++;
      if (level > topLevel) {
        break;
      }
    }

    revert("GameSystem: no valid saved game found");
  }

  function _getPlayableSavedGameId(address player1Address, uint256 randomNumber, uint256 level) internal view returns (bytes32) {
    bytes32[] memory savedGameIds = GamesByLevel.get(level);
    require(savedGameIds.length > 0, "GameSystem: no saved games available");

    bytes32 savedGameId;
    address savedGameWinner;

    uint256 savedGameOriginalLength = savedGameIds.length;

    for (uint256 i = 0; i < savedGameOriginalLength; i++) {
      // Pick a random saved game
      uint256 index = randomNumber % savedGameIds.length;
      savedGameId = savedGameIds[index];
      savedGameWinner = SavedGame.getWinner(savedGameId);

      // If the winner is not the player, return the game ID
      if (savedGameWinner != player1Address) {
        return savedGameId;
      }

      // Remove the checked game ID from the array
      savedGameIds[index] = savedGameIds[savedGameIds.length - 1];
      assembly {
        mstore(savedGameIds, sub(mload(savedGameIds), 1))
      }

      // Update random number for the next iteration
      randomNumber = uint256(keccak256(abi.encode(randomNumber, index)));
    }

    return bytes32(0);
  }

  function validateCreateGame(bytes32 globalPlayer1, string memory username) public {
    string memory player1Username = Username.get(globalPlayer1);
    if (bytes(player1Username).length == 0) {
      bytes32 usernameBytes = keccak256(abi.encodePacked(username));
      require(!UsernameTaken.get(usernameBytes), "GameSystem: username is taken");
      Username.set(globalPlayer1, username);
      UsernameTaken.set(usernameBytes, true);
    }

    bytes32 currentGameId = CurrentGame.get(globalPlayer1);
    if (currentGameId != 0) {
      GameData memory currentGame = Game.get(currentGameId);
      require(currentGame.endTimestamp != 0, "GameSystem: player1 has an ongoing game");
    }
  }

  function executePlayer2Actions(bytes32 gameId, address player1Address, address player2Address) public {
    bytes32 globalPlayer1 = EntityHelpers.globalAddressToKey(player1Address);
    uint8 roundCount = Game.getRoundCount(gameId) - 1;
    uint8 actionCount = Game.getActionCount(gameId);
    uint256 actionIdIndex = (roundCount * MAX_ACTIONS) + (MAX_ACTIONS - actionCount);

    bytes32[] memory actionIds = SavedGame.getActions(gameId);
    if (actionIdIndex >= actionIds.length) {
      return;
    }

    ActionData memory action = Action.get(actionIds[actionIdIndex]);
    (, int16 width) = MapConfig.get();
    action.newX = width - action.newX;
    action.oldX = width - action.oldX;

    if (action.actionType == ActionType.Install) {
      TowerHelpers.installTower(
        player2Address,
        CurrentGame.get(globalPlayer1),
        action.projectile,
        action.newX,
        action.newY
      );
    } else if (action.actionType == ActionType.Move) {
      bytes32 towerEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, action.oldX, action.oldY));
      uint8 towerHealth = Health.getCurrentHealth(towerEntity);
      if (towerHealth == 0) {
        return;
      }

      TowerHelpers.moveTower(player2Address, CurrentGame.get(globalPlayer1), towerEntity, action.newX, action.newY);
    } else if (action.actionType == ActionType.Modify) {
      ProjectileData memory projectileData = Projectile.get(actionIds[actionIdIndex]);
      bytes32 towerEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, action.oldX, action.oldY));
      uint8 towerHealth = Health.getCurrentHealth(towerEntity);
      if (towerHealth == 0) {
        return;
      }

      TowerHelpers.modifyTowerSystem(player2Address, CurrentGame.get(globalPlayer1), towerEntity, projectileData.bytecode, projectileData.sourceCode);
    }
  }
}
