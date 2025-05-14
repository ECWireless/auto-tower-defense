// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @title AutoTowerSellEmitter
/// @notice Deployed on Redstone/Pyrope. Emits cross-chain event after being called by the MUD system.
contract AutoTowerSellEmitter {
  /// @notice Address of the trusted Solar Farm System (MUD system)
  address public immutable solarFarmSystem;

  /// @notice Tracks nonce per user to prevent message replay
  mapping(address => uint256) public saleNonce;

  /// @notice Emitted after electricity is sold in the MUD system
  ///         and this emitter is called to initiate USDC payout cross-chain
  event ElectricitySold(address indexed seller, uint256 receiveAmount, uint256 nonce);

  constructor(address _solarFarmSystem) {
    solarFarmSystem = _solarFarmSystem;
  }

  /// @notice Called by the MUD Solar Farm system after electricity is sold
  /// @param seller The user to receive USDC on Base
  /// @param receiveAmount The amount of USDC to be sent
  function emitSellElectricity(address seller, uint256 receiveAmount) external {
    require(msg.sender == solarFarmSystem, "Only SolarFarmSystem can call");
    require(receiveAmount > 0, "Amount must be greater than 0");

    uint256 nonce = ++saleNonce[seller];
    emit ElectricitySold(seller, receiveAmount, nonce);
  }
}
