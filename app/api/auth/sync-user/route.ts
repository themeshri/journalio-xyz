import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'
import { syncUserSchema, validateBody } from '@/lib/validations'

const checkRateLimit = rateLimit({ limit: 10, windowSeconds: 60, prefix: 'auth-sync' })

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  // Parse outside the try: a malformed body is a client error (400), not a 500.
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validated = validateBody(syncUserSchema, rawBody)
  if ('error' in validated) return validated.error
  const { id, email, name, image } = validated.data

  try {
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

    const userId = id || authUser.id

    // Resolve which row we intend to write.
    //
    // The email lookup preserves the previous behaviour: a user whose Supabase
    // id changed but whose email did not must be UPDATED, not duplicated —
    // `User.email` is @unique, so creating a second row would throw P2002.
    //
    // We key the upsert on `id` rather than `email` because `User.email` is
    // nullable (String?), which Prisma will not accept as an upsert target.
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    // When a row already owns this email, it wins — matching the old code,
    // which updated `where: { id: existingUser.id }` and kept the original id.
    // Rewriting the id would cascade to every FK and needs its own migration.
    const targetId = byEmail?.id ?? userId

    const user = await prisma.user.upsert({
      where: { id: targetId },
      update: {
        // Only overwrite when a value was actually supplied, reproducing the
        // previous `name || existingUser.name` semantics without a prior read.
        ...(name ? { name } : {}),
        ...(image ? { image } : {}),
      },
      create: {
        id: targetId,
        email,
        name: name || email.split('@')[0],
        image,
      },
    })

    // Idempotent, and covers the case the nested create cannot reach: a
    // pre-existing user with no settings row. `userId` is @unique.
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    return NextResponse.json({ user })
  } catch (error) {
    // Two simultaneous requests can both miss the email lookup and race into
    // the upsert's internal create. Treat the loser as a success and re-read.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return NextResponse.json({ user: existing })
    }
    return handleApiError(error, 'Failed to sync user')
  }
}
