// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";
import { Systems } from "@latticexyz/world/src/codegen/tables/Systems.sol";

import { CurrentGame, SavedModification, SavedModNameTaken } from "../codegen/index.sol";
import { ActionType } from "../codegen/common.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT, MAX_MOD_DESCRIPTION_LENGTH, MAX_MOD_NAME_LENGTH } from "../../constants.sol";
import { ProjectileHelpers } from "../Libraries/ProjectileHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { PatentHelpers } from "../Libraries/PatentHelpers.sol";
import { TowerHelpers } from "../Libraries/TowerHelpers.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// TOWER ID
// bytes32 towerId = keccak256(abi.encodePacked(currentGameId, playerAddress, timestamp));

contract TowerSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "TowerSystem: player not registered");
    _;
  }

  function playerInstallTower(bool projectile, int16 x, int16 y) external onlyRegisteredPlayer returns (bytes32) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 gameId = CurrentGame.get(globalPlayerId);
    return TowerHelpers.installTower(globalPlayerId, gameId, projectile, x, y);
  }

  function playerMoveTower(bytes32 towerId, int16 x, int16 y) external onlyRegisteredPlayer returns (bytes32) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 gameId = CurrentGame.get(globalPlayerId);
    return TowerHelpers.moveTower(globalPlayerId, gameId, towerId, x, y);
  }

  function playerModifyTowerSystem(
    bytes32 towerId,
    bytes memory bytecode,
    string memory sourceCode
  ) external onlyRegisteredPlayer returns (address projectileLogicAddress) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes32 gameId = CurrentGame.get(globalPlayerId);
    return TowerHelpers.modifyTowerSystem(globalPlayerId, gameId, towerId, bytecode, sourceCode);
  }

  function saveModification(
    bytes memory bytecode,
    string memory description,
    string memory name,
    string memory sourceCode
  ) external onlyRegisteredPlayer returns (bytes32 savedModificationId) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());

    uint256 contractSize = getContractSize(bytecode);
    require(contractSize > 0, "TowerSystem: bytecode is invalid");
    require(
      contractSize <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );

    savedModificationId = keccak256(abi.encodePacked(bytecode));

    bytes memory savedModificationBytecode = SavedModification.getBytecode(savedModificationId);
    require(
      keccak256(abi.encodePacked(savedModificationBytecode)) != savedModificationId,
      "TowerSystem: modification already exists"
    );

    PatentHelpers.validateModification(savedModificationId, description, name);

    SavedModification.set(
      savedModificationId,
      globalPlayerId,
      contractSize,
      block.timestamp,
      0,
      bytecode,
      description,
      name,
      sourceCode
    );
    return savedModificationId;
  }

  function editModification(
    bytes32 savedModificationId,
    string memory description,
    string memory name
  ) external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());

    bytes memory bytecode = SavedModification.getBytecode(savedModificationId);
    string memory originalName = SavedModification.getName(savedModificationId);

    bool nameHasChanged = keccak256(abi.encodePacked(originalName)) != keccak256(abi.encodePacked(name));
    bool descriptionHasChanged = keccak256(abi.encodePacked(SavedModification.getDescription(savedModificationId))) !=
      keccak256(abi.encodePacked(description));

    require(nameHasChanged || descriptionHasChanged, "TowerSystem: name and description are the same as original");
    require(keccak256(abi.encodePacked(bytecode)) == savedModificationId, "TowerSystem: modification does not exist");
    require(
      SavedModification.getAuthor(savedModificationId) == globalPlayerId,
      "TowerSystem: only the author can edit this modification"
    );

    PatentHelpers.validateModification(savedModificationId, description, name);

    SavedModification.setDescription(savedModificationId, description);
    SavedModification.setName(savedModificationId, name);
  }

  function deleteModification(bytes32 savedModificationId) external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes memory bytecode = SavedModification.getBytecode(savedModificationId);
    require(keccak256(abi.encodePacked(bytecode)) == savedModificationId, "TowerSystem: modification does not exist");
    require(
      SavedModification.getAuthor(savedModificationId) == globalPlayerId,
      "TowerSystem: only the author can delete this modification"
    );

    bytes32 nameHash = keccak256(abi.encodePacked(SavedModification.getName(savedModificationId)));
    SavedModNameTaken.set(nameHash, bytes32(0));
    SavedModification.deleteRecord(savedModificationId);
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
