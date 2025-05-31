// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";

import { CurrentGame, DefaultLogic, EntityAtPosition, Game, GameData, Health, MapConfig, Owner, OwnerTowers, Patent, Position, Projectile, Tower, TowerCounter } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { TowerDetails } from "../interfaces/Structs.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { GameHelpers } from "./GameHelpers.sol";
import { ProjectileHelpers } from "./ProjectileHelpers.sol";
import { ActionStorageHelpers } from "./ActionStorageHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT, MAX_HEALTH_CANNON, MAX_HEALTH_WALL } from "../../constants.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TowerHelpers
 * @notice This library contains helper functions for TowerSystem
 */
library TowerHelpers {
  function installTower(
    bytes32 globalPlayerId,
    bytes32 gameId,
    bool projectile,
    int16 x,
    int16 y
  ) external returns (bytes32) {
    (x, y) = ProjectileHelpers.getActualCoordinates(x, y);
    _validateInstallTower(gameId, globalPlayerId, x, y);

    uint256 towerCounter = TowerCounter.get();
    bytes32 towerId = keccak256(abi.encodePacked(gameId, globalPlayerId, towerCounter));
    _initializeTower(towerId, gameId, globalPlayerId, x, y, projectile);
    bytes32 globalPlayer1Id = Game.getPlayer1Id(gameId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeInstallTowerAction(gameId, globalPlayerId, x, y, projectile);
    }
    TowerCounter.set(towerCounter + 1);

    return towerId;
  }

  function moveTower(
    bytes32 globalPlayerId,
    bytes32 gameId,
    bytes32 towerId,
    int16 x,
    int16 y
  ) external returns (bytes32) {
    _validateMoveTower(gameId, globalPlayerId, towerId, x, y);

    (int16 oldX, int16 oldY) = Position.get(towerId);

    (int16 actualX, int16 actualY) = ProjectileHelpers.getActualCoordinates(x, y);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(gameId, oldX, oldY), 0);

    Position.set(towerId, actualX, actualY);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(gameId, actualX, actualY), towerId);

    _decrementActionCount(gameId);

    bytes32 globalPlayer1Id = Game.getPlayer1Id(gameId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeMoveTowerAction(gameId, towerId, oldX, oldY, actualX, actualY);
    }

    return towerId;
  }

  function modifyTowerSystem(
    bytes32 globalPlayerId,
    bytes32 gameId,
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external returns (address projectileLogicAddress) {
    GameData memory currentGame = Game.get(gameId);

    _validModifySystem(gameId, towerId, globalPlayerId);

    address newSystem;
    assembly {
      newSystem := create(0, add(bytecode, 0x20), mload(bytecode))
    }

    uint256 size;
    assembly {
      size := extcodesize(newSystem)
    }

    require(size > 0, "TowerSystem: contract creation failed");
    require(
      size <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );

    Game.setActionCount(gameId, currentGame.actionCount - 1);
    Projectile.set(towerId, address(newSystem), DEFAULT_LOGIC_SIZE_LIMIT, bytecode, sourceCode);

    _incrementPatentUseCount(bytecode);

    bytes32 globalPlayer1Id = Game.getPlayer1Id(gameId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeModifyTowerAction(gameId, towerId, bytecode, newSystem, sourceCode);
    }
    return address(newSystem);
  }

  function _validateInstallTower(bytes32 gameId, bytes32 globalPlayerId, int16 x, int16 y) public view {
    require(gameId != 0, "TowerSystem: player has no ongoing game");

    GameData memory currentGame = Game.get(gameId);
    require(currentGame.endTimestamp == 0, "TowerSystem: game has ended");
    require(currentGame.actionCount > 0, "TowerSystem: player has no actions remaining");
    require(currentGame.turn == globalPlayerId, "TowerSystem: not player's turn");

    (int16 height, int16 width) = MapConfig.get();
    require(x >= 0 && x < width, "TowerSystem: x is out of bounds");
    require(y >= 0 && y < height, "TowerSystem: y is out of bounds");

    bytes32 positionEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, x, y));
    require(positionEntity == 0, "TowerSystem: position is occupied");

    if (globalPlayerId == currentGame.player2Id) {
      require(x > width / 2, "TowerSystem: x position is in enemy territory");
    } else {
      require(x < width / 2, "TowerSystem: x position is in player territory");
    }
  }

  function _validateMoveTower(bytes32 gameId, bytes32 globalPlayerId, bytes32 towerId, int16 x, int16 y) internal view {
    bytes32 towerGameId = CurrentGame.get(towerId);
    require(gameId != 0, "TowerSystem: player has no ongoing game");
    require(gameId == towerGameId, "TowerSystem: tower is not in player's ongoing game");

    GameData memory currentGame = Game.get(gameId);
    require(currentGame.endTimestamp == 0, "TowerSystem: game has ended");
    require(currentGame.turn == globalPlayerId, "TowerSystem: not player's turn");

    require(currentGame.actionCount > 0, "TowerSystem: player has no actions remaining");
    require(Tower.get(towerId), "TowerSystem: entity is not a tower");

    (int16 height, int16 width) = MapConfig.get();
    require(x >= 0 && x < width, "TowerSystem: x is out of bounds");
    require(y >= 0 && y < height, "TowerSystem: y is out of bounds");
    require(Owner.get(towerId) == globalPlayerId, "TowerSystem: player does not own tower");

    bytes32 positionEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(gameId, x, y));
    require(positionEntity == 0, "TowerSystem: position is occupied");

    if (globalPlayerId == currentGame.player2Id) {
      require(x > width / 2, "TowerSystem: x is in enemy territory");
    } else {
      require(x < width / 2, "TowerSystem: x is in player territory");
    }
  }

  function _initializeTower(
    bytes32 towerId,
    bytes32 gameId,
    bytes32 globalPlayerId,
    int16 x,
    int16 y,
    bool projectile
  ) public {
    Tower.set(towerId, true);
    CurrentGame.set(towerId, gameId);
    Owner.set(towerId, globalPlayerId);

    _addTowerToPlayer(gameId, globalPlayerId, towerId);

    if (projectile) {
      Health.set(towerId, MAX_HEALTH_CANNON, MAX_HEALTH_CANNON);

      address defaultProjectileLogicLeftAddress = DefaultLogic.get();
      Projectile.setLogicAddress(towerId, defaultProjectileLogicLeftAddress);
      Projectile.setSourceCode(
        towerId,
        "contract DefaultProjectileLogic { function getNextProjectilePosition( int16 x, int16 y ) public pure returns (int16, int16) { return (x + 5, y); } }"
      );
      Projectile.setSizeLimit(towerId, DEFAULT_LOGIC_SIZE_LIMIT);
    } else {
      Health.set(towerId, MAX_HEALTH_WALL, MAX_HEALTH_WALL);
    }
    Position.set(towerId, x, y);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(gameId, x, y), towerId);

    _decrementActionCount(gameId);
  }

  function _addTowerToPlayer(bytes32 gameId, bytes32 globalPlayerId, bytes32 towerId) internal {
    bytes32 localPlayerId = EntityHelpers.globalToLocalPlayerId(globalPlayerId, gameId);

    bytes32[] memory playerTowers = OwnerTowers.get(localPlayerId);
    bytes32[] memory updatedTowers = new bytes32[](playerTowers.length + 1);

    for (uint256 i = 0; i < playerTowers.length; i++) {
      updatedTowers[i] = playerTowers[i];
    }

    updatedTowers[playerTowers.length] = towerId;
    OwnerTowers.set(localPlayerId, updatedTowers);
  }

  function _decrementActionCount(bytes32 gameId) public {
    Game.setActionCount(gameId, Game.getActionCount(gameId) - 1);
  }

  function _validModifySystem(bytes32 gameId, bytes32 towerId, bytes32 globalPlayerId) public {
    bytes32 towerGameId = CurrentGame.get(towerId);
    GameData memory currentGame = Game.get(gameId);

    require(gameId != 0, "TowerSystem: player has no ongoing game");
    require(gameId == towerGameId, "TowerSystem: tower is not in player's ongoing game");

    if (globalPlayerId == currentGame.player2Id) {
      require(Owner.get(towerId) == currentGame.player2Id, "TowerSystem: player does not own tower");
      require(currentGame.turn == currentGame.player2Id, "TowerSystem: not player's turn");
    } else {
      require(Owner.get(towerId) == globalPlayerId, "TowerSystem: player does not own tower");
      require(currentGame.turn == globalPlayerId, "TowerSystem: not player's turn");
    }

    require(currentGame.endTimestamp == 0, "TowerSystem: game has ended");
    require(currentGame.actionCount > 0, "TowerSystem: player has no actions remaining");
    require(Tower.get(towerId), "TowerSystem: entity is not a tower");
    require(Health.getCurrentHealth(towerId) > 0, "TowerSystem: tower is destroyed");

    (int16 oldX, int16 oldY) = Position.get(towerId);

    bytes memory data = abi.encodeWithSignature("getNextProjectilePosition(int16,int16)", oldX, oldY);
    address projectileAddress = Projectile.getLogicAddress(towerId);
    (bool success, bytes memory returndata) = projectileAddress.call(data);
    require(success, "getNextProjectilePosition call failed");
    (oldX, oldY) = abi.decode(returndata, (int16, int16));

    (success, returndata) = projectileAddress.call(data);
    require(success, "getNextProjectilePosition call failed");
    (int16 newX, int16 newY) = abi.decode(returndata, (int16, int16));

    uint16 distance = ProjectileHelpers.chebyshevDistance(
      uint256(int256(oldX)),
      uint256(int256(oldY)),
      uint256(int256(newX)),
      uint256(int256(newY))
    );
    require(distance <= 1, "TowerSystem: projectile speed exceeds rules");
  }

  function _incrementPatentUseCount(bytes memory bytecode) public {
    bytes32 patentId = keccak256(abi.encodePacked(bytecode));
    bytes memory potentialExistingBytecode = Patent.getBytecode(patentId);

    if (keccak256(abi.encodePacked(potentialExistingBytecode)) == patentId) {
      uint256 existingBytecodeUseCount = Patent.getUseCount(patentId);
      Patent.setUseCount(patentId, existingBytecodeUseCount + 1);
    }
  }
}
