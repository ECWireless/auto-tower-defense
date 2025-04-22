// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../mocks/MockUSDC.sol";

contract DeployMockUSDC is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    address deployer = vm.addr(deployerPrivateKey);
    uint256 supply = 1_000_000 * 1e6;
    bytes32 salt = keccak256("mock-usdc");

    bytes memory bytecode = abi.encodePacked(type(MockUSDC).creationCode, abi.encode(deployer, supply));
    address deployed = Create2.deploy(0, salt, bytecode);
    console.log("MockUSDC deployed at:");
    console.logAddress(deployed);

    vm.stopBroadcast();
  }
}
