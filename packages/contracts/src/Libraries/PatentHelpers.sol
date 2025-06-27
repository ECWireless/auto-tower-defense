// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { PatentNameTaken } from "../codegen/index.sol";
import { MAX_PATENT_DESCRIPTION_LENGTH, MAX_PATENT_NAME_LENGTH } from "../../constants.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PatentHelpers
 * @notice This library contains helper functions for registering, amending, and deleting patents
 */
library PatentHelpers {
  function validatePatent(bytes32 patentId, string memory description, string memory name) external {
    bytes32 nameHash = keccak256(abi.encodePacked(name));
    bytes32 namePatentId = PatentNameTaken.get(nameHash);
    if (namePatentId != patentId) {
      require(namePatentId == bytes32(0), "PatentSystem: name is already taken by another patent");
    }
    require(bytes(name).length > 0, "PatentSystem: name is required");
    require(bytes(description).length > 0, "PatentSystem: description is required");
    require(
      bytes(name).length <= 32,
      string(
        abi.encodePacked("PatentSystem: name cannot be longer than ", Strings.toString(MAX_PATENT_NAME_LENGTH), " bytes")
      )
    );
    require(
      bytes(description).length <= 256,
      string(
        abi.encodePacked(
          "PatentSystem: description cannot be longer than ",
          Strings.toString(MAX_PATENT_DESCRIPTION_LENGTH),
          " bytes"
        )
      )
    );
    PatentNameTaken.set(nameHash, patentId);
  }
}
