import { supabaseAdmin } from '../../../lib/supabase'
import { hashPassword } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, password, confirmPassword } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const password_hash = await hashPassword(password)

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        name: name.trim(),
        role: 'customer',
        is_active: true,
        created_by: null,
      })
      .select('id, email, name, role, created_at')
      .single()

    if (error) {
      console.error('Registration insert error:', error)
      return res.status(500).json({ error: 'Failed to create account' })
    }

    return res.status(201).json({
      message: 'Account created successfully',
      user,
    })
  } catch (err) {
    console.error('Registration error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
