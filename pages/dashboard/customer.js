import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import DeviceCard from '../../components/DeviceCard'
import DeviceControlPanel from '../../components/DeviceControlPanel'
import AIChat from '../../components/AIChat'
import {
  Cpu,
  Wifi,
  WifiOff,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Power,
  AlertTriangle,
  Zap,
} from 'lucide-react'

const TABS = ['My Devices', 'AI Assistant']

const DEVICE_TYPES = [
  { value: 'temperature_sensor', label: 'Temperature Sensor' },
  { value: 'smart_switch', label: 'Smart Switch' },
  { value: 'smart_bulb', label: 'Smart Bulb' },
  { value: 'thermostat', label: 'Thermostat' },
  { value: 'smart_lock', label: 'Smart Lock' },
]

function Toast({ toast, onClose }) {
  if (!toast) return null
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${
        toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
      } text-white`}
    >
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

function AddDeviceModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', type: 'smart_bulb', location: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add device')
        return
      }
      onAdded(data.device)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-blue-400" />
            Add New Device
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Device Name</label>
            <input
              className="input-field"
              placeholder="e.g. Living Room Bulb"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Device Type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Location (optional)</label>
            <input
              className="input-field"
              placeholder="e.g. Living Room, Kitchen..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-xs text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Device Type Info</p>
            {form.type === 'temperature_sensor' && 'Monitors temperature and humidity. Read-only sensor, no controls.'}
            {form.type === 'smart_switch' && 'Controls power to connected appliances. On/off control.'}
            {form.type === 'smart_bulb' && 'Smart light bulb with brightness control (0–100%).'}
            {form.type === 'thermostat' && 'Controls heating/cooling with adjustable target temperature.'}
            {form.type === 'smart_lock' && 'Electronic door lock with lock/unlock control.'}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Add Device
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('My Devices')

  // Sync tab with URL query param
  useEffect(() => {
    if (router.query.tab) {
      const tab = decodeURIComponent(router.query.tab)
      if (TABS.includes(tab)) setActiveTab(tab)
    }
  }, [router.query.tab])
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, error: 0 })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchDevices = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/devices')
      if (res.ok) {
        const data = await res.json()
        const devList = data.devices || []
        setDevices(devList)
        setStats({
          total: devList.length,
          online: devList.filter((d) => d.status === 'online').length,
          offline: devList.filter((d) => d.status === 'offline').length,
          error: devList.filter((d) => d.status === 'error').length,
        })
      }
    } catch (err) {
      console.error('Fetch devices error:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      if (data.user?.role !== 'customer') { router.push('/dashboard'); return }
      setUser(data.user)
      setLoading(false)
      fetchDevices()
    }
    init()
  }, [])

  const handleControl = async (deviceId, command, params) => {
    const res = await fetch(`/api/device-control/${deviceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, params }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Control failed')

    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, ...data.device, users: d.users, latest_reading: d.latest_reading } : d))
    )
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice((prev) => ({ ...prev, ...data.device }))
    }
    showToast(`Command sent: ${command.replace(/_/g, ' ')}`)
    return data
  }

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm('Delete this device? All readings and history will be lost.')) return
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDevices((prev) => prev.filter((d) => d.id !== deviceId))
      if (selectedDevice?.id === deviceId) setSelectedDevice(null)
      showToast('Device removed successfully')
    } catch (err) {
      showToast(err.message || 'Failed to delete device', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <Layout user={user}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onAdded={(device) => {
            setDevices((prev) => [device, ...prev])
            setShowAddModal(false)
            showToast(`Device "${device.name}" added successfully!`)
            fetchDevices()
          }}
        />
      )}

      {selectedDevice && (
        <DeviceControlPanel
          device={selectedDevice}
          canControl={true}
          onControl={handleControl}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      <div className="p-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Cpu size={24} className="text-green-400" />
              My IoT Devices
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome back, <span className="text-white font-medium">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDevices}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={15} />
              Add Device
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard icon={Cpu} title="Total Devices" value={stats.total} color="blue" />
          <StatsCard icon={Wifi} title="Online" value={stats.online} color="green" />
          <StatsCard icon={WifiOff} title="Offline" value={stats.offline} color="red" />
          <StatsCard icon={AlertTriangle} title="Error" value={stats.error} color="yellow" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); router.replace(`/dashboard/customer?tab=${encodeURIComponent(tab)}`, undefined, { shallow: true }) }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* My Devices Tab */}
        {activeTab === 'My Devices' && (
          <div>
            {devices.length === 0 ? (
              <div className="card text-center py-20">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Cpu size={36} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Devices Yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Add your first IoT device to start monitoring and controlling your smart home.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Your First Device
                </button>
              </div>
            ) : (
              <>
                {/* Online devices first */}
                {devices.filter(d => d.status === 'online').length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Online ({devices.filter(d => d.status === 'online').length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {devices.filter(d => d.status === 'online').map((device) => (
                        <div key={device.id} className="relative group">
                          <DeviceCard
                            device={device}
                            canControl={true}
                            onControl={handleControl}
                            onClick={() => setSelectedDevice(device)}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id) }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-red-900/80 text-red-400 hover:bg-red-700"
                            title="Remove device"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline / Error devices */}
                {devices.filter(d => d.status !== 'online').length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Offline / Error ({devices.filter(d => d.status !== 'online').length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {devices.filter(d => d.status !== 'online').map((device) => (
                        <div key={device.id} className="relative group">
                          <DeviceCard
                            device={device}
                            canControl={true}
                            onControl={handleControl}
                            onClick={() => setSelectedDevice(device)}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id) }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-red-900/80 text-red-400 hover:bg-red-700"
                            title="Remove device"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'AI Assistant' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Personal AI Assistant</h2>
              <p className="text-gray-400 text-sm">Personalized help for your devices — ask anything about your smart home setup</p>
            </div>
            <AIChat userRole="customer" />
          </div>
        )}
      </div>
    </Layout>
  )
}
