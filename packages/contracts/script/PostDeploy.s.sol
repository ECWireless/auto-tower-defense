// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { Action, ActionData, AddressBook, DefaultLogic, KingdomsByLevel, MapConfig, SavedKingdom, SavedKingdomData, SolarFarmDetails, SolarFarmDetailsData, TopLevel, Username, UsernameTaken } from "../src/codegen/index.sol";
import { ActionType } from "../src/codegen/common.sol";
import { _solarFarmSystemAddress } from "../src/utils.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { ROB_ID } from "../constants.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../mocks/MockUSDC.sol";

import "../src/defaultLogicContracts/DefaultProjectileLogic.sol";

contract PostDeploy is Script {
  function run(address worldAddress) external {
    // Specify a store so that you can use tables directly in PostDeploy
    StoreSwitch.setStoreAddress(worldAddress);

    // Load the private key from the `PRIVATE_KEY` environment variable (in .env)
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

    // Start broadcasting transactions from the deployer account
    vm.startBroadcast(deployerPrivateKey);

    // Add map dimensions
    MapConfig.set(70, 140);

    // Add Solar Farm details
    SolarFarmDetailsData memory solarFarmDetails = SolarFarmDetailsData({
      electricityBalance: 16800000, // 16.8 MWh
      fiatBalance: 0,
      msPerWh: 3600,
      rechargePaused: false,
      unpausedTimestamp: block.timestamp,
      whPerCentPrice: 1920 // 1.92kWh/cent
    });
    SolarFarmDetails.set(solarFarmDetails);

    address solarFarmSystemAddress = _solarFarmSystemAddress();
    AddressBook.setSolarFarmAddress(solarFarmSystemAddress);

    if (block.chainid == 31337) {
      uint256 solarFarmerStartingBalance = 100 * 1e6;
      SolarFarmDetails.setFiatBalance(solarFarmerStartingBalance);

      // Send USDC to the Solar Farm System
      address mockUsdcAddress = _deployMockUSDC(solarFarmSystemAddress, solarFarmerStartingBalance);
      AddressBook.setUsdcAddress(mockUsdcAddress);
      MockUSDC usdc = MockUSDC(mockUsdcAddress);
      uint256 balance = usdc.balanceOf(solarFarmSystemAddress);
      console.logString("Solar Farm System MockUSDC balance:");
      console.logUint(balance);
    }

    // Set logic defaults
    address defaultProjectileLogicLeftAddress = address(new DefaultProjectileLogic());
    DefaultLogic.set(defaultProjectileLogicLeftAddress);

    _setTutorialLevels();

    // Set template tower patents
    bytes
      memory bytecode = hex"6080604052348015600e575f5ffd5b506101ba8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100b3565b61005e565b604051610055929190610100565b60405180910390f35b5f5f60058461006d9190610154565b83915091509250929050565b5f5ffd5b5f8160010b9050919050565b6100928161007d565b811461009c575f5ffd5b50565b5f813590506100ad81610089565b92915050565b5f5f604083850312156100c9576100c8610079565b5b5f6100d68582860161009f565b92505060206100e78582860161009f565b9150509250929050565b6100fa8161007d565b82525050565b5f6040820190506101135f8301856100f1565b61012060208301846100f1565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61015e8261007d565b91506101698361007d565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101a7576101a6610127565b5b9291505056fea164736f6c634300081c000a";
    string memory description = "Shoots projectile in a straight line.";
    string memory name = "Straight Line";
    string
      memory sourceCode = "contract DefaultProjectileLogic { function getNextProjectilePosition( int16 x, int16 y ) public pure returns (int16, int16) { return (x + 5, y); } }";
    IWorld(worldAddress).app__registerTemplatePatent(bytecode, description, name, sourceCode);

    bytecode = hex"6080604052348015600e575f5ffd5b506101c68061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60028461007a9190610160565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b9291505056fea164736f6c634300081c000a";
    description = "Shoots projectile downward at a 45 degree angle.";
    name = "45 Degrees Down";
    sourceCode = "contract DefaultProjectileLogic { function getNextProjectilePosition( int16 x, int16 y ) public pure returns (int16, int16) { return (x + 5, y + 2); } }";
    IWorld(worldAddress).app__registerTemplatePatent(bytecode, description, name, sourceCode);

    bytecode = hex"6080604052348015600e575f5ffd5b5061021f8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60028461007a91906101b9565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b92915050565b5f6101c382610089565b91506101ce83610089565b92508282039050617fff81137fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008212171561020c5761020b610133565b5b9291505056fea164736f6c634300081c000a";
    description = "Shoots projectile upward at a 45 degree angle.";
    name = "45 Degrees Up";
    sourceCode = "contract DefaultProjectileLogic { function getNextProjectilePosition( int16 x, int16 y ) public pure returns (int16, int16) { return (x + 5, y - 2); } }";
    IWorld(worldAddress).app__registerTemplatePatent(bytecode, description, name, sourceCode);

    Username.set(ROB_ID, "ROB");
    bytes32 usernameKey = keccak256(abi.encodePacked("ROB"));
    UsernameTaken.set(usernameKey, true);

    vm.stopBroadcast();
  }

  function _deployMockUSDC(address solarFarmSystem, uint256 supply) internal returns (address) {
    bytes32 salt = keccak256("mock-usdc");

    bytes memory bytecode = abi.encodePacked(type(MockUSDC).creationCode, abi.encode(solarFarmSystem, supply));
    address deployed = Create2.deploy(0, salt, bytecode);
    console.log("MockUSDC deployed at:");
    console.logAddress(deployed);

    return deployed;
  }

  function _setTutorialLevels() internal {
    // Create level 0 kingdom for ROB
    bytes32[] memory level0ActionIds = new bytes32[](0);
    bytes32 savedLevel0KingdomId = keccak256(abi.encode(level0ActionIds));

    SavedKingdomData memory savedLevel0Kingdom = SavedKingdomData({
      author: ROB_ID,
      createdAtTimestamp: block.timestamp,
      electricityBalance: 0,
      losses: 0,
      wins: 0,
      actions: level0ActionIds
    });
    SavedKingdom.set(savedLevel0KingdomId, savedLevel0Kingdom);
    bytes32[] memory savedLevel0KingdomIds = new bytes32[](1);
    savedLevel0KingdomIds[0] = savedLevel0KingdomId;
    KingdomsByLevel.set(0, savedLevel0KingdomIds);

    // Create level 1 kingdom for ROB
    bytes32[] memory level1ActionIds = new bytes32[](6);
    for (uint256 i = 0; i < level1ActionIds.length; i++) {
      ActionData memory wallInstall = ActionData({
        actionType: ActionType.Install,
        componentAddress: address(0),
        newX: 15 + int16(uint16(i) * 10), // Increment x by 10 for each action
        newY: 35,
        oldX: 0,
        oldY: 0,
        projectile: false
      });
      bytes32 actionId = keccak256(
        abi.encodePacked(
          wallInstall.actionType,
          wallInstall.componentAddress,
          wallInstall.newX,
          wallInstall.newY,
          wallInstall.oldX,
          wallInstall.oldY,
          wallInstall.projectile
        )
      );
      level1ActionIds[i] = actionId;
      Action.set(actionId, wallInstall);
    }
    bytes32 savedLevel1KingdomId = keccak256(abi.encode(level1ActionIds));
    SavedKingdomData memory savedLevel1Kingdom = SavedKingdomData({
      author: ROB_ID,
      createdAtTimestamp: block.timestamp,
      electricityBalance: 0,
      losses: 0,
      wins: 0,
      actions: level1ActionIds
    });
    SavedKingdom.set(savedLevel1KingdomId, savedLevel1Kingdom);
    bytes32[] memory savedLevel1KingdomIds = new bytes32[](1);
    savedLevel1KingdomIds[0] = savedLevel1KingdomId;
    KingdomsByLevel.set(1, savedLevel1KingdomIds);

    TopLevel.set(1);
  }
}
