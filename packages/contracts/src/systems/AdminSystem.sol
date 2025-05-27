// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressBook, SavedModification, SolarFarmDetails } from "../codegen/index.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { PatentHelpers } from "../Libraries/PatentHelpers.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT, ROB_ID } from "../../constants.sol";
import { _solarFarmSystemAddress } from "../utils.sol";
import "../../mocks/MockUSDC.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AdminSystem is System {
  function saveSystemTemplate(
    bytes memory bytecode,
    string memory description,
    string memory name,
    string memory sourceCode
  ) external returns (bytes32 savedModificationId) {
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

    savedModificationId = keccak256(abi.encodePacked(bytecode));

    bytes memory savedModificationBytecode = SavedModification.getBytecode(savedModificationId);
    require(
      keccak256(abi.encodePacked(savedModificationBytecode)) != savedModificationId,
      "AdminSystem: modification already exists"
    );

    PatentHelpers.validateModification(savedModificationId, description, name);

    SavedModification.set(
      savedModificationId,
      bytes32(0),
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

  function updatUsdcAddress(address usdcAddress) external {
    AddressBook.setUsdcAddress(usdcAddress);
  }

  function updateBuyReceiverAddress(address buyReceiverAddress) external {
    AddressBook.setBuyReceiverAddress(buyReceiverAddress);
  }

  function updateSellEmitterAddress(address sellEmitterAddress) external {
    AddressBook.setSellEmitterAddress(sellEmitterAddress);
  }
}
