// Moralis API integration for Solana swaps
// API Documentation: https://docs.moralis.io/web3-data-api/solana/reference

interface MoralisSwapTransaction {
  signature: string;
  blockTime: number;
  transactionType: 'buy' | 'sell';
  programAddress: string;
  programName: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  tokenLogo?: string;
  tokenAmount: string;
  solAmount: string;
  pricePerToken: number;
  totalValue: number;
  fromAddress: string;
  toAddress: string;
  fee: number;
  slot: number;
  success: boolean;
}

interface MoralisApiResponse {
  transactions: MoralisSwapTransaction[];
  cursor?: string;
  page: number;
  pageSize: number;
}

// Get API key from environment
const MORALIS_API_KEY = process.env.NEXT_PUBLIC_MORALIS_API_KEY || process.env.MORALIS_API_KEY || '';
const MORALIS_BASE_URL = 'https://solana-gateway.moralis.io';

// Check if we have a valid API key
const HAS_API_KEY = MORALIS_API_KEY && MORALIS_API_KEY !== 'your-api-key-here';

console.log('Moralis config:', {
  HAS_API_KEY,
  API_BASE_URL: MORALIS_BASE_URL,
});

/**
 * Fetches swap transactions for a wallet address from Moralis API
 * Note: Moralis only has swap data from September 2024 onwards
 */
export async function getWalletSwaps(
  walletAddress: string,
  limit: number = 50,
  cursor?: string,
  fromDate?: string,
  toDate?: string,
  transactionTypes: string = 'buy,sell',
  tokenAddress?: string
): Promise<{ transactions: any[], cursor?: string }> {
  if (!HAS_API_KEY) {
    console.error('Moralis API key is not configured');
    throw new Error('Moralis API key is required. Please add MORALIS_API_KEY to your .env file');
  }

  // Build query parameters
  const params = new URLSearchParams({
    limit: limit.toString(),
    order: 'DESC',
    transactionTypes,
  });

  if (cursor) params.append('cursor', cursor);
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  if (tokenAddress) params.append('tokenAddress', tokenAddress);

  const url = `${MORALIS_BASE_URL}/account/mainnet/${walletAddress}/swaps?${params.toString()}`;
  
  console.log('Fetching Moralis swaps from:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moralis API error:', response.status, response.statusText, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid Moralis API key');
      } else if (response.status === 429) {
        throw new Error('Moralis rate limit exceeded. Please try again later.');
      } else if (response.status === 404) {
        throw new Error('Wallet not found or has no swaps');
      }
      throw new Error(`Moralis API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Moralis returns data in 'result' field, not 'transactions'
    const swaps = data.result || data.transactions || [];
    console.log(`Moralis returned ${swaps.length} swaps for ${walletAddress}`);
    
    // Transform Moralis data to our common format
    const transformedTransactions = swaps.map((tx: any) => {
      // Moralis returns swaps with bought/sold structure
      const isBuy = tx.transactionType === 'buy';
      const bought = tx.bought || {};
      const sold = tx.sold || {};
      
      return {
        signature: tx.transactionHash,
        timestamp: new Date(tx.blockTimestamp).getTime() / 1000,
        type: tx.transactionType,
        
        // Map bought/sold to tokenIn/tokenOut
        tokenIn: {
          address: sold.address,
          symbol: sold.symbol,
          name: sold.name,
          decimals: 9, // Default, Moralis doesn't provide decimals
          logoURI: sold.logo,
        },
        
        tokenOut: {
          address: bought.address,
          symbol: bought.symbol,
          name: bought.name,
          decimals: 9, // Default
          logoURI: bought.logo,
        },
        
        amountIn: parseFloat(sold.amount || '0'),
        amountOut: parseFloat(bought.amount || '0'),
        priceUSD: parseFloat(bought.usdPrice || sold.usdPrice || '0'),
        valueUSD: parseFloat(tx.totalValueUsd || '0'),
        dex: tx.exchangeName || 'Unknown',
        maker: walletAddress,
        success: true, // Moralis only returns successful swaps
      };
    });

    return {
      transactions: transformedTransactions,
      cursor: data.cursor,
    };
  } catch (error) {
    console.error('Error fetching Moralis swaps:', error);
    throw error;
  }
}

/**
 * Fetches all swaps with pagination
 */
export async function getWalletSwapsWithPagination(
  walletAddress: string,
  maxPages: number = 50,
  transactionTypes: string = 'buy,sell'
): Promise<any[]> {
  const allTransactions: any[] = [];
  let cursor: string | undefined;
  let pageCount = 0;
  const pageSize = 100; // Max allowed by Moralis

  console.log(`Fetching up to ${maxPages} pages of swaps for ${walletAddress}`);

  try {
    while (pageCount < maxPages) {
      const result = await getWalletSwaps(
        walletAddress,
        pageSize,
        cursor,
        undefined,
        undefined,
        transactionTypes
      );

      if (!result.transactions || result.transactions.length === 0) {
        console.log(`No more swaps found at page ${pageCount + 1}`);
        break;
      }

      allTransactions.push(...result.transactions);
      console.log(`Page ${pageCount + 1}: fetched ${result.transactions.length} swaps. Total: ${allTransactions.length}`);

      // Check if there's a next page
      if (!result.cursor) {
        console.log('No more pages available');
        break;
      }

      cursor = result.cursor;
      pageCount++;

      // Add a small delay to avoid rate limiting
      if (pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Fetched total of ${allTransactions.length} swaps across ${pageCount} pages`);
    return allTransactions;
  } catch (error) {
    console.error('Error in pagination:', error);
    // Return what we have so far
    if (allTransactions.length > 0) {
      console.log(`Returning ${allTransactions.length} swaps fetched before error`);
      return allTransactions;
    }
    throw error;
  }
}

/**
 * Get wallet token balances (placeholder - Moralis Solana API doesn't provide this directly)
 * You would need to use Moralis EVM API or another service for token balances
 */
export async function getWalletTokens(walletAddress: string): Promise<any[]> {
  console.log('Note: Moralis Solana API does not provide token balance endpoint');
  console.log('Consider using Moralis EVM API or another service for token balances');
  
  // Return empty array as placeholder
  // In production, you'd integrate with another endpoint or service
  return [];
}

/**
 * Main function to get wallet transactions (swaps)
 */
export async function getWalletTransactions(walletAddress: string, limit?: number): Promise<any[]> {
  // Use pagination function to get all swaps
  return getWalletSwapsWithPagination(walletAddress, 50, 'buy,sell');
}

// Re-export the main function for compatibility
export const getWalletTrades = getWalletTransactions;