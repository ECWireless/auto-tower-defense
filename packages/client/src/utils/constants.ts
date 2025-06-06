import { pyrope, redstone } from '@latticexyz/common/chains';
import { Chain, Hex } from 'viem';
import { anvil, base, baseSepolia } from 'viem/chains';

export const BATTERY_STORAGE_LIMIT = 24000; // Watt-hours
export const MAX_PLAYERS = 100;
export const MAX_ROUNDS = 10;
export const MAX_TICKS = 28;

export const CHAIN_ID = import.meta.env.CHAIN_ID;
export const WORLD_ADDRESS = import.meta.env.WORLD_ADDRESS;
export const START_BLOCK = BigInt(import.meta.env.START_BLOCK ?? 0n);
export const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export const url = new URL(window.location.href);
export type Entity = Hex;

const ALL_CHAINS: readonly [Chain, ...Chain[]] = [
  base,
  baseSepolia,
  pyrope,
  {
    ...redstone,
    rpcUrls: {
      ...redstone.rpcUrls,
      bundler: {
        http: redstone.rpcUrls.default.http,
        webSocket: redstone.rpcUrls.default.webSocket,
      },
    },
  },
  {
    ...anvil,
    contracts: {
      ...anvil.contracts,
      paymaster: {
        address: '0xf03E61E7421c43D9068Ca562882E98d1be0a6b6e',
      },
    },
    blockExplorers: {
      default: {} as never,
      worldsExplorer: {
        name: 'MUD Worlds Explorer',
        url: 'http://localhost:13690/anvil/worlds',
      },
    },
  },
] as const satisfies Chain[];

export const SUPPORTED_CHAINS = ALL_CHAINS.filter(chain => {
  // If CHAIN_ID is Pyrope, then only support testnets
  if (CHAIN_ID === pyrope.id) {
    return chain.testnet;
  }

  // If CHAIN_ID is redstone, then only support production chains
  if (CHAIN_ID === redstone.id) {
    return !chain.testnet;
  }

  // Otherwise, return empty array
  return true;
}) as [Chain, ...Chain[]];

export const USDC_ADDRESSES: { [key: number]: string } = {
  [anvil.id]: '0xc6709F349762B546d83760f28221CEd36d0a19D2',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0xCE420e1793A91efaB6E2cf8aa6b8314b46bde58F',
  [pyrope.id]: '0xAC49338E773d463b9fcd88D44456E0130a7ce35b',
};

export const ESCROW_ADDRESSES: { [key: number]: string } = {
  [base.id]: '0x977437F82fb629FBF3028d485144Ad5666228133',
  [baseSepolia.id]: '0x1ee0C3C8A365fC31eF1eAfAf83bA628940a9498a',
};

export const BUY_ESCROW_TX_KEY = 'buy-escrow-tx';
export const SELL_EMITTER_TX_KEY = 'sell-emitter-tx';

export const ESCROW_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_usdc',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_validator',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'ECDSAInvalidSignature',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'length',
        type: 'uint256',
      },
    ],
    name: 'ECDSAInvalidSignatureLength',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'ECDSAInvalidSignatureS',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'ElectricityPurchase',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'ElectricitySale',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'spendAmount',
        type: 'uint256',
      },
    ],
    name: 'buyElectricity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'isSaleProcessed',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'purchaseNonce',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'saleNonce',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'receiveAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes',
      },
    ],
    name: 'sellElectricity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newValidator',
        type: 'address',
      },
    ],
    name: 'updateValidator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'usdc',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'validator',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const BUY_RECEIVER_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_validator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_worldAddress',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'ECDSAInvalidSignature',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'length',
        type: 'uint256',
      },
    ],
    name: 'ECDSAInvalidSignatureLength',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'ECDSAInvalidSignatureS',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'spendAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes',
      },
    ],
    name: 'handleElectricityPurchase',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'processed',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newValidator',
        type: 'address',
      },
    ],
    name: 'updateValidator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newWorldAddress',
        type: 'address',
      },
    ],
    name: 'updateWorldAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'validator',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'worldAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const SELL_EMITTER_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_solarFarmSystem',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'receiveAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'ElectricitySold',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'receiveAmount',
        type: 'uint256',
      },
    ],
    name: 'emitSellElectricity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'saleNonce',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'solarFarmSystem',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newSystem',
        type: 'address',
      },
    ],
    name: 'updateSolarFarmSystem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
