// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract UpdateSolarFarmDetails is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    IWorld(worldAddress).app__updateSolarFarmElectricityBalance(16800000000); // 16.8 GWh
    IWorld(worldAddress).app__updateSolarFarmFiatBalance();
    IWorld(worldAddress).app__updateSolarFarmDetails(3600, 1920);

    vm.stopBroadcast();
  }
}
