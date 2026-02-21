'use client'

/**
 * Backward-compatible barrel re-export.
 *
 * All state now lives in lib/contexts/ (split into 4 focused contexts).
 * This file re-exports everything so existing consumer pages continue
 * to work without changes — they keep using `useWallet()`.
 *
 * Individual pages can opt into specific hooks later for better perf:
 *   useWalletIdentity(), useTrades(), useMetadata(), useBalances()
 */

// Re-export the split contexts' hooks and types
export {
  DashboardProviders,
  useWalletIdentity,
  useTrades,
  useMetadata,
  useBalances,
  buildWalletQueryParams,
  makeWalletKey,
} from './contexts'

export type { SavedWallet, WalletKey } from './contexts'
export type { WalletSlot } from './contexts'

// Import the individual hooks for the combined useWallet()
import { useWalletIdentity } from './contexts'
import { useTrades } from './contexts'
import { useMetadata } from './contexts'
import { useBalances } from './contexts'

/**
 * Combined hook — returns everything from all 4 contexts.
 * Backward-compatible with the old monolithic WalletProvider.
 */
export function useWallet() {
  return {
    ...useWalletIdentity(),
    ...useTrades(),
    ...useMetadata(),
    ...useBalances(),
  }
}

// Legacy export for dashboard layout transition
export { DashboardProviders as WalletProvider } from './contexts'
