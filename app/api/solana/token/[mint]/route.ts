import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://data.solanatracker.io';
const API_KEY = process.env.SOLANA_TRACKER_API_KEY;

// Validate Solana token address (base58, 32-44 characters)
function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;

    // Validate token address
    if (!isValidSolanaAddress(mint)) {
      return NextResponse.json(
        { error: 'Invalid Solana token address' },
        { status: 400 }
      );
    }

    // Check API key
    if (!API_KEY) {
      console.error('SOLANA_TRACKER_API_KEY is not configured');
      return NextResponse.json(
        { error: 'API key is not configured on the server' },
        { status: 500 }
      );
    }

    // Make request to Solana Tracker API
    const response = await axios.get(
      `${API_BASE_URL}/tokens/${mint}`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const data = response.data;

    // Return formatted token data
    return NextResponse.json({
      success: true,
      data: {
        address: data.address || mint,
        symbol: data.symbol || '',
        name: data.name || '',
        decimals: data.decimals || 0,
        image: data.image,
        marketCap: data.marketCap?.usd || data.mc?.usd || data.marketCap || data.mc,
        price: data.price?.usd || data.priceUsd,
        volume24h: data.volume24h?.usd,
      },
    });
  } catch (error) {
    console.error('Error fetching token data:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      } else if (error.response?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else if (error.response?.status === 404) {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: error.response?.data?.message || 'Failed to fetch token data' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
