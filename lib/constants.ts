// Shared constants used by both client (wallet-context) and server (resolve-trades)

/** Known app/DEX fee rates (deducted from valueUSD) */
export const APP_FEE_RATES: Record<string, number> = {
  fomo: 0.01, // 1% fee
}
