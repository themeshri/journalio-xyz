/**
 * Tests for lib/hooks/use-wallet-url-sync.ts — the pure parse/serialize half.
 * The hook itself needs a router and is covered by browser verification.
 */
import {
  parseWalletsParam,
  serializeWalletsParam,
  sameWalletSet,
} from '../hooks/use-wallet-url-sync'
import type { Chain } from '../chains'

const w = (address: string, chain: Chain = 'solana') => ({ address, chain })

describe('parseWalletsParam', () => {
  it('returns null when the param is absent — "no opinion"', () => {
    // Distinct from '' which means "explicitly none selected".
    expect(parseWalletsParam(null)).toBeNull()
  })

  it('returns an empty array for an empty param — "explicitly none"', () => {
    expect(parseWalletsParam('')).toEqual([])
  })

  it('parses a single chain-qualified wallet', () => {
    expect(parseWalletsParam('solana:abc')).toEqual([w('abc')])
  })

  it('parses several wallets across chains', () => {
    expect(parseWalletsParam('solana:abc,base:def')).toEqual([
      w('abc', 'solana'),
      w('def', 'base'),
    ])
  })

  it('defaults a bare address to solana so hand-written links work', () => {
    expect(parseWalletsParam('abc')).toEqual([w('abc', 'solana')])
  })

  it('tolerates whitespace and empty segments', () => {
    expect(parseWalletsParam('solana:abc, ,base:def,')).toEqual([
      w('abc', 'solana'),
      w('def', 'base'),
    ])
  })

  it('drops a token with a chain but no address', () => {
    expect(parseWalletsParam('solana:')).toEqual([])
  })

  it('keeps an address containing a colon after the first separator', () => {
    expect(parseWalletsParam('base:a:b')).toEqual([w('a:b', 'base')])
  })
})

describe('serializeWalletsParam', () => {
  it('round-trips through parse', () => {
    const wallets = [w('abc', 'solana'), w('def', 'base')]
    expect(parseWalletsParam(serializeWalletsParam(wallets))).toEqual(wallets)
  })

  it('serializes an empty list to an empty string', () => {
    expect(serializeWalletsParam([])).toBe('')
  })
})

describe('sameWalletSet', () => {
  it('is true regardless of order', () => {
    expect(sameWalletSet([w('a'), w('b')], [w('b'), w('a')])).toBe(true)
  })

  it('is false on differing length', () => {
    expect(sameWalletSet([w('a')], [w('a'), w('b')])).toBe(false)
  })

  it('is false when a wallet differs', () => {
    expect(sameWalletSet([w('a')], [w('b')])).toBe(false)
  })

  it('distinguishes the same address on different chains', () => {
    expect(sameWalletSet([w('a', 'solana')], [w('a', 'base')])).toBe(false)
  })

  it('is true for two empty sets', () => {
    expect(sameWalletSet([], [])).toBe(true)
  })
})
