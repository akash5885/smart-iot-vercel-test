import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Cpu,
  Bot,
  LogOut,
  Menu,
  X,
  Zap,
  Shield,
  UserCheck,
  ChevronRight,
} from 'lucide-react'

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    icon: Shield,
  },
  support: {
    label: 'Support',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    icon: UserCheck,
  },
  customer: {
    label: 'Customer',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: Users,
  },
}

const NAV_ITEMS = {
  admin: [
    { href: '/dashboard/admin?tab=Overview', label: 'Dashboard', icon: LayoutDashboard, tab: 'Overview' },
    { href: '/dashboard/admin?tab=Customers', label: 'Customers', icon: Users, tab: 'Customers' },
    { href: '/dashboard/admin?tab=All+Devices', label: 'All Devices', icon: Cpu, tab: 'All Devices' },
    { href: '/dashboard/admin?tab=AI+Assistant', label: 'AI Assistant', icon: Bot, tab: 'AI Assistant' },
  ],
  support: [
    { href: '/dashboard/support?tab=Overview', label: 'Dashboard', icon: LayoutDashboard, tab: 'Overview' },
    { href: '/dashboard/support?tab=Customer+Devices', label: 'Customer Devices', icon: Cpu, tab: 'Customer Devices' },
    { href: '/dashboard/support?tab=AI+Assistant', label: 'AI Assistant', icon: Bot, tab: 'AI Assistant' },
  ],
  customer: [
    { href: '/dashboard/customer?tab=My+Devices', label: 'My Devices', icon: LayoutDashboard, tab: 'My Devices' },
    { href: '/dashboard/customer?tab=AI+Assistant', label: 'AI Assistant', icon: Bot, tab: 'AI Assistant' },
  ],
}

export default function Layout({ children, user }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const roleConfig = ROLE_CONFIG[user?.role] || ROLE_CONFIG.customer
  const RoleIcon = roleConfig.icon
  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.customer

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">SmartIoT</h1>
            <p className="text-gray-500 text-xs">Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-gray-600 text-xs font-medium uppercase tracking-wider px-3 mb-2">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = router.query.tab === item.tab || (!router.query.tab && item.tab === 'Overview') || (!router.query.tab && item.tab === 'My Devices')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={17} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${roleConfig.bgColor} mb-3`}>
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
            <div className="flex items-center gap-1">
              <RoleIcon size={11} className={roleConfig.color} />
              <span className={`text-xs font-medium ${roleConfig.color}`}>{roleConfig.label}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium disabled:opacity-50"
        >
          <LogOut size={16} />
          {loggingOut ? 'Logging out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-gray-900 border-r border-gray-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 h-full bg-gray-900 border-r border-gray-800 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">SmartIoT</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
