import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function TestObservability() {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLatestReport()
  }, [])

  const fetchLatestReport = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/observability/latest-report')
      setReportData(response.data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load observability report')
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-500/20 mb-3">
            <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400">Loading observability report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-card border-red-500/30 bg-red-500/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-white mb-1">Unable to Load Report</h3>
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={fetchLatestReport}
              className="mt-3 px-3 py-1.5 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="dashboard-card">
        <p className="text-gray-400 text-sm">No observability report data available yet.</p>
      </div>
    )
  }

  const {
    systemHealthScore = 71,
    totalReports = 47,
    avgPassRate = 80.61,
    totalBugs = 19,
    stabilityScore = 100,
    browserCoverage = { Chrome: 85, Firefox: 78, Edge: 81 },
    features = [],
    aiInsights = [],
    recommendations = [],
    lastUpdated = new Date().toLocaleString()
  } = reportData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-card border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-indigo-500/10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">🔭 Test Observability Dashboard</h2>
            <p className="text-sm text-gray-400">AI-Powered Test Analytics & Insights</p>
            <p className="text-xs text-gray-500 mt-2">Last Updated: {lastUpdated}</p>
          </div>
          <button
            onClick={fetchLatestReport}
            className="flex-shrink-0 px-3 py-1.5 text-xs rounded bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 text-sky-300 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">System Health Score</p>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{systemHealthScore}</div>
          <p className="text-xs text-emerald-400 mb-1">Good</p>
          <p className="text-xs text-gray-400">Based on pass rates, stability, and trend analysis</p>
        </div>

        {/* Key Metrics */}
        <div className="lg:col-span-2 dashboard-card">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">📊 Key Metrics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricBox label="Total Reports" value={totalReports} delta="+47 reports" />
            <MetricBox label="Avg Pass Rate" value={`${avgPassRate}%`} delta="0.0%" />
            <MetricBox label="Total Bugs" value={totalBugs} delta="+0.0" />
            <MetricBox label="Stability Score" value={`${stabilityScore}%`} delta="0.0%" />
          </div>
        </div>
      </div>

      {/* Browser Coverage */}
      <div className="dashboard-card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">🌐 Browser Coverage</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(browserCoverage).map(([browser, passRate]) => (
            <div key={browser} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-2">{browser}</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${passRate}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{passRate}% Pass Rate</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Performance */}
      <div className="dashboard-card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">⚡ Feature Performance</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Pass Rate</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {features.length > 0 ? (
                features.map((feature, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{feature.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              feature.passRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${feature.passRate}%` }}
                          />
                        </div>
                        <span className="text-gray-300">{feature.passRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        feature.passRate >= 80
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : feature.passRate >= 70
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {feature.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-center text-gray-400">
                    No feature data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="dashboard-card border-indigo-500/30 bg-indigo-500/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">🤖 AI-Powered Insights</p>
          <div className="space-y-3">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-medium text-indigo-300 mb-1">Pattern {idx + 1}</p>
                <p className="text-xs text-gray-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="dashboard-card border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">💡 AI Recommendations</p>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-lg flex-shrink-0">{rec.icon || '💡'}</span>
                <div>
                  <p className="text-xs font-medium text-amber-300 mb-0.5">{rec.title}</p>
                  <p className="text-xs text-gray-400">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t border-white/5">
        <p className="text-xs text-gray-500">
          Dashboard Generated on {lastUpdated}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          AI Analytics Engine: GPT-4 Powered Insights
        </p>
      </div>
    </div>
  )
}

function MetricBox({ label, value, delta }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{delta}</p>
    </div>
  )
}
