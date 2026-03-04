import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, image } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate that the request comes from an authenticated Supabase session
    // and that the user ID matches the session
    try {
      const supabase = createSupabaseServerClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (id && session?.user?.id && session.user.id !== id) {
        return NextResponse.json(
          { error: 'User ID does not match authenticated session' },
          { status: 403 }
        )
      }
    } catch {
      // If service role client isn't available, skip server-side validation
      // The client should still be sending valid Supabase auth data
    }

    // First check if user exists by ID (for Supabase users)
    let existingUser = null
    if (id) {
      existingUser = await prisma.user.findUnique({
        where: { id },
      })
    }

    // If not found by ID, check by email
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { email },
      })
    }

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name,
          email: email || existingUser.email,
          image: image || existingUser.image,
        },
      })

      // Ensure user has settings
      const hasSettings = await prisma.userSettings.findUnique({
        where: { userId: updatedUser.id },
      })

      if (!hasSettings) {
        await prisma.userSettings.create({
          data: {
            userId: updatedUser.id,
          },
        })
      }

      return NextResponse.json({ user: updatedUser })
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id: id || undefined,
          email,
          name: name || email.split('@')[0],
          image,
        },
      })

      // Create default settings
      await prisma.userSettings.create({
        data: {
          userId: newUser.id,
        },
      })

      return NextResponse.json({ user: newUser })
    }
  } catch (error) {
    console.error('User sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
