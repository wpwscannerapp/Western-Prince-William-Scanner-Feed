import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) return res.status(401).json({ error })
    res.status(200).json({ session })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}