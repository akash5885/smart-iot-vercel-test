import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

function generateSimulatedReadings(deviceType, deviceId) {
  const now = new Date()
  const readings = []

  for (let i = 23; i >= 0; i--) {
    const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000)
    const reading = { device_id: deviceId, recorded_at: recordedAt.toISOString() }

    switch (deviceType) {
      case 'temperature_sensor':
        reading.temperature = +(18 + Math.random() * 17).toFixed(1)
        reading.humidity = +(30 + Math.random() * 50).toFixed(1)
        break
      case 'smart_switch':
        reading.power_watts = Math.random() > 0.3 ? +(200 + Math.random() * 20).toFixed(1) : 0
        reading.voltage = 220
        break
      case 'smart_bulb': {
        const brightness = Math.floor(Math.random() * 100)
        reading.brightness = brightness
        reading.power_watts = +(brightness * 0.6).toFixed(1)
        reading.voltage = 220
        break
      }
      case 'thermostat':
        reading.temperature = +(18 + Math.random() * 10).toFixed(1)
        reading.humidity = +(35 + Math.random() * 30).toFixed(1)
        reading.power_watts = +(100 + Math.random() * 100).toFixed(1)
        reading.voltage = 220
        break
      case 'smart_lock':
        reading.is_locked = Math.random() > 0.3
        break
      default:
        reading.temperature = +(20 + Math.random() * 5).toFixed(1)
    }

    readings.push(reading)
  }

  return readings
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { role, id: userId } = req.user
  const { id: deviceId } = req.query

  try {
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (deviceError || !device) {
      return res.status(404).json({ error: 'Device not found' })
    }

    if (role === 'customer' && device.customer_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { data: readings, error } = await supabaseAdmin
      .from('device_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('recorded_at', { ascending: false })
      .limit(24)

    if (error) {
      console.error('Readings fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch readings' })
    }

    if (!readings || readings.length === 0) {
      const simulated = generateSimulatedReadings(device.type, deviceId)
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('device_readings')
        .insert(simulated)
        .select('*')

      if (insertError) {
        return res.status(200).json({ readings: simulated.reverse(), simulated: true })
      }

      return res.status(200).json({ readings: (inserted || simulated).reverse(), simulated: true })
    }

    return res.status(200).json({ readings: readings.reverse(), simulated: false })
  } catch (err) {
    console.error('Readings error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
