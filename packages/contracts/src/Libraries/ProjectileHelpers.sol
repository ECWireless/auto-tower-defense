// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Castle, CurrentGame, EntityAtPosition, Game, GameData, Health, KingdomsByLevel, LastGameWonInRun, Level, MapConfig, Owner, OwnerTowers, Position, Projectile, ProjectileTrajectory, SavedGame, SavedKingdom, SavedKingdomData, TopLevel, WinStreak } from "../codegen/index.sol";
import { TowerDetails } from "../interfaces/Structs.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { BatteryHelpers } from "./BatteryHelpers.sol";
import { MAX_ROUNDS, MAX_TICKS, MAX_HEALTH_WALL } from "../../constants.sol";

/**
 * @title ProjectileHelpers
 * @notice This library contains helper functions for projectile calculations
 */
library ProjectileHelpers {
  function executeRoundResults(bytes32 gameId) public {
    GameData memory game = Game.get(gameId);

    address player1Address = game.player1Address;
    address player2Address = game.player2Address;

    bytes32 localPlayer1Id = EntityHelpers.localAddressToKey(gameId, player1Address);
    bytes32 localPlayer2Id = EntityHelpers.localAddressToKey(gameId, player2Address);

    bytes32[] memory allTowers = getAllTowers(localPlayer1Id, localPlayer2Id);
    TowerDetails[] memory towers = _getTowerDetails(allTowers);

    _simulateTicks(towers);

    bool isGameOver = Game.getEndTimestamp(gameId) != 0;
    if (game.roundCount > MAX_ROUNDS && !isGameOver) {
      endGame(gameId, game.player2Address);
    }
  }

  function clearAllProjectiles(bytes32[] memory allTowers) public {
    for (uint256 i = 0; i < allTowers.length; i++) {
      bytes32 towerId = allTowers[i];
      ProjectileTrajectory.set(towerId, new int16[](0), new int16[](0));
    }
  }

  function getAllTowers(bytes32 localPlayer1Id, bytes32 localPlayer2Id) public view returns (bytes32[] memory) {
    bytes32[] memory towers1 = OwnerTowers.get(localPlayer1Id);
    bytes32[] memory towers2 = OwnerTowers.get(localPlayer2Id);

    bytes32[] memory allTowers = new bytes32[](towers1.length + towers2.length);
    uint256 index = 0;

    for (uint256 i = 0; i < towers1.length; i++) {
      allTowers[index++] = towers1[i];
    }

    for (uint256 i = 0; i < towers2.length; i++) {
      allTowers[index++] = towers2[i];
    }

    return allTowers;
  }

  function _getTowerDetails(bytes32[] memory allTowers) internal view returns (TowerDetails[] memory) {
    TowerDetails[] memory towers = new TowerDetails[](allTowers.length);

    for (uint256 i = 0; i < allTowers.length; i++) {
      bytes32 towerId = allTowers[i];
      int16 x = Position.getX(towerId);
      int16 y = Position.getY(towerId);
      address owner = Owner.get(towerId);

      towers[i] = TowerDetails({
        id: towerId,
        health: Health.getCurrentHealth(towerId),
        owner: owner,
        projectileAddress: Projectile.getLogicAddress(towerId),
        projectileX: x,
        projectileY: y,
        x: x,
        y: y
      });
    }

    return towers;
  }

  function _simulateTicks(TowerDetails[] memory towers) internal {
    for (uint256 tick = 0; tick < MAX_TICKS; tick++) {
      _processTick(towers);
    }
  }

  function _processTick(TowerDetails[] memory towers) internal {
    for (uint256 i = 0; i < towers.length; i++) {
      // Step 1: early checks
      if (towers[i].health == 0 || towers[i].projectileAddress == address(0)) {
        continue;
      }

      // Step 2: get the next projectile position
      (int16 newX, int16 newY) = _getNextProjectilePosition(towers[i]);

      // Step 3: validate distance and check out-of-bounds
      bool isValidMove = _validateProjectileMovement(towers, i, newX, newY);
      if (!isValidMove) {
        // either set projectile to 0 or continue, depending on your logic
        towers[i].projectileAddress = address(0);
        continue;
      }

      // Step 4: update the trajectory
      _updateProjectileTrajectory(towers[i].id, newX, newY);

      // Step 5: finalize the projectile movement and collisions
      _handleProjectileMovement(towers, i, newX, newY);
    }
  }

  function getActualCoordinates(int16 x, int16 y) public pure returns (int16 actualX, int16 actualY) {
    if (x == 0) {
      actualX = 5;
    } else {
      actualX = (x / 10) * 10 + 5;
    }

    if (y == 0) {
      actualY = 5;
    } else {
      actualY = (y / 10) * 10 + 5;
    }

    return (actualX, actualY);
  }

  function _getNextProjectilePosition(TowerDetails memory tower) internal returns (int16 newX, int16 newY) {
    // get position from call to Tower System
    bytes memory data = abi.encodeWithSignature(
      "getNextProjectilePosition(int16,int16)",
      tower.projectileX,
      tower.projectileY
    );

    (bool success, bytes memory returndata) = tower.projectileAddress.call(data);
    require(success, "getNextProjectilePosition call failed");

    (newX, newY) = abi.decode(returndata, (int16, int16));

    (, int16 mapWidth) = MapConfig.get();
    if (tower.x > mapWidth / 2) {
      uint256 displacement = _absDiff(uint256(int256(tower.projectileX)), uint256(int256(newX)));
      newX = tower.projectileX - int16(int256(displacement));
    }
  }

  function _validateProjectileMovement(
    TowerDetails[] memory towers,
    uint256 towerIndex,
    int16 newX,
    int16 newY
  ) internal view returns (bool) {
    TowerDetails memory tower = towers[towerIndex];

    // If x distance > 10 => invalid
    uint16 distance = chebyshevDistance(
      uint256(int256(tower.projectileX)),
      uint256(int256(tower.projectileY)),
      uint256(int256(newX)),
      uint256(int256(tower.projectileY))
    );
    if (distance > 10) {
      return false;
    }

    // Check out-of-bounds
    (int16 mapHeight, int16 mapWidth) = MapConfig.get();
    if (newX > mapWidth - 1 || newX < 0 || newY > mapHeight - 1 || newY < 0) {
      return false;
    }

    return true;
  }

  function _updateProjectileTrajectory(bytes32 towerId, int16 newProjectileX, int16 newProjectileY) internal {
    (int16[] memory prevX, int16[] memory prevY) = ProjectileTrajectory.get(towerId);

    int16[] memory newX = new int16[](prevX.length + 1);
    int16[] memory newY = new int16[](prevY.length + 1);

    for (uint256 j = 0; j < prevX.length; j++) {
      newX[j] = prevX[j];
      newY[j] = prevY[j];
    }
    newX[prevX.length] = newProjectileX;
    newY[prevY.length] = newProjectileY;

    ProjectileTrajectory.set(towerId, newX, newY);
  }

  function _handleProjectileMovement(
    TowerDetails[] memory towers,
    uint256 i,
    int16 newProjectileX,
    int16 newProjectileY
  ) internal {
    bytes32 gameId = CurrentGame.get(towers[i].id);
    (int16 actualX, int16 actualY) = getActualCoordinates(newProjectileX, newProjectileY);
    bytes32 positionEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, actualX, actualY));
    address entityOwner = Owner.get(positionEntity);

    if (positionEntity != 0 && towers[i].id != positionEntity && entityOwner != towers[i].owner) {
      _handleCollision(towers, i, positionEntity);
    } else {
      towers[i].projectileX = newProjectileX;
      towers[i].projectileY = newProjectileY;
    }
  }

  function _handleCollision(TowerDetails[] memory towers, uint256 i, bytes32 positionEntity) internal {
    uint8 entityHealth = Health.getCurrentHealth(positionEntity);

    if (entityHealth == 0) {
      return;
    }
    uint8 newHealth = entityHealth - 1;

    if (Castle.get(positionEntity)) {
      Health.setCurrentHealth(positionEntity, newHealth);
      towers[i].projectileAddress = address(0);

      if (newHealth == 0) {
        bytes32 gameId = CurrentGame.get(towers[i].id);
        if (gameId == 0) {
          gameId = CurrentGame.get(positionEntity);
        }

        // Preference is given to player 1 if both castles are destroyed at the same time
        if (Game.getEndTimestamp(gameId) == 0) {
          endGame(gameId, Owner.get(towers[i].id));
        }
      }
    } else {
      Health.setCurrentHealth(positionEntity, newHealth);
      towers[i].projectileAddress = address(0);

      if (newHealth == 0) {
        _removeDestroyedTower(positionEntity);
      }
    }

    (int16[] memory prevX, int16[] memory prevY) = ProjectileTrajectory.get(towers[i].id);

    int16[] memory newX = new int16[](prevX.length + 4);
    int16[] memory newY = new int16[](prevY.length + 4);

    for (uint256 j = 0; j < prevX.length; j++) {
      newX[j] = prevX[j];
      newY[j] = prevY[j];
    }

    for (uint256 j = prevX.length; j < newX.length; j++) {
      newX[j] = prevX[prevX.length - 1];
      newY[j] = prevY[prevY.length - 1];
    }

    ProjectileTrajectory.set(towers[i].id, newX, newY);
  }

  function _removeDestroyedTower(bytes32 positionEntity) internal {
    bytes32 gameId = CurrentGame.get(positionEntity);

    Health.set(positionEntity, 0, MAX_HEALTH_WALL);
    EntityAtPosition.set(
      EntityHelpers.positionToEntityKey(gameId, Position.getX(positionEntity), Position.getY(positionEntity)),
      0
    );
    Position.set(positionEntity, -1, -1);
  }

  // Allows (0,1), (1,1), and (1,0) to all be the same distance from (0,0)
  function chebyshevDistance(uint256 x1, uint256 y1, uint256 x2, uint256 y2) public pure returns (uint16) {
    return uint16(_max(_absDiff(x1, x2), _absDiff(y1, y2)));
  }

  function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
    return a > b ? a - b : b - a;
  }

  function _max(uint256 a, uint256 b) internal pure returns (uint256) {
    return a >= b ? a : b;
  }

  function endGame(bytes32 gameId, address winner) public {
    require(Game.getWinner(gameId) == address(0), "GameSystem: game has already ended");
    require(Game.getEndTimestamp(gameId) == 0, "GameSystem: game has already ended");

    Game.setEndTimestamp(gameId, block.timestamp);
    Game.setWinner(gameId, winner);

    (int16 mapHeight, int16 mapWidth) = MapConfig.get();

    GameData memory game = Game.get(gameId);
    bool isWinnerPlayer1 = game.player1Address == winner;
    bytes32 loserCastleId = isWinnerPlayer1
      ? EntityHelpers.positionToEntityKey(gameId, mapWidth - 5, mapHeight / 2)
      : EntityHelpers.positionToEntityKey(gameId, 5, mapHeight / 2);

    uint8 loserCastleHealth = Health.getCurrentHealth(loserCastleId);
    require(loserCastleHealth == 0, "GameSystem: loser castle health is not zero");

    bytes32 globalPlayer1Id = EntityHelpers.globalAddressToKey(game.player1Address);
    uint256 winStreak = WinStreak.get(globalPlayer1Id);

    if (isWinnerPlayer1) {
      // If they win, save their last game won in run, but don't save to KingdomsByLevel
      // However, if they have the highest level, set won game in KingdomsByLevel

      winStreak++;
      WinStreak.set(globalPlayer1Id, winStreak);
      bytes32[] memory savedGameActions = SavedGame.getActions(gameId);

      // Create ID by hashing all actions
      bytes32 savedKingdomId = keccak256(abi.encode(savedGameActions));
      uint256 savedKingdomTimestamp = SavedKingdom.getTimestamp(savedKingdomId);

      BatteryHelpers.winStake(gameId, globalPlayer1Id);

      // If this saved kingdom already exists, skip everything below
      if (savedKingdomTimestamp != 0) {
        return;
      }

      _saveKingdom(winner, savedGameActions, savedKingdomId);

      bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(winStreak);
      if (kingdomsByLevel.length == 0) {
        TopLevel.set(winStreak);
        _updateKingdomsByLevel(kingdomsByLevel, savedKingdomId, winStreak, globalPlayer1Id);
      } else {
        LastGameWonInRun.set(globalPlayer1Id, savedKingdomId);
      }

      // Only save the game in KingdomsByLevel if the loser is player 1, and they have a LastGameWonInRun
    } else {
      bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(winStreak);
      bytes32 savedKingdomId = LastGameWonInRun.get(globalPlayer1Id);

      if (savedKingdomId != bytes32(0) && winStreak > 0) {
        _updateKingdomsByLevel(kingdomsByLevel, savedKingdomId, winStreak, globalPlayer1Id);
      }

      WinStreak.set(globalPlayer1Id, 0);

      BatteryHelpers.loseStake(gameId, globalPlayer1Id);
    }
  }

  function _updateKingdomsByLevel(
    bytes32[] memory kingdomsByLevel,
    bytes32 savedKingdomId,
    uint winStreak,
    bytes32 globalPlayer1Id
  ) internal {
    bytes32[] memory updatedKingdomsByLevel = new bytes32[](kingdomsByLevel.length + 1);
    for (uint256 i = 0; i < kingdomsByLevel.length; i++) {
      updatedKingdomsByLevel[i] = kingdomsByLevel[i];

      if (kingdomsByLevel[i] == savedKingdomId) {
        return;
      }
    }

    updatedKingdomsByLevel[updatedKingdomsByLevel.length - 1] = savedKingdomId;
    KingdomsByLevel.set(winStreak, updatedKingdomsByLevel);
    Level.set(savedKingdomId, winStreak);

    LastGameWonInRun.set(globalPlayer1Id, bytes32(0));
  }

  function _saveKingdom(address winner, bytes32[] memory savedGameActions, bytes32 savedKingdomId) internal {
    SavedKingdomData memory savedKingdom = SavedKingdomData({
      author: winner,
      electricityBalance: 0,
      losses: 0,
      timestamp: block.timestamp,
      wins: 0,
      actions: savedGameActions
    });
    SavedKingdom.set(savedKingdomId, savedKingdom);
  }
}
