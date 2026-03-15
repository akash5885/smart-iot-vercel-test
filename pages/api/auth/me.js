import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(200).json({ user })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
