import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
}

// Client-side Supabase client — uses cookies (compatible with middleware/SSR)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Admin Supabase client (for server actions that need elevated privileges)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Create client for component use
export const createSupabaseClient = () => supabase
