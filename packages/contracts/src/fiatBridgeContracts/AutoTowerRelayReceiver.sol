// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @title AutoTowerRelayReceiver
/// @notice Deployed on Redstone/Pyrope. Receives cross-chain messages from Base Mainnet/Base Sepolia
///         via relayer and mints electricity in the MUD world.
contract AutoTowerRelayReceiver {
  /// @notice owner of the contract
  address public owner;

  /// @notice Trusted relayer address
  address public trustedRelayer;

  /// @notice Address of the MUD game world
  address public worldAddress;

  /// @notice Tracks processed messages to prevent replay
  mapping(bytes32 => bool) public processed;

  /// @param _relayer Address of the trusted relayer
  /// @param _worldAddress The address of the MUD game world
  constructor(address _relayer, address _worldAddress) {
    owner = msg.sender;
    trustedRelayer = _relayer;
    worldAddress = _worldAddress;
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

  /// @notice Allow the owner to update the world address
  /// @param newWorldAddress Address of the new world
  function updateWorldAddress(address newWorldAddress) external {
    require(msg.sender == owner, "Not authorized");
    require(newWorldAddress != address(0), "Invalid address");
    worldAddress = newWorldAddress;
  }

  /// @notice Called by the trusted relayer after USDC has been escrowed on Base
  /// @param buyer The address of the user who paid USDC
  /// @param spendAmount The amount of USDC spent on electricity
  /// @param nonce Unique message ID for replay protection
  function handleElectricityPurchase(address buyer, uint256 spendAmount, uint256 nonce) external {
    require(msg.sender == trustedRelayer, "Not authorized");

    bytes32 id = keccak256(abi.encode(buyer, spendAmount, nonce));
    require(!processed[id], "Already processed");
    processed[id] = true;

    // Buy electricity on behalf of the player
    (bool success, ) = worldAddress.call(
      abi.encodeWithSignature("app__buyElectricityThroughRelay(address,uint256)", buyer, spendAmount)
    );
    require(success, "Electricity grant failed");
  }
}
