import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Zap, Eye, EyeOff, Loader2, Wifi, Shield, Users } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-500/30 mb-4">
            <Zap size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartIoT</h1>
          <p className="text-gray-400 mt-2">Intelligent Device Management Platform</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@iot.com"
                required
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Wifi size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              New customer?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-4 card border-blue-900/30 bg-blue-950/20">
          <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <Zap size={14} />
            Demo Credentials
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => fillDemo('admin@iot.com', 'Admin@123')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all text-left group"
            >
              <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-400">
                <Shield size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">System Admin</p>
                <p className="text-gray-500 text-xs truncate">admin@iot.com • Admin@123</p>
              </div>
              <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to fill</span>
            </button>

            <button
              onClick={() => fillDemo('support@iot.com', 'Support@123')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all text-left group"
            >
              <div className="p-1.5 rounded-md bg-blue-500/20 text-blue-400">
                <Users size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">Support Agent</p>
                <p className="text-gray-500 text-xs truncate">support@iot.com • Support@123</p>
              </div>
              <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to fill</span>
            </button>

            <button
              onClick={() => fillDemo('alice@example.com', 'Customer@123')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all text-left group"
            >
              <div className="p-1.5 rounded-md bg-green-500/20 text-green-400">
                <Wifi size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">Customer (Alice)</p>
                <p className="text-gray-500 text-xs truncate">alice@example.com • Customer@123</p>
              </div>
              <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to fill</span>
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-3 text-center">
            * Run the schema.sql in Supabase first, then update password hashes
          </p>
        </div>
      </div>
    </div>
  )
}
