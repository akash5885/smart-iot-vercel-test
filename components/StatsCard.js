export default function StatsCard({ icon: Icon, title, value, subtitle, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  }

  const iconClass = colorMap[color] || colorMap.blue

  return (
    <div className="card flex items-start gap-4">
      {Icon && (
        <div className={`p-3 rounded-lg ${iconClass}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value ?? '—'}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <p
            className={`text-xs mt-1 font-medium ${
              trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {trend > 0 ? `+${trend}` : trend}% from last week
          </p>
        )}
      </div>
    </div>
  )
}
