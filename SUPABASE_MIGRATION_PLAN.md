# 🚀 Supabase Migration Plan - Journalio

## Overview

This document outlines the complete migration from SQLite + NextAuth credentials to Supabase PostgreSQL + Supabase Auth with Google/Twitter social login + email fallback.

**Migration Strategy:** Gradual (Database first, then Auth)  
**Data Strategy:** Fresh start (no data migration)  
**Auth Strategy:** Social + Email fallback  

---

## 📋 Progress Tracking

### Phase 1: Supabase Setup & Database Migration
- [ ] **1.1** Create Supabase project
- [ ] **1.2** Configure environment variables
- [ ] **1.3** Update Prisma schema for PostgreSQL
- [ ] **1.4** Run database migrations
- [ ] **1.5** Test database connection
- [ ] **1.6** Update production environment

### Phase 2: Authentication Migration
- [ ] **2.1** Configure Google OAuth in Google Console
- [ ] **2.2** Configure Twitter OAuth in Twitter Developer Portal
- [ ] **2.3** Set up Supabase Auth providers
- [ ] **2.4** Install Supabase client libraries
- [ ] **2.5** Replace NextAuth with Supabase Auth
- [ ] **2.6** Update authentication middleware
- [ ] **2.7** Migrate session handling

### Phase 3: UI & Frontend Updates
- [ ] **3.1** Create new social login components
- [ ] **3.2** Update sign-in page UI
- [ ] **3.3** Add social login buttons (Google, Twitter)
- [ ] **3.4** Implement email fallback option
- [ ] **3.5** Update user profile/session displays
- [ ] **3.6** Add user conflict detection for existing emails

### Phase 4: Testing & Deployment
- [ ] **4.1** Test local development setup
- [ ] **4.2** Test social authentication flows
- [ ] **4.3** Test email authentication fallback
- [ ] **4.4** Update deployment configuration
- [ ] **4.5** Deploy to production
- [ ] **4.6** Monitor and verify production

---

## Phase 1: Supabase Setup & Database Migration

### 1.1 Create Supabase Project

**Steps:**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region (closest to your users)
4. Set strong database password
5. Note down project details:
   - Project URL
   - Project API keys (anon/public and service_role)
   - Database password

**Checklist after completion:**
- [ ] Project created
- [ ] Project URL noted
- [ ] API keys saved securely
- [ ] Database password recorded

---

### 1.2 Configure Environment Variables

**Update `.env.local`:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Replace SQLite with PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres"

# Keep NextAuth for now (will remove in Phase 2)
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (get from Google Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twitter OAuth (get from Twitter Developer Portal)  
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Keep existing
SOLANA_TRACKER_API_KEY=your-api-key
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

**Update `.env.example`:**
```env
# Add Supabase section
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Update database URL example
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres"

# Add OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

**Checklist after completion:**
- [ ] `.env.local` updated with Supabase credentials
- [ ] `.env.example` updated for future reference
- [ ] All keys properly secured

---

### 1.3 Update Prisma Schema for PostgreSQL

**File: `prisma/schema.prisma`**

**Change datasource:**
```prisma
// FROM:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// TO:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Update ID fields (PostgreSQL doesn't support SQLite syntax):**
```prisma
// Change all @default(cuid()) to @default(cuid())
// Change all @id fields to use proper PostgreSQL syntax
// Remove any SQLite-specific constraints

// Example model update:
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations...
  accounts      Account[]
  sessions      Session[]
  wallets       Wallet[]
  settings      UserSettings?
  trades        Trade[]
  // ... other relations

  @@map("users")
}
```

**Checklist after completion:**
- [ ] Datasource changed to postgresql
- [ ] All models updated for PostgreSQL compatibility
- [ ] No SQLite-specific syntax remaining

---

### 1.4 Run Database Migrations

**Commands:**
```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema to Supabase (for initial setup)
npx prisma db push

# Or create and run migration (recommended for production)
npx prisma migrate dev --name "init_supabase_migration"

# Verify schema in Supabase Dashboard
# Go to https://your-project.supabase.co/project/default/editor
```

**Checklist after completion:**
- [ ] Schema successfully pushed to Supabase
- [ ] All tables created in Supabase Dashboard
- [ ] No migration errors
- [ ] Prisma client regenerated

---

### 1.5 Test Database Connection

**Create test file: `test-supabase-connection.js`**
```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test user creation
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    console.log('✅ User created:', testUser);
    
    // Test user deletion (cleanup)
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ Test user cleaned up');
    
    console.log('🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

**Run test:**
```bash
node test-supabase-connection.js
```

**Checklist after completion:**
- [ ] Test script runs successfully
- [ ] Database connection confirmed
- [ ] CRUD operations working
- [ ] Test file removed after verification

---

### 1.6 Update Production Environment

**Vercel Environment Variables:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add production environment variables:
   - `DATABASE_URL` (production Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Checklist after completion:**
- [ ] Production environment variables set in Vercel
- [ ] Production database accessible
- [ ] Deployment tested with new database

---

## Phase 2: Authentication Migration

### 2.1 Configure Google OAuth

**Google Cloud Console Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback/google` (development)
     - `https://your-domain.com/auth/callback/google` (production)
     - `https://your-project.supabase.co/auth/v1/callback` (Supabase)

**Note your credentials:**
- Client ID
- Client Secret

**Checklist after completion:**
- [ ] Google Cloud project created
- [ ] OAuth 2.0 credentials created
- [ ] Redirect URIs configured
- [ ] Client ID and secret saved

---

### 2.2 Configure Twitter OAuth

**Twitter Developer Portal Setup:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create new app
3. Set up OAuth 2.0:
   - Type: Web App
   - Callback URLs:
     - `http://localhost:3000/auth/callback/twitter` (development)
     - `https://your-domain.com/auth/callback/twitter` (production)
     - `https://your-project.supabase.co/auth/v1/callback` (Supabase)

**Note your credentials:**
- Client ID
- Client Secret

**Checklist after completion:**
- [ ] Twitter Developer account verified
- [ ] App created with OAuth 2.0
- [ ] Callback URLs configured
- [ ] Client ID and secret saved

---

### 2.3 Set up Supabase Auth Providers

**Supabase Dashboard Configuration:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google:
   - Enable Google provider
   - Add Google Client ID
   - Add Google Client Secret
3. Enable Twitter:
   - Enable Twitter provider  
   - Add Twitter Client ID
   - Add Twitter Client Secret
4. Configure Email:
   - Ensure Email provider is enabled
   - Configure email templates (optional)

**Site URL Configuration:**
1. Go to Authentication → Settings
2. Set Site URL: `https://your-domain.com` (production)
3. Add Additional Redirect URLs:
   - `http://localhost:3000` (development)

**Checklist after completion:**
- [ ] Google provider enabled in Supabase
- [ ] Twitter provider enabled in Supabase
- [ ] Email provider configured
- [ ] Site URLs properly set

---

### 2.4 Install Supabase Client Libraries

**Install dependencies:**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

**Create Supabase client:**

**File: `lib/supabase.ts`**
```typescript
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client-side Supabase client
export const createSupabaseClient = () =>
  createClientComponentClient()

// Server-side Supabase client
export const createSupabaseServerClient = () =>
  createServerComponentClient({ cookies })

// Admin Supabase client (for server actions)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Checklist after completion:**
- [ ] Supabase dependencies installed
- [ ] Supabase client utilities created
- [ ] Client/server helpers configured

---

### 2.5 Replace NextAuth with Supabase Auth

**Create new auth utilities:**

**File: `lib/supabase-auth.ts`**
```typescript
import { createSupabaseClient } from './supabase'

export const auth = {
  // Sign in with Google
  async signInWithGoogle() {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  // Sign in with Twitter
  async signInWithTwitter() {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  // Sign in with Email (magic link or password)
  async signInWithEmail(email: string, password?: string) {
    const supabase = createSupabaseClient()
    
    if (password) {
      // Sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } else {
      // Send magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { data, error }
    }
  },

  // Sign up with email
  async signUpWithEmail(email: string, password: string, name?: string) {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const supabase = createSupabaseClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  async getSession() {
    const supabase = createSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  async getUser() {
    const supabase = createSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },
}
```

**Update package.json to remove NextAuth:**
```bash
npm uninstall next-auth @next-auth/prisma-adapter
```

**Remove NextAuth files:**
- `lib/auth.ts` (backup first)
- `app/api/auth/[...nextauth]/route.ts`

**Checklist after completion:**
- [ ] Supabase auth utilities created
- [ ] NextAuth dependencies removed
- [ ] Old auth files backed up and removed

---

### 2.6 Update Authentication Middleware

**File: `middleware.ts`**
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect authenticated routes
  const protectedPaths = ['/dashboard', '/settings', '/trade-journal']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !session) {
    // Redirect to sign-in
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Checklist after completion:**
- [ ] Middleware updated for Supabase
- [ ] Protected routes configured
- [ ] Session refresh handling added

---

### 2.7 Migrate Session Handling

**Update root layout:**

**File: `app/layout.tsx`**
```typescript
import { createSupabaseServerClient } from '@/lib/supabase'
import { SupabaseProvider } from '@/components/providers/supabase-provider'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en">
      <body className={fonts}>
        <SupabaseProvider initialSession={session}>
          <ErrorBoundary>
            <Providers>
              {children}
            </Providers>
          </ErrorBoundary>
        </SupabaseProvider>
      </body>
    </html>
  )
}
```

**Create Supabase Provider:**

**File: `components/providers/supabase-provider.tsx`**
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Session, User } from '@supabase/auth-helpers-nextjs'

type SupabaseContext = {
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: Session | null
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Create or update user in database
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              image: session.user.user_metadata?.avatar_url,
            }),
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user,
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setSession(null)
        setUser(null)
      }
    },
  }

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}
```

**Create user sync API route:**

**File: `app/api/auth/sync-user/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, image } = await request.json()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          name: name || existingUser.name,
          image: image || existingUser.image,
        },
      })

      return NextResponse.json({ user: updatedUser })
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id,
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
```

**Checklist after completion:**
- [ ] Root layout updated for Supabase
- [ ] Supabase provider created
- [ ] User sync API route created
- [ ] Session state management implemented

---

## Phase 3: UI & Frontend Updates

### 3.1 Create New Social Login Components

**File: `components/auth/social-button.tsx`**
```typescript
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SocialButtonProps {
  provider: 'google' | 'twitter'
  onClick: () => void
  isLoading?: boolean
  className?: string
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: '🔍', // Replace with proper Google icon
    bgColor: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  twitter: {
    name: 'Twitter',
    icon: '🐦', // Replace with proper Twitter icon
    bgColor: 'bg-blue-500 text-white hover:bg-blue-600',
  },
}

export function SocialButton({ provider, onClick, isLoading, className }: SocialButtonProps) {
  const config = providerConfig[provider]

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'w-full',
        config.bgColor,
        className
      )}
    >
      <span className="mr-2">{config.icon}</span>
      {isLoading ? 'Connecting...' : `Continue with ${config.name}`}
    </Button>
  )
}
```

**File: `components/auth/auth-form.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/supabase-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SocialButton } from './social-button'
import { toast } from 'sonner'

export function AuthForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSocialAuth = async (provider: 'google' | 'twitter') => {
    setIsLoading(true)
    try {
      const { error } = provider === 'google'
        ? await auth.signInWithGoogle()
        : await auth.signInWithTwitter()

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please use the email option below.')
        } else {
          toast.error(`Failed to sign in with ${provider}`)
        }
      }
      // Success will be handled by the auth state change
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const { error } = await auth.signInWithEmail(email)
      
      if (error) {
        toast.error('Failed to send magic link')
      } else {
        setEmailSent(true)
        toast.success('Check your email for the magic link!')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-emerald-600 text-lg">📧</div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We've sent you a magic link to sign in to your account.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setEmailSent(false)
            setShowEmailForm(false)
          }}
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Social Auth Buttons */}
      <div className="space-y-3">
        <SocialButton
          provider="google"
          onClick={() => handleSocialAuth('google')}
          isLoading={isLoading}
        />
        <SocialButton
          provider="twitter"
          onClick={() => handleSocialAuth('twitter')}
          isLoading={isLoading}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Email Auth */}
      {!showEmailForm ? (
        <Button
          variant="outline"
          onClick={() => setShowEmailForm(true)}
          className="w-full"
        >
          📧 Continue with Email
        </Button>
      ) : (
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowEmailForm(false)}
            className="w-full"
          >
            Back to social login
          </Button>
        </form>
      )}
    </div>
  )
}
```

**Checklist after completion:**
- [ ] Social button component created
- [ ] Auth form component created
- [ ] Email conflict detection implemented
- [ ] Magic link flow implemented

---

### 3.2 Update Sign-in Page UI

**File: `app/auth/signin/page.tsx`**
```typescript
'use client'

import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function SignInContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Journalio</CardTitle>
          <CardDescription>
            Sign in to your trading journal account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
```

**Create auth callback handler:**

**File: `app/auth/callback/page.tsx`**
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createSupabaseClient()
      
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        router.push('/auth/signin?error=callback_error')
        return
      }

      if (session) {
        // Successful authentication
        router.push('/')
        router.refresh()
      } else {
        // No session, redirect back to sign in
        router.push('/auth/signin')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}
```

**Checklist after completion:**
- [ ] Sign-in page redesigned with social buttons
- [ ] Auth callback page created
- [ ] Modern card-based UI implemented
- [ ] Loading states added

---

### 3.3 Add Social Login Icons

**Install Lucide React icons (if not already installed):**
```bash
npm install lucide-react
```

**Update social button with proper icons:**

**File: `components/auth/social-button.tsx` (updated)**
```typescript
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// For Google icon - you can use a custom SVG or icon from a library
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
)

interface SocialButtonProps {
  provider: 'google' | 'twitter'
  onClick: () => void
  isLoading?: boolean
  className?: string
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: GoogleIcon,
    bgColor: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  twitter: {
    name: 'Twitter',
    icon: TwitterIcon,
    bgColor: 'bg-[#1DA1F2] text-white hover:bg-[#1a91da]',
  },
}

export function SocialButton({ provider, onClick, isLoading, className }: SocialButtonProps) {
  const config = providerConfig[provider]
  const Icon = config.icon

  return (
    <Button
      type="button"
      variant={provider === 'google' ? 'outline' : 'default'}
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'w-full',
        config.bgColor,
        className
      )}
    >
      <Icon />
      <span className="ml-2">
        {isLoading ? 'Connecting...' : `Continue with ${config.name}`}
      </span>
    </Button>
  )
}
```

**Checklist after completion:**
- [ ] Google icon added
- [ ] Twitter icon added
- [ ] Brand colors applied
- [ ] Icons properly positioned

---

### 3.4 Implement Email Fallback Option

**Update auth form to handle email conflicts:**

**File: `components/auth/email-conflict-handler.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/lib/supabase-auth'
import { toast } from 'sonner'

interface EmailConflictHandlerProps {
  email: string
  onBack: () => void
}

export function EmailConflictHandler({ email, onBack }: EmailConflictHandlerProps) {
  const [isLoading, setIsLoading] = useState(false)

  const sendMagicLink = async () => {
    setIsLoading(true)
    try {
      const { error } = await auth.signInWithEmail(email)
      if (error) {
        toast.error('Failed to send magic link')
      } else {
        toast.success('Magic link sent! Check your email.')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Email Already Registered</CardTitle>
        <CardDescription>
          The email {email} is already registered. Please sign in using email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={sendMagicLink} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Magic Link'}
        </Button>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full"
        >
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Checklist after completion:**
- [ ] Email conflict detection working
- [ ] Magic link option available
- [ ] User-friendly error messages
- [ ] Clear navigation between options

---

### 3.5 Update User Profile/Session Displays

**Update session usage throughout the app:**

**File: `components/user-nav.tsx` (example update)**
```typescript
'use client'

import { useSupabase } from '@/components/providers/supabase-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings, User } from 'lucide-react'

export function UserNav() {
  const { user, signOut } = useSupabase()

  if (!user) {
    return (
      <Button variant="ghost" asChild>
        <a href="/auth/signin">Sign In</a>
      </Button>
    )
  }

  const displayName = user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Create session hook for easier usage:**

**File: `hooks/use-auth.ts`**
```typescript
'use client'

import { useSupabase } from '@/components/providers/supabase-provider'

export function useAuth() {
  const { session, user, signOut } = useSupabase()
  
  return {
    session,
    user,
    isAuthenticated: !!session,
    isLoading: false, // Supabase handles loading internally
    signOut,
  }
}
```

**Checklist after completion:**
- [ ] User navigation updated
- [ ] Session handling migrated
- [ ] Auth hook created for convenience
- [ ] Avatar display working

---

### 3.6 Add User Conflict Detection

This is handled in the auth form and API routes above.

**Checklist after completion:**
- [ ] Email conflict detection implemented
- [ ] User-friendly messages displayed
- [ ] Fallback auth options working

---

## Phase 4: Testing & Deployment

### 4.1 Test Local Development Setup

**Create comprehensive test checklist:**

**Manual Testing Checklist:**
- [ ] **Google OAuth Flow:**
  - [ ] Click "Continue with Google"
  - [ ] Redirected to Google consent screen
  - [ ] Successfully redirected back to app
  - [ ] User session created
  - [ ] User data synced to database

- [ ] **Twitter OAuth Flow:**
  - [ ] Click "Continue with Twitter"
  - [ ] Redirected to Twitter authorization
  - [ ] Successfully redirected back to app
  - [ ] User session created
  - [ ] User data synced to database

- [ ] **Email Magic Link Flow:**
  - [ ] Enter email address
  - [ ] Magic link sent to email
  - [ ] Click magic link in email
  - [ ] Successfully signed in
  - [ ] User session created

- [ ] **Session Management:**
  - [ ] User stays logged in on page refresh
  - [ ] User can sign out successfully
  - [ ] Protected pages redirect when not authenticated
  - [ ] Authenticated pages accessible when signed in

- [ ] **Database Integration:**
  - [ ] User created in database on first sign in
  - [ ] User settings created automatically
  - [ ] Existing data accessible after sign in

**Automated Test Script:**

**File: `test-auth-flows.js`**
```javascript
// Simple test script to verify auth endpoints
const testAuthEndpoints = async () => {
  console.log('Testing auth endpoints...')
  
  try {
    // Test user sync endpoint
    const syncResponse = await fetch('http://localhost:3000/api/auth/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      }),
    })
    
    if (syncResponse.ok) {
      console.log('✅ User sync endpoint working')
    } else {
      console.log('❌ User sync endpoint failed')
    }
    
    // Add more endpoint tests as needed...
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAuthEndpoints()
```

**Checklist after completion:**
- [ ] All OAuth flows tested manually
- [ ] Email authentication tested
- [ ] Session persistence verified
- [ ] Database sync confirmed
- [ ] Automated tests passing

---

### 4.2 Test Social Authentication Flows

**Test each provider thoroughly:**

**Google OAuth Testing:**
- [ ] Test with new Google account
- [ ] Test with existing Google account
- [ ] Test canceling Google consent
- [ ] Test network interruption during flow
- [ ] Verify user data mapping (name, email, avatar)

**Twitter OAuth Testing:**
- [ ] Test with new Twitter account
- [ ] Test with existing Twitter account  
- [ ] Test canceling Twitter authorization
- [ ] Test network interruption during flow
- [ ] Verify user data mapping (name, email, avatar)

**Cross-Provider Testing:**
- [ ] Sign in with Google, sign out, sign in with Twitter
- [ ] Test email conflicts between providers
- [ ] Test account linking scenarios

**Checklist after completion:**
- [ ] Google OAuth thoroughly tested
- [ ] Twitter OAuth thoroughly tested
- [ ] Cross-provider flows working
- [ ] Error handling verified

---

### 4.3 Test Email Authentication Fallback

**Magic Link Testing:**
- [ ] Send magic link to valid email
- [ ] Click magic link from same browser
- [ ] Click magic link from different browser
- [ ] Test expired magic link
- [ ] Test malformed magic link
- [ ] Test email delivery to different providers (Gmail, Outlook, etc.)

**Email Conflict Testing:**
- [ ] Try social auth with email already registered via email
- [ ] Verify proper error message display
- [ ] Verify fallback to email auth works
- [ ] Test magic link for conflicted email

**Checklist after completion:**
- [ ] Magic links working correctly
- [ ] Email conflicts handled properly
- [ ] Fallback flows tested
- [ ] Error messages user-friendly

---

### 4.4 Update Deployment Configuration

**Vercel Environment Variables (Production):**
```bash
# Add to Vercel Dashboard → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# OAuth Credentials (Production)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
TWITTER_CLIENT_ID=your-production-twitter-client-id
TWITTER_CLIENT_SECRET=your-production-twitter-client-secret

# Remove NextAuth variables
# NEXTAUTH_SECRET (remove)
# NEXTAUTH_URL (remove)

# Keep existing
SOLANA_TRACKER_API_KEY=your-api-key
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

**Update OAuth redirect URLs for production:**

**Google Cloud Console:**
- Add production URL: `https://your-domain.com/auth/callback/google`
- Add Supabase URL: `https://your-project.supabase.co/auth/v1/callback`

**Twitter Developer Portal:**
- Add production URL: `https://your-domain.com/auth/callback/twitter`
- Add Supabase URL: `https://your-project.supabase.co/auth/v1/callback`

**Supabase Dashboard:**
- Update Site URL to production domain
- Add production redirect URLs

**Checklist after completion:**
- [ ] Production environment variables set
- [ ] OAuth redirect URLs updated for production
- [ ] Supabase configuration updated for production
- [ ] Old NextAuth variables removed

---

### 4.5 Deploy to Production

**Pre-deployment Checklist:**
- [ ] All environment variables set in Vercel
- [ ] Database schema deployed to production Supabase
- [ ] OAuth providers configured for production URLs
- [ ] DNS/domain properly configured

**Deployment Steps:**
1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "feat: migrate to Supabase Auth with Google/Twitter social login"
   git push origin main
   ```

2. **Deploy via Vercel:**
   - Vercel will automatically deploy from your main branch
   - Monitor deployment logs for any issues

3. **Run production database migration:**
   ```bash
   # Set production DATABASE_URL temporarily
   npx prisma migrate deploy
   ```

4. **Verify deployment:**
   - Visit production URL
   - Test authentication flows
   - Check error monitoring (Sentry)

**Checklist after completion:**
- [ ] Code committed and pushed
- [ ] Production deployment successful
- [ ] Database migrations applied
- [ ] Basic functionality verified

---

### 4.6 Monitor and Verify Production

**Post-deployment Verification:**

**Authentication Testing:**
- [ ] Test Google OAuth on production
- [ ] Test Twitter OAuth on production
- [ ] Test email magic links on production
- [ ] Verify session persistence
- [ ] Test sign out functionality

**Database Monitoring:**
- [ ] Verify user creation in Supabase dashboard
- [ ] Check database connection logs
- [ ] Monitor query performance
- [ ] Verify data integrity

**Error Monitoring:**
- [ ] Check Sentry for any authentication errors
- [ ] Monitor Vercel logs for issues
- [ ] Set up alerts for auth failures

**Performance Testing:**
- [ ] Test app loading speed
- [ ] Check authentication response times
- [ ] Verify database query performance

**User Experience:**
- [ ] Test on different devices
- [ ] Test with different browsers
- [ ] Verify mobile responsiveness
- [ ] Check email delivery across providers

**Checklist after completion:**
- [ ] Production authentication fully tested
- [ ] Database performance verified
- [ ] Error monitoring confirmed
- [ ] User experience validated
- [ ] Migration officially complete! 🎉

---

## 🚀 Post-Migration Cleanup

**After successful deployment:**

1. **Remove old files:**
   - [ ] Delete `test-supabase-connection.js`
   - [ ] Archive old NextAuth configuration
   - [ ] Clean up any development-only files

2. **Update documentation:**
   - [ ] Update README with new auth setup
   - [ ] Document environment variables
   - [ ] Update development setup instructions

3. **Security review:**
   - [ ] Rotate any exposed secrets
   - [ ] Review OAuth app permissions
   - [ ] Audit user data access patterns

4. **Performance optimization:**
   - [ ] Review Supabase usage patterns
   - [ ] Optimize database queries
   - [ ] Set up proper indexes

---

## 📞 Support & Troubleshooting

**Common Issues and Solutions:**

1. **OAuth redirect mismatch:**
   - Verify redirect URLs in Google/Twitter consoles match exactly
   - Check Supabase Auth settings

2. **Email not receiving magic links:**
   - Check spam folder
   - Verify email provider settings in Supabase
   - Test with different email providers

3. **Session not persisting:**
   - Check Supabase client configuration
   - Verify middleware setup
   - Check browser cookie settings

4. **Database connection issues:**
   - Verify DATABASE_URL format
   - Check Supabase project status
   - Test connection with Prisma CLI

**Getting Help:**
- Supabase Documentation: https://supabase.com/docs
- Next.js Auth Guide: https://nextjs.org/docs/authentication
- Community Support: Supabase Discord, GitHub Issues

---

**Migration Complete!** 🎉

Your app is now powered by Supabase with modern social authentication. Users can sign in with Google, Twitter, or email magic links, providing a seamless and secure authentication experience.