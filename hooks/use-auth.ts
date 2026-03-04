'use client'

import { useSupabase } from '@/components/providers/supabase-provider'

export function useAuth() {
  const { session, user, signOut, isLoading } = useSupabase()
  
  return {
    session,
    user,
    isAuthenticated: !!session,
    isLoading,
    signOut,
  }
}