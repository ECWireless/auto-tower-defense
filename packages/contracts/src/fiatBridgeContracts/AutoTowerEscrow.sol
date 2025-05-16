// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AutoTowerEscrow
/// @notice Deployed on Base Mainnet/Sepolia. Escrows USDC for electricity purchases and releases USDC for electricity sales,
///         based on cross-chain messages from Redstone/Pyrope.
contract AutoTowerEscrow {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  address public owner;
  address public validator;
  IERC20 public immutable usdc;

  /// @notice Per-user nonces to prevent replay on purchase side
  mapping(address => uint256) public purchaseNonce;

  /// @notice Per-user nonces to prevent replay on sale side
  mapping(address => uint256) public saleNonce;

  /// @notice Emitted when a user buys electricity with USDC
  event ElectricityPurchase(address indexed buyer, uint256 amount, uint256 nonce);

  /// @notice Emitted when a user receives USDC for selling electricity
  event ElectricitySale(address indexed seller, uint256 amount, uint256 nonce);

  constructor(address _usdc, address _validator) {
    owner = msg.sender;
    usdc = IERC20(_usdc);
    validator = _validator;
  }

  /// @notice Allower the owner to transfer ownership of the contract
  /// @param newOwner Address of the new owner
  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, "Not authorized");
    require(newOwner != address(0), "Invalid address");
    owner = newOwner;
  }

  /// @notice Allow the owner to update the trusted validator
  /// @param newValidator Address of the new trusted validator
  function updateValidator(address newValidator) external {
    require(msg.sender == owner, "Not authorized");
    require(newValidator != address(0), "Invalid address");
    validator = newValidator;
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

  /// @notice Called by trusted validator to release USDC after electricity has been sold on Redstone
  /// @param seller Address to receive the USDC
  /// @param receiveAmount Amount of USDC to release
  /// @param nonce Unique sale nonce to prevent replay
  /// @param signature Validator signature of the sale data
  function sellElectricity(address seller, uint256 receiveAmount, uint256 nonce, bytes calldata signature) external {
    bytes32 structHash = keccak256(abi.encode(seller, receiveAmount, nonce));
    bytes32 ethSignedMessageHash = structHash.toEthSignedMessageHash();

    address recovered = ethSignedMessageHash.recover(signature);
    require(recovered == validator, "Invalid signature");

    require(!isSaleProcessed[structHash], "Already processed");
    isSaleProcessed[structHash] = true;

    require(receiveAmount > 0, "Amount must be greater than 0");

    bool success = usdc.transfer(seller, receiveAmount);
    require(success, "USDC payout failed");

    saleNonce[seller] = nonce;
    emit ElectricitySale(seller, receiveAmount, nonce);
  }

  /// @notice Tracks which sale messages have already been processed
  mapping(bytes32 => bool) public isSaleProcessed;
}
