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
      schema: {
        id: "bytes32",
        actionType: "ActionType",
        newX: "int16",
        newY: "int16",
        oldX: "int16",
        oldY: "int16",
        projectile: "bool",
      },
      key: ["id"],
    },
    // BatteryDetails: {},
    Castle: "bool",
    Counter: {
      schema: {
        value: "uint32",
      },
      key: [],
    },
    CurrentGame: "bytes32", // Game.id || towerId
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
    // ExpenseReceipt: {},
    Game: {
      schema: {
        id: "bytes32", // keccak256(abi.encodePacked(player1Address, player2Address, timestamp));
        actionCount: "uint8",
        endTimestamp: "uint256",
        player1Address: "address",
        player2Address: "address",
        roundCount: "uint8",
        startTimestamp: "uint256",
        turn: "address",
        winner: "address",
      },
      key: ["id"],
    },
    GamesByLevel: {
      key: ["level"],
      schema: {
        level: "uint256",
        gameIds: "bytes32[]",
      },
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
    KingdomsByLevel: {
      key: ["level"],
      schema: {
        level: "uint256",
        savedKingdomIds: "bytes32[]",
      },
    },
    LastGameWonInRun: "bytes32", // ID is global player ID; value is savedGameId
    Level: "uint256",
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
    Owner: "address",
    OwnerTowers: "bytes32[]",
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
      schema: {
        id: "bytes32", // ID is the tower ID,
        logicAddress: "address",
        sizeLimit: "uint256",
        bytecode: "bytes",
        sourceCode: "string",
      },
      key: ["id"],
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
    // RevenueReceipt: {},
    SavedGame: {
      // This is the table that accumulates actions throughout a game; at the end of a run, it is copied to SavedKingdom
      schema: {
        id: "bytes32", // keccak256(abi.encodePacked(gameId, playerId)) when the template is saved; gameId when the template is loaded for a game
        gameId: "bytes32",
        winner: "address",
        actions: "bytes32[]",
      },
      key: ["id"],
    },
    SavedKingdom: {
      // This is the table accumulates revenue for each player (author)
      schema: {
        id: "bytes32", // This is a deterministic hash of all actions by the author in the game; keccak256(abi.encodePacked(actions[]))
        author: "address",
        electricitybalance: "uint256",
        timestamp: "uint256",
        winStreak: "uint256",
        actions: "bytes32[]",
      },
      key: ["id"],
    },
    SavedModification: {
      schema: {
        id: "bytes32", // keccak256(abi.encodePacked(bytecode))
        author: "address",
        size: "uint256",
        timestamp: "uint256",
        useCount: "uint256",
        bytecode: "bytes",
        description: "string",
        name: "string",
        sourceCode: "string",
      },
      key: ["id"],
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
        electricityPrice: "uint256", // Unformatted cost in USDC with 6 decimals
        fiatBalance: "uint256", // Unformatted balance of USDC with 6 decimals
        electricityBalance: "uint256",
        msPerWh: "uint256", // Number of milliseconds per watt hour; start at 3600ms
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
    Username: "string",
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
