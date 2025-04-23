// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { ResourceId, WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";
import { ROOT_NAMESPACE_ID } from "@latticexyz/world/src/constants.sol";
import { AccessControl } from "@latticexyz/world/src/AccessControl.sol";
import { KingdomsByLevel, Level, SavedGame, SavedGameData, SavedKingdom, SavedKingdomData } from "../codegen/index.sol";
import "forge-std/console.sol";

contract AdminSystem is System {
  function addSavedKingdomRow(bytes32 savedGameId, uint256 level) external returns (bool isAdmin) {
    // Get the SavedGame by ID
    SavedGameData memory savedGame = SavedGame.get(savedGameId);

    // Create ID by hashing all actions
    bytes32 savedKingdomId = keccak256(abi.encode(savedGame.actions));

    // Check if the savedKingdomId already exists
    if (SavedKingdom.get(savedKingdomId).timestamp != 0) {
      console.log("Saved kingdom already exists");
      return false;
    }

    // Convert to SavedKingdom
    SavedKingdomData memory savedKingdom = SavedKingdomData({
      author: savedGame.winner,
      electricitybalance: 0,
      timestamp: block.timestamp,
      winStreak: 0,
      actions: savedGame.actions
    });

    // Store in KingdomsByLevel
    bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(level);
    bytes32[] memory updatedKingdomsByLevel = new bytes32[](kingdomsByLevel.length + 1);
    for (uint256 i = 0; i < kingdomsByLevel.length; i++) {
      updatedKingdomsByLevel[i] = kingdomsByLevel[i];

      if (kingdomsByLevel[i] == savedGameId) {
        console.log("Saved kingdom already exists in KingdomsByLevel");
        return false;
      }
    }

    updatedKingdomsByLevel[updatedKingdomsByLevel.length - 1] = savedGameId;
    KingdomsByLevel.set(level, updatedKingdomsByLevel);
    SavedKingdom.set(savedKingdomId, savedKingdom);
    Level.set(savedKingdomId, level);

    return true;
  }
}
