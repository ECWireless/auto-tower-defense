// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface ISolarFarmSystem {
  function app__buyElectricityThroughRelay(address receiver, uint256 usdcAmount) external;
}

/// @title AutoTowerBuyReceiver
/// @notice Deployed on Redstone/Pyrope. Receives cross-chain messages from Base Mainnet/Base Sepolia
///         via player with validator signature and mints electricity in the MUD world.
contract AutoTowerBuyReceiver {
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

  /// @notice Allow the owner to update the world address
  /// @param newWorldAddress Address of the new world contract
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

    try ISolarFarmSystem(worldAddress).app__buyElectricityThroughRelay(buyer, spendAmount) {
        return;
    } catch Error(string memory reason) {
        // The callee reverted with a reason string
        revert(string.concat("Electricity grant failed: ", reason));
    } catch (bytes memory) {
        // The callee reverted without a reason string
        revert("Electricity grant failed failed without a reason");
    }
  }
}
