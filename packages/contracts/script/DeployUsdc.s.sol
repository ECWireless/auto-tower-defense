// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../mocks/MockUSDC.sol";

contract DeployUsdc is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    uint256 amount = 10 * 1e6; // 10 USDC

    vm.startBroadcast(deployerPrivateKey);
    bytes32 salt = keccak256("mock-usdc");

    bytes memory bytecode = abi.encodePacked(
      type(MockUSDC).creationCode,
      abi.encode(vm.addr(deployerPrivateKey), amount)
    );
    address deployed = Create2.deploy(0, salt, bytecode);
    console.log("MockUSDC deployed at:");
    console.logAddress(deployed);
    vm.stopBroadcast();
  }
}
