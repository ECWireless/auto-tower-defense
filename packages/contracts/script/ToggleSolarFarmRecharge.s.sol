// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract ToggleSolarFarmRecharge is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    IWorld(worldAddress).app__toggleSolarFarmRecharge();
    console.log("Solar Farm recharge paused state toggled");
    vm.stopBroadcast();
  }
}
