import { validateBody, updateSettingsSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

// GET - Get user settings
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PATCH - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(updateSettingsSchema, body)
    if ('error' in validation) return validation.error
    const { displayName, transactionLimit, showUSDValues, darkMode, timezone, tradingStartTime } = validation.data

    // Find or create settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      })
    }

    // Update settings
    const updatedSettings = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(transactionLimit !== undefined && { transactionLimit }),
        ...(showUSDValues !== undefined && { showUSDValues }),
        ...(darkMode !== undefined && { darkMode }),
        ...(timezone !== undefined && { timezone }),
        ...(tradingStartTime !== undefined && { tradingStartTime }),
      },
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
