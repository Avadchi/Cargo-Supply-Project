import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const placeholder = (value) =>
  !value ||
  value.includes('your-project') ||
  value.includes('your-anon') ||
  value === 'undefined' ||
  value === 'null'

export const isSupabaseConfigured = !placeholder(url) && !placeholder(anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const supabaseProjectUrl = isSupabaseConfigured ? url : null
