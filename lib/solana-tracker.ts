import axios from 'axios';

// Use internal API proxy endpoints instead of direct API calls
// This keeps the API key secure on the server-side
const USE_PROXY = typeof window !== 'undefined'; // Use proxy in browser
const API_BASE_URL = USE_PROXY ? '/api/solana' : 'https://data.solanatracker.io';
const API_KEY = process.env.SOLANA_TRACKER_API_KEY;

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  marketCap?: number;
}

export interface Trade {
  signature: string;
  timestamp: number;
  type: 'buy' | 'sell' | 'swap';
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: number;
  amountOut: number;
  priceUSD: number;
  valueUSD: number;
  dex: string;
  maker: string;
}

export interface WalletToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  uiBalance: number;
  priceUSD: number;
  valueUSD: number;
  logoURI?: string;
}

export interface TokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  marketCap?: number;
  price?: number;
  volume24h?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Validate Solana wallet address (base58, 32-44 characters)
export function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Fetch latest wallet trades
export async function getWalletTrades(
  walletAddress: string,
  limit: number = 50
): Promise<Trade[]> {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid Solana wallet address');
  }

  try {
    const url = USE_PROXY
      ? `${API_BASE_URL}/wallet/${walletAddress}/trades?limit=${limit}`
      : `${API_BASE_URL}/wallet/${walletAddress}/trades`;

    const config = USE_PROXY
      ? {} // No headers needed for proxy
      : {
          params: { limit },
          headers: { 'x-api-key': API_KEY },
        };

    const response = await axios.get(url, config);

    // Map API response to our Trade interface
    const trades = response.data.trades || [];

    return trades.map((trade: any) => ({
      signature: trade.tx,
      timestamp: Math.floor(trade.time / 1000), // Convert ms to seconds
      type: trade.type || 'swap',
      tokenIn: {
        address: trade.from.address,
        symbol: trade.from.token.symbol,
        name: trade.from.token.name,
        decimals: trade.from.token.decimals,
        logoURI: trade.from.token.image,
      },
      tokenOut: {
        address: trade.to.address,
        symbol: trade.to.token.symbol,
        name: trade.to.token.name,
        decimals: trade.to.token.decimals,
        logoURI: trade.to.token.image,
      },
      amountIn: trade.from.amount,
      amountOut: trade.to.amount,
      priceUSD: trade.price.usd,
      valueUSD: trade.volume.usd,
      dex: trade.program || 'Unknown',
      maker: trade.wallet,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 404) {
        throw new Error('Wallet not found or has no trades');
      }
      console.error('API Error:', error.response?.data);
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch wallet trades');
    }
    throw error;
  }
}

// Fetch token data including market cap
export async function getTokenData(tokenAddress: string): Promise<TokenData | null> {
  try {
    const url = USE_PROXY
      ? `${API_BASE_URL}/token/${tokenAddress}`
      : `${API_BASE_URL}/tokens/${tokenAddress}`;

    const config = USE_PROXY
      ? {} // No headers needed for proxy
      : {
          headers: { 'x-api-key': API_KEY },
        };

    const response = await axios.get(url, config);

    const data = USE_PROXY ? response.data.data : response.data;

    return {
      address: data.address || tokenAddress,
      symbol: data.symbol || '',
      name: data.name || '',
      decimals: data.decimals || 0,
      image: data.image,
      marketCap: data.marketCap?.usd || data.mc?.usd || data.marketCap || data.mc,
      price: data.price?.usd || data.priceUsd,
      volume24h: data.volume24h?.usd,
    };
  } catch (error) {
    console.error(`Failed to fetch token data for ${tokenAddress}:`, error);
    return null;
  }
}

// Fetch wallet token balances
export async function getWalletTokens(
  walletAddress: string
): Promise<WalletToken[]> {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid Solana wallet address');
  }

  try {
    const url = USE_PROXY
      ? `${API_BASE_URL}/wallet/${walletAddress}/balances`
      : `${API_BASE_URL}/wallet/${walletAddress}/basic`;

    const config = USE_PROXY
      ? {} // No headers needed for proxy
      : {
          headers: { 'x-api-key': API_KEY },
        };

    const response = await axios.get(url, config);

    const tokens = response.data.tokens || [];
    return tokens.map((token: any) => ({
      address: token.address,
      symbol: token.symbol || '',
      name: token.name || '',
      decimals: token.decimals || 0,
      balance: token.balance || 0,
      uiBalance: token.balance || 0,
      priceUSD: token.price?.usd || 0,
      valueUSD: token.value || 0,
      logoURI: token.image,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 404) {
        throw new Error('Wallet not found or has no tokens');
      }
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch wallet tokens');
    }
    throw error;
  }
}
