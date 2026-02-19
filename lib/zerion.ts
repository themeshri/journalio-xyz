// Zerion API integration for EVM chain transaction history (Base, BNB)
// Kept fully separate from solana-tracker.ts

import { type Chain, CHAIN_CONFIG } from './chains'

const USE_PROXY = typeof window !== 'undefined'
const API_BASE_URL = USE_PROXY ? '/api/evm' : 'https://api.zerion.io/v1'
const API_KEY = process.env.ZERION_API_KEY

export interface ZerionTokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  marketCap?: number
  price?: number
}

export interface ZerionTransaction {
  id: string
  hash: string
  timestamp: number
  type: 'send' | 'receive' | 'trade' | 'approve' | 'cancel' | 'deposit' | 'withdraw'
  status: 'confirmed' | 'pending' | 'failed'
  direction: 'in' | 'out' | 'self'
  chain: string

  fee?: {
    value: number
    price: number
    token: ZerionTokenInfo
  }

  transfers: Array<{
    token: ZerionTokenInfo
    value: number
    price: number
    direction: 'in' | 'out'
  }>

  tokenIn?: ZerionTokenInfo
  tokenOut?: ZerionTokenInfo
  amountIn?: number
  amountOut?: number
  priceUSD?: number
  valueUSD?: number

  protocol?: string
  application?: string
}

export interface TransactionsWithPagination {
  transactions: ZerionTransaction[]
  nextCursor?: string
}

// Fetch wallet transaction history with pagination
export async function getWalletTransactionsWithPagination(
  walletAddress: string,
  options: {
    limit?: number
    cursor?: string
    chain?: Chain
    currency?: string
  } = {}
): Promise<TransactionsWithPagination> {
  const {
    limit = 50,
    cursor,
    chain = 'base',
    currency = 'usd',
  } = options

  const chainConfig = CHAIN_CONFIG[chain]
  const zerionChainId = chainConfig.zerionChainId

  try {
    if (!API_KEY && !USE_PROXY) {
      throw new Error('Zerion API key not configured')
    }

    let url = USE_PROXY
      ? `${API_BASE_URL}/wallet/${walletAddress}/trades`
      : `${API_BASE_URL}/wallets/${walletAddress}/transactions`

    const params = new URLSearchParams({
      currency,
      'filter[trash]': 'no_filter',
      ...(limit && { 'page[size]': limit.toString() }),
      ...(cursor && { 'page[after]': cursor }),
      ...(zerionChainId && { 'filter[chain_ids]': zerionChainId }),
    })

    if (params.toString()) {
      url += '?' + params.toString()
    }

    const config: RequestInit = USE_PROXY
      ? {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      : {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
          },
        }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 401) throw new Error('Invalid API key')
      if (response.status === 429) throw new Error('Rate limit exceeded. Please try again later.')
      if (response.status === 404) throw new Error('Wallet not found or has no transactions')
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const transactions = data.data || []

    const transformedTransactions = transactions.map((tx: any) => {
      try {
        const attributes = tx.attributes
        const transfers = attributes.transfers || []

        let tokenIn: ZerionTokenInfo | undefined
        let tokenOut: ZerionTokenInfo | undefined
        let amountIn: number | undefined
        let amountOut: number | undefined
        let valueUSD = 0

        const inTransfers = transfers.filter((t: any) => t.direction === 'in')
        const outTransfers = transfers.filter((t: any) => t.direction === 'out')

        if (outTransfers.length > 0) {
          const outTransfer = outTransfers[0]
          tokenIn = {
            address: outTransfer.fungible_info?.implementations?.[0]?.address || '',
            symbol: outTransfer.fungible_info?.symbol || '',
            name: outTransfer.fungible_info?.name || '',
            decimals: outTransfer.fungible_info?.implementations?.[0]?.decimals || 18,
            logoURI: outTransfer.fungible_info?.icon?.url,
          }
          amountIn = parseFloat(outTransfer.quantity?.numeric || '0')
          valueUSD += parseFloat(outTransfer.value || '0')
        }

        if (inTransfers.length > 0) {
          const inTransfer = inTransfers[0]
          tokenOut = {
            address: inTransfer.fungible_info?.implementations?.[0]?.address || '',
            symbol: inTransfer.fungible_info?.symbol || '',
            name: inTransfer.fungible_info?.name || '',
            decimals: inTransfer.fungible_info?.implementations?.[0]?.decimals || 18,
            logoURI: inTransfer.fungible_info?.icon?.url,
          }
          amountOut = parseFloat(inTransfer.quantity?.numeric || '0')
          valueUSD += parseFloat(inTransfer.value || '0')
        }

        // Synthesize missing side for single-transfer txs (Relay/Fomo trades)
        // These come as single `in` (buy) or single `out` (sell) transfers
        const chainCfg = CHAIN_CONFIG[chain]
        const nativeTokenInfo: ZerionTokenInfo = {
          address: '',
          symbol: chainCfg.nativeToken,
          name: chainCfg.nativeToken,
          decimals: 18,
        }
        const excludedSymbols = new Set([
          ...chainCfg.excludedSymbols,
          ...chainCfg.stablecoins.map(s => s.toUpperCase()),
        ])

        if (tokenIn && !tokenOut) {
          // Only `out` transfer (selling token) → synthesize native token as tokenOut
          tokenOut = nativeTokenInfo
          amountOut = valueUSD // treat as USD-equivalent
        } else if (tokenOut && !tokenIn) {
          // Only `in` transfer (buying token) → synthesize native token as tokenIn
          tokenIn = nativeTokenInfo
          amountIn = valueUSD
        }

        // Check if a token symbol is a non-excluded trading token
        const isTradableToken = (symbol: string | undefined): boolean =>
          !!symbol && !excludedSymbols.has(symbol.toUpperCase())

        let type: ZerionTransaction['type'] = 'send'
        switch (attributes.operation_type) {
          case 'send': type = 'send'; break
          case 'receive':
            // Single-transfer receive of a tradable token → classify as trade
            if (outTransfers.length === 0 && inTransfers.length > 0 &&
                isTradableToken(inTransfers[0].fungible_info?.symbol)) {
              type = 'trade'
            } else {
              type = 'receive'
            }
            break
          case 'trade':
          case 'swap':
            type = tokenIn && tokenOut ? 'trade' : 'send'
            break
          case 'execute':
            // Single-transfer execute of a tradable token → classify as trade
            if (inTransfers.length === 0 && outTransfers.length > 0 &&
                isTradableToken(outTransfers[0].fungible_info?.symbol)) {
              type = 'trade'
            } else if (tokenIn && tokenOut) {
              type = 'trade'
            } else {
              type = 'send'
            }
            break
          case 'approve': type = 'approve'; break
          case 'cancel': type = 'cancel'; break
          case 'deposit': type = 'deposit'; break
          case 'withdraw': type = 'withdraw'; break
          default:
            if (tokenIn && tokenOut) {
              type = 'trade'
            } else if (inTransfers.length > 0) {
              type = 'receive'
            } else {
              type = 'send'
            }
        }

        return {
          id: tx.id,
          hash: attributes.hash,
          timestamp: new Date(attributes.mined_at).getTime() / 1000,
          type,
          status: attributes.status === 'confirmed' ? 'confirmed' as const :
                  attributes.status === 'failed' ? 'failed' as const : 'pending' as const,
          direction: attributes.direction || 'out',
          chain: attributes.chain || chain,
          fee: attributes.fee ? {
            value: parseFloat(attributes.fee.value || '0'),
            price: parseFloat(attributes.fee.price || '0'),
            token: {
              address: attributes.fee.fungible_info?.implementations?.[0]?.address || '',
              symbol: attributes.fee.fungible_info?.symbol || chainConfig.nativeToken,
              name: attributes.fee.fungible_info?.name || '',
              decimals: attributes.fee.fungible_info?.implementations?.[0]?.decimals || 18,
            },
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
        }
      } catch {
        return {
          id: tx.id || 'error',
          hash: tx.attributes?.hash || 'error-hash',
          timestamp: Math.floor(Date.now() / 1000),
          type: 'send' as const,
          status: 'confirmed' as const,
          direction: 'out' as const,
          chain,
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
        }
      }
    })

    const nextCursor = data.links?.next
      ? new URL(data.links.next).searchParams.get('page[after]') || undefined
      : undefined

    return { transactions: transformedTransactions, nextCursor }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Failed to fetch wallet transactions')
  }
}

/**
 * Fetch all wallet trades (swaps) with pagination, formatted to match
 * the same shape as solana-tracker's getWalletTrades output.
 */
export async function getWalletTrades(
  walletAddress: string,
  limit: number = 50,
  chain: Chain = 'base'
): Promise<any[]> {
  const chainConfig = CHAIN_CONFIG[chain]
  const nativeSymbol = chainConfig.nativeToken.toLowerCase()
  const stablecoins = new Set(chainConfig.stablecoins.map(s => s.toLowerCase()))

  let allSwaps: any[] = []
  let cursor: string | undefined = undefined
  let pageCount = 0
  const maxPages = 50

  while (pageCount < maxPages) {
    const result = await getWalletTransactionsWithPagination(walletAddress, {
      limit: 100,
      cursor,
      chain,
    })

    if (!result || !result.transactions || result.transactions.length === 0) break

    // Find valid swaps and collect their token addresses
    const validSwaps = result.transactions.filter(tx =>
      tx.type === 'trade' ||
      (tx.tokenIn && tx.tokenOut &&
       tx.tokenIn.symbol && tx.tokenOut.symbol &&
       tx.tokenIn.symbol !== tx.tokenOut.symbol)
    )

    const includedTokenAddresses = new Set<string>()
    validSwaps.forEach(tx => {
      if (tx.tokenIn?.address) includedTokenAddresses.add(tx.tokenIn.address.toLowerCase())
      if (tx.tokenOut?.address) includedTokenAddresses.add(tx.tokenOut.address.toLowerCase())
    })

    // Include all transactions that involve any swapped token
    const swapsInBatch = result.transactions
      .filter(tx => {
        const isValidSwap = tx.type === 'trade' ||
          (tx.tokenIn && tx.tokenOut &&
           tx.tokenIn.symbol && tx.tokenOut.symbol &&
           tx.tokenIn.symbol !== tx.tokenOut.symbol)

        const hasIncludedToken =
          (tx.tokenIn?.address && includedTokenAddresses.has(tx.tokenIn.address.toLowerCase())) ||
          (tx.tokenOut?.address && includedTokenAddresses.has(tx.tokenOut.address.toLowerCase()))

        return isValidSwap || hasIncludedToken
      })
      .map(tx => ({
        signature: tx.hash,
        timestamp: tx.timestamp,
        type: (() => {
          const tokenInSymbol = tx.tokenIn?.symbol?.toLowerCase()
          const tokenOutSymbol = tx.tokenOut?.symbol?.toLowerCase()

          // Buying with native token
          if (tokenInSymbol === nativeSymbol && tokenOutSymbol !== nativeSymbol) return 'buy'
          // Selling to native token
          if (tokenInSymbol !== nativeSymbol && tokenOutSymbol === nativeSymbol) return 'sell'
          // Buying with stablecoin
          if (stablecoins.has(tokenInSymbol || '') && !stablecoins.has(tokenOutSymbol || '') && tokenOutSymbol !== nativeSymbol) return 'buy'
          // Selling to stablecoin
          if (!stablecoins.has(tokenInSymbol || '') && tokenInSymbol !== nativeSymbol && stablecoins.has(tokenOutSymbol || '')) return 'sell'
          // Token-to-token: focus on what's acquired
          if (tokenInSymbol && tokenOutSymbol && tokenInSymbol !== tokenOutSymbol &&
              !stablecoins.has(tokenInSymbol) && tokenInSymbol !== nativeSymbol &&
              !stablecoins.has(tokenOutSymbol) && tokenOutSymbol !== nativeSymbol) return 'buy'
          // Fallback
          if (tx.direction === 'in') return 'buy'
          if (tx.direction === 'out') return 'sell'
          return 'swap'
        })(),
        tokenIn: tx.tokenIn,
        tokenOut: tx.tokenOut,
        amountIn: tx.amountIn || 0,
        amountOut: tx.amountOut || 0,
        priceUSD: tx.priceUSD || 0,
        valueUSD: tx.valueUSD || 0,
        dex: tx.protocol || tx.application || 'Unknown',
        maker: walletAddress,
      }))

    allSwaps.push(...swapsInBatch)

    cursor = result.nextCursor
    if (!cursor) break
    pageCount++
  }

  return allSwaps
}
