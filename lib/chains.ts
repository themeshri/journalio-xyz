export type Chain = 'solana' | 'ethereum' | 'base' | 'bnb' | 'robinhood'

/**
 * How a chain's trade history is fetched. `svm` goes through Solana Tracker,
 * `evm` through Zerion. Dispatch reads this rather than hardcoding chain names,
 * so adding a chain can't silently route to the wrong API.
 */
export type ChainKind = 'svm' | 'evm'

export interface ChainConfig {
  label: string
  kind: ChainKind
  nativeToken: string
  wrappedToken: string
  stablecoins: string[]
  excludedSymbols: Set<string>
  zerionChainId: string | null // null for solana (uses separate API)
  addressPattern: RegExp
  /** Explorer transaction URL; `{HASH}` is substituted. */
  explorerTxUrlTemplate: string
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/

export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  solana: {
    label: 'Solana',
    kind: 'svm',
    nativeToken: 'SOL',
    wrappedToken: 'WSOL',
    stablecoins: ['USDC', 'USDT', 'USDS', 'PYUSD', 'DAI'],
    excludedSymbols: new Set([
      'SOL', 'WSOL', 'Wrapped SOL',
      'USDC', 'USDT', 'USDS', 'PYUSD', 'DAI',
      'mSOL', 'stSOL', 'jitoSOL', 'bSOL',
    ]),
    zerionChainId: null,
    addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    explorerTxUrlTemplate: 'https://solscan.io/tx/{HASH}',
  },
  ethereum: {
    label: 'Ethereum',
    kind: 'evm',
    nativeToken: 'ETH',
    wrappedToken: 'WETH',
    stablecoins: ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'],
    excludedSymbols: new Set([
      'ETH', 'WETH', 'Wrapped Ether',
      'USDC', 'USDT', 'DAI', 'BUSD', 'FRAX',
      'stETH', 'wstETH', 'rETH', 'cbETH',
    ]),
    zerionChainId: 'ethereum',
    addressPattern: EVM_ADDRESS,
    explorerTxUrlTemplate: 'https://etherscan.io/tx/{HASH}',
  },
  base: {
    label: 'Base',
    kind: 'evm',
    nativeToken: 'ETH',
    wrappedToken: 'WETH',
    stablecoins: ['USDC', 'USDT', 'USDbC', 'DAI'],
    excludedSymbols: new Set([
      'ETH', 'WETH', 'Wrapped Ether',
      'USDC', 'USDT', 'USDbC', 'DAI',
    ]),
    zerionChainId: 'base',
    addressPattern: EVM_ADDRESS,
    explorerTxUrlTemplate: 'https://basescan.org/tx/{HASH}',
  },
  bnb: {
    label: 'BNB',
    kind: 'evm',
    nativeToken: 'BNB',
    wrappedToken: 'WBNB',
    stablecoins: ['USDT', 'USDC', 'BUSD', 'DAI'],
    excludedSymbols: new Set([
      'BNB', 'WBNB', 'Wrapped BNB',
      'USDT', 'USDC', 'BUSD', 'DAI',
    ]),
    zerionChainId: 'binance-smart-chain',
    addressPattern: EVM_ADDRESS,
    explorerTxUrlTemplate: 'https://bscscan.com/tx/{HASH}',
  },
  robinhood: {
    label: 'Robinhood',
    kind: 'evm',
    // Robinhood Chain (chainId 4663) is an EVM L2 with ETH as its native asset.
    nativeToken: 'ETH',
    wrappedToken: 'WETH',
    stablecoins: ['USDC', 'USDT', 'DAI'],
    excludedSymbols: new Set([
      'ETH', 'WETH', 'Wrapped Ether',
      'USDC', 'USDT', 'DAI',
    ]),
    zerionChainId: 'robinhood',
    addressPattern: EVM_ADDRESS,
    explorerTxUrlTemplate: 'https://robinhoodchain.blockscout.com/tx/{HASH}',
  },
}

/** Every chain the app supports, in display order. */
export const ALL_CHAINS = Object.keys(CHAIN_CONFIG) as Chain[]

export function isChain(value: string): value is Chain {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIG, value)
}

/**
 * Detect chain from address format.
 * Returns 'solana' for base58, null for 0x — every EVM chain shares the same
 * address format, so the user must pick which one.
 */
export function detectChainFromAddress(address: string): Chain | null {
  if (CHAIN_CONFIG.solana.addressPattern.test(address)) return 'solana'
  return null
}

export function isEvmChain(chain: Chain): boolean {
  return CHAIN_CONFIG[chain].kind === 'evm'
}

export function isValidAddress(address: string, chain: Chain): boolean {
  return CHAIN_CONFIG[chain].addressPattern.test(address)
}

export function explorerTxUrl(chain: Chain, signature: string): string {
  return CHAIN_CONFIG[chain].explorerTxUrlTemplate.replace('{HASH}', signature)
}
