// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { AddressBook, SolarFarmDetails } from "../codegen/index.sol";
import { BatteryHelpers } from "../Libraries/BatteryHelpers.sol";
import { _solarFarmSystemAddress } from "../utils.sol";
import "../../mocks/MockUSDC.sol";

contract AdminSystem is System {
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
