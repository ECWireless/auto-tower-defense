// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract AddUsdcTokenAddress is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");
    address usdcAddress = vm.envAddress("USDC_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    IWorld(worldAddress).app__addUsdcTokenAddress(usdcAddress);
    vm.stopBroadcast();
  }
}
