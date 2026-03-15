import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

async function handler(req, res) {
  const { role, id: userId } = req.user
  const { id: deviceId } = req.query

  // Fetch device with owner info
  const { data: device, error: deviceError } = await supabaseAdmin
    .from('devices')
    .select(`*, users:customer_id (id, name, email)`)
    .eq('id', deviceId)
    .single()

  if (deviceError || !device) {
    return res.status(404).json({ error: 'Device not found' })
  }

  // Permission check: customer can only access their own device
  if (role === 'customer' && device.customer_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'GET') {
    try {
      const { data: readings } = await supabaseAdmin
        .from('device_readings')
        .select('*')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false })
        .limit(24)

      const { data: commands } = await supabaseAdmin
        .from('device_commands')
        .select(`*, users:issued_by (name, role)`)
        .eq('device_id', deviceId)
        .order('issued_at', { ascending: false })
        .limit(10)

      return res.status(200).json({
        device,
        readings: readings || [],
        commands: commands || [],
        canControl: role !== 'support',
      })
    } catch (err) {
      console.error('Device GET error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    if (role === 'support') {
      return res.status(403).json({ error: 'Support users cannot modify devices' })
    }

    try {
      const { name, location, settings, status } = req.body
      const updates = { updated_at: new Date().toISOString() }

      if (name) updates.name = name.trim()
      if (location !== undefined) updates.location = location?.trim() || null
      if (settings) updates.settings = { ...device.settings, ...settings }
      if (status && ['online', 'offline', 'error'].includes(status)) updates.status = status

      const { data: updatedDevice, error } = await supabaseAdmin
        .from('devices')
        .update(updates)
        .eq('id', deviceId)
        .select(`*, users:customer_id (id, name, email)`)
        .single()

      if (error) {
        console.error('Device PATCH error:', error)
        return res.status(500).json({ error: 'Failed to update device' })
      }

      return res.status(200).json({ device: updatedDevice })
    } catch (err) {
      console.error('Device PATCH error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    if (role === 'support') {
      return res.status(403).json({ error: 'Support users cannot delete devices' })
    }

    try {
      const { error } = await supabaseAdmin
        .from('devices')
        .delete()
        .eq('id', deviceId)

      if (error) {
        console.error('Device DELETE error:', error)
        return res.status(500).json({ error: 'Failed to delete device' })
      }

      return res.status(200).json({ message: 'Device deleted successfully' })
    } catch (err) {
      console.error('Device DELETE error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
