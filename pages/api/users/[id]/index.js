import { withAuth } from '../../../../lib/auth'
import { supabaseAdmin } from '../../../../lib/supabase'

// This file mirrors pages/api/users/[id].js
// Both exist because Next.js may route /api/users/:id to either
// the parent [id].js file or this directory index depending on version.

async function handler(req, res) {
  const { role } = req.user
  const { id: targetId } = req.query

  if (req.method === 'GET') {
    try {
      if (!['admin', 'support'].includes(role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, is_active, created_at, created_by')
        .eq('id', targetId)
        .single()

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const { count: deviceCount } = await supabaseAdmin
        .from('devices')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', targetId)

      return res.status(200).json({ user: { ...user, device_count: deviceCount || 0 } })
    } catch (err) {
      console.error('User GET error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    try {
      const { is_active, name } = req.body
      const updates = {}

      if (typeof is_active === 'boolean') updates.is_active = is_active
      if (name) updates.name = name.trim()

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' })
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', targetId)
        .select('id, email, name, role, is_active, created_at')
        .single()

      if (error || !user) {
        return res.status(404).json({ error: 'User not found or update failed' })
      }

      return res.status(200).json({ user })
    } catch (err) {
      console.error('User PATCH error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    try {
      if (targetId === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
      }

      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', targetId)

      if (error) {
        console.error('User DELETE error:', error)
        return res.status(500).json({ error: 'Failed to delete user' })
      }

      return res.status(200).json({ message: 'User deleted successfully' })
    } catch (err) {
      console.error('User DELETE error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler, ['admin', 'support'])
