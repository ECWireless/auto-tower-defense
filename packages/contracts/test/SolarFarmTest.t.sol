// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { _solarFarmSystemAddress } from "../src/utils.sol";
import { BATTERY_STORAGE_LIMIT, REWARD_AMOUNT } from "../constants.sol";

import { AddressBook, BatteryDetails, KingdomsByLevel, LastRewardDistro, SavedKingdom, SolarFarmDetails, TopLevel } from "../src/codegen/index.sol";
import "../mocks/MockUSDC.sol";

contract SolarFarmTest is MudTest {
  address aliceAddress = vm.addr(1);
  address bobAddress = vm.addr(2);

  address public adminAddress = vm.addr(vm.envUint("PRIVATE_KEY"));
  bytes constant AUTHORED_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101ef8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea26469706673582212200f36ce47d179e4a4274b65916ffd491b33285775935ab7ab90dc53e854837fdb64736f6c634300081c0033";

  function _mintUsdc(address to, uint256 amount) internal returns (MockUSDC) {
    address mockUsdcAddress = AddressBook.getUsdcAddress();
    MockUSDC usdc = MockUSDC(mockUsdcAddress);
    usdc.mint(to, amount);
    return usdc;
  }

  function _beatTutorial(address player, string memory username) internal {
    vm.startPrank(player);
    bytes32 battleId = IWorld(worldAddress).app__createBattle(username, true);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);

    // Need to go through 1 turn to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);

    vm.warp(block.timestamp + 1 hours);

    battleId = IWorld(worldAddress).app__createBattle(username, false);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 55, 15);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, AUTHORED_BYTECODE, "");

    // Need to go through 3 turns to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);
    IWorld(worldAddress).app__nextTurn(battleId);

    vm.stopPrank();
    vm.warp(block.timestamp + 1 hours);
  }

  function testBuyElectricity() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 8000 + 1920); // minus 8kWh + 1.92kWh
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(reserveBalance, 0); // 0.00kWh
  }

  // Test buying electricity to fill active and reserve balance
  function testBuyElectricityFillReserveBalance() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(reserveBalance, 19200 - 8000); // 19.2kWh - 8kWh
  }

  // Test revert buying player not registered
  function testRevertBuyElectricityNotRegistered() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Approve the Solar Farm System to spend 0.01 USDC
    vm.startPrank(aliceAddress);
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 1920; // 1.92kWh
    vm.expectRevert("SolarFarmSystem: player not registered");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  // Test revert buying zero electricity
  function testRevertBuyElectricityZero() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 16800000 + 1; // 16.8 MWh + 1
    vm.expectRevert("SolarFarmSystem: not enough electricity in Solar Farm");
    IWorld(worldAddress).app__buyElectricity(electricityAmount);
    vm.stopPrank();
  }

  function testSellElectricity() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a battle in order to get a battery
    _beatTutorial(aliceAddress, "Alice");

    // Make sure active balance is full
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
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

  // Test revert selling before player is registered
  function testRevertSellElectricityNotRegistered() public {
    uint256 electricityAmount = 1920; // 1.92kWh
    vm.expectRevert("SolarFarmSystem: player not registered");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
  }

  // Test revert selling zero electricity
  function testRevertSellElectricityZero() public {
    MockUSDC usdc = _mintUsdc(aliceAddress, 1 * 1e6); // 1 USDC

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

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

    // Create a battle in order to get a battery
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Approve the Solar Farm System to spend 0.01 USDC
    usdc.approve(_solarFarmSystemAddress(), 10000); // 0.01 USDC
    uint256 electricityAmount = 16799998080 + 1; // 16.79999808 GWh + 1
    vm.expectRevert("SolarFarmSystem: not enough USDC in Solar Farm");
    IWorld(worldAddress).app__sellElectricity(electricityAmount);
    vm.stopPrank();
  }

  function testClaimCharge() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 3600);

    // Before ending the battle, the player should claim their recharge
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
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Warp forward 24 hours (86400000 ms)
    vm.warp(block.timestamp + 86400);
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 86400);

    // Before ending the battle, the player should claim their recharge
    IWorld(worldAddress).app__claimRecharge();
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT); // 24kWh
    assertEq(reserveBalance, 0); // 0.00kWh
    uint256 lastRechargeTimestampAfter = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assertEq(lastRechargeTimestampAfter, block.timestamp); // Last recharge timestamp should be updated
    vm.stopPrank();
  }

  // Test revert claiming recharge before player is registered
  function testRevertClaimRechargeNotRegistered() public {
    vm.expectRevert("SolarFarmSystem: player not registered");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
  }

  // Test revert claiming recharge when the battery is full
  function testRevertClaimRechargeFull() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    _beatTutorial(aliceAddress, "Alice");

    // Warp forward 24 hours (86400000 ms)
    vm.warp(block.timestamp + 86400);

    vm.expectRevert("SolarFarmSystem: battery already full");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
  }

  // Test revert claiming recharge when the player has no electricity to claim
  function testRevertClaimRechargeNoElectricity() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    vm.expectRevert("SolarFarmSystem: no electricity to claim");
    IWorld(worldAddress).app__claimRecharge();
    vm.stopPrank();
  }

  // Test revert when Solar Farm does not have enough electricity to offer
  function testRevertClaimRechargeNotEnoughElectricity() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
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

  function testRevertClaimRechargePaused() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Pause the recharge
    vm.prank(adminAddress);
    IWorld(worldAddress).app__toggleSolarFarmRecharge();

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    vm.expectRevert("SolarFarmSystem: recharge is paused");
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
    vm.stopPrank();
  }

  function testClaimChargeAfterUnpause() public {
    // Create a battle in order to get a battery, and to stake 8kWh
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__createBattle("Alice", true);

    // Warp forward 1 hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    uint256 timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 3600);

    // Pause and unpause recharge
    vm.startPrank(adminAddress);
    IWorld(worldAddress).app__toggleSolarFarmRecharge();
    IWorld(worldAddress).app__toggleSolarFarmRecharge();
    vm.stopPrank();

    // Warp forward 1 more hour (3600000 ms)
    vm.warp(block.timestamp + 3600);
    globalPlayerId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    timeSinceLastRecharge = block.timestamp - lastRechargeTimestamp;
    assertEq(timeSinceLastRecharge, 3600 * 2); // 2 hours since last recharge

    // Before ending the battle, the player should claim their recharge
    // This should only recharge 1 hour worth of electricity because of unpause
    vm.startPrank(aliceAddress);
    IWorld(worldAddress).app__claimRecharge();
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    assertEq(activeBalance, BATTERY_STORAGE_LIMIT - 8000 + 1000); // 24kWh - 8kWh + 1kWh
    assertEq(reserveBalance, 0); // 0.00kWh
    uint256 lastRechargeTimestampAfter = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    assertEq(lastRechargeTimestampAfter, block.timestamp); // Last recharge timestamp should be updated
    vm.stopPrank();
  }

  function testGrantKingdomRewards() public {
    // Create a battle in order to get a battery
    _beatTutorial(aliceAddress, "Alice");

    // Grant electricity to top kingdoms
    vm.prank(adminAddress);
    IWorld(worldAddress).app__grantKingdomRewards();

    // Check that the LastRewardDistro timestamp is updated
    uint256 lastRewardTimestamp = LastRewardDistro.get();
    assertEq(lastRewardTimestamp, block.timestamp);

    // Check that the top level kingdoms received their rewards
    uint256 topLevel = TopLevel.get();
    bytes32[] memory kingdoms = KingdomsByLevel.get(topLevel);
    require(kingdoms.length > 0, "SolarFarmSystem: no kingdoms to reward");

    uint256 rewardPerKingdom = REWARD_AMOUNT / kingdoms.length;

    // Check that the Solar Farm's electricity balance is reduced
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    assertEq(solarFarmElectricityBalance, 16800000 - REWARD_AMOUNT);

    for (uint256 i = 0; i < kingdoms.length; i++) {
      bytes32 kingdomId = kingdoms[i];
      uint256 kingdomElectricityBalance = SavedKingdom.getElectricityBalance(kingdomId);
      assertEq(kingdomElectricityBalance, rewardPerKingdom); // Each kingdom should
    }

    vm.stopPrank();
  }

  function testRevertGrantKingdomShortOfInterval() public {
    // Create a battle in order to get a battery
    _beatTutorial(aliceAddress, "Alice");

    // Grant electricity to top kingdoms
    vm.prank(adminAddress);
    IWorld(worldAddress).app__grantKingdomRewards();

    // Try to grant again before the interval
    vm.expectRevert("SolarFarmSystem: reward interval not met");
    vm.prank(adminAddress);
    IWorld(worldAddress).app__grantKingdomRewards();
  }

  function testRevertGrantKingdomsNoKingdoms() public {
    // Try to grant rewards when there are no kingdoms
    vm.expectRevert("SolarFarmSystem: no kingdoms to reward");
    vm.prank(adminAddress);
    IWorld(worldAddress).app__grantKingdomRewards();
  }

  function testRevertGrantKingdomsLowBalance() public {
    // Create a battle in order to get a battery
    _beatTutorial(aliceAddress, "Alice");

    // Set the Solar Farm's electricity balance to 0
    uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
    address admin = vm.addr(adminPrivateKey);
    vm.prank(admin);
    IWorld(worldAddress).app__updateSolarFarmElectricityBalance(0);

    // Try to grant rewards when the Solar Farm has no electricity
    vm.expectRevert("SolarFarmSystem: not enough electricity in Solar Farm");
    vm.prank(adminAddress);
    IWorld(worldAddress).app__grantKingdomRewards();
  }
}
