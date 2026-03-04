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
    // Clear all journalio localStorage data on logout
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('journalio_'))
        .forEach((key) => localStorage.removeItem(key))
    }
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