import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

console.log('[supabaseAdmin] Initializing Supabase admin client...')

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing server Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
