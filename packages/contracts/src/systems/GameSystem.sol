// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Game, GameData, SavedGame, SavedGameData, WinStreak } from "../codegen/index.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { GameHelpers } from "../Libraries/GameHelpers.sol";
import "forge-std/console.sol";

contract GameSystem is System {
  function getGameSystemAddress() external view returns (address) {
    return address(this);
  }

  function createGame(string memory username, bool resetLevel) public returns (bytes32) {
    address player1Address = _msgSender();
    bytes32 globalPlayer1 = EntityHelpers.globalAddressToKey(player1Address);

    bytes32 savedGameId;

    if (resetLevel) {
      WinStreak.set(globalPlayer1, 0);
    } else {
      savedGameId = GameHelpers.nextLevel(player1Address);
    }

    GameHelpers.validateCreateGame(globalPlayer1, username);

    SavedGameData memory savedGame = SavedGame.get(savedGameId);
    return GameHelpers.initializeGame(player1Address, savedGame.winner, savedGameId, globalPlayer1);
  }

  function nextTurn(bytes32 gameId) external {
    GameData memory game = Game.get(gameId);
    require(game.endTimestamp == 0, "GameSystem: game has ended");

    address player1Address = game.player1Address;
    address player2Address = game.player2Address;

    address currentPlayerAddress = game.turn;
    if (game.turn == player1Address) {
      // TODO: Maybe bring back this restriction
      // require(newGame.actionCount == 0, "GameSystem: player has actions remaining");

      bytes32 localPlayer1 = EntityHelpers.localAddressToKey(gameId, player1Address);
      bytes32 localPlayer2 = EntityHelpers.localAddressToKey(gameId, player2Address);

      bytes32[] memory allTowers = ProjectileHelpers.getAllTowers(localPlayer1, localPlayer2);
      ProjectileHelpers.clearAllProjectiles(allTowers);
    } else {
      Game.setRoundCount(gameId, game.roundCount + 1);
      ProjectileHelpers.executeRoundResults(gameId);
    }

    Game.setTurn(gameId, currentPlayerAddress == player1Address ? player2Address : player1Address);
    Game.setActionCount(gameId, 1);

    if (Game.getTurn(gameId) == player2Address) {
      address worldAddress = _world();
      GameHelpers.executePlayer2Actions(worldAddress, gameId, player1Address);
    }
  }
}
