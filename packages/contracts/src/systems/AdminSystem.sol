// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressBook, KingdomsByLevel, Patent, PatentData, SavedKingdom, SolarFarmDetails, TopLevel, Username, UsernameTaken } from "../codegen/index.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { PatentHelpers } from "../Libraries/PatentHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT, ROB_ID } from "../../constants.sol";
import { _solarFarmSystemAddress } from "../utils.sol";
import "../../mocks/MockUSDC.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AdminSystem is System {
  function registerTemplatePatent(
    bytes memory bytecode,
    string memory description,
    string memory name,
    string memory sourceCode
  ) external returns (bytes32 patentId) {
    uint256 contractSize;
    address newSystem;
    assembly {
      newSystem := create(0, add(bytecode, 0x20), mload(bytecode))
    }

    assembly {
      contractSize := extcodesize(newSystem)
    }

    require(contractSize > 0, "AdminSystem: bytecode is invalid");
    require(
      contractSize <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );

    patentId = keccak256(abi.encodePacked(bytecode));

    bytes memory patentBytecode = Patent.getBytecode(patentId);
    require(keccak256(abi.encodePacked(patentBytecode)) != patentId, "AdminSystem: patent already exists");

    PatentHelpers.validatePatent(patentId, description, name);

    Patent.set(patentId, bytes32(0), contractSize, block.timestamp, 0, bytecode, description, name, sourceCode);
    return patentId;
  }

  function mintUsdcToPlayer(address player, uint256 amount) external {
    address usdcTokenAddress = AddressBook.getUsdcAddress();
    require(usdcTokenAddress != address(0), "USDC token address not set");
    MockUSDC usdc = MockUSDC(usdcTokenAddress);
    usdc.mint(player, amount);
  }

  function getSolarFarmSystemAddress() external view returns (address) {
    return _solarFarmSystemAddress();
  }

  function updateSolarFarmElectricityBalance(uint256 newElectricityBalance) external {
    SolarFarmDetails.setElectricityBalance(newElectricityBalance);
  }

  function syncSolarFarmFiatBalance() external {
    address usdcTokenAddress = AddressBook.getUsdcAddress();
    require(usdcTokenAddress != address(0), "USDC token address not set");
    MockUSDC usdc = MockUSDC(usdcTokenAddress);
    address solarFarmSystemAddress = _solarFarmSystemAddress();
    uint256 balance = usdc.balanceOf(solarFarmSystemAddress);
    SolarFarmDetails.setFiatBalance(balance);
  }

  function toggleSolarFarmRecharge() external {
    bool isPaused = SolarFarmDetails.getRechargePaused();
    SolarFarmDetails.setRechargePaused(!isPaused);
    if (!isPaused) {
      SolarFarmDetails.setUnpausedTimestamp(block.timestamp);
    }
  }

  function updatUsdcAddress(address usdcAddress) external {
    AddressBook.setUsdcAddress(usdcAddress);
  }

  function updateBuyReceiverAddress(address buyReceiverAddress) external {
    AddressBook.setBuyReceiverAddress(buyReceiverAddress);
  }

  function updateSellEmitterAddress(address sellEmitterAddress) external {
    AddressBook.setSellEmitterAddress(sellEmitterAddress);
  }

  function adminUpdateUsername(address playerAddress, string memory newUsername) external {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(playerAddress);
    require(globalPlayerId != bytes32(0), "AdminSystem: player not registered");
    string memory oldUsername = Username.get(globalPlayerId);
    bytes32 oldUsernameBytes = keccak256(abi.encodePacked(oldUsername));
    bytes32 newUsernameBytes = keccak256(abi.encodePacked(newUsername));
    require(oldUsernameBytes != newUsernameBytes, "AdminSystem: new username is the same as the current one");
    require(!UsernameTaken.get(newUsernameBytes), "AdminSystem: username is already taken");
    Username.set(globalPlayerId, newUsername);
    UsernameTaken.set(oldUsernameBytes, false);
    UsernameTaken.set(newUsernameBytes, true);
  }

  function grantElectricityToTopKingdoms() external {
    uint256 topLevel = TopLevel.get();
    require(topLevel > 1, "AdminSystem: no kingdoms to reward");

    uint256 count = 0;
    for (uint256 i = 2; i <= topLevel; i++) {
      bytes32[] memory kingdomsInLevel = KingdomsByLevel.get(i);
      if (kingdomsInLevel.length == 0) {
        continue;
      }
      for (uint256 j = 0; j < kingdomsInLevel.length; j++) {
        count++;
      }
    }

    bytes32[] memory kingdoms = new bytes32[](count);
    uint256 index = 0;
    for (uint256 i = 2; i <= topLevel; i++) {
      bytes32[] memory kingdomsInLevel = KingdomsByLevel.get(i);
      if (kingdomsInLevel.length == 0) {
        continue; // Skip if no kingdoms in this level
      }
      for (uint256 j = 0; j < kingdomsInLevel.length; j++) {
        kingdoms[index] = kingdomsInLevel[j];
        index++;
      }
    }
    require(kingdoms.length > 0, "AdminSystem: no kingdoms to reward");

    // Loop through each kingdom and reward 192kWh from the Solar Farm for each win of the kingdom
    for (uint256 i = 0; i < kingdoms.length; i++) {
      bytes32 kingdomId = kingdoms[i];
      uint256 kingdomWins = SavedKingdom.getWins(kingdomId);
      if (kingdomWins > 0) {
        uint256 reward = kingdomWins * 192e3; // 192kWh in Wh
        uint256 currentElectricityBalance = SolarFarmDetails.getElectricityBalance();
        require(currentElectricityBalance >= reward, "AdminSystem: not enough electricity in Solar Farm");
        SolarFarmDetails.setElectricityBalance(currentElectricityBalance - reward);
        SavedKingdom.setElectricityBalance(kingdomId, SavedKingdom.getElectricityBalance(kingdomId) + reward);
      }
    }
  }

  function updateTemplateBytecode(bytes memory oldBytecode, bytes memory newBytecode) external {
    bytes32 oldPatentId = keccak256(abi.encodePacked(oldBytecode));
    PatentData memory oldPatent = Patent.get(oldPatentId);
    require(keccak256(abi.encodePacked(oldPatent.bytecode)) == oldPatentId, "AdminSystem: patent does not exist");

    uint256 contractSize;
    address newSystem;
    assembly {
      newSystem := create(0, add(newBytecode, 0x20), mload(newBytecode))
    }

    assembly {
      contractSize := extcodesize(newSystem)
    }

    require(contractSize > 0, "AdminSystem: bytecode is invalid");
    require(
      contractSize <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );
    Patent.deleteRecord(oldPatentId);

    bytes32 newPatentId = keccak256(abi.encodePacked(newBytecode));
    PatentData memory newPatent = PatentData({
      patentee: oldPatent.patentee,
      size: contractSize,
      timestamp: oldPatent.timestamp,
      useCount: oldPatent.useCount,
      bytecode: newBytecode,
      description: oldPatent.description,
      name: oldPatent.name,
      sourceCode: oldPatent.sourceCode
    });
    Patent.set(newPatentId, newPatent);
  }
}
