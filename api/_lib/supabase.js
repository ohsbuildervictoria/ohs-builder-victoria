import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service-role key.
 *
 * The service role bypasses Row Level Security, so this MUST only ever run in
 * serverless functions (never shipped to the browser). The TikTok token table
 * has RLS enabled with no policies, so the service role is the only thing that
 * can read/write it.
 */
export function getServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
