/**
 * Test suite for formatters.ts
 * Tests formatting utilities for display purposes
 */

import {
  formatDuration,
  formatTime,
  formatValue,
  formatTokenAmount,
  formatMarketCap,
  formatPrice,
  formatPercentage,
} from '../formatters';

describe('formatters', () => {
  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(60000)).toBe('1m');
      expect(formatDuration(3600000)).toBe('1h');
      expect(formatDuration(86400000)).toBe('1d');
    });

    it('should format complex durations', () => {
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(3665000)).toBe('1h 1m 5s');
      expect(formatDuration(90000000)).toBe('1d 1h');
    });

    it('should not show seconds for durations over 1 day', () => {
      const oneDayPlus = 86400000 + 65000; // 1 day 1 minute 5 seconds
      const result = formatDuration(oneDayPlus);
      expect(result).not.toContain('s');
      expect(result).toContain('1d');
      expect(result).toContain('1m');
    });
  });

  describe('formatTime', () => {
    it('should format Unix timestamps to readable dates', () => {
      const timestamp = 1696348800; // Oct 3, 2023, 4:00 PM
      const result = formatTime(timestamp);
      expect(result).toContain('Oct');
      expect(result).toContain('2023');
    });
  });

  describe('formatValue', () => {
    it('should format positive values', () => {
      expect(formatValue(100)).toBe('$100.00');
      expect(formatValue(1234.56)).toBe('$1,234.56');
      expect(formatValue(1000000)).toBe('$1,000,000.00');
    });

    it('should format negative values', () => {
      expect(formatValue(-100)).toBe('-$100.00');
      expect(formatValue(-1234.56)).toBe('-$1,234.56');
    });

    it('should format zero', () => {
      expect(formatValue(0)).toBe('$0.00');
    });

    it('should always show two decimal places', () => {
      expect(formatValue(100.1)).toBe('$100.10');
      expect(formatValue(100.0)).toBe('$100.00');
    });
  });

  describe('formatTokenAmount', () => {
    it('should format standard amounts', () => {
      expect(formatTokenAmount(1000, 2)).toBe('1,000.00');
      expect(formatTokenAmount(1234567.89, 2)).toBe('1,234,567.89');
    });

    it('should format zero', () => {
      expect(formatTokenAmount(0)).toBe('0');
    });

    it('should use exponential notation for very small amounts', () => {
      const result = formatTokenAmount(0.00001, 2);
      expect(result).toContain('e');
    });

    it('should respect decimal places parameter', () => {
      expect(formatTokenAmount(100.12345, 4)).toBe('100.1235');
    });
  });

  describe('formatMarketCap', () => {
    it('should format with K suffix', () => {
      expect(formatMarketCap(5000)).toBe('$5.00K');
      expect(formatMarketCap(50000)).toBe('$50.00K');
    });

    it('should format with M suffix', () => {
      expect(formatMarketCap(1000000)).toBe('$1.00M');
      expect(formatMarketCap(50000000)).toBe('$50.00M');
    });

    it('should format with B suffix', () => {
      expect(formatMarketCap(1000000000)).toBe('$1.00B');
      expect(formatMarketCap(50000000000)).toBe('$50.00B');
    });

    it('should format with T suffix', () => {
      expect(formatMarketCap(1000000000000)).toBe('$1.00T');
      expect(formatMarketCap(5000000000000)).toBe('$5.00T');
    });

    it('should format small values without suffix', () => {
      expect(formatMarketCap(500)).toBe('$500.00');
    });
  });

  describe('formatPrice', () => {
    it('should format zero', () => {
      expect(formatPrice(0)).toBe('$0');
    });

    it('should format very small prices with exponential notation', () => {
      const result = formatPrice(0.0000001);
      expect(result).toContain('e');
    });

    it('should format small prices with many decimals', () => {
      expect(formatPrice(0.00012345)).toBe('$0.00012345');
    });

    it('should format medium prices', () => {
      expect(formatPrice(0.5)).toBe('$0.500000');
    });

    it('should format large prices', () => {
      expect(formatPrice(1234.56)).toContain('$1,234.56');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentages with + sign', () => {
      expect(formatPercentage(10.5)).toBe('+10.50%');
      expect(formatPercentage(0.01)).toBe('+0.01%');
    });

    it('should format negative percentages', () => {
      expect(formatPercentage(-10.5)).toBe('-10.50%');
      expect(formatPercentage(-0.01)).toBe('-0.01%');
    });

    it('should format zero', () => {
      expect(formatPercentage(0)).toBe('+0.00%');
    });

    it('should always show two decimal places', () => {
      expect(formatPercentage(10)).toBe('+10.00%');
    });
  });
});
