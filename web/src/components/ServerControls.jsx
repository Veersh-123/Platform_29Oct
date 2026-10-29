import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const POLL_INTERVAL = 10_000 // refresh status every 10 s

export default function ServerControls() {
  const [status, setStatus]       = useState(null)   // null | object
  const [loading, setLoading]     = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [error, setError]         = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/server/status')
      setStatus(data)
      setError(null)
    } catch {
      setStatus(null)
      setError('Server unreachable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchStatus])

  const handleRestart = async () => {
    if (!window.confirm('Restart the backend server now?')) return
    setRestarting(true)
    setError(null)
    try {
      await axios.post('/api/server/restart')
    } catch { /* server may close before responding */ }

    // Poll until the server comes back up (max 30 s)
    const start = Date.now()
    const poll = setInterval(async () => {
      try {
        const { data } = await axios.get('/api/server/status')
        if (data.ok) {
          clearInterval(poll)
          setStatus(data)
          setRestarting(false)
        }
      } catch { /* still offline */ }
      if (Date.now() - start > 30_000) {
        clearInterval(poll)
        setRestarting(false)
        setError('Server did not come back online in 30 s — check your terminal')
      }
    }, 1500)
  }

  const online = status?.ok === true

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Server Controls</span>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            restarting
              ? 'bg-amber-900/20 border-amber-700 text-amber-400'
              : online
                ? 'bg-emerald-900/20 border-emerald-700 text-emerald-400'
                : 'bg-red-900/20 border-red-700 text-red-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${restarting ? 'bg-amber-400 animate-pulse' : online ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {restarting ? 'Restarting…' : online ? 'Online' : 'Offline'}
        </span>
      </div>

      {loading && !status && (
        <p className="text-sm text-gray-500">Checking server…</p>
      )}

      {!loading && !restarting && (
        <div className="space-y-2 text-sm mb-4">
          <Row label="Port"    value={status ? `:${status.port}` : '—'} />
          <Row label="PID"     value={status?.pid ?? '—'} />
          <Row label="Uptime"  value={status?.uptimeStr ?? '—'} />
          <Row label="Node"    value={status?.nodeVersion ?? '—'} />
          <Row label="Started" value={status?.startedAt ? new Date(status.startedAt).toLocaleTimeString() : '—'} />
        </div>
      )}

      {restarting && (
        <div className="py-4 text-center">
          <div className="inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-gray-400">Waiting for server to come back…</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={fetchStatus}
          disabled={loading || restarting}
          className="flex-1 py-1.5 text-xs rounded border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors disabled:opacity-40"
        >
          Refresh
        </button>
        <button
          onClick={handleRestart}
          disabled={restarting || !online}
          className="flex-1 py-1.5 text-xs rounded bg-sky-700/20 border border-sky-700/50 text-sky-400 hover:bg-sky-700/30 transition-colors disabled:opacity-40"
        >
          {restarting ? 'Restarting…' : 'Restart Server'}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Requires <code className="font-mono text-gray-500">node --watch</code> or a process manager to auto-restart.
      </p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-gray-500 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-gray-300 font-mono text-xs">{value}</span>
    </div>
  )
}
