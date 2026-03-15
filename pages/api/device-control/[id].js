import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'

function generateReadingAfterCommand(deviceType, command, params, currentSettings) {
  const reading = {}

  switch (command) {
    case 'turn_on':
      if (deviceType === 'smart_switch') {
        reading.power_watts = +(200 + Math.random() * 20).toFixed(1)
        reading.voltage = 220
      } else if (deviceType === 'smart_bulb') {
        const brightness = currentSettings?.brightness || 100
        reading.brightness = brightness
        reading.power_watts = +(brightness * 0.6).toFixed(1)
        reading.voltage = 220
      } else if (deviceType === 'thermostat') {
        reading.temperature = +(20 + Math.random() * 5).toFixed(1)
        reading.humidity = +(40 + Math.random() * 20).toFixed(1)
        reading.power_watts = +(120 + Math.random() * 80).toFixed(1)
        reading.voltage = 220
      }
      break
    case 'turn_off':
      if (['smart_switch', 'smart_bulb'].includes(deviceType)) {
        reading.power_watts = 0
        reading.voltage = 220
        if (deviceType === 'smart_bulb') reading.brightness = 0
      } else if (deviceType === 'thermostat') {
        reading.temperature = +(18 + Math.random() * 5).toFixed(1)
        reading.humidity = +(40 + Math.random() * 20).toFixed(1)
        reading.power_watts = 0
        reading.voltage = 220
      }
      break
    case 'set_brightness': {
      const brightness = params?.brightness ?? 100
      reading.brightness = brightness
      reading.power_watts = +(brightness * 0.6).toFixed(1)
      reading.voltage = 220
      break
    }
    case 'set_temperature':
      reading.temperature = +(18 + Math.random() * 10).toFixed(1)
      reading.humidity = +(40 + Math.random() * 20).toFixed(1)
      reading.power_watts = +(100 + Math.random() * 100).toFixed(1)
      reading.voltage = 220
      break
    case 'lock':
      reading.is_locked = true
      break
    case 'unlock':
      reading.is_locked = false
      break
    default:
      break
  }

  return reading
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { role, id: userId } = req.user
  const { id: deviceId } = req.query

  if (role === 'support') {
    return res.status(403).json({ error: 'Support users cannot control devices' })
  }

  try {
    const { command, params } = req.body

    const validCommands = ['turn_on', 'turn_off', 'set_brightness', 'set_temperature', 'lock', 'unlock']
    if (!command || !validCommands.includes(command)) {
      return res.status(400).json({ error: 'Invalid or missing command' })
    }

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

    const typeCommandMap = {
      temperature_sensor: [],
      smart_switch: ['turn_on', 'turn_off'],
      smart_bulb: ['turn_on', 'turn_off', 'set_brightness'],
      thermostat: ['turn_on', 'turn_off', 'set_temperature'],
      smart_lock: ['lock', 'unlock'],
    }

    const allowedCommands = typeCommandMap[device.type] || []
    if (!allowedCommands.includes(command)) {
      return res.status(400).json({
        error: `Command '${command}' is not supported for device type '${device.type}'`,
      })
    }

    const deviceUpdates = { updated_at: new Date().toISOString() }

    if (command === 'turn_on') {
      deviceUpdates.is_on = true
      deviceUpdates.status = 'online'
    } else if (command === 'turn_off') {
      deviceUpdates.is_on = false
      deviceUpdates.status = 'online'
    } else if (command === 'set_brightness') {
      const brightness = params?.brightness ?? 100
      deviceUpdates.settings = { ...device.settings, brightness }
      deviceUpdates.is_on = brightness > 0
    } else if (command === 'set_temperature') {
      const target_temperature = params?.temperature ?? 22
      deviceUpdates.settings = { ...device.settings, target_temperature }
    } else if (command === 'lock') {
      deviceUpdates.settings = { ...device.settings, is_locked: true }
    } else if (command === 'unlock') {
      deviceUpdates.settings = { ...device.settings, is_locked: false }
    }

    const { data: updatedDevice, error: updateError } = await supabaseAdmin
      .from('devices')
      .update(deviceUpdates)
      .eq('id', deviceId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Device update error:', updateError)
      return res.status(500).json({ error: 'Failed to update device' })
    }

    await supabaseAdmin.from('device_commands').insert({
      device_id: deviceId,
      command,
      params: params || {},
      issued_by: userId,
    })

    const newReading = generateReadingAfterCommand(device.type, command, params, updatedDevice.settings)
    if (Object.keys(newReading).length > 0) {
      await supabaseAdmin.from('device_readings').insert({
        device_id: deviceId,
        ...newReading,
        recorded_at: new Date().toISOString(),
      })
    }

    return res.status(200).json({ message: 'Command executed successfully', device: updatedDevice, command })
  } catch (err) {
    console.error('Control error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
