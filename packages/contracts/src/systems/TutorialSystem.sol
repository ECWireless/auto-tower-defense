// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { TutorialProgress } from "../codegen/index.sol";
import { EntityHelpers } from "../Libraries/EntityHelpers.sol";

contract TutorialSystem is System {
  modifier onlyRegisteredPlayer() {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    require(globalPlayerId != bytes32(0), "TutorialSystem: player not registered");
    _;
  }

  function completeTutorialStep1() external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    TutorialProgress.set(globalPlayerId, true, false, false, false, false);
  }

  function completeTutorialStep2() external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    TutorialProgress.set(globalPlayerId, true, true, false, false, false);
  }

  function completeTutorialStep3() external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    TutorialProgress.set(globalPlayerId, true, true, true, false, false);
  }

  function completeTutorialStep4() external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    TutorialProgress.set(globalPlayerId, true, true, true, true, false);
  }

  function completeTutorialStep5() external onlyRegisteredPlayer {
    bytes32 globalPlayerId = EntityHelpers.addressToGlobalPlayerId(_msgSender());
    TutorialProgress.set(globalPlayerId, true, true, true, true, true);
  }
}
