import cookie from 'cookie'
import { supabaseAdmin } from '../../../lib/supabase'
import { signToken, comparePassword } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact admin.' })
    }

    // Verify password
    const valid = await comparePassword(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Sign JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production'
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('iot_auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
      })
    )

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
