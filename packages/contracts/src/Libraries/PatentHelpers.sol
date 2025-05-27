// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { SavedModNameTaken } from "../codegen/index.sol";
import { MAX_MOD_DESCRIPTION_LENGTH, MAX_MOD_NAME_LENGTH } from "../../constants.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PatentHelpers
 * @notice This library contains helper functions for registering, modifying, and deleting patents
 */
library PatentHelpers {
  function validateModification(bytes32 savedModificationId, string memory description, string memory name) external {
    bytes32 nameHash = keccak256(abi.encodePacked(name));
    require(SavedModNameTaken.get(nameHash) == bytes32(0), "TowerSystem: name is already taken");
    require(bytes(name).length > 0, "TowerSystem: name is required");
    require(bytes(description).length > 0, "TowerSystem: description is required");
    require(
      bytes(name).length <= 32,
      string(
        abi.encodePacked("TowerSystem: name cannot be longer than ", Strings.toString(MAX_MOD_NAME_LENGTH), " bytes")
      )
    );
    require(
      bytes(description).length <= 256,
      string(
        abi.encodePacked(
          "TowerSystem: description cannot be longer than ",
          Strings.toString(MAX_MOD_DESCRIPTION_LENGTH),
          " bytes"
        )
      )
    );
    SavedModNameTaken.set(nameHash, savedModificationId);
  }
}
