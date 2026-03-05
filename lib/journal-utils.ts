/**
 * Build a unique key for a journal entry from trade identifiers.
 * Used to look up journal entries in the journalMap.
 */
export function journalKey(t: { tokenMint: string; tradeNumber: number; walletAddress: string }): string {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
}
