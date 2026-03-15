/**
 * POST /api/auth/seed
 * One-time setup endpoint to create correct password hashes for demo users.
 * Call this ONCE after running schema.sql to fix the password hashes.
 * DELETE or disable this endpoint in production.
 */
import { supabaseAdmin } from '../../../lib/supabase'
import { hashPassword } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Only allow in development or with a secret key
  const { secret } = req.body
  if (process.env.NODE_ENV === 'production' && secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ error: 'Forbidden in production without SEED_SECRET' })
  }

  try {
    const users = [
      { email: 'admin@iot.com', password: 'Admin@123', name: 'System Admin', role: 'admin' },
      { email: 'support@iot.com', password: 'Support@123', name: 'Support Agent', role: 'support' },
      { email: 'alice@example.com', password: 'Customer@123', name: 'Alice Johnson', role: 'customer' },
      { email: 'bob@example.com', password: 'Customer@123', name: 'Bob Smith', role: 'customer' },
    ]

    const results = []

    for (const u of users) {
      const password_hash = await hashPassword(u.password)

      // Try to update existing user, or insert if not exists
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', u.email)
        .single()

      if (existing) {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ password_hash })
          .eq('email', u.email)

        results.push({ email: u.email, action: error ? 'error' : 'updated', error: error?.message })
      } else {
        const { error } = await supabaseAdmin
          .from('users')
          .insert({
            email: u.email,
            password_hash,
            name: u.name,
            role: u.role,
            is_active: true,
          })

        results.push({ email: u.email, action: error ? 'error' : 'created', error: error?.message })
      }
    }

    return res.status(200).json({
      message: 'Seed completed',
      results,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return res.status(500).json({ error: 'Seed failed: ' + err.message })
  }
}
