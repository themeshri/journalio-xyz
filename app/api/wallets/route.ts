import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all wallets for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(wallets)
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
  }
}

// POST - Add a new wallet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { address, nickname, isDefault, chain = 'ethereum' } = body

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    // Validate wallet address format based on chain
    const isValidAddress = (addr: string, chainType: string): boolean => {
      switch (chainType.toLowerCase()) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'base':
        case 'avalanche':
        case 'bsc':
          return /^0x[a-fA-F0-9]{40}$/.test(addr)
        case 'solana':
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
        case 'bitcoin':
          return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr)
        default:
          return /^0x[a-fA-F0-9]{40}$/.test(addr) // Default to Ethereum format
      }
    }

    if (!isValidAddress(address, chain)) {
      return NextResponse.json({ error: `Invalid ${chain} wallet address` }, { status: 400 })
    }

    // Check if wallet already exists for this user
    const existing = await prisma.wallet.findUnique({
      where: {
        userId_address_chain: {
          userId: session.user.id,
          address,
          chain,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Wallet already added' }, { status: 400 })
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.wallet.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        address,
        chain,
        nickname: nickname || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(wallet, { status: 201 })
  } catch (error) {
    console.error('Error creating wallet:', error)
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
  }
}
