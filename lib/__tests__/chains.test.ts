/**
 * Characterization tests for lib/chains.ts address validation, before Batch 4
 * routes ~9 duplicated regex sites through these helpers. Pins that the shared
 * patterns match the same inputs the hardcoded copies did.
 */
import {
  isValidAddress,
  detectChainFromAddress,
  isEvmChain,
  isChain,
  explorerTxUrl,
  ALL_CHAINS,
  CHAIN_CONFIG,
} from '../chains'

// Representative valid addresses.
const SOL = 'So11111111111111111111111111111111111111112' // 43 chars, base58
const SOL2 = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
const EVM = '0x1234567890abcdefABCDEF1234567890abcdef12' // 0x + 40 hex

describe('isValidAddress(solana)', () => {
  it('accepts valid base58 solana addresses (32–44 chars)', () => {
    expect(isValidAddress(SOL, 'solana')).toBe(true)
    expect(isValidAddress(SOL2, 'solana')).toBe(true)
  })

  it('rejects 0x/EVM, empty, too-short, and base58-illegal chars (0 O I l)', () => {
    expect(isValidAddress(EVM, 'solana')).toBe(false)
    expect(isValidAddress('', 'solana')).toBe(false)
    expect(isValidAddress('abc', 'solana')).toBe(false)
    // contains '0' (zero) which is excluded from base58
    expect(isValidAddress('0oIl' + 'a'.repeat(40), 'solana')).toBe(false)
  })
})

describe('isValidAddress(base/bnb) — EVM pattern', () => {
  it('accepts a 0x + 40-hex address for both base and bnb', () => {
    expect(isValidAddress(EVM, 'base')).toBe(true)
    expect(isValidAddress(EVM, 'bnb')).toBe(true)
  })

  it('rejects wrong length, missing 0x, non-hex', () => {
    expect(isValidAddress('0x123', 'base')).toBe(false)
    expect(isValidAddress('1234567890abcdef1234567890abcdef12345678', 'base')).toBe(false) // no 0x
    expect(isValidAddress('0x' + 'g'.repeat(40), 'base')).toBe(false) // non-hex
    expect(isValidAddress(SOL, 'base')).toBe(false)
  })
})

describe('detectChainFromAddress', () => {
  it('base58 → solana', () => {
    expect(detectChainFromAddress(SOL)).toBe('solana')
  })

  it('0x → null (ambiguous across every EVM chain)', () => {
    expect(detectChainFromAddress(EVM)).toBeNull()
  })

  it('garbage → null', () => {
    expect(detectChainFromAddress('not-an-address')).toBeNull()
    expect(detectChainFromAddress('')).toBeNull()
  })
})

describe('multi-chain support', () => {
  it('exposes every supported chain', () => {
    expect(ALL_CHAINS).toEqual(
      expect.arrayContaining(['solana', 'ethereum', 'base', 'bnb', 'robinhood'])
    )
  })

  it('accepts 0x addresses on every EVM chain', () => {
    for (const chain of ALL_CHAINS.filter(isEvmChain)) {
      expect(isValidAddress(EVM, chain)).toBe(true)
      expect(isValidAddress(SOL, chain)).toBe(false)
    }
  })

  it('classifies chain kind correctly', () => {
    expect(isEvmChain('solana')).toBe(false)
    for (const chain of ['ethereum', 'base', 'bnb', 'robinhood'] as const) {
      expect(isEvmChain(chain)).toBe(true)
    }
  })

  it('gives every EVM chain a Zerion id, and solana none', () => {
    expect(CHAIN_CONFIG.solana.zerionChainId).toBeNull()
    for (const chain of ALL_CHAINS.filter(isEvmChain)) {
      expect(CHAIN_CONFIG[chain].zerionChainId).toBeTruthy()
    }
  })

  it('builds an explorer URL for every chain', () => {
    for (const chain of ALL_CHAINS) {
      const url = explorerTxUrl(chain, 'HASH123')
      expect(url).toMatch(/^https:\/\//)
      expect(url).toContain('HASH123')
      expect(url).not.toContain('{HASH}')
    }
  })

  it('isChain guards the union', () => {
    expect(isChain('robinhood')).toBe(true)
    expect(isChain('ethereum')).toBe(true)
    expect(isChain('dogecoin')).toBe(false)
    expect(isChain('')).toBe(false)
  })
})
