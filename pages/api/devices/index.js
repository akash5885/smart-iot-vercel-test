import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

function generateInitialReadings(deviceType, deviceId) {
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
      case 'smart_bulb':
        const brightness = Math.floor(Math.random() * 100)
        reading.brightness = brightness
        reading.power_watts = +(brightness * 0.6).toFixed(1)
        reading.voltage = 220
        break
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
  const { role, id: userId } = req.user

  if (req.method === 'GET') {
    try {
      let query = supabaseAdmin
        .from('devices')
        .select(`
          *,
          users:customer_id (id, name, email)
        `)
        .order('created_at', { ascending: false })

      if (role === 'customer') {
        query = query.eq('customer_id', userId)
      }
      // admin and support see all devices

      const { data: devices, error } = await query

      if (error) {
        console.error('Devices fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch devices' })
      }

      // For each device, get the latest reading
      const devicesWithReadings = await Promise.all(
        devices.map(async (device) => {
          const { data: latestReading } = await supabaseAdmin
            .from('device_readings')
            .select('*')
            .eq('device_id', device.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()

          return { ...device, latest_reading: latestReading || null }
        })
      )

      return res.status(200).json({
        devices: devicesWithReadings,
        canControl: role !== 'support',
      })
    } catch (err) {
      console.error('Devices GET error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    // Only customers (and admins on behalf) can register devices
    if (!['customer', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    try {
      const { name, type, location, customer_id } = req.body

      if (!name || !type) {
        return res.status(400).json({ error: 'Device name and type are required' })
      }

      const validTypes = ['temperature_sensor', 'smart_switch', 'smart_bulb', 'thermostat', 'smart_lock']
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid device type' })
      }

      // Determine customer_id
      const assignedCustomerId = role === 'admin' && customer_id ? customer_id : userId

      // Default settings based on type
      let settings = {}
      switch (type) {
        case 'smart_bulb':
          settings = { brightness: 100, color_temp: 3000 }
          break
        case 'thermostat':
          settings = { target_temperature: 22, mode: 'auto' }
          break
        case 'smart_lock':
          settings = { auto_lock_minutes: 0 }
          break
        case 'smart_switch':
          settings = { max_watts: 2000 }
          break
        default:
          settings = {}
      }

      const { data: device, error } = await supabaseAdmin
        .from('devices')
        .insert({
          name: name.trim(),
          type,
          customer_id: assignedCustomerId,
          status: 'online',
          is_on: false,
          settings,
          location: location?.trim() || null,
        })
        .select(`*, users:customer_id (id, name, email)`)
        .single()

      if (error) {
        console.error('Device insert error:', error)
        return res.status(500).json({ error: 'Failed to register device' })
      }

      // Generate initial readings
      const readings = generateInitialReadings(type, device.id)
      await supabaseAdmin.from('device_readings').insert(readings)

      return res.status(201).json({ device: { ...device, latest_reading: readings[readings.length - 1] } })
    } catch (err) {
      console.error('Devices POST error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
