import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.ZERION_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {

    if (!API_KEY) {
      return NextResponse.json({ error: 'Zerion API key not configured' }, { status: 500 })
    }

    const { address } = await params
    const { searchParams } = new URL(request.url)
    
    // Forward query parameters to Zerion API
    const currency = searchParams.get('currency') || 'usd'
    const limit = searchParams.get('limit') || '50'
    const cursor = searchParams.get('cursor')
    const chain = searchParams.get('chain')

    // Build Zerion API URL
    let zerionUrl = `https://api.zerion.io/v1/wallets/${address}/transactions`
    
    const params_obj = new URLSearchParams({
      currency,
      'page[size]': limit,
    })
    
    if (cursor) {
      params_obj.set('page[cursor]', cursor)
    }
    
    if (chain) {
      params_obj.set('filter[chain_ids]', chain)
    }
    
    zerionUrl += '?' + params_obj.toString()

    // Make request to Zerion API
    const response = await fetch(zerionUrl, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
      },
    })

    if (!response.ok) {
      console.error('Zerion API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Zerion API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Zerion proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}