import { Action, ActionData, AddressBook, CurrentGame, EntityAtPosition, Game, GamesByLevel, GameData, MapConfig, Projectile, ProjectileData, SavedGame, Username, UsernameTaken, WinStreak } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { EntityHelpers } from "./EntityHelpers.sol";

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/**
 * @title GameHelpers
 * @notice This library contains helper functions for GameSystem
 */
library GameHelpers {
  function validateCreateGame(bytes32 player1, string memory username) public {
    string memory player1Username = Username.get(player1);
    if (bytes(player1Username).length == 0) {
      bytes32 usernameBytes = keccak256(abi.encodePacked(username));
      require(!UsernameTaken.get(usernameBytes), "GameSystem: username is taken");
      Username.set(player1, username);
      UsernameTaken.set(usernameBytes, true);
    }

    bytes32 currentGameId = CurrentGame.get(player1);
    if (currentGameId != 0) {
      GameData memory currentGame = Game.get(currentGameId);
      require(currentGame.endTimestamp != 0, "GameSystem: player1 has an ongoing game");
    }
  }

  function executePlayer2Actions(bytes32 gameId, address player1Address) public {
    bytes32 player1 = EntityHelpers.addressToEntityKey(player1Address);
    uint256 turnCount = Game.getRoundCount(gameId) - 1;

    bytes32[] memory actionIds = SavedGame.getActions(gameId);
    if (actionIds.length > turnCount) {
      address worldAddress = AddressBook.getWorld();
      ActionData memory action = Action.get(actionIds[turnCount]);
      (, int16 width) = MapConfig.get();
      action.newX = width - action.newX;
      action.oldX = width - action.oldX;

      if (action.actionType == ActionType.Install) {
        bytes memory data = abi.encodeWithSignature(
          "app__installTower(bytes32,bool,int16,int16)",
          CurrentGame.get(player1),
          action.projectile,
          action.newX,
          action.newY
        );

        (bool success, ) = worldAddress.call(data);
        require(success, "installTower call failed");
      } else if (action.actionType == ActionType.Move) {
        bytes memory data = abi.encodeWithSignature(
          "app__moveTower(bytes32,bytes32,int16,int16)",
          CurrentGame.get(player1),
          EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, action.oldX, action.oldY)),
          action.newX,
          action.newY
        );

        (bool success, ) = worldAddress.call(data);
        require(success, "moveTower call failed");
      } else if (action.actionType == ActionType.Modify) {
        ProjectileData memory projectileData = Projectile.get(actionIds[turnCount]);

        bytes memory data = abi.encodeWithSignature(
          "app__modifyTowerSystem(bytes32,bytes,string)",
          EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, action.oldX, action.oldY)),
          projectileData.bytecode,
          projectileData.sourceCode
        );

        (bool success, ) = worldAddress.call(data);
        require(success, "modifyTowerSystem call failed");
      }
    }
  }

  function endGame(bytes32 gameId, address winner) public {
    Game.setEndTimestamp(gameId, block.timestamp);
    Game.setWinner(gameId, winner);

    bytes32 winnerId = EntityHelpers.addressToEntityKey(winner);
    uint256 winStreak = WinStreak.get(winnerId) + 1;
    WinStreak.set(winnerId, winStreak);

    GameData memory game = Game.get(gameId);
    address loserAddress = game.player1Address == winner ? game.player2Address : game.player1Address;

    if (loserAddress == game.player1Address) {
      bytes32 loserId = EntityHelpers.addressToEntityKey(loserAddress);
      WinStreak.set(loserId, 0);
    }

    bytes32 savedGameId = keccak256(abi.encodePacked(gameId, winnerId));
    bytes32[] memory gamesByLevel = GamesByLevel.get(winStreak);

    bytes32[] memory updatedGamesByLevel = new bytes32[](gamesByLevel.length + 1);
    for (uint256 i = 0; i < gamesByLevel.length; i++) {
      updatedGamesByLevel[i] = gamesByLevel[i];

      if (gamesByLevel[i] == savedGameId) {
        return;
      }
    }
    updatedGamesByLevel[updatedGamesByLevel.length - 1] = savedGameId;
    GamesByLevel.set(winStreak, updatedGamesByLevel);
  }
}
