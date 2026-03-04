import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export interface AuthResult {
  userId: string
  email: string
}

/**
 * Resolves the authenticated user from the Supabase session.
 * Returns the userId and email if authenticated, or null if not.
 */
export async function getAuthUser(): Promise<AuthResult | null> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id || !session?.user?.email) return null
    return { userId: session.user.id, email: session.user.email }
  } catch {
    return null
  }
}

/**
 * Requires authentication. Returns the userId or a 401 response.
 * Usage:
 *   const auth = await requireAuth()
 *   if (auth instanceof NextResponse) return auth
 *   const userId = auth.userId
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return auth
}

/**
 * Ensures the user exists in the database (upsert).
 * Called after successful auth to make sure Prisma user record exists.
 */
export async function ensureUserExists(userId: string, email: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name: email.split('@')[0] },
    update: {},
  })
}
