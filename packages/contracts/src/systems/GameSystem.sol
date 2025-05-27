// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressToPlayerId, CurrentGame, Game, GameData, PlayerIdToAddress, SavedKingdom, SavedKingdomData, WinStreak } from "../codegen/index.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { GameHelpers } from "../Libraries/GameHelpers.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { ActionStorageHelpers } from "../Libraries/ActionStorageHelpers.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { MAX_ACTIONS, ROB_ID } from "../../constants.sol";
import "forge-std/console.sol";

contract GameSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "GameSystem: player not registered");
    _;
  }

  function createGame(string memory username, bool resetLevel) external returns (bytes32) {
    address player1Address = _msgSender();
    bytes32 globalPlayer1Id = EntityHelpers.addressToGlobalPlayerId(player1Address);

    if (globalPlayer1Id == bytes32(0)) {
      globalPlayer1Id = keccak256(abi.encodePacked(username, player1Address, block.timestamp));
      AddressToPlayerId.set(EntityHelpers.addressToKey(player1Address), globalPlayer1Id);
      PlayerIdToAddress.set(globalPlayer1Id, player1Address);
    }

    bytes32 savedKingdomId;

    GameHelpers.validateCreateGame(globalPlayer1Id, username);

    if (resetLevel) {
      WinStreak.set(globalPlayer1Id, 0);
      // Stake 8 kWh of electricity
      BatteryHelpers.stakeElectricity(globalPlayer1Id);
    } else {
      savedKingdomId = GameHelpers.nextLevel(globalPlayer1Id);
    }

    SavedKingdomData memory savedKingdom = SavedKingdom.get(savedKingdomId);
    return GameHelpers.initializeGame(globalPlayer1Id, savedKingdom.author, savedKingdomId);
  }

  function forfeitRun() external onlyRegisteredPlayer {
    bytes32 globalPlayer1Id = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 gameId = CurrentGame.get(globalPlayer1Id);
    require(gameId != bytes32(0), "GameSystem: no game found");

    GameData memory game = Game.get(gameId);
    require(game.endTimestamp == 0, "GameSystem: game has ended");
    require(globalPlayer1Id == game.player1Id, "GameSystem: not player1");

    ProjectileHelpers.endGame(gameId, game.player2Id);
  }

  function nextTurn(bytes32 gameId) external onlyRegisteredPlayer {
    GameData memory game = Game.get(gameId);
    require(game.endTimestamp == 0, "GameSystem: game has ended");

    bytes32 globalPlayer1Id = game.player1Id;
    bytes32 globalPlayer2Id = game.player2Id;

    require(EntityHelpers.addressToGlobalPlayerId(_msgSender()) == globalPlayer1Id, "GameSystem: not player1");

    if (game.turn == globalPlayer1Id) {
      // For all actions remaining, add that number of skipped actions
      uint256 skippedActions = Game.getActionCount(gameId);
      for (uint256 i = 0; i < skippedActions; i++) {
        ActionStorageHelpers.storeSkipAction(gameId);
      }

      bytes32 localPlayer1Id = EntityHelpers.globalToLocalPlayerId(globalPlayer1Id, gameId);
      bytes32 localPlayer2Id = EntityHelpers.globalToLocalPlayerId(globalPlayer2Id, gameId);

      bytes32[] memory allTowers = ProjectileHelpers.getAllTowers(localPlayer1Id, localPlayer2Id);
      ProjectileHelpers.clearAllProjectiles(allTowers);
    } else {
      Game.setRoundCount(gameId, game.roundCount + 1);
      ProjectileHelpers.executeRoundResults(gameId);
    }

    Game.setTurn(gameId, game.turn == globalPlayer1Id ? globalPlayer2Id : globalPlayer1Id);
    Game.setActionCount(gameId, MAX_ACTIONS);

    if (Game.getTurn(gameId) == globalPlayer2Id) {
      for (uint256 i = 0; i < MAX_ACTIONS; i++) {
        GameHelpers.executePlayer2Actions(gameId, globalPlayer1Id, globalPlayer2Id);
      }
    }
  }
}
