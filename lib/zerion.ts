// Zerion API integration for multichain transaction history
// Based on: https://developers.zerion.io/recipes/how-to-build-a-multichain-transaction-history-like-zerion

// Use internal API proxy endpoints instead of direct API calls
// This keeps the API key secure on the server-side
const USE_PROXY = typeof window !== 'undefined'; // Use proxy in browser
const API_BASE_URL = USE_PROXY ? '/api/zerion' : 'https://api.zerion.io/v1';
const API_KEY = process.env.ZERION_API_KEY;

// Debug logging
console.log('Zerion config:', {
  USE_PROXY,
  API_BASE_URL,
  HAS_API_KEY: !!API_KEY
});

export interface ZerionTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  marketCap?: number;
  price?: number;
}

export interface ZerionTransaction {
  id: string;
  hash: string;
  timestamp: number;
  type: 'send' | 'receive' | 'trade' | 'approve' | 'cancel' | 'deposit' | 'withdraw';
  status: 'confirmed' | 'pending' | 'failed';
  direction: 'in' | 'out' | 'self';
  chain: string; // ethereum, polygon, arbitrum, optimism, base, etc.
  
  // Transaction details
  fee?: {
    value: number;
    price: number;
    token: ZerionTokenInfo;
  };
  
  // Transfer information
  transfers: Array<{
    token: ZerionTokenInfo;
    value: number;
    price: number;
    direction: 'in' | 'out';
  }>;
  
  // For swaps/trades
  tokenIn?: ZerionTokenInfo;
  tokenOut?: ZerionTokenInfo;
  amountIn?: number;
  amountOut?: number;
  priceUSD?: number;
  valueUSD?: number;
  
  // Protocol/DEX information
  protocol?: string;
  application?: string;
}

export interface WalletPortfolio {
  totalValue: number;
  chains: Array<{
    chain: string;
    value: number;
    tokens: Array<{
      address: string;
      symbol: string;
      name: string;
      balance: number;
      value: number;
      price: number;
      logoURI?: string;
    }>;
  }>;
}

export interface ZerionApiResponse<T> {
  data: T;
  links?: {
    next?: string;
    prev?: string;
  };
}

export interface TransactionsWithPagination {
  transactions: ZerionTransaction[];
  nextCursor?: string;
}

// Validate wallet address for multiple chains
export function isValidWalletAddress(address: string, chain?: string): boolean {
  // Ethereum-like addresses (0x + 40 hex chars)
  const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
  
  // Solana addresses (base58, 32-44 characters)
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  // Bitcoin addresses (various formats)
  const bitcoinRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
  
  if (chain) {
    switch (chain.toLowerCase()) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'avalanche':
      case 'bsc':
        return ethereumRegex.test(address);
      case 'solana':
        return solanaRegex.test(address);
      case 'bitcoin':
        return bitcoinRegex.test(address);
      default:
        return ethereumRegex.test(address); // Default to Ethereum format
    }
  }
  
  // If no chain specified, check common formats
  return ethereumRegex.test(address) || solanaRegex.test(address) || bitcoinRegex.test(address);
}

// Fetch wallet transaction history with pagination
export async function getWalletTransactionsWithPagination(
  walletAddress: string,
  options: {
    limit?: number;
    cursor?: string;
    chain?: string;
    currency?: string;
  } = {}
): Promise<TransactionsWithPagination> {
  if (!isValidWalletAddress(walletAddress, options.chain)) {
    throw new Error('Invalid wallet address format');
  }

  const {
    limit = 50,
    cursor,
    chain,
    currency = 'usd'
  } = options;

  try {
    console.log('Fetching Zerion transactions for:', walletAddress, 'Chain:', chain, 'USE_PROXY:', USE_PROXY);
    
    if (!API_KEY && !USE_PROXY) {
      throw new Error('Zerion API key not configured');
    }
    
    let url = USE_PROXY
      ? `${API_BASE_URL}/wallets/${walletAddress}/transactions`
      : `${API_BASE_URL}/wallets/${walletAddress}/transactions`;
    
    // Build query parameters
    const params = new URLSearchParams({
      currency,
      'filter[trash]': 'no_filter', // Add the same filter from your working example
      ...(limit && { 'page[size]': limit.toString() }),
      ...(cursor && { 'page[cursor]': cursor }),
      ...(chain && { 'filter[chain_ids]': chain }),
    });
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    console.log('Fetching URL:', url);

    const config: RequestInit = USE_PROXY
      ? { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        } // No auth headers needed for proxy
      : {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
          },
        };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zerion API error:', response.status, response.statusText, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 404) {
        throw new Error('Wallet not found or has no transactions');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: ZerionApiResponse<any[]> = await response.json();
    const transactions = data.data || [];

    console.log(`Zerion returned ${transactions.length} transactions for ${walletAddress}`);
    if (transactions.length > 0) {
      console.log('First transaction:', JSON.stringify(transactions[0], null, 2));
      
      // Show operation types from raw data
      const rawTypes = transactions.slice(0, 5).map(tx => ({
        operation_type: tx.attributes?.operation_type,
        transfers: tx.attributes?.transfers?.length || 0,
        hash: tx.attributes?.hash?.slice(0, 8) + '...'
      }));
      console.log('First 5 raw transaction types:', rawTypes);
    }

    // Transform Zerion API response to our format
    const transformedTransactions = transactions.map((tx: any, index: number) => {
      try {
      const attributes = tx.attributes;
      const transfers = attributes.transfers || [];
      
      // Extract token information from transfers
      let tokenIn: ZerionTokenInfo | undefined;
      let tokenOut: ZerionTokenInfo | undefined;
      let amountIn: number | undefined;
      let amountOut: number | undefined;
      let valueUSD = 0;
      
      // Process transfers to determine trade direction and amounts
      const inTransfers = transfers.filter((t: any) => t.direction === 'in');
      const outTransfers = transfers.filter((t: any) => t.direction === 'out');
      
      if (outTransfers.length > 0) {
        const outTransfer = outTransfers[0];
        tokenIn = {
          address: outTransfer.fungible_info?.implementations?.[0]?.address || '',
          symbol: outTransfer.fungible_info?.symbol || '',
          name: outTransfer.fungible_info?.name || '',
          decimals: outTransfer.fungible_info?.implementations?.[0]?.decimals || 18,
          logoURI: outTransfer.fungible_info?.icon?.url,
        };
        amountIn = parseFloat(outTransfer.quantity?.numeric || '0');
        valueUSD += parseFloat(outTransfer.value || '0');
      }
      
      if (inTransfers.length > 0) {
        const inTransfer = inTransfers[0];
        tokenOut = {
          address: inTransfer.fungible_info?.implementations?.[0]?.address || '',
          symbol: inTransfer.fungible_info?.symbol || '',
          name: inTransfer.fungible_info?.name || '',
          decimals: inTransfer.fungible_info?.implementations?.[0]?.decimals || 18,
          logoURI: inTransfer.fungible_info?.icon?.url,
        };
        amountOut = parseFloat(inTransfer.quantity?.numeric || '0');
        valueUSD += parseFloat(inTransfer.value || '0');
      }

      // Determine transaction type - be strict about what's a trade
      let type: ZerionTransaction['type'] = 'send'; // Default to send, not trade
      switch (attributes.operation_type) {
        case 'send':
          type = 'send';
          break;
        case 'receive':
          type = 'receive';
          break;
        case 'trade':
        case 'swap':
          // Only mark as trade if we have both tokenIn and tokenOut
          type = (tokenIn && tokenOut) ? 'trade' : 'send';
          break;
        case 'approve':
          type = 'approve';
          break;
        case 'cancel':
          type = 'cancel';
          break;
        case 'deposit':
          type = 'deposit';
          break;
        case 'withdraw':
          type = 'withdraw';
          break;
        default:
          // Don't default to trade - classify based on transfers
          if (inTransfers.length > 0 && outTransfers.length > 0 && tokenIn && tokenOut) {
            type = 'trade';
          } else if (inTransfers.length > 0) {
            type = 'receive';
          } else {
            type = 'send';
          }
      }

      return {
        id: tx.id,
        hash: attributes.hash,
        timestamp: new Date(attributes.mined_at).getTime() / 1000, // Convert to seconds
        type,
        status: attributes.status === 'confirmed' ? 'confirmed' as const : 
                attributes.status === 'failed' ? 'failed' as const : 'pending' as const,
        direction: attributes.direction || 'out',
        chain: attributes.chain || 'ethereum',
        
        fee: attributes.fee ? {
          value: parseFloat(attributes.fee.value || '0'),
          price: parseFloat(attributes.fee.price || '0'),
          token: {
            address: attributes.fee.fungible_info?.implementations?.[0]?.address || '',
            symbol: attributes.fee.fungible_info?.symbol || 'ETH',
            name: attributes.fee.fungible_info?.name || 'Ethereum',
            decimals: attributes.fee.fungible_info?.implementations?.[0]?.decimals || 18,
          }
        } : undefined,
        
        transfers: transfers.map((transfer: any) => ({
          token: {
            address: transfer.fungible_info?.implementations?.[0]?.address || '',
            symbol: transfer.fungible_info?.symbol || '',
            name: transfer.fungible_info?.name || '',
            decimals: transfer.fungible_info?.implementations?.[0]?.decimals || 18,
            logoURI: transfer.fungible_info?.icon?.url,
          },
          value: parseFloat(transfer.quantity?.numeric || '0'),
          price: parseFloat(transfer.price || '0'),
          direction: transfer.direction,
        })),
        
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        priceUSD: tokenOut && amountOut ? valueUSD / amountOut : 0,
        valueUSD,
        
        protocol: attributes.application_metadata?.name,
        application: attributes.application_metadata?.name,
      };
      } catch (txError) {
        console.error(`Error transforming transaction ${index}:`, txError, tx);
        // Return a minimal transaction object for failed transformations
        return {
          id: tx.id || `error-${index}`,
          hash: tx.attributes?.hash || `error-hash-${index}`,
          timestamp: Math.floor(Date.now() / 1000),
          type: 'send' as const,
          status: 'confirmed' as const,
          direction: 'out' as const,
          chain: 'solana',
          fee: undefined,
          transfers: [],
          tokenIn: undefined,
          tokenOut: undefined,
          amountIn: 0,
          amountOut: 0,
          priceUSD: 0,
          valueUSD: 0,
          protocol: undefined,
          application: undefined,
        };
      }
    });

    // Debug: show what types we ended up with after transformation
    const transformedTypes = transformedTransactions.slice(0, 5).map(tx => ({
      type: tx.type,
      hasTokenIn: !!tx.tokenIn,
      hasTokenOut: !!tx.tokenOut,
      tokenInSymbol: tx.tokenIn?.symbol,
      tokenOutSymbol: tx.tokenOut?.symbol,
      hash: tx.hash?.slice(0, 8) + '...'
    }));
    console.log('First 5 transformed transactions:', transformedTypes);

    // Extract next cursor from API response
    const nextCursor = data.links?.next ? new URL(data.links.next).searchParams.get('page[cursor]') || undefined : undefined;

    return {
      transactions: transformedTransactions,
      nextCursor
    };
  } catch (error) {
    console.error('Zerion API error details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      walletAddress,
      options
    });
    
    if (error instanceof Error) {
      throw error;
    }
    console.error('Failed to fetch wallet transactions:', error);
    throw new Error('Failed to fetch wallet transactions');
  }
}

// Legacy function that returns just transactions (for backward compatibility)
export async function getWalletTransactions(
  walletAddress: string,
  options: {
    limit?: number;
    cursor?: string;
    chain?: string;
    currency?: string;
  } = {}
): Promise<ZerionTransaction[]> {
  const result = await getWalletTransactionsWithPagination(walletAddress, options);
  return result.transactions;
}

// Fetch wallet portfolio/balances
export async function getWalletPortfolio(
  walletAddress: string,
  options: {
    currency?: string;
    chain?: string;
  } = {}
): Promise<WalletPortfolio> {
  if (!isValidWalletAddress(walletAddress, options.chain)) {
    throw new Error('Invalid wallet address format');
  }

  const { currency = 'usd', chain } = options;

  try {
    let url = USE_PROXY
      ? `${API_BASE_URL}/wallets/${walletAddress}/portfolio`
      : `${API_BASE_URL}/wallets/${walletAddress}/portfolio`;
    
    const params = new URLSearchParams({
      currency,
      ...(chain && { 'filter[chain_ids]': chain }),
    });
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    const config = USE_PROXY
      ? {} // No headers needed for proxy
      : {
          headers: {
            'accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
          },
        };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: ZerionApiResponse<any> = await response.json();
    
    // Transform to our portfolio format
    const portfolio = data.data;
    const positions = portfolio.attributes?.positions || [];
    
    // Group by chain
    const chainMap = new Map<string, any>();
    let totalValue = 0;
    
    positions.forEach((position: any) => {
      const chain = position.chain || 'ethereum';
      const value = parseFloat(position.value || '0');
      totalValue += value;
      
      if (!chainMap.has(chain)) {
        chainMap.set(chain, {
          chain,
          value: 0,
          tokens: []
        });
      }
      
      const chainData = chainMap.get(chain);
      chainData.value += value;
      chainData.tokens.push({
        address: position.fungible_info?.implementations?.[0]?.address || '',
        symbol: position.fungible_info?.symbol || '',
        name: position.fungible_info?.name || '',
        balance: parseFloat(position.quantity?.numeric || '0'),
        value,
        price: parseFloat(position.price || '0'),
        logoURI: position.fungible_info?.icon?.url,
      });
    });
    
    return {
      totalValue,
      chains: Array.from(chainMap.values()),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error('Failed to fetch wallet portfolio:', error);
    throw new Error('Failed to fetch wallet portfolio');
  }
}

// Legacy compatibility functions to match current Solana API
export async function getWalletTrades(
  walletAddress: string,
  limit: number = 50
): Promise<any[]> {
  console.log(`Looking for ${limit} swaps for wallet ${walletAddress}`);
  
  let allTransactions: any[] = [];
  let allSwaps: any[] = [];
  let cursor: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 50; // Limit to 50 pages (5000 transactions max) to find more swaps
  
  // Keep fetching pages until we hit the page limit (don't stop early)
  while (pageCount < maxPages) {
    console.log(`Fetching page ${pageCount + 1}, cursor:`, cursor);
    
    const result = await getWalletTransactionsWithPagination(walletAddress, { 
      limit: 100, // Use Zerion's max page size
      cursor: cursor 
    });
    
    if (!result || !result.transactions || result.transactions.length === 0) {
      console.log('No more transactions available');
      break;
    }
    
    allTransactions.push(...result.transactions);
    
    // Filter for swaps and collect all token addresses
    console.log(`Analyzing ${result.transactions.length} transactions for swaps...`);
    
    // Debug: show transaction type distribution
    const typeCount = result.transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Transaction types:', typeCount);
    
    // First pass: find all valid swaps and collect their token addresses
    const validSwaps = result.transactions.filter(tx => {
      const isSwap = tx.type === 'trade' || 
                    (tx.tokenIn && tx.tokenOut && 
                     tx.tokenIn.symbol && tx.tokenOut.symbol &&
                     tx.tokenIn.symbol !== tx.tokenOut.symbol);
      return isSwap;
    });
    
    // Collect all token addresses from valid swaps
    const includedTokenAddresses = new Set<string>();
    validSwaps.forEach(tx => {
      if (tx.tokenIn?.address) includedTokenAddresses.add(tx.tokenIn.address.toLowerCase());
      if (tx.tokenOut?.address) includedTokenAddresses.add(tx.tokenOut.address.toLowerCase());
    });
    
    console.log(`Found ${validSwaps.length} valid swaps with ${includedTokenAddresses.size} unique tokens`);
    
    // Second pass: include ALL transactions that involve any of these tokens
    const swapsInBatch = result.transactions
      .filter(tx => {
        // Include if it's a valid swap
        const isValidSwap = tx.type === 'trade' || 
                           (tx.tokenIn && tx.tokenOut && 
                            tx.tokenIn.symbol && tx.tokenOut.symbol &&
                            tx.tokenIn.symbol !== tx.tokenOut.symbol);
        
        // Also include if it involves any token from our included set
        const hasIncludedToken = (tx.tokenIn?.address && includedTokenAddresses.has(tx.tokenIn.address.toLowerCase())) ||
                                (tx.tokenOut?.address && includedTokenAddresses.has(tx.tokenOut.address.toLowerCase()));
        
        const shouldInclude = isValidSwap || hasIncludedToken;
        
        if (hasIncludedToken && !isValidSwap) {
          console.log('Including transaction due to token match:', {
            type: tx.type,
            tokenInSymbol: tx.tokenIn?.symbol,
            tokenOutSymbol: tx.tokenOut?.symbol,
            hash: tx.hash?.slice(0, 8) + '...'
          });
        }
        
        return shouldInclude;
      })
      .map(tx => ({
        signature: tx.hash,
        timestamp: tx.timestamp,
        type: (() => {
          // Determine buy/sell based on token types rather than direction
          const tokenInSymbol = tx.tokenIn?.symbol?.toLowerCase();
          const tokenOutSymbol = tx.tokenOut?.symbol?.toLowerCase();
          
          // If trading SOL for another token = buy (buying the other token)
          if (tokenInSymbol === 'sol' && tokenOutSymbol !== 'sol') {
            return 'buy';
          }
          // If trading another token for SOL = sell (selling the token for SOL)
          else if (tokenInSymbol !== 'sol' && tokenOutSymbol === 'sol') {
            return 'sell';
          }
          // If trading USDC/USDT for tokens = buy (buying the token)
          else if (['usdc', 'usdt'].includes(tokenInSymbol || '') && !['usdc', 'usdt', 'sol'].includes(tokenOutSymbol || '')) {
            return 'buy';
          }
          // If trading tokens for USDC/USDT = sell (selling the token)
          else if (!['usdc', 'usdt', 'sol'].includes(tokenInSymbol || '') && ['usdc', 'usdt'].includes(tokenOutSymbol || '')) {
            return 'sell';
          }
          // Token1 -> Token2: Focus on what you're getting (buying token2)
          else if (tokenInSymbol && tokenOutSymbol && 
                   tokenInSymbol !== tokenOutSymbol && 
                   !['sol', 'usdc', 'usdt'].includes(tokenInSymbol) &&
                   !['sol', 'usdc', 'usdt'].includes(tokenOutSymbol)) {
            return 'buy'; // Focus on the token being acquired
          }
          // Default fallback to direction-based logic
          else if (tx.direction === 'in') {
            return 'buy';
          } else if (tx.direction === 'out') {
            return 'sell';
          }
          else {
            return 'swap';
          }
        })(),
        tokenIn: tx.tokenIn,
        tokenOut: tx.tokenOut,
        amountIn: tx.amountIn || 0,
        amountOut: tx.amountOut || 0,
        priceUSD: tx.priceUSD || 0,
        valueUSD: tx.valueUSD || 0,
        dex: tx.protocol || tx.application || 'Unknown',
        maker: walletAddress,
      }));
    
    allSwaps.push(...swapsInBatch);
    console.log(`Page ${pageCount + 1}: Found ${swapsInBatch.length} swaps out of ${result.transactions.length} transactions`);
    
    // Get cursor for next page
    cursor = result.nextCursor;
    if (!cursor) {
      console.log('No more pages available');
      break;
    }
    
    pageCount++;
  }
  
  console.log(`Total: Found ${allSwaps.length} swaps out of ${allTransactions.length} total transactions across ${pageCount} pages`);
  
  return allSwaps; // Return ALL swaps found, no limit
}

export async function getWalletTokens(walletAddress: string): Promise<any[]> {
  const portfolio = await getWalletPortfolio(walletAddress);
  
  // Flatten all tokens from all chains
  const tokens: any[] = [];
  
  portfolio.chains.forEach(chain => {
    chain.tokens.forEach(token => {
      tokens.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: 18, // Default, could be improved
        balance: token.balance,
        uiBalance: token.balance,
        priceUSD: token.price,
        valueUSD: token.value,
        logoURI: token.logoURI,
        chain: chain.chain,
      });
    });
  });
  
  return tokens;
}