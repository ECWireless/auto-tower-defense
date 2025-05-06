// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract AddSolarFarmAddress is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");
    address solarFarmAddress = vm.envAddress("SOLAR_FARM_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    IWorld(worldAddress).app__addSolarFarmAddress(solarFarmAddress);
    vm.stopBroadcast();
  }
}
