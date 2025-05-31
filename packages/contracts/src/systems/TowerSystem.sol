// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { CurrentGame } from "../codegen/index.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { TowerHelpers } from "../Libraries/TowerHelpers.sol";

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
}
