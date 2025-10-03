import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://data.solanatracker.io';
const API_KEY = process.env.SOLANA_TRACKER_API_KEY;

// Validate Solana wallet address (base58, 32-44 characters)
function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    // Validate wallet address
    if (!isValidSolanaAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
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
      `${API_BASE_URL}/wallet/${address}/basic`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Return the tokens data
    return NextResponse.json({
      tokens: response.data.tokens || [],
      success: true,
    });
  } catch (error) {
    console.error('Error fetching wallet balances:', error);

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
          { error: 'Wallet not found or has no tokens' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: error.response?.data?.message || 'Failed to fetch wallet balances' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
