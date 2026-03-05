import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'

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

    // First check if user exists by ID
    let existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    // If not found by ID, check by email
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { email },
      })
    }

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name,
          email: email || existingUser.email,
          image: image || existingUser.image,
        },
      })

      const hasSettings = await prisma.userSettings.findUnique({
        where: { userId: updatedUser.id },
      })

      if (!hasSettings) {
        await prisma.userSettings.create({
          data: { userId: updatedUser.id },
        })
      }

      return NextResponse.json({ user: updatedUser })
    } else {
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: name || email.split('@')[0],
          image,
        },
      })

      await prisma.userSettings.create({
        data: { userId: newUser.id },
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
