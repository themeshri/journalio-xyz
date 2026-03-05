import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export interface AuthResult {
  userId: string
  email: string
}

/**
 * Creates a Supabase client that reads auth from request cookies.
 */
function createSupabaseFromRequest(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // API routes don't need to set cookies
        },
      },
    }
  )
}

/**
 * Resolves the authenticated user from the Supabase session in request cookies.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthResult | null> {
  try {
    const supabase = createSupabaseFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user?.email) return null
    return { userId: user.id, email: user.email }
  } catch {
    return null
  }
}

/**
 * Requires authentication. Returns the userId or a 401 response.
 * Usage:
 *   const auth = await requireAuth(request)
 *   if (auth instanceof NextResponse) return auth
 *   const userId = auth.userId
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  const auth = await getAuthUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return auth
}

const seenUsers = new Set<string>()

/**
 * Ensures the user exists in the database (upsert).
 * Pass skipIfSeen=true on hot paths (dashboard, wallets) to skip the DB round-trip
 * after the first successful call for a given userId.
 */
export async function ensureUserExists(userId: string, email: string, skipIfSeen = false): Promise<void> {
  if (skipIfSeen && seenUsers.has(userId)) return
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name: email.split('@')[0] },
    update: {},
  })
  seenUsers.add(userId)
}
