/**
 * Test suite for tradeCycles.ts
 * Tests trade cycle calculation, grouping, and balance tracking logic
 */

import { Trade } from '../solana-tracker';
import { calculateTradeCycles, flattenTradeCycles, TradeCycle } from '../tradeCycles';

// Helper to create mock trade data
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

// Test addresses
const USDC_ADDR = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_ADDR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SOL_ADDR = 'So11111111111111111111111111111111111111112';

describe('tradeCycles', () => {
  describe('calculateTradeCycles', () => {
    it('should return empty array for empty input', () => {
      const result = calculateTradeCycles([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      const result1 = calculateTradeCycles(null as any);
      const result2 = calculateTradeCycles(undefined as any);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should calculate a complete buy-sell cycle correctly', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 120, 120),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);

      const cycle = cycles[0];
      expect(cycle.token).toBe('TOKEN');
      expect(cycle.tradeGroups.length).toBe(1);

      const group = cycle.tradeGroups[0];
      expect(group.buys.length).toBe(1);
      expect(group.sells.length).toBe(1);
      expect(group.totalBuyAmount).toBe(1000);
      expect(group.totalSellAmount).toBe(1000);
      expect(group.isComplete).toBe(true);
      expect(group.profitLoss).toBe(20); // $120 - $100
    });

    it('should exclude SOL and USDC tokens', () => {
      const trades = [
        createMockTrade(1000, 'SOL_ADDR', 'SOL', 'OTHER', 'OTHER', 1, 100, 100),
        createMockTrade(2000, USDC_ADDR, 'USDC', 'OTHER', 'OTHER', 100, 1000, 100),
      ];

      const cycles = calculateTradeCycles(trades);

      // Should not create cycles for SOL or USDC
      expect(cycles.every(c => c.token !== 'SOL' && c.token !== 'USDC')).toBe(true);
    });

    it('should handle multiple cycles for the same token', () => {
      const trades = [
        // First cycle: Buy 1000, Sell 1000 (complete)
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 110, 110),

        // Second cycle: Buy 2000 (incomplete)
        createMockTrade(3000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 200, 2000, 200),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      expect(cycles[0].tradeGroups.length).toBe(2);

      // First group should be complete
      expect(cycles[0].tradeGroups[0].isComplete).toBe(true);
      expect(cycles[0].tradeGroups[0].profitLoss).toBe(10); // $110 - $100

      // Second group should be incomplete
      expect(cycles[0].tradeGroups[1].isComplete).toBe(false);
      expect(cycles[0].tradeGroups[1].endBalance).toBe(2000);
    });

    it('should treat dust amounts (< 100 tokens) as zero', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 10000, 100),
        createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 9950, 100, 100), // Leave 50 tokens (dust)
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.isComplete).toBe(true); // Should be complete despite 50 token remainder
      expect(Math.abs(group.endBalance)).toBeLessThan(100);
    });

    it('should calculate profit/loss correctly', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 500, 60, 60),
        createMockTrade(3000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 500, 70, 70),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.totalBuyValue).toBe(100);
      expect(group.totalSellValue).toBe(130); // 60 + 70
      expect(group.profitLoss).toBe(30); // 130 - 100
    });

    it('should track running balance correctly', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(2000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(3000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1500, 150, 150),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.totalBuyAmount).toBe(2000); // 1000 + 1000
      expect(group.totalSellAmount).toBe(1500);
      expect(group.endBalance).toBe(500); // 2000 - 1500
      expect(group.isComplete).toBe(false);
    });
  });

  describe('flattenTradeCycles', () => {
    it('should flatten and sort trade cycles by start date', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
        createMockTrade(2000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 120, 120),
        createMockTrade(3000, USDC_ADDR, 'USDC', 'OTHER_TOKEN', 'OTHER', 100, 500, 100),
        createMockTrade(4000, 'OTHER_TOKEN', 'OTHER', USDC_ADDR, 'USDC', 500, 110, 110),
      ];

      const cycles = calculateTradeCycles(trades);
      const flattened = flattenTradeCycles(cycles);

      // Should have global trade numbers
      expect(flattened.length).toBeGreaterThanOrEqual(2);

      // Verify all items have unique global trade numbers
      const tradeNumbers = flattened.map(t => t.globalTradeNumber);
      const uniqueNumbers = new Set(tradeNumbers);
      expect(uniqueNumbers.size).toBe(flattened.length);

      // Should be sorted by startDate (newest first)
      for (let i = 0; i < flattened.length - 1; i++) {
        expect(flattened[i].startDate).toBeGreaterThanOrEqual(flattened[i + 1].startDate);
      }
    });

    it('should return empty array for empty input', () => {
      const result = flattenTradeCycles([]);
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle single trade (incomplete cycle)', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 100, 1000, 100),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.isComplete).toBe(false);
      expect(group.buys.length).toBe(1);
      expect(group.sells.length).toBe(0);
    });

    it('should handle only sell trades (incomplete cycle)', () => {
      const trades = [
        createMockTrade(1000, TOKEN_ADDR, 'TOKEN', USDC_ADDR, 'USDC', 1000, 100, 100),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.isComplete).toBe(false);
      expect(group.buys.length).toBe(0);
      expect(group.sells.length).toBe(1);
    });

    it('should handle zero value trades', () => {
      const trades = [
        createMockTrade(1000, USDC_ADDR, 'USDC', TOKEN_ADDR, 'TOKEN', 0, 0, 0),
      ];

      const cycles = calculateTradeCycles(trades);

      expect(cycles.length).toBe(1);
      const group = cycles[0].tradeGroups[0];
      expect(group.totalBuyValue).toBe(0);
      expect(group.totalBuyAmount).toBe(0);
    });
  });
});
