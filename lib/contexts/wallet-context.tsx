'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { type Chain } from '../chains'

export interface SavedWallet {
  address: string
  chain: Chain
  nickname: string
  dex: string
}

export type WalletKey = string // "chain:address"

export function makeWalletKey(address: string, chain: Chain): WalletKey {
  return `${chain}:${address}`
}

export interface WalletIdentityContextValue {
  savedWallets: SavedWallet[]
  activeWallets: SavedWallet[]
  hasActiveWallets: boolean
  initialized: boolean
  setWalletActive: (address: string, chain: Chain, active: boolean) => void
  reloadWallets: () => Promise<void>
}

export const WalletIdentityContext = createContext<WalletIdentityContextValue | null>(null)

export function useWalletIdentity() {
  const ctx = useContext(WalletIdentityContext)
  if (!ctx) throw new Error('useWalletIdentity must be used within DashboardProviders')
  return ctx
}

/** Build query string params for analytics API endpoints from active wallets */
export function buildWalletQueryParams(wallets: SavedWallet[]): string {
  if (wallets.length === 0) return ''
  const addresses = wallets.map((w) => w.address).join(',')
  const chains = wallets.map((w) => w.chain).join(',')
  const dexes = wallets.map((w) => w.dex).join(',')
  return `addresses=${encodeURIComponent(addresses)}&chains=${encodeURIComponent(chains)}&dexes=${encodeURIComponent(dexes)}`
}
