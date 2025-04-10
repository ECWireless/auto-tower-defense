// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "forge-std/Test.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { getKeysWithValue } from "@latticexyz/world-modules/src/modules/keyswithvalue/getKeysWithValue.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { Counter } from "../src/codegen/index.sol";
import { CurrentGame, EntityAtPosition, Health, Position, Projectile, SavedModification, SavedModificationData, Tower, Username, UsernameTaken } from "../src/codegen/index.sol";
import { EntityHelpers } from "../src/Libraries/EntityHelpers.sol";

contract TowerTest is MudTest {
  address alice = vm.addr(1);
  address bob = vm.addr(2);
  address rob = address(0);

  bytes32 robId = EntityHelpers.globalAddressToKey(rob);
  bytes32 defaultSavedGameId = keccak256(abi.encodePacked(bytes32(0), robId));
  bytes constant BYTECODE =
    hex"6080604052348015600e575f5ffd5b506102488061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60018461006d9190610160565b60018461007a91906101b9565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b92915050565b5f6101c382610089565b91506101ce83610089565b92508282039050617fff81137fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008212171561020c5761020b610133565b5b9291505056fea2646970667358221220ce99c3e5e762de0a056f89a7edc1f3fd0b073a97bb3c924e932a6f0a45c842cd64736f6c634300081c0033";
  bytes constant STRAIGHT_LINE_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506101e38061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100b3565b61005e565b604051610055929190610100565b60405180910390f35b5f5f60058461006d9190610154565b83915091509250929050565b5f5ffd5b5f8160010b9050919050565b6100928161007d565b811461009c575f5ffd5b50565b5f813590506100ad81610089565b92915050565b5f5f604083850312156100c9576100c8610079565b5b5f6100d68582860161009f565b92505060206100e78582860161009f565b9150509250929050565b6100fa8161007d565b82525050565b5f6040820190506101135f8301856100f1565b61012060208301846100f1565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61015e8261007d565b91506101698361007d565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101a7576101a6610127565b5b9291505056fea2646970667358221220d4b2738654620c9a41462f26897884a6fb6a6ca055e7360b356bbff81b61665264736f6c634300081c0033";
  bytes constant ANGLED_DOWN_BYTECODE =
    hex"6080604052348015600e575f5ffd5b506102488061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063cae93eb91461002d575b5f5ffd5b610047600480360381019061004291906100bf565b61005e565b60405161005592919061010c565b60405180910390f35b5f5f60058461006d9190610160565b60018461007a91906101b9565b915091509250929050565b5f5ffd5b5f8160010b9050919050565b61009e81610089565b81146100a8575f5ffd5b50565b5f813590506100b981610095565b92915050565b5f5f604083850312156100d5576100d4610085565b5b5f6100e2858286016100ab565b92505060206100f3858286016100ab565b9150509250929050565b61010681610089565b82525050565b5f60408201905061011f5f8301856100fd565b61012c60208301846100fd565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016a82610089565b915061017583610089565b925082820190507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008112617fff821317156101b3576101b2610133565b5b92915050565b5f6101c382610089565b91506101ce83610089565b92508282039050617fff81137fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80008212171561020c5761020b610133565b5b9291505056fea264697066735822122092d8253b5d490e5eeed37e38839c0312a46bd8c975cfdc901990373974a97d0764736f6c634300081c0033";

  function testInstallTower() public {
    vm.prank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);

    vm.prank(alice);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 35, 35);

    (int16 x, int16 y) = Position.get(towerId);
    assertEq(x, 35);
    assertEq(y, 35);

    bytes32 entityKey = EntityHelpers.positionToEntityKey(gameId, x, y);
    bytes32 entity = EntityAtPosition.get(entityKey);
    assertEq(entity, towerId);

    bool isTower = Tower.get(towerId);
    assertTrue(isTower);

    address projectileLogicAddress = Projectile.getLogicAddress(towerId);
    assertTrue(projectileLogicAddress != address(0));
  }

  function testInstallWallTower() public {
    vm.startPrank(alice);
    IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(false, 35, 35);

    address projectileLogicAddress = Projectile.getLogicAddress(towerId);
    assertFalse(projectileLogicAddress != address(0));
    vm.stopPrank();
  }

  function testRevertInstallPositionIsOccupied() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    vm.expectRevert(bytes("TowerSystem: position is occupied"));
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    vm.stopPrank();
  }

  function testRevertInstallNotPlayerGame() public {
    vm.startPrank(alice);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    vm.startPrank(bob);
    IWorld(worldAddress).app__createGame("Bob", true);
    vm.expectRevert(bytes("TowerSystem: game does not match player's ongoing game"));
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
  }

  function testMoveTower() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    IWorld(worldAddress).app__playerMoveTower(towerId, 45, 45);

    (int16 x, int16 y) = Position.get(towerId);
    assertEq(x, 45);
    assertEq(y, 45);

    bytes32 entityKey = EntityHelpers.positionToEntityKey(gameId, x, y);
    bytes32 entity = EntityAtPosition.get(entityKey);
    assertEq(entity, towerId);
  }

  function testRevertMoveNoTower() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    bytes32 fakeTowerId = keccak256(abi.encodePacked("fake"));
    vm.expectRevert(bytes("TowerSystem: entity is not a tower"));
    IWorld(worldAddress).app__playerMoveTower(fakeTowerId, 45, 45);
    vm.stopPrank();
  }

  function testRevertMovePositionIsOccupied() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 35, 45);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    IWorld(worldAddress).app__playerInstallTower(true, 45, 45);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    vm.expectRevert(bytes("TowerSystem: position is occupied"));
    IWorld(worldAddress).app__playerMoveTower(towerId, 45, 45);
  }

  function testRevertMoveNotPlayerGame() public {
    vm.startPrank(alice);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 35, 35);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    vm.startPrank(bob);
    IWorld(worldAddress).app__createGame("Bob", true);
    vm.expectRevert(bytes("TowerSystem: game does not match player's ongoing game"));
    IWorld(worldAddress).app__playerMoveTower(towerId, 45, 45);
  }

  function testModifyTowerSystem() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 35);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, BYTECODE, "");
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    vm.stopPrank();

    bytes32 positionEntity = EntityHelpers.positionToEntityKey(gameId, 135, 35);
    bytes32 enemyTowerId = EntityAtPosition.get(positionEntity);
    uint8 enemyTowerHealth = Health.getCurrentHealth(enemyTowerId);
    assertEq(enemyTowerHealth, 1);
  }

  function testRevertModifyNoTower() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);

    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);

    bytes32 positionEntity = EntityHelpers.positionToEntityKey(gameId, 5, 35);
    bytes32 castleId = EntityAtPosition.get(positionEntity);

    vm.expectRevert(bytes("TowerSystem: entity is not a tower"));
    IWorld(worldAddress).app__playerModifyTowerSystem(castleId, BYTECODE, "");
    vm.stopPrank();
  }

  function testRevertModifyNoGame() public {
    vm.expectRevert(bytes("TowerSystem: player has no ongoing game"));
    vm.prank(alice);
    IWorld(worldAddress).app__playerModifyTowerSystem(0, BYTECODE, "");
  }

  function testRevertModifyNotPlayerGame() public {
    vm.startPrank(alice);
    bytes32 aliceGameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 65);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    IWorld(worldAddress).app__nextTurn(aliceGameId);
    vm.stopPrank();

    vm.startPrank(bob);
    IWorld(worldAddress).app__createGame("Bob", true);
    vm.expectRevert(bytes("TowerSystem: game does not match player's ongoing game"));
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, BYTECODE, "");
  }

  function testSaveMoficiationSystem() public {
    vm.startPrank(alice);
    IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 35);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, BYTECODE, "");

    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    SavedModificationData memory savedModification = SavedModification.get(savedModificationId);
    assertEq(savedModification.bytecode, BYTECODE);
    assertEq(savedModification.description, description);
    assertEq(savedModification.name, name);
    assertEq(savedModification.sourceCode, sourceCode);
    assertEq(savedModification.author, alice);
  }

  function testRevertSaveModificationEmptyBytes() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes memory emptyBytecode;

    vm.expectRevert(bytes("TowerSystem: bytecode is invalid"));
    IWorld(worldAddress).app__saveModification(emptyBytecode, description, name, sourceCode);
  }

  function testRevertSaveModificationNoDuplicateBytecode() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("TowerSystem: modification already exists"));
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);
  }

  function testIncrementSaveModificationUseCount() public {
    vm.startPrank(alice);
    bytes32 gameId = IWorld(worldAddress).app__createGame("Alice", true);
    bytes32 towerId = IWorld(worldAddress).app__playerInstallTower(true, 65, 35);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, STRAIGHT_LINE_BYTECODE, "");
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__nextTurn(gameId);
    IWorld(worldAddress).app__playerModifyTowerSystem(towerId, STRAIGHT_LINE_BYTECODE, "");

    bytes32 savedModificationId = keccak256(abi.encodePacked(STRAIGHT_LINE_BYTECODE));
    SavedModificationData memory savedModification = SavedModification.get(savedModificationId);
    assertEq(savedModification.useCount, 2);
  }

  function testRevertSaveModificationNoName() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory sourceCode = "Test source code";
    string memory emptyName;

    vm.expectRevert(bytes("TowerSystem: name is required"));
    IWorld(worldAddress).app__saveModification(BYTECODE, description, emptyName, sourceCode);
  }

  function testRevertSaveModificationNoDescription() public {
    vm.startPrank(alice);
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    string memory emptyDescription;

    vm.expectRevert(bytes("TowerSystem: description is required"));
    IWorld(worldAddress).app__saveModification(BYTECODE, emptyDescription, name, sourceCode);
  }

  function testRevertSaveModificationNameTooLong() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name that is too long and should revert";
    string memory sourceCode = "Test source code";

    vm.expectRevert(bytes("TowerSystem: name cannot be longer than 32 bytes"));
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);
  }

  function testRevertSaveModificationDescriptionTooLong() public {
    vm.startPrank(alice);
    string
      memory description = "This is a long test string meant to exceed the 256-byte limit in Solidity. It serves as a demonstration of handling storage and memory strings in smart contracts. The purpose of this string is to push beyond constraints, ensuring that Solidity developers recognize when their data exceeds inline storage limits.";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    vm.expectRevert(bytes("TowerSystem: description cannot be longer than 256 bytes"));
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);
  }

  function testRevertSaveModificationNameTaken() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("TowerSystem: name is already taken"));
    IWorld(worldAddress).app__saveModification(ANGLED_DOWN_BYTECODE, description, name, sourceCode);
  }

  function testEditModification() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "New name";

    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, newName);

    SavedModificationData memory savedModification = SavedModification.get(savedModificationId);
    assertEq(savedModification.description, newDescription);
    assertEq(savedModification.name, newName);
  }

  function testRevertEditModificationNotAuthor() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    vm.stopPrank();
    vm.startPrank(bob);

    string memory newDescription = "New description";
    string memory newName = "New name";

    vm.expectRevert(bytes("TowerSystem: only the author can edit this modification"));
    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertEditModificationNameTaken() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";

    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    vm.expectRevert(bytes("TowerSystem: name is already taken"));
    IWorld(worldAddress).app__saveModification(ANGLED_DOWN_BYTECODE, description, name, sourceCode);
    vm.stopPrank();
  }

  function testRevertEditModificationSameDetails() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory newDescription = "Test description";
    string memory newName = "Test name";

    vm.expectRevert(bytes("TowerSystem: name and description are the same as original"));
    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertEditModificationNoName() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory emptyName;

    vm.expectRevert(bytes("TowerSystem: name is required"));
    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, emptyName);
    vm.stopPrank();
  }

  function testRevertEditModificationNoDescription() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory emptyDescription;
    string memory newName = "New name";

    vm.expectRevert(bytes("TowerSystem: description is required"));
    IWorld(worldAddress).app__editModification(savedModificationId, emptyDescription, newName);
    vm.stopPrank();
  }

  function testRevertEditModificationNameTooLong() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "Test name that is too long and should revert";

    vm.expectRevert(bytes("TowerSystem: name cannot be longer than 32 bytes"));
    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertEditModificationDescriptionTooLong() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string
      memory newDescription = "This is a long test string meant to exceed the 256-byte limit in Solidity. It serves as a demonstration of handling storage and memory strings in smart contracts. The purpose of this string is to push beyond constraints, ensuring that Solidity developers recognize when their data exceeds inline storage limits.";
    string memory newName = "New name";

    vm.expectRevert(bytes("TowerSystem: description cannot be longer than 256 bytes"));
    IWorld(worldAddress).app__editModification(savedModificationId, newDescription, newName);
    vm.stopPrank();
  }

  function testRevertEditModificationModDoesNotExist() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    string memory newDescription = "New description";
    string memory newName = "New name";
    bytes32 fakeModificationId = keccak256(abi.encodePacked("fake"));

    vm.expectRevert(bytes("TowerSystem: modification does not exist"));
    IWorld(worldAddress).app__editModification(fakeModificationId, newDescription, newName);
    vm.stopPrank();
  }

  function testDeleteModification() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    IWorld(worldAddress).app__deleteModification(savedModificationId);

    SavedModificationData memory savedModification = SavedModification.get(savedModificationId);
    assertEq(savedModification.bytecode, bytes(""));
    assertEq(savedModification.description, "");
    assertEq(savedModification.name, "");
    assertEq(savedModification.sourceCode, "");
    assertEq(savedModification.author, address(0));
    assertEq(savedModification.useCount, 0);
  }

  function testRevertDeleteModificationNotAuthor() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    bytes32 savedModificationId = IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    vm.stopPrank();
    vm.startPrank(bob);

    vm.expectRevert(bytes("TowerSystem: only the author can delete this modification"));
    IWorld(worldAddress).app__deleteModification(savedModificationId);
    vm.stopPrank();
  }

  function testRevertDeleteModificationModDoesNotExist() public {
    vm.startPrank(alice);
    string memory description = "Test description";
    string memory name = "Test name";
    string memory sourceCode = "Test source code";
    IWorld(worldAddress).app__saveModification(BYTECODE, description, name, sourceCode);

    bytes32 fakeModificationId = keccak256(abi.encodePacked("fake"));

    vm.expectRevert(bytes("TowerSystem: modification does not exist"));
    IWorld(worldAddress).app__deleteModification(fakeModificationId);
    vm.stopPrank();
  }
}
