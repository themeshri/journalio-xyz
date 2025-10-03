// Format duration in milliseconds to human-readable string
// Constants for time conversions
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours % HOURS_PER_DAY > 0) parts.push(`${hours % HOURS_PER_DAY}h`);
  if (minutes % MINUTES_PER_HOUR > 0) parts.push(`${minutes % MINUTES_PER_HOUR}m`);
  if (seconds % SECONDS_PER_MINUTE > 0 && days === 0) parts.push(`${seconds % SECONDS_PER_MINUTE}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}

// Format Unix timestamp to human-readable date/time
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * MS_PER_SECOND);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Format number as USD currency
export function formatValue(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

// Format token amount with appropriate decimal places
export function formatTokenAmount(amount: number, decimals: number = 2): string {
  if (amount === 0) return '0';
  if (amount < 0.01) return amount.toExponential(2);

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Constants for market cap formatting
const TRILLION = 1_000_000_000_000;
const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;

// Format market cap with abbreviated notation (M, B, T)
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= TRILLION) {
    return `$${(marketCap / TRILLION).toFixed(2)}T`;
  } else if (marketCap >= BILLION) {
    return `$${(marketCap / BILLION).toFixed(2)}B`;
  } else if (marketCap >= MILLION) {
    return `$${(marketCap / MILLION).toFixed(2)}M`;
  } else if (marketCap >= THOUSAND) {
    return `$${(marketCap / THOUSAND).toFixed(2)}K`;
  }
  return `$${marketCap.toFixed(2)}`;
}

// Format price without rounding - show full precision
export function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price < 0.000001) return `$${price.toExponential(6)}`;
  if (price < 0.01) return `$${price.toFixed(8)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

// Format percentage
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
