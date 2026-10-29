import React, { useEffect, useState } from 'react'
import axios from 'axios'

function StatCard({ label, value, color = 'text-white', sub }) {
  return (
    <div className="dashboard-card flex flex-col gap-1">
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value ?? '–'}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function DashboardOverview() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    axios.get('/api/stats')
      .then(r => setStats(r.data))
      .catch(() => setError(true))
  }, [])

  const passRate = stats && stats.total > 0
    ? Math.round((stats.passed / stats.total) * 100)
    : null

  const lastRunLabel = stats?.lastRun
    ? new Date(stats.lastRun).toLocaleString()
    : 'No runs yet'

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3">
          <span className="mt-0.5 flex-shrink-0">ℹ</span>
          <span>
            Backend server is not running. Start it with:{' '}
            <code className="font-mono bg-black/30 px-1 py-0.5 rounded">cd server &amp;&amp; node index.js</code>
            <br />
            <span className="text-amber-400/70 mt-1 block">Stats will load automatically once the server is up.</span>
          </span>
        </div>
      )}

      {/* Summary header */}
      <div className="dashboard-card">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Project</div>
        <h2 className="text-2xl font-bold text-white">Playwright Test Suite</h2>
        <div className="subtitle mt-1">Airbnb Destination Search — SCRUM-6</div>
        <div className="text-xs text-gray-500 mt-3">Last run: {lastRunLabel}</div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Spec Files" value={stats?.specFiles} />
        <StatCard label="Test Cases" value={stats?.totalTests} />
        <StatCard
          label="Passed"
          value={stats?.passed}
          color="text-emerald-400"
          sub={passRate != null ? `${passRate}% pass rate` : undefined}
        />
        <StatCard
          label="Failed"
          value={stats?.failed}
          color={stats?.failed > 0 ? 'text-red-400' : 'text-white'}
        />
        <StatCard label="Page Objects" value={stats?.pageObjects} />
        <StatCard label="Locator Files" value={stats?.locators} />
      </div>

      {/* Pass rate bar */}
      {stats && stats.total > 0 && (
        <div className="dashboard-card">
          <div className="text-xs text-gray-400 uppercase mb-2">Pass Rate</div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${passRate}%`,
                background: passRate === 100 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <div className="text-right text-xs mt-1 text-gray-400">{passRate}%</div>
        </div>
      )}
    </div>
  )
}
