// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { _solarFarmSystemAddress } from "../src/utils.sol";
import { BATTERY_STORAGE_LIMIT } from "../constants.sol";

import { AddressBook, BatteryDetails, SolarFarmDetails } from "../src/codegen/index.sol";
import "../mocks/MockUSDC.sol";

contract SolarFarmTest is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);

  function _mintUsdc(address to, uint256 amount) internal returns (MockUSDC) {
    address mockUsdcAddress = AddressBook.getUsdcAddress();
    MockUSDC usdc = MockUSDC(mockUsdcAddress);
    usdc.mint(to, amount);
    return usdc;
  }

  function _endGame(address player, bytes32 gameId) internal {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);

    // Need to go through 4 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
  }

  function testBuyElectricity() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 1920; // 1.92kWh
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();

    // Check that the USDC was transferred to the Solar Farm
    uint256 newBalance = usdc.balanceOf(aliceAddress);
    assertEq(newBalance, 990000);
    address solarFarmSystemAddress = _solarFarmSystemAddress();
    uint256 solarFarmBalance = usdc.balanceOf(solarFarmSystemAddress);
    assertEq(solarFarmBalance, 100010000); // 100.01 USDC

    // Check Solar Farm's electricity balance and fiat balance
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    assertEq(solarFarmElectricityBalance, 16798080); // 16.798080 MWh
    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    assertEq(solarFarmFiatBalance, 100010000); // 100.01 USDC

    // Check Alice's active battery balance and reserve balance
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 8000 + 1920); // minus 8kWh + 1.92kWh
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(reserveBalance, 0); // 0.00kWh
  }

  // Test buying electricity to fill active and reserve balance
  function testBuyElectricityFillReserveBalance() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.10 USDC
    usdc.approve(_solarFarmSystemAddress(), 100000); // 0.10 USDC
    uint256 electricityAmount = 19200; // 19.2kWh
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();

    // Check that the USDC was transferred to the Solar Farm
    uint256 newBalance = usdc.balanceOf(aliceAddress);
    assertEq(newBalance, 900000);
    address solarFarmSystemAddress = _solarFarmSystemAddress();
    uint256 solarFarmBalance = usdc.balanceOf(solarFarmSystemAddress);
    assertEq(solarFarmBalance, 100100000); // 100.10 USDC

    // Check Solar Farm's electricity balance and fiat balance
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    assertEq(solarFarmElectricityBalance, 16780800); // 16.780800 MWh
    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    assertEq(solarFarmFiatBalance, 100100000); // 100.10 USDC

    // Check Alice's active battery balance and reserve balance
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(reserveBalance, 19200 - 8000); // 19.2kWh - 8kWh
  }

  // Test revert buying before you have a battery
  function testRevertBuyElectricityNoBattery() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Approve the Solar Farm System to spend 0.01 USDC
    vm.startPrank(aliceAddress);
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 1920; // 1.92kWh
    vm.expectRevert("SolarFarmSystem: player must have a battery");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert buying zero electricity
  function testRevertBuyElectricityZero() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 0; // 0kWh
    vm.expectRevert("SolarFarmSystem: electricity amount must be greater than 0");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert buying less than 0.01 USDC worth of electricity
  function testRevertBuyElectricityTooLittle() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 192; // 0.192kWh
    vm.expectRevert("SolarFarmSystem: amount must be greater than 0.01 USDC");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert buying more electricity than Solar Farm has
  function testRevertBuyElectricityTooMuch() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 16800000 + 1; // 16.8 MWh + 1
    vm.expectRevert("SolarFarmSystem: not enough electricity in Solar Farm");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  function testSellElectricity() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.prank(aliceAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);

    // End game to put stake back in active balance
    _endGame(aliceAddress, gameId);

    // Make sure active balance is full
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT);

    // Approve the Solar Farm System to spend 0.01 USDC
    vm.startPrank(aliceAddress);
    address solarFarmSystemAddress = _solarFarmSystemAddress();
    usdc.approve(solarFarmSystemAddress, 10000); // 0.01 USDC

    // Buy electricity to fill the battery reserve
    uint256 electricityAmount = 1920; // 1.92kWh
    IWorld(worldAddress).app__buyElectricity(electricityAmount);

    // Sell electricity
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();

    // Make sure the USDC was transferred to Alice
    uint256 newBalance = usdc.balanceOf(aliceAddress);
    assertEq(newBalance, 1000000);
    uint256 solarFarmBalance = usdc.balanceOf(solarFarmSystemAddress);
    assertEq(solarFarmBalance, 100000000); // 100.00 USDC

    // Check Solar Farm's electricity balance and fiat balance
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    assertEq(solarFarmElectricityBalance, 16800000); // 16.8 MWh
    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    assertEq(solarFarmFiatBalance, 100000000); // 100.00 USDC

    // Check Alice's active battery balance and reserve balance
    activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT); // 24kWh
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(reserveBalance, 0); // 0.00kWh
  }

  // Test revert selling before you have a battery
  function testRevertSellElectricityNoBattery() public {
    uint256 electricityAmount = 1920; // 1.92kWh
    vm.expectRevert("SolarFarmSystem: player must have a battery");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
  }

  // Test revert selling zero electricity
  function testRevertSellElectricityZero() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 0; // 0kWh
    vm.expectRevert("SolarFarmSystem: electricity amount must be greater than 0");
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert selling less than 0.01 USDC worth of electricity
  function testRevertSellElectricityTooLittle() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 192; // 0.192kWh
    vm.expectRevert("SolarFarmSystem: amount must be greater than 0.01 USDC");
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert selling more electricity than the player has
  function testRevertSellElectricityTooMuch() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = BATTERY_STORAGE_LIMIT + 1; // 8kWh + 1
    vm.expectRevert("SolarFarmSystem: not enough electricity in battery reserve");
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert selling more electricity than the Solar Farm has in USDC
  function testRevertSellElectricityTooMuchFiat() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a game in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 16799998080 + 1; // 16.79999808 GWh + 1
    vm.expectRevert("SolarFarmSystem: not enough USDC in Solar Farm");
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();
  }

  function testClaimCharge() public {
    // Create a game in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 3600);

    // Before ending the game, the player should claim their recharge
    IWorld(worldAddress).app__claimRecharge();
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 8000 + 1000); // 24kWh - 8kWh + 1kWh
    assertEq(reserveBalance, 0); // 0.00kWh
    uint256 lastRechargeTimestampAfter = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assertEq(lastRechargeTimestampAfter, block.timestamp); // Last recharge timestamp should be updated
    vm.stopPrank();
  }

  function testClaimChargeMaxCharge() public {
    // Create a game in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Warp forward 24 hours (86400000 ms)
    vm.warp(block.timestamp + 86400);
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 86400);

    // Before ending the game, the player should claim their recharge
    IWorld(worldAddress).app__claimRecharge();
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT); // 24kWh
    assertEq(reserveBalance, 0); // 0.00kWh
    uint256 lastRechargeTimestampAfter = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assertEq(lastRechargeTimestampAfter, block.timestamp); // Last recharge timestamp should be updated
    vm.stopPrank();
  }

  // Test revert claiming recharge before you have a battery
  function testRevertClaimRechargeNoBattery() public {
    vm.expectRevert("SolarFarmSystem: player must have a battery");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
  }

  // Test revert claiming recharge when the battery is full
  function testRevertClaimRechargeFull() public {
    // Create a game in order to get a battery, and to stake 8kWh
    vm.prank(aliceAddress);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);

    // End game to return stake to active balance
    _endGame(aliceAddress, gameId);

    // Warp forward 24 hours (86400000 ms)
    vm.warp(block.timestamp + 86400);

    vm.expectRevert("SolarFarmSystem: battery already full");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
  }

  // Test revert claiming recharge when the player has no electricity to claim
  function testRevertClaimRechargeNoElectricity() public {
    // Create a game in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    vm.expectRevert("SolarFarmSystem: no electricity to claim");
    IWorld(worldAddress).app__claimRecharge();
    vm.stopPrank();
  }

  // Test revert when Solar Farm does not have enough electricity to offer
  function testRevertClaimRechargeNotEnoughElectricity() public {
    // Create a game in order to get a battery, and to stake 8kWh
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createGame("Alice", true);

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    bytes32 globalPlayerId = EntityHelpers.globalAddressToKey(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 3600);

    // Update the Solar Farm's electricity balance to 0
    uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
    address admin = vm.addr(adminPrivateKey);
    vm.prank(admin);
    IWorld(worldAddress).app__updateSolarFarmElectricityBalance(0);
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    assertEq(solarFarmElectricityBalance, 0); // 0.00kWh

    vm.expectRevert("SolarFarmSystem: not enough electricity in Solar Farm");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
  }
}
