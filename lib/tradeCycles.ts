import { Trade } from './solana-tracker';

/**
 * Constants used in trade cycle calculations
 */
const DUST_THRESHOLD = 100; // Tokens below this threshold are considered dust (negligible)
const MS_TO_SECONDS = 1000; // Conversion factor from milliseconds to seconds

/**
 * Common trading pairs and stablecoins to exclude from trade cycles.
 * These tokens are typically used as intermediary trading pairs and
 * don't represent meaningful position tracking.
 */
const EXCLUDED_TOKENS = new Set([
  'SOL', 'WSOL', 'Wrapped SOL',
  'USDC', 'USDT', 'USDS', 'PYUSD', 'DAI',
  'mSOL', 'stSOL', 'jitoSOL', 'bSOL',
]);

/**
 * Check if a token should be excluded from trade cycles.
 * @param symbol - The token symbol to check
 * @returns true if the token should be excluded from trade cycle tracking
 */
function isExcludedToken(symbol: string): boolean {
  return EXCLUDED_TOKENS.has(symbol.toUpperCase());
}

export interface TradeGroup {
  tradeNumber: number;        // Cycle number for this token
  token: string;             // Token symbol
  tokenMint: string;         // Token address
  buys: Trade[];             // All buy transactions
  sells: Trade[];            // All sell transactions
  totalBuyAmount: number;    // Total tokens bought
  totalSellAmount: number;   // Total tokens sold
  totalBuyValue: number;     // Total USD spent
  totalSellValue: number;    // Total USD received
  startBalance: number;      // Token balance at cycle start
  endBalance: number;        // Token balance at cycle end
  profitLoss: number;        // Net P/L in USD
  isComplete: boolean;       // true if balance returned to 0
  startDate: number;         // Timestamp of first transaction
  endDate?: number;          // Timestamp of last transaction (if complete)
  duration?: number;         // Duration in milliseconds (if complete)
}

export interface TradeCycle {
  token: string;
  tokenMint: string;
  tradeGroups: TradeGroup[];
}

export interface FlattenedTrade extends TradeGroup {
  globalTradeNumber: number;
}

/**
 * Trade direction from the perspective of the tracked token.
 * - 'buy': We are receiving/acquiring the token (token is in tokenOut)
 * - 'sell': We are sending/disposing of the token (token is in tokenIn)
 * - null: The token is not involved in this trade, or appears in both sides (invalid)
 */
type TradeDirection = 'buy' | 'sell' | null;

/**
 * Determine if a trade is a buy or sell based on token mint address.
 *
 * @param trade - The trade to analyze
 * @param tokenMint - The token address we're tracking
 * @returns 'buy' if receiving token, 'sell' if sending token, null if not involved
 *
 * Logic:
 * - Buy: We receive the token (it's in tokenOut / "to" field)
 * - Sell: We give away the token (it's in tokenIn / "from" field)
 * - Null: Token not involved or appears in both sides (shouldn't happen)
 */
function determineTradeDirection(trade: Trade, tokenMint: string): TradeDirection {
  const isTokenOut = trade.tokenOut.address === tokenMint;
  const isTokenIn = trade.tokenIn.address === tokenMint;

  // If token appears in both (shouldn't happen), skip
  if (isTokenOut && isTokenIn) return null;

  // If tokenOut matches, we're receiving this token = BUY
  if (isTokenOut) return 'buy';

  // If tokenIn matches, we're sending this token = SELL
  if (isTokenIn) return 'sell';

  // Token not involved in this trade
  return null;
}

/**
 * Check if a token balance is effectively zero (accounting for floating point errors and dust amounts).
 *
 * @param balance - The token balance to check
 * @returns true if the balance is less than 100 tokens (considered dust/negligible)
 *
 * Note: The threshold of 100 tokens is used to handle:
 * - Floating point arithmetic errors
 * - Dust amounts that are negligible in value
 * - Incomplete sells that leave tiny amounts
 */
function isEffectivelyZero(balance: number): boolean {
  return Math.abs(balance) < DUST_THRESHOLD;
}

/**
 * Helper to safely add a trade to a token's trade list in the map.
 * Uses immutable pattern by creating new arrays instead of mutating.
 *
 * @param tokenMap - The map of token addresses to trades
 * @param tokenMint - The token address
 * @param trade - The trade to add
 * @returns Updated map (functional approach)
 */
function addTradeToTokenMap(
  tokenMap: Map<string, Trade[]>,
  tokenMint: string,
  trade: Trade
): void {
  const existingTrades = tokenMap.get(tokenMint);
  if (existingTrades) {
    tokenMap.set(tokenMint, [...existingTrades, trade]);
  } else {
    tokenMap.set(tokenMint, [trade]);
  }
}

/**
 * Group trades by token address.
 * Each token will have all trades where it appears in either tokenIn or tokenOut.
 *
 * @param trades - Array of all trades
 * @returns Map of token addresses to their associated trades
 */
function groupTradesByToken(trades: Trade[]): Map<string, Trade[]> {
  const tokenMap = new Map<string, Trade[]>();

  trades.forEach(trade => {
    const tokenOutMint = trade.tokenOut.address;
    const tokenInMint = trade.tokenIn.address;

    // Add to tokenOut group (potential buy)
    addTradeToTokenMap(tokenMap, tokenOutMint, trade);

    // Add to tokenIn group (potential sell) if different token
    if (tokenInMint !== tokenOutMint) {
      addTradeToTokenMap(tokenMap, tokenInMint, trade);
    }
  });

  return tokenMap;
}

/**
 * Extract the token symbol from a trade for a given token address.
 * Safely handles the case where the token might be in either tokenIn or tokenOut.
 *
 * @param trade - The trade to extract from
 * @param tokenMint - The token address to find
 * @returns The token symbol, or empty string if not found
 */
function extractTokenSymbol(trade: Trade, tokenMint: string): string {
  if (trade.tokenOut.address === tokenMint) {
    return trade.tokenOut.symbol;
  }
  if (trade.tokenIn.address === tokenMint) {
    return trade.tokenIn.symbol;
  }
  return '';
}

/**
 * Check if we should start a new trade group.
 * A new group starts when:
 * 1. No current group exists (first trade)
 * 2. Balance is effectively zero AND we have a new buy (starting fresh position)
 *
 * @param currentGroup - The current trade group (or null)
 * @param runningBalance - Current token balance
 * @param tradeDirection - Direction of the current trade
 * @returns true if we should start a new group
 */
function shouldStartNewGroup(
  currentGroup: TradeGroup | null,
  runningBalance: number,
  tradeDirection: TradeDirection
): boolean {
  if (!currentGroup) return true;
  if (isEffectivelyZero(runningBalance) && tradeDirection === 'buy') return true;
  return false;
}

/**
 * Process a single trade and update the trade group.
 * This function handles the balance tracking and trade categorization.
 *
 * @param group - The current trade group to update
 * @param trade - The trade to process
 * @param tradeDirection - Whether this is a buy or sell
 * @param currentBalance - The current running balance before this trade
 * @returns Updated balance after this trade
 */
function processTradeIntoGroup(
  group: TradeGroup,
  trade: Trade,
  tradeDirection: TradeDirection,
  currentBalance: number
): number {
  let newBalance = currentBalance;

  if (tradeDirection === 'buy') {
    // BUY: We receive the token (tokenOut), spend USD (valueUSD)
    group.buys = [...group.buys, trade];
    group.totalBuyAmount += trade.amountOut;
    group.totalBuyValue += trade.valueUSD;
    newBalance += trade.amountOut;
  } else if (tradeDirection === 'sell') {
    // SELL: We give away the token (tokenIn), receive USD (valueUSD)
    group.sells = [...group.sells, trade];
    group.totalSellAmount += trade.amountIn;
    group.totalSellValue += trade.valueUSD;
    newBalance -= trade.amountIn;
  }

  // Update group state (immutably)
  group.endBalance = newBalance;
  group.profitLoss = group.totalSellValue - group.totalBuyValue;

  // Mark complete if balance returns to effectively zero
  if (isEffectivelyZero(newBalance)) {
    group.isComplete = true;
    group.endDate = trade.timestamp;
    group.duration = (group.endDate - group.startDate) * MS_TO_SECONDS;
  }

  return newBalance;
}

/**
 * Create trade groups for a specific token from its trades.
 * This breaks down the trades into logical "cycles" based on balance tracking.
 *
 * @param tokenMint - The token address
 * @param tokenTrades - All trades involving this token
 * @returns Array of trade groups representing distinct trading cycles
 */
function createTradeGroupsForToken(tokenMint: string, tokenTrades: Trade[]): TradeGroup[] {
  // Validate input
  if (tokenTrades.length === 0) {
    return [];
  }

  // Sort chronologically (oldest first)
  const sortedTrades = [...tokenTrades].sort((a, b) => a.timestamp - b.timestamp);

  const tradeGroups: TradeGroup[] = [];
  let currentGroup: TradeGroup | null = null;
  let runningBalance = 0;
  let tradeCounter = 1;

  sortedTrades.forEach(trade => {
    const tradeDirection = determineTradeDirection(trade, tokenMint);

    // Skip if this trade doesn't involve our token
    if (tradeDirection === null) return;

    // Check if we need to start a new group
    if (shouldStartNewGroup(currentGroup, runningBalance, tradeDirection)) {
      // Finalize previous group if it exists
      if (currentGroup && !currentGroup.isComplete) {
        currentGroup.endBalance = runningBalance;
        currentGroup.isComplete = isEffectivelyZero(runningBalance);
        if (currentGroup.isComplete) {
          currentGroup.endDate = trade.timestamp;
          currentGroup.duration = (currentGroup.endDate - currentGroup.startDate) * MS_TO_SECONDS;
        }
      }

      // Create new group
      const tokenSymbol = tradeDirection === 'buy' ? trade.tokenOut.symbol : trade.tokenIn.symbol;
      currentGroup = {
        tradeNumber: tradeCounter++,
        token: tokenSymbol,
        tokenMint: tokenMint,
        buys: [],
        sells: [],
        totalBuyAmount: 0,
        totalSellAmount: 0,
        totalBuyValue: 0,
        totalSellValue: 0,
        startBalance: runningBalance,
        endBalance: 0,
        profitLoss: 0,
        isComplete: false,
        startDate: trade.timestamp,
      };
      tradeGroups.push(currentGroup);
    }

    // Process the trade into the current group (with null check)
    if (currentGroup) {
      runningBalance = processTradeIntoGroup(currentGroup, trade, tradeDirection, runningBalance);
    }
  });

  return tradeGroups;
}

/**
 * Calculate trade cycles from transaction history.
 * Groups trades by token and creates trading cycles based on balance tracking.
 *
 * @param trades - Array of all wallet trades
 * @returns Array of trade cycles, one per token with trade activity
 *
 * Algorithm:
 * 1. Group trades by token address
 * 2. Filter out excluded tokens (stablecoins, SOL, etc.)
 * 3. For each token, create trade groups based on balance cycles
 * 4. A new cycle starts when balance returns to ~0 and a new buy occurs
 * 5. Track buys, sells, P/L, and completion status for each cycle
 */
export function calculateTradeCycles(trades: Trade[]): TradeCycle[] {
  // Handle empty input
  if (!trades || trades.length === 0) {
    return [];
  }

  // Group trades by token
  const tokenMap = groupTradesByToken(trades);

  const tradeCycles: TradeCycle[] = [];

  // Process each token
  tokenMap.forEach((tokenTrades, tokenMint) => {
    // Safely get token symbol from first trade
    const firstTrade = tokenTrades[0];
    if (!firstTrade) {
      return; // Skip if no trades (shouldn't happen, but safe)
    }

    const tokenSymbol = extractTokenSymbol(firstTrade, tokenMint);

    // Skip excluded tokens (stablecoins, SOL, wrapped tokens)
    if (isExcludedToken(tokenSymbol)) {
      return;
    }

    // Create trade groups for this token
    const tradeGroups = createTradeGroupsForToken(tokenMint, tokenTrades);

    // Only add tokens that have actual buy/sell activity
    if (tradeGroups.length > 0 && tradeGroups.some(g => g.buys.length > 0 || g.sells.length > 0)) {
      tradeCycles.push({
        token: tradeGroups[0].token,
        tokenMint: tokenMint,
        tradeGroups: tradeGroups,
      });
    }
  });

  return tradeCycles;
}

/**
 * Flatten and sort all trade groups across all tokens into a single sorted list.
 * Assigns a global trade number to each group for display purposes.
 *
 * @param tradeCycles - Array of trade cycles to flatten
 * @returns Flattened array of all trade groups, sorted by start date (newest first)
 *
 * Use case: For displaying all trades across all tokens in a unified timeline view.
 */
export function flattenTradeCycles(tradeCycles: TradeCycle[]): FlattenedTrade[] {
  // Handle empty input
  if (!tradeCycles || tradeCycles.length === 0) {
    return [];
  }

  let globalCounter = 1;

  // Use flatMap and map for immutable transformation
  const allTrades: FlattenedTrade[] = tradeCycles.flatMap(tokenCycle =>
    tokenCycle.tradeGroups.map(trade => ({
      ...trade,
      globalTradeNumber: globalCounter++,
    }))
  );

  // Sort by start date, newest first
  return allTrades.sort((a, b) => b.startDate - a.startDate);
}
