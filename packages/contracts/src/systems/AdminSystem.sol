// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressBook, KingdomsByLevel, Level, PlayerCount, SavedGame, SavedGameData, SavedKingdom, SavedKingdomData, SolarFarmDetails } from "../codegen/index.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import "../../mocks/MockUSDC.sol";

contract AdminSystem is System {
  function addSavedKingdomRow(bytes32 savedGameId, uint256 level) external returns (bool added) {
    // Get the SavedGame by ID
    SavedGameData memory savedGame = SavedGame.get(savedGameId);

    // Create ID by hashing all actions
    bytes32 savedKingdomId = keccak256(abi.encode(savedGame.actions));

    // Check if the savedKingdomId already exists
    if (SavedKingdom.get(savedKingdomId).createdAtTimestamp != 0) {
      return false;
    }

    // Convert to SavedKingdom
    SavedKingdomData memory savedKingdom = SavedKingdomData({
      author: savedGame.winner,
      createdAtTimestamp: block.timestamp,
      electricityBalance: 0,
      losses: 0,
      wins: 0,
      actions: savedGame.actions
    });

    // Store in KingdomsByLevel
    bytes32[] memory kingdomsByLevel = KingdomsByLevel.get(level);
    bytes32[] memory updatedKingdomsByLevel = new bytes32[](kingdomsByLevel.length + 1);
    for (uint256 i = 0; i < kingdomsByLevel.length; i++) {
      updatedKingdomsByLevel[i] = kingdomsByLevel[i];

      if (kingdomsByLevel[i] == savedKingdomId) {
        return false;
      }
    }

    updatedKingdomsByLevel[updatedKingdomsByLevel.length - 1] = savedKingdomId;
    KingdomsByLevel.set(level, updatedKingdomsByLevel);
    SavedKingdom.set(savedKingdomId, savedKingdom);
    Level.set(savedKingdomId, level);

    return true;
  }

  function mintUsdcToPlayer(address player, uint256 amount) external {
    address usdcTokenAddress = AddressBook.getUsdcAddress();
    require(usdcTokenAddress != address(0), "USDC token address not set");
    MockUSDC usdc = MockUSDC(usdcTokenAddress);
    usdc.mint(player, amount);
  }
}
