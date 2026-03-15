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
  Users,
  Loader2,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  Search,
} from 'lucide-react'

const TABS = ['Overview', 'Customer Devices', 'AI Assistant']

export default function SupportDashboard() {
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
  const [devices, setDevices] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ totalCustomers: 0, totalDevices: 0, online: 0, offline: 0, error: 0 })

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [devicesRes, usersRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/users'),
      ])

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

      if (usersRes.ok) {
        const data = await usersRes.json()
        const customerList = data.users?.filter((u) => u.role === 'customer') || []
        setCustomers(customerList)
        setStats((prev) => ({ ...prev, totalCustomers: customerList.length }))
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
      if (data.user?.role !== 'support') { router.push('/dashboard'); return }
      setUser(data.user)
      setLoading(false)
      fetchData()
    }
    init()
  }, [])

  // Group devices by customer
  const devicesByCustomer = customers.map((customer) => ({
    customer,
    devices: devices.filter((d) => d.customer_id === customer.id),
  })).filter((group) => group.devices.length > 0)

  const filteredDevices = devices.filter((d) => {
    const term = searchTerm.toLowerCase()
    return (
      d.name?.toLowerCase().includes(term) ||
      d.type?.toLowerCase().includes(term) ||
      d.location?.toLowerCase().includes(term) ||
      d.users?.name?.toLowerCase().includes(term) ||
      d.users?.email?.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <Layout user={user}>
      {selectedDevice && (
        <DeviceControlPanel
          device={selectedDevice}
          canControl={false}
          onControl={null}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      <div className="p-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCheck size={24} className="text-blue-400" />
              Support Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">Read-only view of all customer devices</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); router.replace(`/dashboard/support?tab=${encodeURIComponent(tab)}`, undefined, { shallow: true }) }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatsCard icon={Users} title="Customers" value={stats.totalCustomers} color="blue" />
              <StatsCard icon={Cpu} title="Total Devices" value={stats.totalDevices} color="orange" />
              <StatsCard icon={Wifi} title="Online" value={stats.online} color="green" />
              <StatsCard icon={WifiOff} title="Offline" value={stats.offline} color="red" />
              <StatsCard icon={AlertTriangle} title="Error" value={stats.error} color="yellow" />
            </div>

            {/* View only notice */}
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
              <UserCheck size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 font-medium text-sm">Support View Only Mode</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  You can view all device data and statistics, but cannot control or modify devices.
                  If a customer needs device control, ask them to log in or contact an admin.
                </p>
              </div>
            </div>

            {/* Quick device overview */}
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {devices.slice(0, 8).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  canControl={false}
                  onControl={null}
                  onClick={() => setSelectedDevice(device)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Customer Devices Tab */}
        {activeTab === 'Customer Devices' && (
          <div>
            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search devices by name, type, location, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9"
              />
            </div>

            {searchTerm ? (
              <div>
                <p className="text-gray-400 text-sm mb-4">
                  Found {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDevices.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      canControl={false}
                      onControl={null}
                      onClick={() => setSelectedDevice(device)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {devicesByCustomer.length === 0 ? (
                  <div className="card text-center py-16">
                    <Cpu size={48} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No devices registered</p>
                  </div>
                ) : (
                  devicesByCustomer.map(({ customer, devices: customerDevices }) => (
                    <div key={customer.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                          {customer.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{customer.name}</h3>
                          <p className="text-gray-500 text-xs">{customer.email} · {customerDevices.length} device{customerDevices.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="ml-auto flex gap-2">
                          <span className="badge-online">{customerDevices.filter(d => d.status === 'online').length} online</span>
                          {customerDevices.filter(d => d.status === 'offline').length > 0 && (
                            <span className="badge-offline">{customerDevices.filter(d => d.status === 'offline').length} offline</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {customerDevices.map((device) => (
                          <DeviceCard
                            key={device.id}
                            device={device}
                            canControl={false}
                            onControl={null}
                            onClick={() => setSelectedDevice(device)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'AI Assistant' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-gray-400 text-sm">Support context — get help with customer troubleshooting (view only guidance)</p>
            </div>
            <AIChat userRole="support" />
          </div>
        )}
      </div>
    </Layout>
  )
}
