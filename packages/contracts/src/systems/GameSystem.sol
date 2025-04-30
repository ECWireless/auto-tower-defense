// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { CurrentGame, Game, GameData, SavedKingdom, SavedKingdomData, WinStreak } from "../codegen/index.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { GameHelpers } from "../Libraries/GameHelpers.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { ActionStorageHelpers } from "../Libraries/ActionStorageHelpers.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { MAX_ACTIONS } from "../../constants.sol";
import "forge-std/console.sol";

contract GameSystem is System {
  function getGameSystemAddress() external view returns (address) {
    return address(this);
  }

  function createGame(string memory username, bool resetLevel) external returns (bytes32) {
    address player1Address = _msgSender();
    bytes32 globalPlayer1 = EntityHelpers.globalAddressToKey(player1Address);

    bytes32 savedKingdomId;

    GameHelpers.validateCreateGame(globalPlayer1, username);

    if (resetLevel) {
      WinStreak.set(globalPlayer1, 0);
      // Stake 8 kWh of electricity
      BatteryHelpers.stakeElectricity(globalPlayer1);
    } else {
      savedKingdomId = GameHelpers.nextLevel(player1Address);
    }

    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    return GameHelpers.initializeGame(player1Address, savedKingdom.author, savedKingdomId, globalPlayer1);
  }

  function forfeitRun() external {
    address player1Address = _msgSender();
    bytes32 globalPlayer1 = EntityHelpers.globalAddressToKey(player1Address);
    bytes32 gameId = CurrentGame.get(globalPlayer1);

    GameData memory game = Game.get(gameId);
    require(game.endTimestamp == 0, "GameSystem: game has ended");

    address player2Address = game.player2Address;
    require(player1Address == game.player1Address, "GameSystem: not player1");

    ProjectileHelpers.endGame(gameId, player2Address);
  }

  function nextTurn(bytes32 gameId) external {
    GameData memory game = Game.get(gameId);
    require(game.endTimestamp == 0, "GameSystem: game has ended");

    address player1Address = game.player1Address;
    address player2Address = game.player2Address;

    require(_msgSender() == player1Address, "GameSystem: not player1");

    address currentPlayerAddress = game.turn;
    if (game.turn == player1Address) {
      // For all actions remaining, add that number of skipped actions
      uint256 skippedActions = Game.getActionCount(gameId);
      for (uint256 i = 0; i < skippedActions; i++) {
        ActionStorageHelpers.storeSkipAction(gameId);
      }

      bytes32 localPlayer1 = EntityHelpers.localAddressToKey(gameId, player1Address);
      bytes32 localPlayer2 = EntityHelpers.localAddressToKey(gameId, player2Address);

      bytes32[] memory allTowers = ProjectileHelpers.getAllTowers(localPlayer1, localPlayer2);
      ProjectileHelpers.clearAllProjectiles(allTowers);
    } else {
      Game.setRoundCount(gameId, game.roundCount + 1);
      ProjectileHelpers.executeRoundResults(gameId);
    }

    Game.setTurn(gameId, currentPlayerAddress == player1Address ? player2Address : player1Address);
    Game.setActionCount(gameId, MAX_ACTIONS);

    if (Game.getTurn(gameId) == player2Address) {
      for (uint256 i = 0; i < MAX_ACTIONS; i++) {
        GameHelpers.executePlayer2Actions(gameId, player1Address, player2Address);
      }
    }
  }
}
