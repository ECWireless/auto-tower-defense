// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { Patent, PatentData } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";

contract PatentTest is MudTest {
  address alice = vm.addr(1);
  address bob = vm.addr(2);

  bytes constant BYTECODE =
    hex"6080604052348015600e575f5ffd5b506102488061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60018461006d9190610160565b60018461007a91906101b9565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b92915050565b5f6101c382610089565b91506101ce83610089565b92508282039050617fff81137fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008212171561020c5761020b610133565b5b9291505056fea2646970667358221220ce99c3e5e762de0a056f89a7edc1f3fd0b073a97bb3c924e932a6f0a45c842cd64736f6c634300081c0033";
  bytes constant STRAIGHT_LINE_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101e38061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100b3565b61005e565b604051610055929190610100565b60405180910390f35b5f5f60058461006d9190610154565b83915091509250929050565b5f5ffd5b5f8160010b9050919050565b6100928161007d565b811461009c575f5ffd5b50565b5f813590506100ad81610089565b92915050565b5f5f604083850312156100c9576100c8610079565b5b5f6100d68582860161009f565b92505060206100e78582860161009f565b9150509250929050565b6100fa8161007d565b82525050565b5f6040820190506101135f8301856100f1565b61012060208301846100f1565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61015e8261007d565b91506101698361007d565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101a7576101a6610127565b5b9291505056fea2646970667358221220d4b2738654620c9a41462f26897884a6fb6a6ca055e7360b356bbff81b61665264736f6c634300081c0033";
  bytes constant ANGLED_DOWN_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506102488061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a91906101b9565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b92915050565b5f6101c382610089565b91506101ce83610089565b92508282039050617fff81137fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008212171561020c5761020b610133565b5b9291505056fea264697066735822122092d8253b5d490e5eeed37e38839c0312a46bd8c975cfdc901990373974a97d0764736f6c634300081c0033";

  function testRegisterPatent() public {
    vm.startPrank(alice);
    IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 35);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, BYTECODE, "");

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    PatentData memory patent = Patent.get(patentId);
    assertEq(patent.bytecode, BYTECODE);
    assertEq(patent.description, description);
    assertEq(patent.name, name);
    assertEq(patent.sourceCode, sourceCode);
    assertEq(patent.patentee, EntityHelpers.addressToGlobalPlayerId(alice));
  }

  function testRevertRegisterPatentEmptyBytes() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes memory emptyBytecode;

    vm.expectRevert(bytes("PatentSystem: bytecode is invalid"));
    IWorld(worldAddress).app__registerPatent(emptyBytecode, description, name, sourceCode);
  }

  function testRevertRegisterPatentNoDuplicateBytecode() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("PatentSystem: patent already exists"));
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);
  }

  function testIncrementRegisterPatentUseCount() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 35);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, STRAIGHT_LINE_BYTECODE, "");
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, STRAIGHT_LINE_BYTECODE, "");

    bytes32 patentId = keccak256(abi.encodePacked(STRAIGHT_LINE_BYTECODE));
    PatentData memory patent = Patent.get(patentId);
    assertEq(patent.useCount, 2);
  }

  function testRevertRegisterPatentNoName() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);
    string memory description = "Test description";
    string memory sourceCode = "Test source code";
    string memory emptyName;

    vm.expectRevert(bytes("PatentSystem: name is required"));
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, emptyName, sourceCode);
  }

  function testRevertRegisterPatentNoDescription() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    string memory emptyDescription;

    vm.expectRevert(bytes("PatentSystem: description is required"));
    IWorld(worldAddress).app__registerPatent(BYTECODE, emptyDescription, name, sourceCode);
  }

  function testRevertRegisterPatentNameTooLong() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);
    string memory description = "Test description";
    string memory name = "Test name that is too long and should revert";
    string memory sourceCode = "Test source code";

    vm.expectRevert(bytes("PatentSystem: name cannot be longer than 32 bytes"));
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);
  }

  function testRevertRegisterPatentDescriptionTooLong() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string
      memory description = "This is a long test string meant to exceed the 256-byte limit in Solidity. It serves as a demonstration of handling storage and memory strings in smart contracts. The purpose of this string is to push beyond constraints, ensuring that Solidity developers recognize when their data exceeds inline storage limits.";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    vm.expectRevert(bytes("PatentSystem: description cannot be longer than 256 bytes"));
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);
  }

  function testRevertRegisterPatentNameTaken() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("PatentSystem: name is already taken"));
    IWorld(worldAddress).app__registerPatent(ANGLED_DOWN_BYTECODE, description, name, sourceCode);
  }

  function testAmendPatent() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "New name";

    IWorld(worldAddress).app__amendPatent(patentId, newDescription, newName);

    PatentData memory patent = Patent.get(patentId);
    assertEq(patent.description, newDescription);
    assertEq(patent.name, newName);
  }

  function testRevertAmendPatentNotPatentee() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);
    vm.stopPrank();

    vm.startPrank(bob);
    IWorld(worldAddress).app__createGame("Bob", true);
    string memory newDescription = "New description";
    string memory newName = "New name";

    vm.expectRevert(bytes("PatentSystem: only the patentee can amend this patent"));
    IWorld(worldAddress).app__amendPatent(patentId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertAmendPatentNameTaken() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("PatentSystem: name is already taken"));
    IWorld(worldAddress).app__registerPatent(ANGLED_DOWN_BYTECODE, description, name, sourceCode);
    vm.stopPrank();
  }

  function testRevertAmendPatentSameDetails() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory newDescription = "Test description";
    string memory newName = "Test name";

    vm.expectRevert(bytes("PatentSystem: name and description are the same as original"));
    IWorld(worldAddress).app__amendPatent(patentId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertAmendPatentNoName() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory emptyName;

    vm.expectRevert(bytes("PatentSystem: name is required"));
    IWorld(worldAddress).app__amendPatent(patentId, newDescription, emptyName);
    vm.stopPrank();
  }

  function testRevertAmendPatentNoDescription() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory emptyDescription;
    string memory newName = "New name";

    vm.expectRevert(bytes("PatentSystem: description is required"));
    IWorld(worldAddress).app__amendPatent(patentId, emptyDescription, newName);
    vm.stopPrank();
  }

  function testRevertAmendPatentNameTooLong() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "Test name that is too long and should revert";

    vm.expectRevert(bytes("PatentSystem: name cannot be longer than 32 bytes"));
    IWorld(worldAddress).app__amendPatent(patentId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertAmendPatentDescriptionTooLong() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string
      memory newDescription = "This is a long test string meant to exceed the 256-byte limit in Solidity. It serves as a demonstration of handling storage and memory strings in smart contracts. The purpose of this string is to push beyond constraints, ensuring that Solidity developers recognize when their data exceeds inline storage limits.";
    string memory newName = "New name";

    vm.expectRevert(bytes("PatentSystem: description cannot be longer than 256 bytes"));
    IWorld(worldAddress).app__amendPatent(patentId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertAmendPatentDoesNotExist() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "New name";
    bytes32 fakePatentId = keccak256(abi.encodePacked("fake"));

    vm.expectRevert(bytes("PatentSystem: patent does not exist"));
    IWorld(worldAddress).app__amendPatent(fakePatentId, newDescription, newName);
    vm.stopPrank();
  }

  function testDisclaimPatent() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    IWorld(worldAddress).app__disclaimPatent(patentId);

    PatentData memory patent = Patent.get(patentId);
    assertEq(patent.bytecode, bytes(""));
    assertEq(patent.description, "");
    assertEq(patent.name, "");
    assertEq(patent.sourceCode, "");
    assertEq(patent.patentee, EntityHelpers.addressToGlobalPlayerId(address(0)));
    assertEq(patent.useCount, 0);
  }

  function testRevertDisclaimPatentNotPatentee() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 patentId = IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);
    vm.stopPrank();

    vm.startPrank(bob);
    IWorld(worldAddress).app__createGame("Bob", true);
    vm.expectRevert(bytes("PatentSystem: only the patentee can disclaim this patent"));
    IWorld(worldAddress).app__disclaimPatent(patentId);
    vm.stopPrank();
  }

  function testRevertDisclaimPatentDoesNotExist() public {
    vm.startPrank(alice);
    // Create a game to register the player
    IWorld(worldAddress).app__createGame("Alice", true);

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__registerPatent(BYTECODE, description, name, sourceCode);

    bytes32 fakePatentId = keccak256(abi.encodePacked("fake"));

    vm.expectRevert(bytes("PatentSystem: patent does not exist"));
    IWorld(worldAddress).app__disclaimPatent(fakePatentId);
    vm.stopPrank();
  }
}
