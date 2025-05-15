// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AutoTowerRelayReceiver
/// @notice Deployed on Redstone/Pyrope. Receives cross-chain messages from Base Mainnet/Base Sepolia
///         via player with validator signature and mints electricity in the MUD world.
contract AutoTowerRelayReceiver {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  address public owner;
  address public validator;
  address public worldAddress;

  mapping(bytes32 => bool) public processed;

  constructor(address _validator, address _worldAddress) {
    owner = msg.sender;
    validator = _validator;
    worldAddress = _worldAddress;
  }

  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, "Not authorized");
    require(newOwner != address(0), "Invalid address");
    owner = newOwner;
  }

  function updateValidator(address newValidator) external {
    require(msg.sender == owner, "Not authorized");
    require(newValidator != address(0), "Invalid address");
    validator = newValidator;
  }

  function updateWorldAddress(address newWorldAddress) external {
    require(msg.sender == owner, "Not authorized");
    require(newWorldAddress != address(0), "Invalid address");
    worldAddress = newWorldAddress;
  }

  /// @notice Called by player with a validator signature after USDC has been escrowed on Base
  /// @param buyer The address of the user who paid USDC
  /// @param spendAmount The amount of USDC spent on electricity
  /// @param nonce Unique message ID for replay protection
  /// @param signature Validator signature of the purchase data
  function handleElectricityPurchase(
    address buyer,
    uint256 spendAmount,
    uint256 nonce,
    bytes calldata signature
  ) external {
    bytes32 structHash = keccak256(abi.encode(buyer, spendAmount, nonce));
    bytes32 ethSignedMessageHash = structHash.toEthSignedMessageHash();

    address recovered = ethSignedMessageHash.recover(signature);
    require(recovered == validator, "Invalid signature");

    require(!processed[structHash], "Already processed");
    processed[structHash] = true;

    (bool success, ) = worldAddress.call(
      abi.encodeWithSignature("app__buyElectricityThroughRelay(address,uint256)", buyer, spendAmount)
    );
    require(success, "Electricity grant failed");
  }
}
