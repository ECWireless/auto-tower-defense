// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { ResourceId } from "@latticexyz/store/src/ResourceId.sol";
import { WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { Systems } from "@latticexyz/world/src/codegen/tables/Systems.sol";

bytes16 constant SOLAR_FARM_SYSTEM_NAME = "SolarFarmSystem";

function _solarFarmSystemId() pure returns (ResourceId) {
  return WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "app", name: SOLAR_FARM_SYSTEM_NAME });
}

function _solarFarmSystemAddress() view returns (address) {
  (address gameAddress, ) = Systems.get(_solarFarmSystemId());
  return gameAddress;
}
