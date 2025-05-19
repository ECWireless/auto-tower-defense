// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import "../src/relayContracts/AutoTowerEscrow.sol";
import "../src/relayContracts/AutoTowerBuyReceiver.sol";
import "../mocks/MockUSDC.sol";

contract RelayTest is Test {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  address relayOwner = vm.addr(1);
  address relayValidator = vm.addr(2);
  address aliceAddress = vm.addr(3);
  address bobAddress = vm.addr(4);

  AutoTowerEscrow public relayEscrow;
  AutoTowerBuyReceiver public relayReceiver;
  address public usdcAddress = vm.envAddress("USDC_ADDRESS");
  address public worldAddress = vm.envAddress("WORLD_ADDRESS");
  address public adminAddress = vm.addr(vm.envUint("PRIVATE_KEY"));

  event ElectricityPurchase(address indexed buyer, uint256 amount, uint256 nonce);
  event ElectricitySale(address indexed seller, uint256 amount, uint256 nonce);

  function setUp() public {
    vm.startPrank(relayOwner);
    relayEscrow = new AutoTowerEscrow(usdcAddress, relayValidator);
    relayReceiver = new AutoTowerBuyReceiver(relayValidator, worldAddress);
    vm.stopPrank();

    vm.prank(adminAddress);
    IWorld(worldAddress).app__updateBuyReceiverAddress(address(relayReceiver));

    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(aliceAddress, 10 * 1e6);
    usdc.approve(address(relayEscrow), type(uint256).max);
    vm.stopPrank();
  }

    function _endGame(address player, bytes32 gameId) internal {
    vm.startPrank(player);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__playerInstallTower(true, 45, 35);

    // Need to go through 2 turns to end the game
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();
  }

  /// ESCROW TESTS ///
  function testIsEscrowInitialized() public {
    address escrowOwner = relayEscrow.owner();
    address escrowUsdc = address(relayEscrow.usdc());
    address escrowValidator = relayEscrow.validator();

    assertEq(escrowOwner, relayOwner);
    assertEq(escrowUsdc, usdcAddress);
    assertEq(escrowValidator, relayValidator);
  }

  function testTransferOwnership() public {
    vm.prank(relayOwner);
    relayEscrow.transferOwnership(aliceAddress);

    address newOwner = relayEscrow.owner();
    assertEq(newOwner, aliceAddress);
  }

  function testRevertTransferOwnershipNotOwner() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEscrow.transferOwnership(aliceAddress);
    vm.stopPrank();
  }

  function testUpdateValidator() public {
    vm.prank(relayOwner);
    relayEscrow.updateValidator(aliceAddress);

    address newValidator = relayEscrow.validator();
    assertEq(newValidator, aliceAddress);
  }

  function testRevertUpdateValidatorNotOwner() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayEscrow.updateValidator(aliceAddress);
    vm.stopPrank();
  }

  function testBuyElectricity() public {
    vm.startPrank(aliceAddress);
    uint256 spendAmount = 1 * 1e6;
    vm.expectEmit(true, false, false, true);
    emit ElectricityPurchase(aliceAddress, spendAmount, 1);
    relayEscrow.buyElectricity(spendAmount);
    vm.stopPrank();
  }

  function testRevertBuyElectricityZeroAmount() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Amount must be greater than 0");
    relayEscrow.buyElectricity(0);
    vm.stopPrank();
  }

  function testSellElectricity() public {
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

  function testRevertSellElectricityInvalidSignature() public {
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

  function testRevertSellElectricityAlreadyProcessed() public {
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

  function testRevertSellElectricityZeroAmount() public {
    vm.startPrank(aliceAddress);
    MockUSDC usdc = MockUSDC(usdcAddress);
    usdc.mint(address(relayEscrow), 1 * 1e6);

    uint256 receiveAmount = 0;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, receiveAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);

    bytes memory signature = abi.encodePacked(r, s, v);
    vm.expectRevert("Amount must be greater than 0");
    relayEscrow.sellElectricity(aliceAddress, receiveAmount, nonce, signature);
    vm.stopPrank();
  }

  /// BUY RECEIVER TESTS ///
  function testIsReceiverInitialized() public {
    address receiverOwner = relayReceiver.owner();
    address receiverValidator = relayReceiver.validator();
    address receiverWorldAddress = relayReceiver.worldAddress();

    assertEq(receiverOwner, relayOwner);
    assertEq(receiverValidator, relayValidator);
    assertEq(receiverWorldAddress, worldAddress);
  }

  function testTransferReceiverOwnership() public {
    vm.startPrank(relayOwner);
    relayReceiver.transferOwnership(aliceAddress);
    vm.stopPrank();

    address newOwner = relayReceiver.owner();
    assertEq(newOwner, aliceAddress);
  }

  function testRevertTransferReceiverOwnershipNotOwner() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.transferOwnership(aliceAddress);
    vm.stopPrank();
  }

  function testUpdateReceiverValidator() public {
    vm.startPrank(relayOwner);
    relayReceiver.updateValidator(aliceAddress);
    vm.stopPrank();

    address newValidator = relayReceiver.validator();
    assertEq(newValidator, aliceAddress);
  }

  function testRevertUpdateReceiverValidatorNotOwner() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.updateValidator(aliceAddress);
    vm.stopPrank();
  }

  function testUpdateReceiverWorldAddress() public {
    vm.startPrank(relayOwner);
    relayReceiver.updateWorldAddress(aliceAddress);
    vm.stopPrank();

    address newWorldAddress = relayReceiver.worldAddress();
    assertEq(newWorldAddress, aliceAddress);
  }

  function testRevertUpdateReceiverWorldAddressNotOwner() public {
    vm.startPrank(aliceAddress);
    vm.expectRevert("Not authorized");
    relayReceiver.updateWorldAddress(aliceAddress);
    vm.stopPrank();
  }

  function testHandleElectricityPurchase() public {
    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);
    
    vm.prank(aliceAddress);
    // Create a game to get battery
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    // End game to have stake returned
    _endGame(aliceAddress, gameId);
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertHandleElectricityPurchaseInvalidSignature() public {
    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(3, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a game to get battery
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    // End game to have stake returned
    _endGame(aliceAddress, gameId);
    vm.prank(aliceAddress);
    vm.expectRevert("Invalid signature");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
  }

  function testRevertHandleElectricityPurchaseAlreadyProcessed() public {
    uint256 spendAmount = 1 * 1e6;
    uint256 nonce = 1;
    bytes32 structHash = keccak256(abi.encode(aliceAddress, spendAmount, nonce));
    bytes32 ethHash = structHash.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.prank(aliceAddress);
    // Create a game to get battery
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    // End game to have stake returned
    _endGame(aliceAddress, gameId);
    vm.prank(aliceAddress);
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);

    vm.prank(aliceAddress);
    vm.expectRevert("Already processed");
    relayReceiver.handleElectricityPurchase(aliceAddress, spendAmount, nonce, signature);
    vm.stopPrank();
  }

  /// BUY THROUGH RELAY TESTS ///

  /// SELL THROUGH RELAY TESTS ///

  /// BUY EMITTER TESTS ///
}
