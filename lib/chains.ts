export type Chain = 'solana' | 'base' | 'bnb'

export interface ChainConfig {
  label: string
  nativeToken: string
  wrappedToken: string
  stablecoins: string[]
  excludedSymbols: Set<string>
  zerionChainId: string | null // null for solana (uses separate API)
  addressPattern: RegExp
}

export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  solana: {
    label: 'Solana',
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
  },
  base: {
    label: 'Base',
    nativeToken: 'ETH',
    wrappedToken: 'WETH',
    stablecoins: ['USDC', 'USDT', 'USDbC', 'DAI'],
    excludedSymbols: new Set([
      'ETH', 'WETH', 'Wrapped Ether',
      'USDC', 'USDT', 'USDbC', 'DAI',
    ]),
    zerionChainId: 'base',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
  },
  bnb: {
    label: 'BNB',
    nativeToken: 'BNB',
    wrappedToken: 'WBNB',
    stablecoins: ['USDT', 'USDC', 'BUSD', 'DAI'],
    excludedSymbols: new Set([
      'BNB', 'WBNB', 'Wrapped BNB',
      'USDT', 'USDC', 'BUSD', 'DAI',
    ]),
    zerionChainId: 'binance-smart-chain',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
  },
}

/**
 * Detect chain from address format.
 * Returns 'solana' for base58, null for 0x (ambiguous — user must pick).
 */
export function detectChainFromAddress(address: string): Chain | null {
  if (CHAIN_CONFIG.solana.addressPattern.test(address)) return 'solana'
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return null // ambiguous: could be base or bnb
  return null
}

export function isEvmChain(chain: Chain): boolean {
  return chain === 'base' || chain === 'bnb'
}

export function isValidAddress(address: string, chain: Chain): boolean {
  return CHAIN_CONFIG[chain].addressPattern.test(address)
}

export function explorerTxUrl(chain: Chain, signature: string): string {
  switch (chain) {
    case 'solana': return `https://solscan.io/tx/${signature}`
    case 'base':   return `https://basescan.org/tx/${signature}`
    case 'bnb':    return `https://bscscan.com/tx/${signature}`
  }
}
