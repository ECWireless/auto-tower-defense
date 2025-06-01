// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";

import { CurrentBattle, DefaultLogic, EntityAtPosition, Battle, BattleData, Health, MapConfig, Owner, OwnerTowers, Patent, Position, Projectile, Tower, TowerCounter } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { TowerDetails } from "../interfaces/Structs.sol";
import { EntityHelpers } from "./EntityHelpers.sol";
import { BattleHelpers } from "./GameHelpers.sol";
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
    bytes32 battleId,
    bool projectile,
    int16 x,
    int16 y
  ) external returns (bytes32) {
    (x, y) = ProjectileHelpers.getActualCoordinates(x, y);
    _validateInstallTower(battleId, globalPlayerId, x, y);

    uint256 towerCounter = TowerCounter.get();
    bytes32 towerId = keccak256(abi.encodePacked(battleId, globalPlayerId, towerCounter));
    _initializeTower(towerId, battleId, globalPlayerId, x, y, projectile);
    bytes32 globalPlayer1Id = Battle.getPlayer1Id(battleId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeInstallTowerAction(battleId, globalPlayerId, x, y, projectile);
    }
    TowerCounter.set(towerCounter + 1);

    return towerId;
  }

  function moveTower(
    bytes32 globalPlayerId,
    bytes32 battleId,
    bytes32 towerId,
    int16 x,
    int16 y
  ) external returns (bytes32) {
    _validateMoveTower(battleId, globalPlayerId, towerId, x, y);

    (int16 oldX, int16 oldY) = Position.get(towerId);

    (int16 actualX, int16 actualY) = ProjectileHelpers.getActualCoordinates(x, y);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, oldX, oldY), 0);

    Position.set(towerId, actualX, actualY);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, actualX, actualY), towerId);

    _decrementActionCount(battleId);

    bytes32 globalPlayer1Id = Battle.getPlayer1Id(battleId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeMoveTowerAction(battleId, towerId, oldX, oldY, actualX, actualY);
    }

    return towerId;
  }

  function modifyTowerSystem(
    bytes32 globalPlayerId,
    bytes32 battleId,
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external returns (address projectileLogicAddress) {
    BattleData memory currentBattle = Battle.get(battleId);

    _validModifySystem(battleId, towerId, globalPlayerId);

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

    Battle.setActionCount(battleId, currentBattle.actionCount - 1);
    Projectile.set(towerId, address(newSystem), DEFAULT_LOGIC_SIZE_LIMIT, bytecode, sourceCode);

    _incrementPatentUseCount(bytecode);

    bytes32 globalPlayer1Id = Battle.getPlayer1Id(battleId);
    if (globalPlayerId == globalPlayer1Id) {
      ActionStorageHelpers.storeModifyTowerAction(battleId, towerId, bytecode, newSystem, sourceCode);
    }
    return address(newSystem);
  }

  function _validateInstallTower(bytes32 battleId, bytes32 globalPlayerId, int16 x, int16 y) public view {
    require(battleId != 0, "TowerSystem: player has no ongoing battle");

    BattleData memory currentBattle = Battle.get(battleId);
    require(currentBattle.endTimestamp == 0, "TowerSystem: battle has ended");
    require(currentBattle.actionCount > 0, "TowerSystem: player has no actions remaining");
    require(currentBattle.turn == globalPlayerId, "TowerSystem: not player's turn");

    (int16 height, int16 width) = MapConfig.get();
    require(x >= 0 && x < width, "TowerSystem: x is out of bounds");
    require(y >= 0 && y < height, "TowerSystem: y is out of bounds");

    bytes32 positionEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(battleId, x, y));
    require(positionEntity == 0, "TowerSystem: position is occupied");

    if (globalPlayerId == currentBattle.player2Id) {
      require(x > width / 2, "TowerSystem: x position is in enemy territory");
    } else {
      require(x < width / 2, "TowerSystem: x position is in player territory");
    }
  }

  function _validateMoveTower(bytes32 battleId, bytes32 globalPlayerId, bytes32 towerId, int16 x, int16 y) internal view {
    bytes32 towerBattleId = CurrentBattle.get(towerId);
    require(battleId != 0, "TowerSystem: player has no ongoing battle");
    require(battleId == towerBattleId, "TowerSystem: tower is not in player's ongoing battle");

    BattleData memory currentBattle = Battle.get(battleId);
    require(currentBattle.endTimestamp == 0, "TowerSystem: battle has ended");
    require(currentBattle.turn == globalPlayerId, "TowerSystem: not player's turn");

    require(currentBattle.actionCount > 0, "TowerSystem: player has no actions remaining");
    require(Tower.get(towerId), "TowerSystem: entity is not a tower");

    (int16 height, int16 width) = MapConfig.get();
    require(x >= 0 && x < width, "TowerSystem: x is out of bounds");
    require(y >= 0 && y < height, "TowerSystem: y is out of bounds");
    require(Owner.get(towerId) == globalPlayerId, "TowerSystem: player does not own tower");

    bytes32 positionEntity = EntityAtPosition.get(EntityHelpers.positionToEntityKey(battleId, x, y));
    require(positionEntity == 0, "TowerSystem: position is occupied");

    if (globalPlayerId == currentBattle.player2Id) {
      require(x > width / 2, "TowerSystem: x is in enemy territory");
    } else {
      require(x < width / 2, "TowerSystem: x is in player territory");
    }
  }

  function _initializeTower(
    bytes32 towerId,
    bytes32 battleId,
    bytes32 globalPlayerId,
    int16 x,
    int16 y,
    bool projectile
  ) public {
    Tower.set(towerId, true);
    CurrentBattle.set(towerId, battleId);
    Owner.set(towerId, globalPlayerId);

    _addTowerToPlayer(battleId, globalPlayerId, towerId);

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
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(battleId, x, y), towerId);

    _decrementActionCount(battleId);
  }

  function _addTowerToPlayer(bytes32 battleId, bytes32 globalPlayerId, bytes32 towerId) internal {
    bytes32 localPlayerId = EntityHelpers.globalToLocalPlayerId(globalPlayerId, battleId);

    bytes32[] memory playerTowers = OwnerTowers.get(localPlayerId);
    bytes32[] memory updatedTowers = new bytes32[](playerTowers.length + 1);

    for (uint256 i = 0; i < playerTowers.length; i++) {
      updatedTowers[i] = playerTowers[i];
    }

    updatedTowers[playerTowers.length] = towerId;
    OwnerTowers.set(localPlayerId, updatedTowers);
  }

  function _decrementActionCount(bytes32 battleId) public {
    Battle.setActionCount(battleId, Battle.getActionCount(battleId) - 1);
  }

  function _validModifySystem(bytes32 battleId, bytes32 towerId, bytes32 globalPlayerId) public {
    bytes32 towerBattleId = CurrentBattle.get(towerId);
    BattleData memory currentBattle = Battle.get(battleId);

    require(battleId != 0, "TowerSystem: player has no ongoing battle");
    require(battleId == towerBattleId, "TowerSystem: tower is not in player's ongoing battle");

    if (globalPlayerId == currentBattle.player2Id) {
      require(Owner.get(towerId) == currentBattle.player2Id, "TowerSystem: player does not own tower");
      require(currentBattle.turn == currentBattle.player2Id, "TowerSystem: not player's turn");
    } else {
      require(Owner.get(towerId) == globalPlayerId, "TowerSystem: player does not own tower");
      require(currentBattle.turn == globalPlayerId, "TowerSystem: not player's turn");
    }

    require(currentBattle.endTimestamp == 0, "TowerSystem: battle has ended");
    require(currentBattle.actionCount > 0, "TowerSystem: player has no actions remaining");
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
