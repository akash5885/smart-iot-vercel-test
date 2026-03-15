import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Loader2, Zap } from 'lucide-react'

export default function DashboardIndex() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/')
          return
        }
        const data = await res.json()
        const role = data?.user?.role

        if (role === 'admin') {
          router.replace('/dashboard/admin')
        } else if (role === 'support') {
          router.replace('/dashboard/support')
        } else if (role === 'customer') {
          router.replace('/dashboard/customer')
        } else {
          router.push('/')
        }
      } catch (err) {
        router.push('/')
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
          <Zap size={28} className="text-white" />
        </div>
        <div className="flex items-center gap-2 text-gray-400 justify-center">
          <Loader2 size={20} className="animate-spin text-blue-400" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    </div>
  )
}
