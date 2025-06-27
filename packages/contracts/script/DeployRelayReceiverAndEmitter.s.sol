// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { _solarFarmSystemAddress } from "../src/utils.sol";
import "../src/relayContracts/AutoTowerBuyReceiver.sol";
import "../src/relayContracts/AutoTowerSellEmitter.sol";

contract DeployRelayReceiverAndEmitter is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address validator = vm.envAddress("VALIDATOR_ADDRESS");
    address worldAddress = vm.envAddress("WORLD_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    address solarFarmSystem = IWorld(worldAddress).app__getSolarFarmSystemAddress();
    new AutoTowerBuyReceiver(validator, worldAddress);
    new AutoTowerSellEmitter(solarFarmSystem);
    vm.stopBroadcast();
  }
}
