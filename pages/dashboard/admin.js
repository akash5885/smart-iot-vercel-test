import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import StatsCard from '../../components/StatsCard'
import DeviceCard from '../../components/DeviceCard'
import DeviceControlPanel from '../../components/DeviceControlPanel'
import AIChat from '../../components/AIChat'
import {
  Users,
  Cpu,
  Wifi,
  WifiOff,
  Shield,
  Plus,
  X,
  Loader2,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

const TABS = ['Overview', 'Customers', 'Support Users', 'All Devices', 'AI Assistant']

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

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', userRole: 'customer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create user')
        return
      }
      onCreated(data.user)
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
          <h3 className="text-lg font-bold text-white">Create New User</h3>
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
            <label className="block text-gray-400 text-sm mb-1">Full Name</label>
            <input
              className="input-field"
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Role</label>
            <select
              className="input-field"
              value={form.userRole}
              onChange={(e) => setForm({ ...form, userRole: e.target.value })}
            >
              <option value="customer">Customer</option>
              <option value="support">Support</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')

  // Sync tab with URL query param
  useEffect(() => {
    if (router.query.tab) {
      const tab = decodeURIComponent(router.query.tab)
      if (TABS.includes(tab)) setActiveTab(tab)
    }
  }, [router.query.tab])
  const [users, setUsers] = useState([])
  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState({ customers: 0, support: 0, totalDevices: 0, online: 0, offline: 0, error: 0 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [toast, setToast] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [usersRes, devicesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/devices'),
      ])

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
        const customers = data.users?.filter((u) => u.role === 'customer') || []
        const support = data.users?.filter((u) => u.role === 'support') || []
        setStats((prev) => ({ ...prev, customers: customers.length, support: support.length }))
      }

      if (devicesRes.ok) {
        const data = await devicesRes.json()
        const devList = data.devices || []
        setDevices(devList)
        setStats((prev) => ({
          ...prev,
          totalDevices: devList.length,
          online: devList.filter((d) => d.status === 'online').length,
          offline: devList.filter((d) => d.status === 'offline').length,
          error: devList.filter((d) => d.status === 'error').length,
        }))
      }
    } catch (err) {
      console.error('Fetch data error:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      if (data.user?.role !== 'admin') { router.push('/dashboard'); return }
      setUser(data.user)
      setLoading(false)
      fetchData()
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
      prev.map((d) => (d.id === deviceId ? { ...d, ...data.device, users: d.users } : d))
    )
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice((prev) => ({ ...prev, ...data.device }))
    }
    showToast(`Command '${command}' sent successfully`)
    return data
  }

  const handleToggleUser = async (userId, isActive) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)))
      showToast(`User ${!isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      showToast('User deleted successfully')
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error')
    }
  }

  const customers = users.filter((u) => u.role === 'customer')
  const supportUsers = users.filter((u) => u.role === 'support')

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

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev])
            setShowCreateModal(false)
            showToast(`User ${newUser.name} created successfully`)
            fetchData()
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
              <Shield size={24} className="text-purple-400" />
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">Full system control and management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={15} />
              New User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); router.replace(`/dashboard/admin?tab=${encodeURIComponent(tab)}`, undefined, { shallow: true }) }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <StatsCard icon={Users} title="Customers" value={stats.customers} color="blue" />
              <StatsCard icon={UserCheck} title="Support" value={stats.support} color="purple" />
              <StatsCard icon={Cpu} title="Total Devices" value={stats.totalDevices} color="orange" />
              <StatsCard icon={Wifi} title="Online" value={stats.online} color="green" />
              <StatsCard icon={WifiOff} title="Offline" value={stats.offline} color="red" />
              <StatsCard icon={AlertTriangle} title="Error" value={stats.error} color="yellow" />
            </div>

            {/* Recent Devices */}
            <h2 className="text-lg font-semibold text-white mb-4">Recent Devices</h2>
            {devices.length === 0 ? (
              <div className="card text-center py-12">
                <Cpu size={40} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No devices registered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {devices.slice(0, 8).map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    canControl={true}
                    onControl={handleControl}
                    onClick={() => setSelectedDevice(device)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'Customers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">All Customers ({customers.length})</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Add Customer
              </button>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Name</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Email</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Devices</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Status</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Joined</th>
                      <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-12">No customers yet</td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                                {customer.name[0].toUpperCase()}
                              </div>
                              <span className="text-white font-medium">{customer.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{customer.email}</td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                              {customer.device_count} device{customer.device_count !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={customer.is_active ? 'badge-online' : 'badge-offline'}>
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm">
                            {new Date(customer.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleUser(customer.id, customer.is_active)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  customer.is_active
                                    ? 'text-green-400 hover:bg-green-500/10'
                                    : 'text-gray-500 hover:bg-gray-700'
                                }`}
                                title={customer.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {customer.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(customer.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Users Tab */}
        {activeTab === 'Support Users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Support Users ({supportUsers.length})</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Add Support User
              </button>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Name</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Email</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Status</th>
                      <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Created</th>
                      <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 py-12">No support users yet</td>
                      </tr>
                    ) : (
                      supportUsers.map((su) => (
                        <tr key={su.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                                {su.name[0].toUpperCase()}
                              </div>
                              <span className="text-white font-medium">{su.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{su.email}</td>
                          <td className="px-6 py-4">
                            <span className={su.is_active ? 'badge-online' : 'badge-offline'}>
                              {su.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm">
                            {new Date(su.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleUser(su.id, su.is_active)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  su.is_active
                                    ? 'text-green-400 hover:bg-green-500/10'
                                    : 'text-gray-500 hover:bg-gray-700'
                                }`}
                                title={su.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {su.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(su.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* All Devices Tab */}
        {activeTab === 'All Devices' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">All Devices ({devices.length})</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="badge-online">{stats.online} Online</span>
                <span className="badge-offline">{stats.offline} Offline</span>
                {stats.error > 0 && <span className="badge-error">{stats.error} Error</span>}
              </div>
            </div>
            {devices.length === 0 ? (
              <div className="card text-center py-16">
                <Cpu size={48} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">No devices registered</p>
                <p className="text-gray-600 text-sm mt-1">Customers need to register their devices first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {devices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    canControl={true}
                    onControl={handleControl}
                    onClick={() => setSelectedDevice(device)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'AI Assistant' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-gray-400 text-sm">Full administrative access — ask about any devices, users, or system stats</p>
            </div>
            <AIChat userRole="admin" />
          </div>
        )}
      </div>
    </Layout>
  )
}
