import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'
import { hashPassword } from '../../../lib/auth'

async function handler(req, res) {
  const { role, id } = req.user

  if (req.method === 'GET') {
    try {
      let query = supabaseAdmin
        .from('users')
        .select('id, email, name, role, is_active, created_at, created_by')
        .order('created_at', { ascending: false })

      if (role === 'support') {
        // Support can only see customers
        query = query.eq('role', 'customer')
      } else if (role === 'admin') {
        // Admin sees all, optionally filter by role
        if (req.query.role) {
          query = query.eq('role', req.query.role)
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const { data: users, error } = await query

      if (error) {
        console.error('Users fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch users' })
      }

      // Add device counts for each user
      const usersWithCounts = await Promise.all(
        users.map(async (user) => {
          const { count } = await supabaseAdmin
            .from('devices')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', user.id)
          return { ...user, device_count: count || 0 }
        })
      )

      return res.status(200).json({ users: usersWithCounts })
    } catch (err) {
      console.error('Users GET error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    // Only admin can create users
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    try {
      const { name, email, password, userRole } = req.body

      if (!name || !email || !password || !userRole) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' })
      }

      if (!['support', 'customer'].includes(userRole)) {
        return res.status(400).json({ error: 'Role must be support or customer' })
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' })
      }

      // Check email uniqueness
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (existing) {
        return res.status(409).json({ error: 'Email already registered' })
      }

      const password_hash = await hashPassword(password)

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash,
          name: name.trim(),
          role: userRole,
          is_active: true,
          created_by: id,
        })
        .select('id, email, name, role, is_active, created_at')
        .single()

      if (error) {
        console.error('Create user error:', error)
        return res.status(500).json({ error: 'Failed to create user' })
      }

      return res.status(201).json({ user: { ...newUser, device_count: 0 } })
    } catch (err) {
      console.error('Users POST error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler, ['admin', 'support'])
