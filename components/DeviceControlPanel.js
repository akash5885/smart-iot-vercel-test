import { useState, useEffect } from 'react'
import {
  X,
  Power,
  Lock,
  Unlock,
  Thermometer,
  Lightbulb,
  Zap,
  Sliders,
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const DEVICE_ICONS = {
  temperature_sensor: Thermometer,
  smart_switch: Zap,
  smart_bulb: Lightbulb,
  thermostat: Sliders,
  smart_lock: Lock,
}

function formatChartData(readings, deviceType) {
  return readings.map((r) => {
    const time = new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const point = { time }

    switch (deviceType) {
      case 'temperature_sensor':
      case 'thermostat':
        if (r.temperature != null) point.Temperature = +r.temperature
        if (r.humidity != null) point.Humidity = +r.humidity
        if (r.power_watts != null) point['Power (W)'] = +r.power_watts
        break
      case 'smart_switch':
        if (r.power_watts != null) point['Power (W)'] = +r.power_watts
        break
      case 'smart_bulb':
        if (r.brightness != null) point['Brightness (%)'] = +r.brightness
        if (r.power_watts != null) point['Power (W)'] = +r.power_watts
        break
      case 'smart_lock':
        if (r.is_locked != null) point['Locked'] = r.is_locked ? 1 : 0
        break
    }

    return point
  })
}

function getChartLines(deviceType) {
  switch (deviceType) {
    case 'temperature_sensor':
    case 'thermostat':
      return [
        { key: 'Temperature', color: '#f97316' },
        { key: 'Humidity', color: '#3b82f6' },
        { key: 'Power (W)', color: '#a855f7' },
      ]
    case 'smart_switch':
      return [{ key: 'Power (W)', color: '#eab308' }]
    case 'smart_bulb':
      return [
        { key: 'Brightness (%)', color: '#fbbf24' },
        { key: 'Power (W)', color: '#a855f7' },
      ]
    case 'smart_lock':
      return [{ key: 'Locked', color: '#22c55e' }]
    default:
      return []
  }
}

export default function DeviceControlPanel({ device, canControl, onControl, onClose }) {
  const [readings, setReadings] = useState([])
  const [commands, setCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [controlling, setControlling] = useState(false)
  const [localDevice, setLocalDevice] = useState(device)
  const [brightnessValue, setBrightnessValue] = useState(device?.settings?.brightness ?? 100)
  const [tempValue, setTempValue] = useState(device?.settings?.target_temperature ?? 22)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (device?.id) {
      fetchData()
    }
  }, [device?.id])

  useEffect(() => {
    setLocalDevice(device)
    setBrightnessValue(device?.settings?.brightness ?? 100)
    setTempValue(device?.settings?.target_temperature ?? 22)
  }, [device])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [readingsRes, deviceRes] = await Promise.all([
        fetch(`/api/device-readings/${device.id}`),
        fetch(`/api/devices/${device.id}`),
      ])

      if (readingsRes.ok) {
        const data = await readingsRes.json()
        setReadings(data.readings || [])
      }

      if (deviceRes.ok) {
        const data = await deviceRes.json()
        setCommands(data.commands || [])
        setLocalDevice(data.device || device)
      }
    } catch (err) {
      console.error('Fetch data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleControl = async (command, params = {}) => {
    if (!canControl || controlling) return
    setControlling(true)
    try {
      const result = await onControl(device.id, command, params)
      if (result?.device) {
        setLocalDevice(result.device)
        setBrightnessValue(result.device.settings?.brightness ?? brightnessValue)
        setTempValue(result.device.settings?.target_temperature ?? tempValue)
      }
      showToast(`Command '${command}' executed successfully`)
      // Refresh readings after command
      setTimeout(() => fetchData(), 500)
    } catch (err) {
      showToast(err.message || 'Command failed', 'error')
    } finally {
      setControlling(false)
    }
  }

  const DeviceIcon = DEVICE_ICONS[localDevice?.type] || Zap
  const chartData = formatChartData(readings, localDevice?.type)
  const chartLines = getChartLines(localDevice?.type)

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  if (!device) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-60 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${localDevice.is_on ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
              <DeviceIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{localDevice.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 text-sm capitalize">{localDevice.type?.replace(/_/g, ' ')}</span>
                {localDevice.location && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400 text-sm">{localDevice.location}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {localDevice.status === 'online' ? (
                  <span className="badge-online flex items-center gap-1"><Wifi size={10} />Online</span>
                ) : localDevice.status === 'offline' ? (
                  <span className="badge-offline flex items-center gap-1"><WifiOff size={10} />Offline</span>
                ) : (
                  <span className="badge-error flex items-center gap-1"><AlertTriangle size={10} />Error</span>
                )}
                {!canControl && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
                    View Only
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls */}
          {canControl && localDevice.type !== 'temperature_sensor' && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Device Controls</h3>

              {/* Smart Switch / Bulb / Thermostat: On/Off */}
              {['smart_switch', 'smart_bulb', 'thermostat'].includes(localDevice.type) && (
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => handleControl('turn_on')}
                    disabled={controlling || localDevice.is_on || localDevice.status === 'offline'}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Power size={16} />
                    Turn On
                  </button>
                  <button
                    onClick={() => handleControl('turn_off')}
                    disabled={controlling || !localDevice.is_on || localDevice.status === 'offline'}
                    className="btn-danger flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Power size={16} />
                    Turn Off
                  </button>
                  <span className={`text-sm font-medium ${localDevice.is_on ? 'text-green-400' : 'text-gray-500'}`}>
                    {controlling ? 'Sending command...' : localDevice.is_on ? 'Device is ON' : 'Device is OFF'}
                  </span>
                </div>
              )}

              {/* Smart Bulb: Brightness */}
              {localDevice.type === 'smart_bulb' && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Brightness: <span className="text-white font-medium">{brightnessValue}%</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={brightnessValue}
                      onChange={(e) => setBrightnessValue(+e.target.value)}
                      className="flex-1 accent-blue-500"
                    />
                    <button
                      onClick={() => handleControl('set_brightness', { brightness: brightnessValue })}
                      disabled={controlling || localDevice.status === 'offline'}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Thermostat: Temperature */}
              {localDevice.type === 'thermostat' && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Target Temperature: <span className="text-white font-medium">{tempValue}°C</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="16"
                      max="30"
                      step="0.5"
                      value={tempValue}
                      onChange={(e) => setTempValue(+e.target.value)}
                      className="flex-1 accent-orange-500"
                    />
                    <button
                      onClick={() => handleControl('set_temperature', { temperature: tempValue })}
                      disabled={controlling || localDevice.status === 'offline'}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>16°C</span>
                    <span>30°C</span>
                  </div>
                </div>
              )}

              {/* Smart Lock */}
              {localDevice.type === 'smart_lock' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleControl('lock')}
                    disabled={controlling || localDevice.settings?.is_locked || localDevice.status === 'offline'}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={16} />
                    Lock
                  </button>
                  <button
                    onClick={() => handleControl('unlock')}
                    disabled={controlling || !localDevice.settings?.is_locked || localDevice.status === 'offline'}
                    className="btn-danger flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Unlock size={16} />
                    Unlock
                  </button>
                  <span className={`text-sm font-medium ${localDevice.settings?.is_locked ? 'text-green-400' : 'text-red-400'}`}>
                    {controlling ? 'Sending command...' : localDevice.settings?.is_locked ? 'Door is LOCKED' : 'Door is UNLOCKED'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Readings Chart */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">
              Readings (Last 24 Hours)
            </h3>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
              </div>
            ) : chartData.length > 0 && chartLines.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#d1d5db' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  {chartLines.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No readings data available</p>
            )}
          </div>

          {/* Command History */}
          {commands.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Recent Commands</h3>
              <div className="space-y-2">
                {commands.map((cmd) => (
                  <div key={cmd.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded font-mono">
                        {cmd.command}
                      </span>
                      {cmd.users && (
                        <span className="text-gray-500 text-xs">by {cmd.users.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-xs">
                      <Clock size={10} />
                      {formatTime(cmd.issued_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
