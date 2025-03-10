// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";
import { Systems } from "@latticexyz/world/src/codegen/tables/Systems.sol";

import { _gameSystemAddress } from "../utils.sol";
import { CurrentGame, EntityAtPosition, Game, GameData, Position, Projectile, SavedModification, TowerCounter } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT, MAX_TOWER_HEALTH } from "../../constants.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { TowerHelpers } from "../Libraries/TowerHelpers.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// TOWER ID
// bytes32 towerId = keccak256(abi.encodePacked(currentGameId, playerAddress, timestamp));

contract TowerSystem is System {
  function getTowerSystemAddress() external view returns (address) {
    return address(this);
  }

  function installTower(bytes32 potentialGameId, bool projectile, int16 x, int16 y) external returns (bytes32) {
    address playerAddress = _msgSender();

    (x, y) = ProjectileHelpers.getActualCoordinates(x, y);
    TowerHelpers.validateInstallTower(potentialGameId, playerAddress, x, y);

    uint256 towerCounter = TowerCounter.get();
    address actualPlayerAddress = Game.get(potentialGameId).turn;
    bytes32 towerId = keccak256(abi.encodePacked(potentialGameId, actualPlayerAddress, towerCounter));
    TowerHelpers.initializeTower(towerId, potentialGameId, actualPlayerAddress, x, y, projectile);
    TowerHelpers.storeInstallTowerAction(potentialGameId, playerAddress, x, y, projectile);
    TowerCounter.set(towerCounter + 1);

    return towerId;
  }

  function moveTower(bytes32 potentialGameId, bytes32 towerId, int16 x, int16 y) external returns (bytes32) {
    address playerAddress = _msgSender();
    TowerHelpers.validateMoveTower(potentialGameId, playerAddress, towerId, x, y);

    (int16 oldX, int16 oldY) = Position.get(towerId);

    (int16 actualX, int16 actualY) = ProjectileHelpers.getActualCoordinates(x, y);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(potentialGameId, oldX, oldY), 0);

    Position.set(towerId, actualX, actualY);
    EntityAtPosition.set(EntityHelpers.positionToEntityKey(potentialGameId, actualX, actualY), towerId);

    TowerHelpers.decrementActionCount(potentialGameId);
    TowerHelpers.storeMoveTowerAction(potentialGameId, playerAddress, towerId, oldX, oldY, actualX, actualY);

    return towerId;
  }

  function modifyTowerSystem(
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external returns (address projectileLogicAddress) {
    address playerAddress = _msgSender();
    bytes32 playerGameId = CurrentGame.get(EntityHelpers.globalAddressToKey(playerAddress));

    address gameSystemAddress = _gameSystemAddress();
    if (playerAddress == gameSystemAddress) {
      playerGameId = CurrentGame.get(towerId);
    }

    GameData memory currentGame = Game.get(playerGameId);

    TowerHelpers.validModifySystem(playerGameId, gameSystemAddress, towerId, playerAddress);

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

    Game.setActionCount(playerGameId, currentGame.actionCount - 1);
    Projectile.set(towerId, address(newSystem), DEFAULT_LOGIC_SIZE_LIMIT, bytecode, sourceCode);

    TowerHelpers.incrementSavedModificationUseCount(bytecode);
    TowerHelpers.storeModifyTowerAction(playerGameId, playerAddress, towerId, bytecode, newSystem, sourceCode);
    return address(newSystem);
  }

  function saveModification(bytes memory bytecode, string memory description, string memory name, string memory sourceCode) external returns (bytes32 savedModificationId) {
    address author = _msgSender();
    uint256 contractSize = getContractSize(bytecode);

    require(contractSize > 0, "TowerSystem: bytecode is invalid");
    require(
      contractSize <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );

    savedModificationId = keccak256(abi.encodePacked(bytecode));

    bytes memory savedModificationBytecode = SavedModification.getBytecode(savedModificationId);
    require(keccak256(abi.encodePacked(savedModificationBytecode)) != savedModificationId, "TowerSystem: modification already exists");

    SavedModification.set(savedModificationId, author, contractSize, 0, bytecode, description, name, sourceCode);
    return savedModificationId;
  }

  function getContractSize(bytes memory bytecode) public returns (uint256 size) {
    address newSystem;
    assembly {
      newSystem := create(0, add(bytecode, 0x20), mload(bytecode))
    }

    assembly {
      size := extcodesize(newSystem)
    }
    return size;
  }
}
