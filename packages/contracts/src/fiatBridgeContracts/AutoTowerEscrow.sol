// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AutoTowerEscrow
/// @notice Deployed on Base Mainnet/Sepolia. Escrows USDC for electricity purchases and releases USDC for electricity sales,
///         based on cross-chain messages from Redstone/Pyrope.
contract AutoTowerEscrow {
  /// @notice owner of the contract
  address public owner;

  /// @notice USDC token used for payment
  IERC20 public immutable usdc;

  /// @notice Trusted relayer allowed to call sellElectricity
  address public trustedRelayer;

  /// @notice Per-user nonces to prevent replay on purchase side
  mapping(address => uint256) public purchaseNonce;

  /// @notice Per-user nonces to prevent replay on sale side
  mapping(address => uint256) public saleNonce;

  /// @notice Emitted when a user buys electricity with USDC
  event ElectricityPurchase(address indexed buyer, uint256 amount, uint256 nonce);

  /// @notice Emitted when a user receives USDC for selling electricity
  event ElectricitySale(address indexed seller, uint256 amount, uint256 nonce);

  /// @param _usdc Address of the USDC token on Base
  /// @param _trustedRelayer Address of the trusted relayer
  constructor(address _usdc, address _trustedRelayer) {
    owner = msg.sender;
    usdc = IERC20(_usdc);
    trustedRelayer = _trustedRelayer;
  }

  /// @notice Allower the owner to transfer ownership of the contract
  /// @param newOwner Address of the new owner
  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, "Not authorized");
    require(newOwner != address(0), "Invalid address");
    owner = newOwner;
  }

  /// @notice Allow the owner to update the trusted relayer
  /// @param newRelayer Address of the new trusted relayer
  function updateTrustedRelayer(address newRelayer) external {
    require(msg.sender == owner, "Not authorized");
    require(newRelayer != address(0), "Invalid address");
    trustedRelayer = newRelayer;
  }

  /// @notice Called by user to purchase electricity with USDC
  /// @param spendAmount Amount of USDC to escrow
  function buyElectricity(uint256 spendAmount) external {
    require(spendAmount > 0, "Amount must be greater than 0");

    bool success = usdc.transferFrom(msg.sender, address(this), spendAmount);
    require(success, "USDC transfer failed");

    uint256 nonce = ++purchaseNonce[msg.sender];
    emit ElectricityPurchase(msg.sender, spendAmount, nonce);
  }

  /// @notice Called by trusted relayer to release USDC after electricity has been sold on Redstone
  /// @param seller Address to receive the USDC
  /// @param receiveAmount Amount of USDC to release
  /// @param nonce Unique sale nonce to prevent replay
  function sellElectricity(address seller, uint256 receiveAmount, uint256 nonce) external {
    require(msg.sender == trustedRelayer, "Not authorized");
    require(receiveAmount > 0, "Amount must be greater than 0");

    bytes32 id = keccak256(abi.encode(seller, receiveAmount, nonce));
    require(!isSaleProcessed[id], "Already processed");
    isSaleProcessed[id] = true;

    bool success = usdc.transfer(seller, receiveAmount);
    require(success, "USDC payout failed");

    saleNonce[seller] = nonce;
    emit ElectricitySale(seller, receiveAmount, nonce);
  }

  /// @notice Tracks which sale messages have already been processed
  mapping(bytes32 => bool) public isSaleProcessed;
}
