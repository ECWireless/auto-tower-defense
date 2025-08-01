// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { AddressBook, BatteryDetails, KingdomsByLevel, LastRewardDistro, SavedKingdom, SolarFarmDetails, TopLevel, Username } from "../codegen/index.sol";
import { BATTERY_STORAGE_LIMIT, REWARD_AMOUNT, REWARD_INTERVAL } from "../../constants.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import "forge-std/console.sol";

contract SolarFarmSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "SolarFarmSystem: player not registered");
    _;
  }

  /**
   * Allows purchasing watt-hours with USDC based on whPerCentPrice
   * Electricity first goes to activeBalance of BatteryDetails
   * Excess goes to reserveBalance of BatteryDetails
   * @param electricityAmount in watt-hours
   */
  function buyElectricity(uint256 electricityAmount) external onlyRegisteredPlayer {
    require(electricityAmount > 0, "SolarFarmSystem: electricity amount must be greater than 0");

    // Make sure the player already has a Battery
    address playerAddress = _msgSender();
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(playerAddress);
    require(
      BatteryDetails.getLastRechargeTimestamp(globalPlayerId) != 0,
      "SolarFarmSystem: player must have a battery"
    );

    // Figure out how much USDC to transfer
    uint256 whPerCentPrice = SolarFarmDetails.getWhPerCentPrice();
    require(electricityAmount >= whPerCentPrice, "SolarFarmSystem: amount must be greater than 0.01 USDC");
    uint256 usdcAmountCents = electricityAmount / whPerCentPrice;
    uint256 usdcAmount = usdcAmountCents * 10000; // Convert to unformatted USDC
    require(usdcAmount > 0, "SolarFarmSystem: USDC amount must be greater than 0");

    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    require(solarFarmElectricityBalance >= electricityAmount, "SolarFarmSystem: not enough electricity in Solar Farm");

    // Transfer USDC from player to Solar Farm
    address usdcAddress = AddressBook.getUsdcAddress();
    IERC20 usdc = IERC20(usdcAddress);
    usdc.transferFrom(playerAddress, address(this), usdcAmount);

    // Add electricity to player's battery
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    uint256 newActiveBalance = activeBalance + electricityAmount;
    uint256 newReserveBalance = reserveBalance;
    if (newActiveBalance > BATTERY_STORAGE_LIMIT) {
      newReserveBalance += newActiveBalance - BATTERY_STORAGE_LIMIT;
      newActiveBalance = BATTERY_STORAGE_LIMIT;
    }
    BatteryDetails.setActiveBalance(globalPlayerId, newActiveBalance);
    BatteryDetails.setReserveBalance(globalPlayerId, newReserveBalance);

    // Update Solar Farm's electricity and fiat balances
    SolarFarmDetails.setElectricityBalance(solarFarmElectricityBalance - electricityAmount);
    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    uint256 newFiatBalance = solarFarmFiatBalance + usdcAmount;
    SolarFarmDetails.setFiatBalance(newFiatBalance);
  }

  /**
   * Allows a relay receiver to give electricity to a player based on USDC spent on a different chain
   * Electricity first goes to activeBalance of BatteryDetails
   * Excess goes to reserveBalance of BatteryDetails
   * @param receiver address of the player who purchased on a different chain
   * @param usdcAmount amount of USDC spent on a different chain
   */
  function buyElectricityThroughRelay(address receiver, uint256 usdcAmount) external {
    require(usdcAmount > 0, "SolarFarmSystem: USDC amount must be greater than 0");

    // Make sure the sender is the relay receiver contract
    require(
      _msgSender() == AddressBook.getBuyReceiverAddress(),
      "SolarFarmSystem: only the relay reciever can call this function"
    );

    // Make sure the player already has a Battery
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(receiver);
    require(
      BatteryDetails.getLastRechargeTimestamp(globalPlayerId) != 0,
      "SolarFarmSystem: player must have a battery"
    );

    // Figure out how much electricity was purchased
    uint256 whPerCentPrice = SolarFarmDetails.getWhPerCentPrice();
    require(usdcAmount >= 10000, "SolarFarmSystem: amount must be greater than 0.01 USDC");
    uint256 usdcAmountInCents = usdcAmount / 10000;
    uint256 electricityAmount = usdcAmountInCents * whPerCentPrice;

    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    require(solarFarmElectricityBalance >= electricityAmount, "SolarFarmSystem: not enough electricity in Solar Farm");

    // Add electricity to player's battery
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    uint256 newActiveBalance = activeBalance + electricityAmount;
    uint256 newReserveBalance = reserveBalance;
    if (newActiveBalance > BATTERY_STORAGE_LIMIT) {
      newReserveBalance += newActiveBalance - BATTERY_STORAGE_LIMIT;
      newActiveBalance = BATTERY_STORAGE_LIMIT;
    }
    BatteryDetails.setActiveBalance(globalPlayerId, newActiveBalance);
    BatteryDetails.setReserveBalance(globalPlayerId, newReserveBalance);

    // Update Solar Farm's electricity and fiat balances
    SolarFarmDetails.setElectricityBalance(solarFarmElectricityBalance - electricityAmount);
    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    uint256 newFiatBalance = solarFarmFiatBalance + usdcAmount;
    SolarFarmDetails.setFiatBalance(newFiatBalance);
  }

  /**
   * Allows selling watt-hours for USDC based on electricityPrice
   * Can only sell from reserveBalance of BatteryDetails
   * @param electricityAmount in watt-hours
   */
  function sellElectricity(uint256 electricityAmount) external onlyRegisteredPlayer {
    require(electricityAmount > 0, "SolarFarmSystem: electricity amount must be greater than 0");

    // Make sure the player already has a Battery
    address playerAddress = _msgSender();
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(playerAddress);
    require(
      BatteryDetails.getLastRechargeTimestamp(globalPlayerId) != 0,
      "SolarFarmSystem: player must have a battery"
    );

    // Figure out how much USDC to transfer
    uint256 whPerCentPrice = SolarFarmDetails.getWhPerCentPrice();
    require(whPerCentPrice > 0, "SolarFarmSystem: whPerCentPrice must be greater than 0");
    require(electricityAmount >= whPerCentPrice, "SolarFarmSystem: amount must be greater than 0.01 USDC");
    uint256 usdcAmountCents = electricityAmount / whPerCentPrice;
    uint256 usdcAmount = usdcAmountCents * 10000; // Convert to unformatted USDC

    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    require(solarFarmFiatBalance >= usdcAmount, "SolarFarmSystem: not enough USDC in Solar Farm");

    // Transfer USDC from Solar Farm to player
    address usdcAddress = AddressBook.getUsdcAddress();
    IERC20 usdc = IERC20(usdcAddress);
    usdc.transfer(playerAddress, usdcAmount);

    // Remove electricity from player's battery reserve
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    require(reserveBalance >= electricityAmount, "SolarFarmSystem: not enough electricity in battery reserve");
    uint256 newReserveBalance = reserveBalance - electricityAmount;
    BatteryDetails.setReserveBalance(globalPlayerId, newReserveBalance);

    // Update Solar Farm's electricity and fiat balances
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    uint256 newElectricityBalance = solarFarmElectricityBalance + electricityAmount;
    SolarFarmDetails.setElectricityBalance(newElectricityBalance);
    uint256 newFiatBalance = solarFarmFiatBalance - usdcAmount;
    SolarFarmDetails.setFiatBalance(newFiatBalance);
  }

  /**
   * Allows a player to sell electricity on Redstone/Pyrope, while receiving USDC on a different chain
   * Can only sell from reserveBalance of BatteryDetails
   * @param electricityAmount in watt-hours
   */
  function sellElectricityThroughRelay(uint256 electricityAmount) external onlyRegisteredPlayer {
    require(electricityAmount > 0, "SolarFarmSystem: electricity amount must be greater than 0");

    // Make sure the player already has a Battery
    address playerAddress = _msgSender();
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(playerAddress);
    require(
      BatteryDetails.getLastRechargeTimestamp(globalPlayerId) != 0,
      "SolarFarmSystem: player must have a battery"
    );

    // Figure out how much USDC to transfer
    uint256 whPerCentPrice = SolarFarmDetails.getWhPerCentPrice();
    require(whPerCentPrice > 0, "SolarFarmSystem: whPerCentPrice must be greater than 0");
    require(electricityAmount >= whPerCentPrice, "SolarFarmSystem: amount must be greater than 0.01 USDC");
    uint256 usdcAmountCents = electricityAmount / whPerCentPrice;
    uint256 usdcAmount = usdcAmountCents * 10000; // Convert to unformatted USDC

    uint256 solarFarmFiatBalance = SolarFarmDetails.getFiatBalance();
    require(solarFarmFiatBalance >= usdcAmount, "SolarFarmSystem: not enough USDC in Solar Farm");

    // Remove electricity from player's battery reserve
    uint256 reserveBalance = BatteryDetails.getReserveBalance(globalPlayerId);
    require(reserveBalance >= electricityAmount, "SolarFarmSystem: not enough electricity in battery reserve");
    uint256 newReserveBalance = reserveBalance - electricityAmount;
    BatteryDetails.setReserveBalance(globalPlayerId, newReserveBalance);

    // Update Solar Farm's electricity and fiat balances
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    uint256 newElectricityBalance = solarFarmElectricityBalance + electricityAmount;
    SolarFarmDetails.setElectricityBalance(newElectricityBalance);
    uint256 newFiatBalance = solarFarmFiatBalance - usdcAmount;
    SolarFarmDetails.setFiatBalance(newFiatBalance);

    // Call the emitter contract to handle the USDC transfer
    address sellEmitterAddress = AddressBook.getSellEmitterAddress();
    require(sellEmitterAddress != address(0), "SolarFarmSystem: sell emitter address not set in AddressBook");
    (bool success, ) = sellEmitterAddress.call(
      abi.encodeWithSignature("emitSellElectricity(address,uint256)", playerAddress, usdcAmount)
    );
    require(success, "SolarFarmSystem: failed to emit sell electricity event");
  }

  /**
   * Claims more electricity for BatteryDetails activeBalance based on SolarFarmDetails msPerWh; cannot exceed BATTERY_STORAGE_LIMIT
   * Also decreases SolarFarmSystem electricityBalance
   */
  function claimRecharge() external onlyRegisteredPlayer {
    // Make sure recharge is not paused
    bool rechargePaused = SolarFarmDetails.getRechargePaused();
    require(!rechargePaused, "SolarFarmSystem: recharge is paused");

    // Make sure the player already has a Battery
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(
      BatteryDetails.getLastRechargeTimestamp(globalPlayerId) != 0,
      "SolarFarmSystem: player must have a battery"
    );

    // Get time elapsed in ms since last recharge
    uint256 lastRechargeTimestamp = BatteryDetails.getLastRechargeTimestamp(globalPlayerId);
    // If unpause was more recent than last recharge, use unpaused timestamp
    uint256 unpausedTimestamp = SolarFarmDetails.getUnpausedTimestamp();
    if (unpausedTimestamp > lastRechargeTimestamp) {
      lastRechargeTimestamp = unpausedTimestamp;
    }

    uint256 currentTimestamp = block.timestamp;
    uint256 timeElapsed = currentTimestamp - lastRechargeTimestamp;
    uint256 timeElapsedMs = timeElapsed * 1000; // Convert to milliseconds

    // Calculate claimable electricity
    uint256 msPerWhChargeRate = SolarFarmDetails.getMsPerWh();
    uint256 claimableElectricity = timeElapsedMs / msPerWhChargeRate;

    // Only claim enough to fill activeBalance to BATTERY_STORAGE_LIMIT
    uint256 activeBalance = BatteryDetails.getActiveBalance(globalPlayerId);
    require(activeBalance < BATTERY_STORAGE_LIMIT, "SolarFarmSystem: battery already full");
    if (activeBalance + claimableElectricity > BATTERY_STORAGE_LIMIT) {
      claimableElectricity = BATTERY_STORAGE_LIMIT - activeBalance;
    }

    // Check if there is enough electricity to claim
    require(claimableElectricity > 0, "SolarFarmSystem: no electricity to claim");
    uint256 solarFarmElectricityBalance = SolarFarmDetails.getElectricityBalance();
    require(
      solarFarmElectricityBalance >= claimableElectricity,
      "SolarFarmSystem: not enough electricity in Solar Farm"
    );

    // Update last recharge timestamp
    BatteryDetails.setLastRechargeTimestamp(globalPlayerId, currentTimestamp);
    // Update Solar Farm's electricity balance
    SolarFarmDetails.setElectricityBalance(solarFarmElectricityBalance - claimableElectricity);
    // Update player's battery active balance
    uint256 newActiveBalance = activeBalance + claimableElectricity;
    BatteryDetails.setActiveBalance(globalPlayerId, newActiveBalance);
  }

  /**
   * Grants electricity rewards to the top level kingdoms
   */
  function grantKingdomRewards() external {
    uint256 lastRewardTimestamp = LastRewardDistro.get();
    if (lastRewardTimestamp != 0) {
      // Check if enough time has passed since the last reward distribution
      require(block.timestamp - lastRewardTimestamp >= REWARD_INTERVAL, "SolarFarmSystem: reward interval not met");
    }

    uint256 topLevel = TopLevel.get();
    require(topLevel > 1, "SolarFarmSystem: no kingdoms to reward");

    bytes32[] memory topKingdoms = KingdomsByLevel.get(topLevel);
    require(topKingdoms.length > 0, "SolarFarmSystem: no kingdoms to reward");

    // Calculate the total electricity to distribute
    uint256 rewardPerKingdom = REWARD_AMOUNT / topKingdoms.length;
    require(rewardPerKingdom > 0, "SolarFarmSystem: reward amount too low");

    // Distribute rewards to each top kingdom
    for (uint256 i = 0; i < topKingdoms.length; i++) {
      bytes32 kingdomId = topKingdoms[i];
      uint256 currentElectricityBalance = SolarFarmDetails.getElectricityBalance();
      require(currentElectricityBalance >= rewardPerKingdom, "SolarFarmSystem: not enough electricity in Solar Farm");
      SolarFarmDetails.setElectricityBalance(currentElectricityBalance - rewardPerKingdom);
      SavedKingdom.setElectricityBalance(kingdomId, SavedKingdom.getElectricityBalance(kingdomId) + rewardPerKingdom);
    }

    // Update the last reward distribution timestamp
    LastRewardDistro.set(block.timestamp);
  }
}
