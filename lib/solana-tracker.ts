import axios from 'axios';

const API_BASE_URL = 'https://data.solanatracker.io';
const API_KEY = process.env.NEXT_PUBLIC_SOLANA_TRACKER_API_KEY;

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

  if (!API_KEY) {
    throw new Error('API key is not configured. Please add NEXT_PUBLIC_SOLANA_TRACKER_API_KEY to your .env.local file');
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/wallet/${walletAddress}/trades`,
      {
        params: {
          limit,
        },
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

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
      throw new Error(error.response?.data?.message || 'Failed to fetch wallet trades');
    }
    throw error;
  }
}

// Fetch token data including market cap
export async function getTokenData(tokenAddress: string): Promise<TokenData | null> {
  if (!API_KEY) {
    console.error('API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/tokens/${tokenAddress}`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

    const data = response.data;

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

  if (!API_KEY) {
    throw new Error('API key is not configured. Please add NEXT_PUBLIC_SOLANA_TRACKER_API_KEY to your .env.local file');
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/wallet/${walletAddress}/basic`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

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
      throw new Error(error.response?.data?.message || 'Failed to fetch wallet tokens');
    }
    throw error;
  }
}
