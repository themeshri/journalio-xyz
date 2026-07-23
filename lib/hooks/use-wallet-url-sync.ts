'use client'

/**
 * Wallet selection in the URL.
 *
 * Phase C11 of the TradeZella refactor. TradeZella encodes the account
 * dimension in the query string (`?accounts[]=fdad036b`), which is what makes
 * an analytics view shareable and the back button correct (docs §1, §5).
 * Journalio kept the same state in localStorage only, so a pasted link showed
 * the recipient *their* wallets, not the ones being discussed.
 *
 * Contract: the URL wins when present; localStorage is the fallback for a cold
 * load with no `?wallets=` param, and is kept in sync so the next cold load
 * restores the last selection.
 */

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Chain } from '../chains'

export const WALLETS_PARAM = 'wallets'

export interface WalletRef {
  address: string
  chain: Chain
}

/**
 * Parse `?wallets=solana:addr1,base:addr2`.
 *
 * Returns null when the param is absent — meaning "no opinion, use the stored
 * selection" — which is different from an empty string, meaning "explicitly
 * none selected".
 */
export function parseWalletsParam(raw: string | null): WalletRef[] | null {
  if (raw === null) return null
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const idx = token.indexOf(':')
      // Bare addresses default to solana, so hand-written links stay usable.
      if (idx === -1) return { address: token, chain: 'solana' as Chain }
      return {
        chain: token.slice(0, idx) as Chain,
        address: token.slice(idx + 1),
      }
    })
    .filter((w) => w.address.length > 0)
}

export function serializeWalletsParam(wallets: WalletRef[]): string {
  return wallets.map((w) => `${w.chain}:${w.address}`).join(',')
}

/** True when both lists hold the same wallets, order-insensitively. */
export function sameWalletSet(a: WalletRef[], b: WalletRef[]): boolean {
  if (a.length !== b.length) return false
  const keys = new Set(a.map((w) => `${w.chain}:${w.address}`))
  return b.every((w) => keys.has(`${w.chain}:${w.address}`))
}

export function useWalletUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlWallets = useMemo(
    () => parseWalletsParam(searchParams.get(WALLETS_PARAM)),
    [searchParams]
  )

  /**
   * Write the selection into the URL.
   *
   * Uses `replace`, not `push`: toggling a wallet is a change of view, not a
   * navigation step, so it should not require one Back press per toggle.
   */
  const setUrlWallets = useCallback(
    (wallets: WalletRef[]) => {
      const params = new URLSearchParams(searchParams.toString())
      const next = serializeWalletsParam(wallets)
      const current = params.get(WALLETS_PARAM)
      if (current === next) return
      if (wallets.length === 0) params.delete(WALLETS_PARAM)
      else params.set(WALLETS_PARAM, next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return { urlWallets, setUrlWallets }
}
