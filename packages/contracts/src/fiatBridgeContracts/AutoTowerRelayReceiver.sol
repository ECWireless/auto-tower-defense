// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @title AutoTowerRelayReceiver
/// @notice Deployed on Redstone/Pyrope. Receives cross-chain messages from Base Mainnet/Base Sepolia
///         via relayer and mints electricity in the MUD world.
contract AutoTowerRelayReceiver {
    /// @notice Trusted relayer address
    address public immutable trustedRelayer;

    /// @notice Address of the MUD Solar Farm System
    address public immutable solarFarmSystem;

    /// @notice Tracks processed messages to prevent replay
    mapping(bytes32 => bool) public processed;

    /// @param _relayer Address of the trusted relayer
    /// @param _solarFarmSystem The MUD system that handles electricity minting
    constructor(address _relayer, address _solarFarmSystem) {
        trustedRelayer = _relayer;
        solarFarmSystem = _solarFarmSystem;
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

        // Grant electricity to player via MUD system
        // TODO: An actual SolarFarmSystem function still needs to be created
        (bool success, ) = solarFarmSystem.call(
            abi.encodeWithSignature("grantElectricityFromBridge(address,uint256)", buyer, spendAmount)
        );
        require(success, "Electricity grant failed");
    }
}
