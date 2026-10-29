import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function LLMStatusWidget() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true)
      const response = await axios.get('/api/llm/status')
      console.log('LLM Status Response:', response.data)
      setStatus(response.data)
      setError(null)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch LLM status'
      setError(errorMsg)
      console.error('Error fetching LLM status:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
        <span className="text-xs text-gray-400">Loading LLM status…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <span className="text-xs text-red-300">{error}</span>
      </div>
    )
  }

  if (!status) {
    return null
  }

  const providerIcons = {
    groq: '⚡',
    ollama: '🦙',
    openai: '🤖',
    claude: '🧠',
    copilot: '🚀',
  }

  const providerNames = {
    groq: 'Groq',
    ollama: 'Ollama',
    openai: 'OpenAI',
    claude: 'Claude',
    copilot: 'Copilot',
  }

  const isConfigured = status.configured || status.authenticated
  const statusColor = isConfigured ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
  const statusDot = isConfigured ? '🟢' : '🟡'
  const icon = providerIcons[status.provider] || '⚙️'
  const providerName = providerNames[status.provider] || status.provider || 'Not Configured'
  
  // Get model display name
  // Show the model the backend reports; only fall back to a neutral label
  const modelDisplay = status.model || (status.provider === 'copilot' ? 'Copilot default' : 'Default model')

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusColor} border`}>
      <span className="text-sm">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-gray-200 capitalize">
          {providerName}
        </span>
        <span className="text-xs text-gray-400 font-mono">
          {modelDisplay}
        </span>
      </div>
      <span className="text-sm ml-auto">{statusDot}</span>
      <span className="text-xs text-gray-400">
        {isConfigured ? 'Ready' : 'Not Ready'}
      </span>
      <button
        onClick={fetchStatus}
        disabled={isRefreshing}
        title="Refresh LLM Status"
        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
      >
        <svg className={`w-3 h-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}
