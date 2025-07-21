// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { BatteryDetails, SolarFarmDetails, SolarFarmDetailsData } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import "../src/relayContracts/AutoTowerEscrow.sol";
import "../src/relayContracts/AutoTowerBuyReceiver.sol";
import "../src/relayContracts/AutoTowerSellEmitter.sol";
import "../mocks/MockUSDC.sol";
import "forge-std/console.sol";

contract RelayTest is MudTest {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  address relayOwner = vm.addr(1);
  address relayValidator = vm.addr(2);
  address aliceAddress = vm.addr(3);
  address bobAddress = vm.addr(4);

  bytes constant AUTHORED_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101ef8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea26469706673582212200f36ce47d179e4a4274b65916ffd491b33285775935ab7ab90dc53e854837fdb64736f6c634300081c0033";

  AutoTowerEscrow public relayEscrow;
  AutoTowerBuyReceiver public relayReceiver;
  AutoTowerSellEmitter public relayEmitter;
  address public usdcAddress = vm.envAddress("USDC_ADDRESS");
  address public adminAddress = vm.addr(vm.envUint("PRIVATE_KEY"));

  event ElectricityPurchase(address indexed buyer, uint256 amount, uint256 nonce);
  event ElectricitySale(address indexed seller, uint256 amount, uint256 nonce);
  event ElectricitySold(address indexed seller, uint256 receiveAmount, uint256 nonce);

  function _deployRelayContracts() public {
    vm.prank(adminAddress);
    address solarFarmAddress = IWorld(worldAddress).app__getSolarFarmSystemAddress();

    vm.startPrank(relayOwner);
    relayEscrow = new AutoTowerEscrow(usdcAddress, relayValidator);
    relayReceiver = new AutoTowerBuyReceiver(relayValidator, worldAddress);
    relayEmitter = new AutoTowerSellEmitter(solarFarmAddress);
    vm.stopPrank();

    vm.startPrank(adminAddress);
    IWorld(worldAddress).app__updateBuyReceiverAddress(address(relayReceiver));
    IWorld(worldAddress).app__updateSellEmitterAddress(address(relayEmitter));
    vm.stopPrank();

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(aliceAddress, 100 * 1e6);
    usdc.approve(address(relayEscrow), type(uint256).max);
    vm.stopPrank();
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

  function _endBattle(address player, bytes32 battleId) internal {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);

    // Need to go through 1 turn to end the battle
    IWorld(worldAddress).app__nextTurn(battleId);
    vm.stopPrank();
  }

  /// ESCROW TESTS ///
  function testIsEscrowInitialized() public {
    _deployRelayContracts();

    address escrowOwner = relayEscrow.owner();
    address escrowUsdc = address(relayEscrow.usdc());
    address escrowValidator = relayEscrow.validator();

    assertEq(escrowOwner, relayOwner);
    assertEq(escrowUsdc, usdcAddress);
    assertEq(escrowValidator, relayValidator);
  }

  function testEscrowTransferOwnership() public {
    _deployRelayContracts();

    vm.prank(relayOwner);
    relayEscrow.transferOwnership(aliceAddress);

    address newOwner = relayEscrow.owner();
    assertEq(newOwner, aliceAddress);
  }

  function testRevertEscrowTransferOwnershipNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEscrow.transferOwnership(aliceAddress);
    vm.stopPrank();
  }

  function testEscrowUpdateValidator() public {
    _deployRelayContracts();

    vm.prank(relayOwner);
    relayEscrow.updateValidator(aliceAddress);

    address newValidator = relayEscrow.validator();
    assertEq(newValidator, aliceAddress);
  }

  function testRevertEscrowUpdateValidatorNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEscrow.updateValidator(aliceAddress);
    vm.stopPrank();
  }

  function testBuyEscrowElectricity() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    uint256 spendAmount = 1 * 1e6;
    vm.expectEmit(true, false, false, true);
    emit ElectricityPurchase(aliceAddress, spendAmount, 1);
    relayEscrow.buyElectricity(spendAmount);
    vm.stopPrank();
  }

  function testRevertBuyEscrowElectricityZeroAmount() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Amount must be greater than 0.01 USDC");
    relayEscrow.buyElectricity(0);
    vm.stopPrank();
  }

  function testSellEscrowElectricity() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(address(relayEscrow), 1 * 1e6);

    uint256 receiveAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, receiveAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.expectEmit(true, false, false, true);
    emit ElectricitySale(aliceAddress, receiveAmount, nonce);
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);
    vm.stopPrank();
  }

  function testRevertSellEscrowElectricityInvalidSignature() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(address(relayEscrow), 1 * 1e6);

    uint256 receiveAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, receiveAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(3, ethHash);

    bytes memory signature = abi.encodePacked(r, s, v);
    vm.expectRevert("Invalid signature");
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);
    vm.stopPrank();
  }

  function testRevertSellEscrowElectricityAlreadyProcessed() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(address(relayEscrow), 1 * 1e6);

    uint256 receiveAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, receiveAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);

    bytes memory signature = abi.encodePacked(r, s, v);
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);

    vm.expectRevert("Already processed");
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);
    vm.stopPrank();
  }

  function testRevertSellEscrowElectricityZeroAmount() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(address(relayEscrow), 1 * 1e6);

    uint256 receiveAmount = 0;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, receiveAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);

    bytes memory signature = abi.encodePacked(r, s, v);
    vm.expectRevert("Amount must be greater than 0.01 USDC");
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);
    vm.stopPrank();
  }

  /// BUY RECEIVER TESTS ///
  function testIsReceiverInitialized() public {
    _deployRelayContracts();

    address receiverOwner = relayReceiver.owner();
    address receiverValidator = relayReceiver.validator();
    address receiverWorldAddress = relayReceiver.worldAddress();

    assertEq(receiverOwner, relayOwner);
    assertEq(receiverValidator, relayValidator);
    assertEq(receiverWorldAddress, worldAddress);
  }

  function testTransferReceiverOwnership() public {
    _deployRelayContracts();

    vm.startPrank(relayOwner);
    relayReceiver.transferOwnership(aliceAddress);
    vm.stopPrank();

    address newOwner = relayReceiver.owner();
    assertEq(newOwner, aliceAddress);
  }

  function testRevertTransferReceiverOwnershipNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.transferOwnership(aliceAddress);
    vm.stopPrank();
  }

  function testUpdateReceiverValidator() public {
    _deployRelayContracts();

    vm.startPrank(relayOwner);
    relayReceiver.updateValidator(aliceAddress);
    vm.stopPrank();

    address newValidator = relayReceiver.validator();
    assertEq(newValidator, aliceAddress);
  }

  function testRevertUpdateReceiverValidatorNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.updateValidator(aliceAddress);
    vm.stopPrank();
  }

  function testUpdateReceiverWorldAddress() public {
    _deployRelayContracts();

    vm.startPrank(relayOwner);
    relayReceiver.updateWorldAddress(aliceAddress);
    vm.stopPrank();

    address newWorldAddress = relayReceiver.worldAddress();
    assertEq(newWorldAddress, aliceAddress);
  }

  function testRevertUpdateReceiverWorldAddressNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.updateWorldAddress(aliceAddress);
    vm.stopPrank();
  }

  function testHandleElectricityPurchase() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertHandleElectricityPurchaseInvalidSignature() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(3, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    vm.expectRevert("Invalid signature");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertHandleElectricityPurchaseAlreadyProcessed() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("Already processed");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
    vm.stopPrank();
  }

  /// BUY THROUGH RELAY TESTS ///
  function testBuyElectricityThroughRelay() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    // Create a battle to get battery
    _beatTutorial(aliceAddress, "Alice");

    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
    SolarFarmDetailsData memory solarFarmDetails = SolarFarmDetails.get();

    uint256 farmOldlectricityBalance = 16800000; // 16.8 MWh
    uint256 farmNewElectricityBalance = farmOldlectricityBalance - 192000;
    assertEq(solarFarmDetails.electricityBalance, farmNewElectricityBalance);

    uint256 farmOldFiatBalance = 100 * 1e6;
    uint256 farmNewFiatBalance = farmOldFiatBalance + spendAmount;
    assertEq(solarFarmDetails.fiatBalance, farmNewFiatBalance);

    uint256 aliceNewReserveBalance = 192000;
    bytes32 aliceGlobalId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);
    assertEq(BatteryDetails.getReserveBalance(aliceGlobalId), aliceNewReserveBalance);
  }

  function testRevertBuyThroughRelayZeroAmount() public {
    _deployRelayContracts();

    uint256 spendAmount = 0;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: USDC amount must be greater than 0");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertBuyThroughRelayNoBattery() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: player must have a battery");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertBuyThroughRelayLessThanCent() public {
    _deployRelayContracts();

    uint256 spendAmount = 1;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: amount must be greater than 0.01 USDC");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertBuyThroughRelayNotEnoughElectricity() public {
    _deployRelayContracts();

    // Buy all 87.5 USDC worth of electricity
    uint256 spendAmount = 875 * 1e5;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);
    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    // Buy 0.01 more USDC worth of electricity
    spendAmount = 1 * 1e4;
    nonce = 2;
    structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    ethHash = structHash.toEthSignedMessageHash();
    (v, r, s) = vm.sign(2, ethHash);
    signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: not enough electricity in Solar Farm");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  /// SELL THROUGH RELAY TESTS ///
  function testSellElectricityThroughRelay() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    _beatTutorial(aliceAddress, "Alice");

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    // Sell 0.50 USDC worth of electricity
    uint256 electricityAmount = 96000;
    vm.prank(aliceAddress);
    IWorld(worldAddress).app__sellElectricityThroughRelay(electricityAmount);

    SolarFarmDetailsData memory solarFarmDetails = SolarFarmDetails.get();
    bytes32 aliceGlobalId = EntityHelpers.addressToGlobalPlayerId(aliceAddress);

    assertEq(solarFarmDetails.electricityBalance, 16800000 - 192000 + electricityAmount);
    assertEq(solarFarmDetails.fiatBalance, (100 * 1e6) + spendAmount - (5 * 1e5));
    assertEq(BatteryDetails.getReserveBalance(aliceGlobalId), electricityAmount);
  }

  function testRevertSellThroughRelayZeroAmount() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: electricity amount must be greater than 0");
    IWorld(worldAddress).app__sellElectricityThroughRelay(0);
  }

  function testRevertSellThroughRelayLessThanCent() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: amount must be greater than 0.01 USDC");
    IWorld(worldAddress).app__sellElectricityThroughRelay(1);
  }

  function testRevertSellThroughRelayNotEnoughFiat() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: not enough USDC in Solar Farm");
    IWorld(worldAddress).app__sellElectricityThroughRelay(1000000000); // 1,000 USDC
  }

  function testRevertSellThroughRelayNotEnoughElectricity() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("SolarFarmSystem: not enough electricity in battery reserve");
    IWorld(worldAddress).app__sellElectricityThroughRelay(192000 + 1);
  }

  /// SELL EMITTER TESTS ///
  function testIsEmitterInitialized() public {
    _deployRelayContracts();

    address emitterOwner = relayEmitter.owner();
    address emitterSolarFarmSystem = relayEmitter.solarFarmSystem();

    vm.prank(adminAddress);
    address solarFarmSystemAddress = IWorld(worldAddress).app__getSolarFarmSystemAddress();

    assertEq(emitterOwner, relayOwner);
    assertEq(emitterSolarFarmSystem, solarFarmSystemAddress);
  }

  function testEmitterTransferOwnership() public {
    _deployRelayContracts();

    vm.startPrank(relayOwner);
    relayEmitter.transferOwnership(aliceAddress);
    vm.stopPrank();

    address newOwner = relayEmitter.owner();
    assertEq(newOwner, aliceAddress);
  }

  function testRevertEmitterTransferOwnershipNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEmitter.transferOwnership(aliceAddress);
    vm.stopPrank();
  }

  function testEmitterUpdateSolarFarmSystem() public {
    _deployRelayContracts();

    vm.startPrank(relayOwner);
    relayEmitter.updateSolarFarmSystem(aliceAddress);
    vm.stopPrank();

    address newSystem = relayEmitter.solarFarmSystem();
    assertEq(newSystem, aliceAddress);
  }

  function testRevertEmitterUpdateSolarFarmSystemNotOwner() public {
    _deployRelayContracts();

    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEmitter.updateSolarFarmSystem(aliceAddress);
    vm.stopPrank();
  }

  function testEmitSellElectricity() public {
    _deployRelayContracts();

    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a battle to get battery
    bytes32 battleId = IWorld(worldAddress).app__createBattle("Alice", true);
    // End battle to have stake returned
    _endBattle(aliceAddress, battleId);

    // Buy 1 USDC worth of electricity, so that it can be sold
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    // Sell 0.50 USDC worth of electricity
    uint256 electricityAmount = 96000; // This is worth 0.50 USDC (5 * 1e5)
    vm.prank(aliceAddress);
    vm.expectEmit(true, false, false, true);
    emit ElectricitySold(aliceAddress, 5 * 1e5, 1);
    IWorld(worldAddress).app__sellElectricityThroughRelay(electricityAmount);
  }
}
