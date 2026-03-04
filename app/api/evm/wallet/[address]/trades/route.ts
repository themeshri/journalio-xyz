import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.zerion.io/v1'
const API_KEY = process.env.ZERION_API_KEY

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const { searchParams } = new URL(request.url)

    if (!isValidEvmAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid EVM wallet address' },
        { status: 400 }
      )
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Zerion API key is not configured on the server' },
        { status: 500 }
      )
    }

    // Build Zerion API URL with query params
    const zerionParams = new URLSearchParams({
      currency: searchParams.get('currency') || 'usd',
      'filter[trash]': 'no_filter',
    })

    const pageSize = searchParams.get('page[size]')
    if (pageSize) zerionParams.set('page[size]', pageSize)

    const pageCursor = searchParams.get('page[cursor]')
    if (pageCursor) zerionParams.set('page[cursor]', pageCursor)

    const chainFilter = searchParams.get('filter[chain_ids]')
    if (chainFilter) zerionParams.set('filter[chain_ids]', chainFilter)

    const url = `${API_BASE_URL}/wallets/${address}/transactions?${zerionParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
      },
    })

    if (!response.ok) {
      console.error('Zerion API error:', response.status, await response.text())
      return NextResponse.json(
        { error: 'Failed to fetch EVM trades' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying EVM trades:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
