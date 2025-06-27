// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import "../mocks/MockUSDC.sol";

contract MintUsdcToPlayer is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");
    address playerAddress = vm.envAddress("PLAYER_ADDRESS");
    uint256 amount = 10 * 1e6; // 10 USDC

    vm.startBroadcast(deployerPrivateKey);
    IWorld(worldAddress).app__mintUsdcToPlayer(playerAddress, amount);
    vm.stopBroadcast();
  }
}
