/**
 * Test suite for tradeCycles.ts refactoring
 * Verifies that the refactored code produces identical behavior to the original
 */

import { Trade } from './solana-tracker';
import { calculateTradeCycles, flattenTradeCycles } from './tradeCycles';

// Mock trade data for testing
const createMockTrade = (
  timestamp: number,
  tokenInAddress: string,
  tokenInSymbol: string,
  tokenOutAddress: string,
  tokenOutSymbol: string,
  amountIn: number,
  amountOut: number,
  valueUSD: number
): Trade => ({
  signature: `mock_sig_${timestamp}`,
  timestamp,
  type: 'swap',
  tokenIn: {
    address: tokenInAddress,
    symbol: tokenInSymbol,
    name: tokenInSymbol,
    decimals: 9,
  },
  tokenOut: {
    address: tokenOutAddress,
    symbol: tokenOutSymbol,
    name: tokenOutSymbol,
    decimals: 9,
  },
  amountIn,
  amountOut,
  priceUSD: valueUSD / amountOut,
  valueUSD,
  dex: 'Jupiter',
  maker: 'test_wallet',
});

// Test 1: Empty array handling
console.log('Test 1: Empty array handling...');
const emptyResult = calculateTradeCycles([]);
if (emptyResult.length === 0) {
  console.log('✓ PASS: Empty array returns empty result');
} else {
  console.error('✗ FAIL: Empty array did not return empty result');
}

// Test 2: Null/undefined handling
console.log('\nTest 2: Null/undefined handling...');
const nullResult = calculateTradeCycles(null as any);
if (nullResult.length === 0) {
  console.log('✓ PASS: Null input returns empty result');
} else {
  console.error('✗ FAIL: Null input did not return empty result');
}

// Test 3: Complete buy-sell cycle
console.log('\nTest 3: Complete buy-sell cycle...');
const USDC_ADDR = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_ADDR = 'TokenMintAddress123';
const completeCycleTrades: Trade[] = [
  // Buy: Spend USDC, receive TOKEN
  createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
  // Sell: Spend TOKEN, receive USDC
  createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 120, 120),
];

const cycleResult = calculateTradeCycles(completeCycleTrades);
if (cycleResult.length > 0) {
  const tokenCycle = cycleResult.find(c => c.token === 'TOKEN');
  if (tokenCycle && tokenCycle.tradeGroups.length === 1) {
    const group = tokenCycle.tradeGroups[0];
    console.log('  Trade group:', {
      buys: group.buys.length,
      sells: group.sells.length,
      isComplete: group.isComplete,
      profitLoss: group.profitLoss,
      totalBuyValue: group.totalBuyValue,
      totalSellValue: group.totalSellValue,
    });

    if (
      group.buys.length === 1 &&
      group.sells.length === 1 &&
      group.isComplete === true &&
      Math.abs(group.profitLoss - 20) < 0.01 &&
      Math.abs(group.totalBuyValue - 100) < 0.01 &&
      Math.abs(group.totalSellValue - 120) < 0.01
    ) {
      console.log('✓ PASS: Complete cycle correctly identified with P/L = $20');
    } else {
      console.error('✗ FAIL: Complete cycle has incorrect values');
    }
  } else {
    console.error('✗ FAIL: Expected 1 trade group for TOKEN');
  }
} else {
  console.error('✗ FAIL: No cycles found for complete trade');
}

// Test 4: Excluded tokens (USDC, SOL)
console.log('\nTest 4: Excluded tokens filter...');
const excludedTokenTrades: Trade[] = [
  createMockTrade(1000, 'SOL_ADDR', 'SOL', 'OTHER', 'OTHER', 1, 100, 100),
  createMockTrade(2000, USDC_ADDR, 'USDC', 'OTHER', 'OTHER', 100, 1000, 100),
];

const excludedResult = calculateTradeCycles(excludedTokenTrades);
const hasSol = excludedResult.some(c => c.token === 'SOL');
const hasUsdc = excludedResult.some(c => c.token === 'USDC');

if (!hasSol && !hasUsdc) {
  console.log('✓ PASS: SOL and USDC correctly excluded');
} else {
  console.error('✗ FAIL: Excluded tokens were not filtered');
}

// Test 5: Multiple cycles for same token
console.log('\nTest 5: Multiple cycles for same token...');
const multipleCycleTrades: Trade[] = [
  // Cycle 1: Buy and sell (complete)
  createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
  createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 110, 110),
  // Cycle 2: Another buy (incomplete)
  createMockTrade(3000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 200, 2000, 200),
];

const multiCycleResult = calculateTradeCycles(multipleCycleTrades);
if (multiCycleResult.length > 0) {
  const tokenCycle = multiCycleResult.find(c => c.token === 'TOKEN');
  if (tokenCycle && tokenCycle.tradeGroups.length === 2) {
    const cycle1 = tokenCycle.tradeGroups[0];
    const cycle2 = tokenCycle.tradeGroups[1];

    console.log('  Cycle 1:', {
      isComplete: cycle1.isComplete,
      profitLoss: cycle1.profitLoss,
    });
    console.log('  Cycle 2:', {
      isComplete: cycle2.isComplete,
      endBalance: cycle2.endBalance,
    });

    if (
      cycle1.isComplete === true &&
      cycle2.isComplete === false &&
      Math.abs(cycle1.profitLoss - 10) < 0.01 &&
      cycle2.endBalance > 1900
    ) {
      console.log('✓ PASS: Multiple cycles correctly identified');
    } else {
      console.error('✗ FAIL: Multiple cycles have incorrect values');
    }
  } else {
    console.error('✗ FAIL: Expected 2 trade groups, got:', tokenCycle?.tradeGroups.length);
  }
} else {
  console.error('✗ FAIL: No cycles found for multiple cycle test');
}

// Test 6: flattenTradeCycles
console.log('\nTest 6: Flatten trade cycles...');
const flattenResult = flattenTradeCycles(multiCycleResult);
if (flattenResult.length > 0) {
  const hasGlobalNumbers = flattenResult.every((t, i) => t.globalTradeNumber > 0);
  const isSorted = flattenResult.every(
    (t, i) => i === 0 || t.startDate <= flattenResult[i - 1].startDate
  );

  console.log('  Flattened trades:', flattenResult.length);
  console.log('  Has global numbers:', hasGlobalNumbers);
  console.log('  Is sorted (newest first):', isSorted);

  if (hasGlobalNumbers && isSorted) {
    console.log('✓ PASS: Flatten works correctly');
  } else {
    console.error('✗ FAIL: Flatten has issues');
  }
} else {
  console.error('✗ FAIL: Flatten returned empty result');
}

// Test 7: Edge case - dust amounts
console.log('\nTest 7: Dust amounts (< 100 tokens)...');
const dustTrades: Trade[] = [
  createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 10000, 100),
  createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 9950, 100, 100), // Leave 50 tokens (dust)
];

const dustResult = calculateTradeCycles(dustTrades);
if (dustResult.length > 0) {
  const tokenCycle = dustResult.find(c => c.token === 'TOKEN');
  if (tokenCycle && tokenCycle.tradeGroups.length > 0) {
    const group = tokenCycle.tradeGroups[0];
    console.log('  End balance:', group.endBalance);
    console.log('  Is complete:', group.isComplete);

    if (group.isComplete === true && Math.abs(group.endBalance - 50) < 0.01) {
      console.log('✓ PASS: Dust amounts correctly handled as complete');
    } else {
      console.error('✗ FAIL: Dust amounts not handled correctly');
    }
  } else {
    console.error('✗ FAIL: No trade group found for dust test');
  }
} else {
  console.error('✗ FAIL: No cycles found for dust test');
}

console.log('\n========================================');
console.log('All tests completed!');
console.log('========================================');
