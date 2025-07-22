// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Patent, PatentNameTaken } from "../codegen/index.sol";
import { DEFAULT_LOGIC_SIZE_LIMIT } from "../../constants.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";
import { PatentHelpers } from "../Libraries/PatentHelpers.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PatentSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "PatentSystem: player not registered");
    _;
  }

  function registerPatent(
    bytes memory bytecode,
    string memory description,
    string memory name,
    string memory sourceCode
  ) external onlyRegisteredPlayer returns (bytes32 patentId) {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());

    uint256 contractSize = getContractSize(bytecode);
    require(contractSize > 0, "PatentSystem: bytecode is invalid");
    require(
      contractSize <= DEFAULT_LOGIC_SIZE_LIMIT,
      string(abi.encodePacked("Contract cannot be larger than ", Strings.toString(DEFAULT_LOGIC_SIZE_LIMIT), " bytes"))
    );

    patentId = keccak256(abi.encodePacked(bytecode));

    bytes memory patentBytecode = Patent.getBytecode(patentId);
    require(keccak256(abi.encodePacked(patentBytecode)) != patentId, "PatentSystem: patent already exists");

    PatentHelpers.validatePatent(patentId, description, name);

    Patent.set(patentId, globalPlayerId, contractSize, block.timestamp, 0, bytecode, description, name, sourceCode);
    return patentId;
  }

  function amendPatent(bytes32 patentId, string memory description, string memory name) external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());

    bytes memory bytecode = Patent.getBytecode(patentId);
    string memory originalName = Patent.getName(patentId);

    bool nameHasChanged = keccak256(abi.encodePacked(originalName)) != keccak256(abi.encodePacked(name));
    bool descriptionHasChanged = keccak256(abi.encodePacked(Patent.getDescription(patentId))) !=
      keccak256(abi.encodePacked(description));

    require(nameHasChanged || descriptionHasChanged, "PatentSystem: name and description are the same as original");
    require(keccak256(abi.encodePacked(bytecode)) == patentId, "PatentSystem: patent does not exist");
    require(Patent.getPatentee(patentId) == globalPlayerId, "PatentSystem: only the patentee can amend this patent");

    PatentHelpers.validatePatent(patentId, description, name);

    Patent.setDescription(patentId, description);
    Patent.setName(patentId, name);
  }

  function disclaimPatent(bytes32 patentId) external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    bytes memory bytecode = Patent.getBytecode(patentId);
    require(keccak256(abi.encodePacked(bytecode)) == patentId, "PatentSystem: patent does not exist");
    require(Patent.getPatentee(patentId) == globalPlayerId, "PatentSystem: only the patentee can disclaim this patent");

    bytes32 nameHash = keccak256(abi.encodePacked(Patent.getName(patentId)));
    PatentNameTaken.set(nameHash, bytes32(0));
    Patent.deleteRecord(patentId);
  }

  function getContractSize(bytes memory bytecode) public returns (uint256 size) {
    address newSystem;
    assembly {
      newSystem := create(0, add(bytecode, 0x20), mload(bytecode))
    }

    assembly {
      size := extcodesize(newSystem)
    }
    return size;
  }
}
