// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import "../src/relayContracts/AutoTowerEscrow.sol";

contract DeployRelayEscrow is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address usdc = vm.envAddress("USDC_ADDRESS");
    address validator = vm.envAddress("VALIDATOR_ADDRESS");

    vm.startBroadcast(deployerPrivateKey);
    new AutoTowerEscrow(usdc, validator);
    vm.stopBroadcast();
  }
}
