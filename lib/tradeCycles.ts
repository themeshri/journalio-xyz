import { Trade } from './solana-tracker';

// Common trading pairs and stablecoins to exclude from trade cycles
const EXCLUDED_TOKENS = new Set([
  'SOL', 'WSOL', 'Wrapped SOL',
  'USDC', 'USDT', 'USDS', 'PYUSD', 'DAI',
  'mSOL', 'stSOL', 'jitoSOL', 'bSOL',
]);

// Check if a token should be excluded from trade cycles
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

// Determine if a trade is a buy or sell based on token mint address
// Buy: We receive the token (it's in tokenOut / "to" field)
// Sell: We give away the token (it's in tokenIn / "from" field)
function isBuyTrade(trade: Trade, tokenMint: string): boolean | null {
  const isTokenOut = trade.tokenOut.address === tokenMint;
  const isTokenIn = trade.tokenIn.address === tokenMint;

  // If token appears in both (shouldn't happen), skip
  if (isTokenOut && isTokenIn) return null;

  // If tokenOut matches, we're receiving this token = BUY
  if (isTokenOut) return true;

  // If tokenIn matches, we're sending this token = SELL
  if (isTokenIn) return false;

  // Token not involved in this trade
  return null;
}

// Check if balance is effectively zero (accounting for floating point and dust amounts)
// Consider balance "zero" if less than 100 tokens (dust/negligible amount)
function isEffectivelyZero(balance: number): boolean {
  return Math.abs(balance) < 100;
}

// Calculate trade cycles from transaction history
export function calculateTradeCycles(trades: Trade[]): TradeCycle[] {
  // Group trades by token
  const tokenMap = new Map<string, Trade[]>();

  trades.forEach(trade => {
    // Track both tokenIn and tokenOut
    const tokenOutMint = trade.tokenOut.address;
    const tokenInMint = trade.tokenIn.address;

    // Add to tokenOut group (potential buy)
    if (!tokenMap.has(tokenOutMint)) {
      tokenMap.set(tokenOutMint, []);
    }
    tokenMap.get(tokenOutMint)!.push(trade);

    // Add to tokenIn group (potential sell) if different token
    if (tokenInMint !== tokenOutMint) {
      if (!tokenMap.has(tokenInMint)) {
        tokenMap.set(tokenInMint, []);
      }
      tokenMap.get(tokenInMint)!.push(trade);
    }
  });

  const tradeCycles: TradeCycle[] = [];

  // Process each token
  tokenMap.forEach((tokenTrades, tokenMint) => {
    // Get token symbol from the first trade
    const firstTrade = tokenTrades[0];
    const tokenSymbol =
      firstTrade.tokenOut.address === tokenMint ? firstTrade.tokenOut.symbol : firstTrade.tokenIn.symbol;

    // Skip excluded tokens (stablecoins, SOL, wrapped tokens)
    if (isExcludedToken(tokenSymbol)) {
      return;
    }

    // Sort chronologically (oldest first)
    const sortedTrades = [...tokenTrades].sort((a, b) => a.timestamp - b.timestamp);

    const tradeGroups: TradeGroup[] = [];
    let currentGroup: TradeGroup | null = null;
    let runningBalance = 0;
    let tradeCounter = 1;

    sortedTrades.forEach(trade => {
      const isBuy = isBuyTrade(trade, tokenMint);

      // Skip if this trade doesn't involve our token
      if (isBuy === null) return;

      // Start new group if:
      // 1. No current group exists
      // 2. Balance is 0 and we have a new buy
      // 3. Previous group is complete
      if (!currentGroup || (isEffectivelyZero(runningBalance) && isBuy)) {
        if (currentGroup && !currentGroup.isComplete) {
          currentGroup.endBalance = runningBalance;
          currentGroup.isComplete = isEffectivelyZero(runningBalance);
          if (currentGroup.isComplete) {
            currentGroup.endDate = trade.timestamp;
            currentGroup.duration = (currentGroup.endDate - currentGroup.startDate) * 1000;
          }
        }

        currentGroup = {
          tradeNumber: tradeCounter++,
          token: isBuy ? trade.tokenOut.symbol : trade.tokenIn.symbol,
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

      // Add trade to current group
      if (isBuy) {
        // BUY: We receive the token (tokenOut), spend USD (valueUSD from tokenIn)
        currentGroup.buys.push(trade);
        currentGroup.totalBuyAmount += trade.amountOut; // Amount of token received
        currentGroup.totalBuyValue += trade.valueUSD;   // USD spent
        runningBalance += trade.amountOut;
      } else {
        // SELL: We give away the token (tokenIn), receive USD (valueUSD from tokenOut)
        currentGroup.sells.push(trade);
        currentGroup.totalSellAmount += trade.amountIn; // Amount of token sold
        currentGroup.totalSellValue += trade.valueUSD;  // USD received
        runningBalance -= trade.amountIn;
      }

      // Update current group
      currentGroup.endBalance = runningBalance;
      currentGroup.profitLoss = currentGroup.totalSellValue - currentGroup.totalBuyValue;

      // Mark complete if balance returns to 0
      if (isEffectivelyZero(runningBalance)) {
        currentGroup.isComplete = true;
        currentGroup.endDate = trade.timestamp;
        currentGroup.duration = (currentGroup.endDate - currentGroup.startDate) * 1000;
      }
    });

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

// Flatten and sort all trade groups across all tokens
export function flattenTradeCycles(tradeCycles: TradeCycle[]): FlattenedTrade[] {
  const allTrades: FlattenedTrade[] = [];
  let globalCounter = 1;

  tradeCycles.forEach(tokenCycle => {
    tokenCycle.tradeGroups.forEach(trade => {
      allTrades.push({
        ...trade,
        globalTradeNumber: globalCounter++,
      });
    });
  });

  // Sort by start date, newest first
  return allTrades.sort((a, b) => b.startDate - a.startDate);
}
