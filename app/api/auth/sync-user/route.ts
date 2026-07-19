import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'

const checkRateLimit = rateLimit({ limit: 10, windowSeconds: 60, prefix: 'auth-sync' })

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  try {
    const { id, email, name, image } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate that the request comes from an authenticated Supabase session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Ensure the ID in the body matches the authenticated user
    if (id && authUser.id !== id) {
      return NextResponse.json(
        { error: 'User ID does not match authenticated session' },
        { status: 403 }
      )
    }

    // The authenticated Supabase user id is the sole source of truth for the
    // account. Never reconcile by email: a different account could already own
    // this email, and updating that record (or adopting its id) would merge two
    // distinct users / allow account takeover.
    const userId = authUser.id

    // Only claim the email if no *other* user already holds it (email is @unique).
    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    const canUseEmail = !emailOwner || emailOwner.id === userId

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: name || undefined,
        ...(canUseEmail ? { email } : {}),
        image: image || undefined,
      },
      create: {
        id: userId,
        // Fall back to null (not a colliding email) when another user owns it.
        email: canUseEmail ? email : null,
        name: name || email.split('@')[0],
        image,
      },
    })

    // Ensure a settings row exists (idempotent).
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('User sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
