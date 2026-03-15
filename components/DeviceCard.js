import { useState } from 'react'
import {
  Thermometer,
  Zap,
  Lightbulb,
  Sliders,
  Lock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Power,
  Clock,
} from 'lucide-react'

const DEVICE_ICONS = {
  temperature_sensor: Thermometer,
  smart_switch: Zap,
  smart_bulb: Lightbulb,
  thermostat: Sliders,
  smart_lock: Lock,
}

const DEVICE_LABELS = {
  temperature_sensor: 'Temperature Sensor',
  smart_switch: 'Smart Switch',
  smart_bulb: 'Smart Bulb',
  thermostat: 'Thermostat',
  smart_lock: 'Smart Lock',
}

function StatusBadge({ status }) {
  if (status === 'online') return <span className="badge-online flex items-center gap-1"><Wifi size={10} />Online</span>
  if (status === 'offline') return <span className="badge-offline flex items-center gap-1"><WifiOff size={10} />Offline</span>
  return <span className="badge-error flex items-center gap-1"><AlertTriangle size={10} />Error</span>
}

function ReadingDisplay({ device, reading }) {
  if (!reading) return <p className="text-gray-500 text-xs">No readings yet</p>

  switch (device.type) {
    case 'temperature_sensor':
    case 'thermostat':
      return (
        <div className="flex gap-3 text-xs">
          {reading.temperature != null && (
            <span className="text-orange-400 font-medium">{reading.temperature}°C</span>
          )}
          {reading.humidity != null && (
            <span className="text-blue-400">{reading.humidity}% RH</span>
          )}
          {reading.power_watts != null && reading.power_watts > 0 && (
            <span className="text-yellow-400">{reading.power_watts}W</span>
          )}
        </div>
      )
    case 'smart_switch':
      return (
        <div className="text-xs">
          {reading.power_watts != null ? (
            <span className={reading.power_watts > 0 ? 'text-yellow-400 font-medium' : 'text-gray-500'}>
              {reading.power_watts > 0 ? `${reading.power_watts}W` : 'Off (0W)'}
            </span>
          ) : (
            <span className="text-gray-500">No data</span>
          )}
        </div>
      )
    case 'smart_bulb':
      return (
        <div className="flex gap-3 text-xs">
          {reading.brightness != null && (
            <span className="text-yellow-400 font-medium">{reading.brightness}%</span>
          )}
          {reading.power_watts != null && (
            <span className="text-gray-400">{reading.power_watts}W</span>
          )}
        </div>
      )
    case 'smart_lock':
      return (
        <div className="text-xs">
          {reading.is_locked != null ? (
            <span className={reading.is_locked ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {reading.is_locked ? 'Locked' : 'Unlocked'}
            </span>
          ) : (
            <span className="text-gray-500">Unknown</span>
          )}
        </div>
      )
    default:
      return null
  }
}

export default function DeviceCard({ device, canControl = false, onControl, onClick }) {
  const [toggling, setToggling] = useState(false)
  const DeviceIcon = DEVICE_ICONS[device.type] || Zap
  const reading = device.latest_reading

  const handleToggle = async (e) => {
    e.stopPropagation()
    if (!canControl || toggling) return
    if (device.type === 'temperature_sensor') return

    const command = device.is_on ? 'turn_off' : 'turn_on'
    setToggling(true)
    try {
      await onControl(device.id, command, {})
    } finally {
      setToggling(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-200 relative group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              device.is_on ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-500'
            }`}
          >
            <DeviceIcon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{device.name}</h3>
            <p className="text-gray-500 text-xs">{DEVICE_LABELS[device.type]}</p>
          </div>
        </div>
        <StatusBadge status={device.status} />
      </div>

      {/* Location */}
      {device.location && (
        <p className="text-gray-500 text-xs mb-2 truncate">{device.location}</p>
      )}

      {/* Customer name (for admin/support views) */}
      {device.users && (
        <p className="text-blue-400/70 text-xs mb-2 truncate">
          {device.users.name}
        </p>
      )}

      {/* Reading */}
      <div className="mb-3">
        <ReadingDisplay device={device} reading={reading} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <div className="flex items-center gap-1 text-gray-600 text-xs">
          <Clock size={10} />
          <span>{formatTime(reading?.recorded_at || device.updated_at)}</span>
        </div>

        {/* Toggle */}
        {canControl && device.type !== 'temperature_sensor' && device.type !== 'smart_lock' && (
          <button
            onClick={handleToggle}
            disabled={toggling || device.status === 'offline'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              device.is_on
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Power size={10} />
            {toggling ? '...' : device.is_on ? 'ON' : 'OFF'}
          </button>
        )}

        {/* Lock status toggle */}
        {canControl && device.type === 'smart_lock' && (
          <button
            onClick={handleToggle}
            disabled={toggling || device.status === 'offline'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              device.settings?.is_locked
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Lock size={10} />
            {toggling ? '...' : device.settings?.is_locked ? 'Locked' : 'Unlocked'}
          </button>
        )}

        {/* View only badge */}
        {!canControl && (
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">View Only</span>
        )}
      </div>
    </div>
  )
}
