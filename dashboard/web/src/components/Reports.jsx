import React, { useEffect, useState } from 'react'
import axios from 'axios'

function SummaryCard({ label, value, color = 'text-white' }) {
  return (
    <div className="dashboard-card text-center">
      <div className={`text-3xl font-bold ${color}`}>{value ?? '–'}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}

function SuiteBlock({ suite }) {
  const [open, setOpen] = useState(true)
  const passCount = suite.tests - suite.failures - suite.skipped

  return (
    <div className="rounded-lg overflow-hidden border border-white/5 bg-white/5">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{open ? '▾' : '▸'}</span>
          <span className="text-sm font-medium text-gray-200">{suite.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">✓ {passCount}</span>
          {suite.failures > 0 && <span className="text-red-400">✗ {suite.failures}</span>}
          {suite.skipped > 0  && <span className="text-yellow-400">⏭ {suite.skipped}</span>}
          <span className="text-gray-500">{suite.time.toFixed(2)}s</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5">
          {suite.cases.map((tc, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5">
              <span className="text-base flex-shrink-0 mt-0.5">
                {tc.status === 'passed' ? '✅' : tc.status === 'failed' ? '❌' : '⏭'}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${
                  tc.status === 'passed' ? 'text-gray-200' :
                  tc.status === 'failed' ? 'text-red-300' : 'text-yellow-300'
                }`}>
                  {tc.name}
                </div>
                {tc.failureMessage && (
                  <div className="text-xs text-red-400 font-mono mt-1 bg-red-900/20 rounded px-2 py-1 break-words">
                    {tc.failureMessage.slice(0, 200)}{tc.failureMessage.length > 200 ? '…' : ''}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">{tc.time.toFixed(2)}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    axios.get('/api/results')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load results'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading results…</div>

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-3xl mb-3">📊</div>
        <div className="text-gray-400 text-sm mb-2">{error}</div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold"
        >
          Retry
        </button>
      </div>
    )
  }

  const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Test Results</h3>
          <div className="text-xs text-gray-500 mt-0.5">
            Last run: {new Date(data.generatedAt).toLocaleString()}
          </div>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total"   value={data.total}   />
        <SummaryCard label="Passed"  value={data.passed}  color="text-emerald-400" />
        <SummaryCard label="Failed"  value={data.failed}  color={data.failed > 0 ? 'text-red-400' : 'text-white'} />
        <SummaryCard label="Skipped" value={data.skipped} color="text-yellow-400" />
      </div>

      {/* Pass rate bar */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span className="uppercase tracking-wider">Pass Rate</span>
          <span className={passRate === 100 ? 'text-emerald-400 font-bold' : passRate >= 50 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>
            {passRate}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{
              width: `${passRate}%`,
              background: passRate === 100 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
      </div>

      {/* Suite blocks */}
      {data.suites?.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Test Suites</div>
          {data.suites.map((suite, i) => (
            <SuiteBlock key={i} suite={suite} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">📭</div>
          <p className="text-sm">No suite details found. Run tests to populate results.</p>
        </div>
      )}
    </div>
  )
}
