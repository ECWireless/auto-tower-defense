import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  deploy: {
    upgradeableWorldImplementation: true,
  },
  enums: {
    ActionType: ["Skip", "Install", "Move", "Modify"],
  },
  systems: {
    AdminSystem: {
      openAccess: false,
    },
  },
  tables: {
    Action: {
      id: "bytes32",
      actionType: "ActionType",
      newX: "int16",
      newY: "int16",
      oldX: "int16",
      oldY: "int16",
      projectile: "bool",
    },
    AddressBook: {
      schema: {
        buyReceiverAddress: "address",
        sellEmitterAddress: "address",
        solarFarmAddress: "address",
        usdcAddress: "address",
      },
      key: [],
    },
    AddressToPlayerId: "bytes32", // Use addressToKey helper function; returns globalPlayerId
    BatteryDetails: {
      id: "bytes32", // This is the globalPlayerId
      activeBalance: "uint256", // Electricity in watt-hours
      lastRechargeTimestamp: "uint256",
      reserveBalance: "uint256", // Electricity in watt-hours
      stakedBalance: "uint256", // Electricity in watt-hours
    },
    Castle: "bool",
    Counter: {
      schema: {
        value: "uint32",
      },
      key: [],
    },
    CurrentGame: "bytes32", // globalPlayerId || tower Id
    DefaultLogic: {
      schema: {
        value: "address",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    EntityAtPosition: "bytes32",
    ExpenseReceipt: {
      key: ["id"],
      schema: {
        id: "bytes32", // keccak256(abi.encodePacked(savedKingdomId, gameId))
        amountToBattery: "uint256", // Electricity in watt-hours
        amountToKingdom: "uint256", // Electricity in watt-hours
        gameId: "bytes32", // The gameId of the game that generated this expense
        playerId: "bytes32",
        savedKingdomId: "bytes32",
        timestamp: "uint256",
        authors: "bytes23[]", // globalPlayerIds of all who authored the tower modifications used in the game
      },
      type: "offchainTable",
    },
    Game: {
      id: "bytes32", // keccak256(abi.encodePacked(globalPlayer1Id, globalPlayer2Id, timestamp));
      actionCount: "uint8",
      endTimestamp: "uint256",
      player1Id: "bytes32", // globalPlayerId
      player2Id: "bytes32", // globalPlayerId
      roundCount: "uint8",
      startTimestamp: "uint256",
      turn: "bytes32", // globalPlayerId
      winner: "bytes32", // globalPlayerId
    },
    Health: {
      schema: {
        id: "bytes32",
        currentHealth: "uint8",
        maxHealth: "uint8",
      },
      key: ["id"],
      codegen: {
        dataStruct: false,
      },
    },
    HighestLevel: "uint256", // ID is global player ID; value is level
    KingdomsByLevel: {
      key: ["level"],
      schema: {
        level: "uint256",
        savedKingdomIds: "bytes32[]",
      },
    },
    LastGameWonInRun: "bytes32", // ID is global player ID; value is savedGameId
    Level: "uint256",
    LoadedKingdomActions: {
      // When a game is created, the enemy SavedKingdom's actions are loaded into the game
      id: "bytes32", // gameId of the game being played
      savedKingdomId: "bytes32", // The SavedKindom the actions are loaded from
      actions: "bytes32[]",
    },
    LogicSystemAddress: {
      schema: {
        value: "address",
      },
      key: [],
    },
    MapConfig: {
      schema: {
        height: "int16",
        width: "int16",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    Owner: "bytes32", // ID it the tower ID; return is the globalPlayerId
    OwnerTowers: "bytes32[]", // ID is the localPlayerId; value is list of towerIds
    PlayerCount: {
      schema: {
        value: "uint256",
      },
      key: [],
    },
    PlayerIdToAddress: "address", // globalPlayerId is keccak256(abi.encodePacked(username, msg.sender, block.timestamp)) from player registration
    Position: {
      schema: {
        id: "bytes32",
        x: "int16",
        y: "int16",
      },
      key: ["id"],
      codegen: {
        dataStruct: false,
      },
    },
    Projectile: {
      id: "bytes32", // ID is the tower ID,
      logicAddress: "address",
      sizeLimit: "uint256",
      bytecode: "bytes",
      sourceCode: "string",
    },
    ProjectileTrajectory: {
      schema: {
        id: "bytes32",
        x: "int16[]",
        y: "int16[]",
      },
      key: ["id"],
      codegen: {
        dataStruct: false,
      },
    },
    RevenueReceipt: {
      key: ["id"],
      schema: {
        id: "bytes32", // keccak256(abi.encodePacked(savedKingdomId, gameId))
        amountToKingdom: "uint256", // Electricity in watt-hours
        amountToReserve: "uint256", // Electricity in watt-hours
        gameId: "bytes32", // The gameId of the game that generated this revenue
        playerId: "bytes32", // globalPlayerId
        savedKingdomId: "bytes32",
        timestamp: "uint256",
        authors: "bytes32[]", // globalPlayerIds of all who authored the tower modifications used in the game
      },
      type: "offchainTable",
    },
    SavedGame: {
      // This is the table that accumulates actions throughout a game; at the end of a run, it is copied to SavedKingdom
      id: "bytes32", // gameId of the game being played
      gameId: "bytes32",
      winner: "bytes32", // globalPlayerId
      actions: "bytes32[]",
    },
    SavedKingdom: {
      // This is the table accumulates revenue for each player (author)
      id: "bytes32", // This is a deterministic hash of all actions by the author in the game; keccak256(abi.encodePacked(actions[]))
      author: "bytes32", // globalPlayerId
      createdAtTimestamp: "uint256",
      electricityBalance: "uint256",
      losses: "uint256",
      wins: "uint256",
      actions: "bytes32[]",
    },
    SavedModification: {
      id: "bytes32", // keccak256(abi.encodePacked(bytecode))
      author: "bytes32", // globalPlayerId
      size: "uint256",
      timestamp: "uint256",
      useCount: "uint256",
      bytecode: "bytes",
      description: "string",
      name: "string",
      sourceCode: "string",
    },
    SavedModNameTaken: {
      schema: {
        nameAsBytes: "bytes32", // keccak256(abi.encodePacked(name))
        value: "bytes32", // savedModificationId
      },
      key: ["nameAsBytes"],
      codegen: {
        dataStruct: false,
      },
    },
    SolarFarmDetails: {
      schema: {
        electricityBalance: "uint256", // 16.8 MWh (16800000 watt-hours) to start
        fiatBalance: "uint256", // Unformatted balance of USDC with 6 decimals
        msPerWh: "uint256", // Number of milliseconds per watt hour; start at 3600ms
        whPerCentPrice: "uint256", // Electricity in watt-hours per 1 cent in USDC; 1.92kWh/cent; start at 1920
      },
      key: [],
    },
    TopLevel: {
      schema: {
        level: "uint256",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    Tower: "bool",
    TowerCounter: {
      schema: {
        value: "uint256",
      },
      key: [],
    },
    Username: "string", // ID is globalPlayerId
    UsernameTaken: {
      schema: {
        usernameBytes: "bytes32",
        value: "bool",
      },
      key: ["usernameBytes"],
    },
    WinStreak: "uint256",
  },
});
