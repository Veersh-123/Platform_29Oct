import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function LLMProviderSelector() {
  const [providers, setProviders] = useState([])
  const [currentProvider, setCurrentProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/llm/available-providers')
      setProviders(response.data.providers || [])
      setCurrentProvider(response.data.current || null)
      setError(null)
    } catch (err) {
      setError('Failed to fetch available providers')
      console.error('Error fetching providers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = async (providerId) => {
    try {
      setConfiguring(true)
      await axios.post('/api/llm/configure', { provider: providerId })
      setCurrentProvider(providerId)
      setSuccessMessage(`Switched to ${providerId}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to configure provider')
    } finally {
      setConfiguring(false)
    }
  }

  const providerDetails = {
    groq: {
      name: 'Groq (LLaMA 70B)',
      icon: '⚡',
      description: 'Fast open-source model - Free',
      color: 'blue',
    },
    ollama: {
      name: 'Ollama Cloud (gpt-oss:120b)',
      icon: '🦙',
      description: 'Open models hosted by Ollama Cloud',
      color: 'orange',
    },
    claude: {
      name: 'Claude 3.5 Haiku',
      icon: '🧠',
      description: 'Advanced reasoning model - Paid',
      color: 'purple',
    },
    openai: {
      name: 'OpenAI GPT-4o',
      icon: '🤖',
      description: 'Multimodal flagship model - Paid',
      color: 'teal',
    },
    copilot: {
      name: 'GitHub Copilot',
      icon: '🚀',
      description: 'Code-focused model - Free (GitHub)',
      color: 'gray',
    },
  }

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-300">Loading LLM providers…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🤖</span>
          LLM Provider Selection
        </h2>
        <p className="text-gray-400 text-sm">
          Choose your AI model for test case and script generation
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-emerald-300 text-sm flex items-center gap-2">
            <span>✓</span>
            {successMessage}
          </p>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => {
          const details = providerDetails[provider.id] || {
            name: provider.name,
            icon: '⚙️',
            description: provider.description || 'Custom provider',
            color: 'gray',
          }
          const isActive = currentProvider === provider.id

          return (
            <button
              key={provider.id}
              onClick={() => !configuring && handleProviderChange(provider.id)}
              disabled={configuring}
              className={`p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? `border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50`
                  : `border-slate-600 bg-slate-700/50 hover:border-slate-500`
              } ${configuring ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{details.icon}</span>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-white text-sm">{details.name}</h3>
                  <p className="text-gray-400 text-xs mt-1">{details.description}</p>
                  {provider.authenticated && (
                    <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                      <span>✓</span> Configured
                    </p>
                  )}
                  {!provider.authenticated && (
                    <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                      <span>○</span> Not configured
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🟢</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Current Settings Info */}
      {currentProvider && (
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <span>💡</span>
            Current Settings
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p className="flex justify-between">
              <span className="text-gray-400">Provider:</span>
              <span className="font-mono text-white">{currentProvider}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span>🟢</span> Ready to use
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-3">
              ℹ️ Switch providers to use different AI models for test generation
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
