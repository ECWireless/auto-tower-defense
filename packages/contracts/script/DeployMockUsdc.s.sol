// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../mocks/MockUSDC.sol";
import { console } from "forge-std/console.sol";

contract DeployMockUsdc is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address solarFarmAddress = vm.envAddress("SOLAR_FARM_ADDRESS");
    uint256 amount = 100 * 1e6; // 10 USDC

    vm.startBroadcast(deployerPrivateKey);
    bytes32 salt = keccak256("mock-usdc");

    bytes memory bytecode = abi.encodePacked(type(MockUSDC).creationCode, abi.encode(solarFarmAddress, amount));
    address deployed = Create2.deploy(0, salt, bytecode);
    console.log("MockUSDC deployed at:");
    console.logAddress(deployed);
    vm.stopBroadcast();
  }
}
