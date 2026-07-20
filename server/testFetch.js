import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, is_active')
    if (error) {
      console.log('Supabase returned error:', error)
    } else {
      console.log('Supabase success:', data)
    }
  } catch (err) {
    console.error('Caught error:', err)
    if (err.cause) {
      console.error('Error cause:', err.cause)
    }
  }
}

run()
