'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

type SupabaseContext = {
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
  isLoading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode
  initialSession?: Session | null
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createSupabaseClient()

  const syncedRef = useRef(false)

  useEffect(() => {
    setIsLoading(true)
    syncedRef.current = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)

        if (session?.user && !syncedRef.current) {
          syncedRef.current = true
          // Create or update user in database
          try {
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
          } catch (error) {
            console.error('Failed to sync user:', error)
          }
        }
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const value = {
    session,
    user,
    isLoading,
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setSession(null)
        setUser(null)
        window.location.href = '/auth/signin'
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