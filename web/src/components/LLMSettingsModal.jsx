import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Check, AlertCircle, Loader } from 'lucide-react'

export default function LLMSettingsModal({ isOpen, onClose, onStatusChange }) {
  const [aiStatus, setAiStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    provider: 'kiro',
    model: 'claude-haiku-5.5',
    apiKey: '',
  })

  // Available providers with their default models
  const providers = {
    kiro: {
      label: 'Kiro CLI (Recommended)',
      models: ['claude-haiku-5.5'],
      requiresKey: false,
      description: 'Uses local Kiro CLI with GitHub authentication',
    },
    groq: {
      label: 'Groq (Fast & Free)',
      models: ['openai/gpt-oss-120b'],
      requiresKey: true,
      description: 'Free tier available, fast inference',
    },
    openai: {
      label: 'OpenAI (GPT-4)',
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      requiresKey: true,
      description: 'Powerful models, requires API key',
    },
    anthropic: {
      label: 'Anthropic Claude',
      models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
      requiresKey: true,
      description: 'Advanced reasoning, requires API key',
    },
    copilot: {
      label: 'GitHub Copilot',
      models: ['claude-haiku-5-5', 'gpt-4o'],
      requiresKey: false,
      description: 'Uses GitHub CLI authentication',
    },
    ollama: {
      label: 'Ollama (Local)',
      models: ['gpt-oss:120b', 'mistral', 'neural-chat'],
      requiresKey: false,
      description: 'Local LLM, requires Ollama running locally',
    },
  }

  // Load LLM status on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLLMStatus()
    }
  }, [isOpen])

  async function loadLLMStatus() {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/llm/status')
      const status = response.data
      setAiStatus(status)
      setFormData({
        provider: status.provider || 'kiro',
        model: status.model || 'claude-haiku-5.5',
        apiKey: '', // Don't load actual key for security
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load LLM status')
    } finally {
      setLoading(false)
    }
  }

  function handleProviderChange(newProvider) {
    setFormData(prev => ({
      ...prev,
      provider: newProvider,
      model: providers[newProvider]?.models[0] || prev.model,
    }))
    setError('')
    setSuccess('')
  }

  function handleModelChange(newModel) {
    setFormData(prev => ({
      ...prev,
      model: newModel,
    }))
  }

  function handleApiKeyChange(e) {
    setFormData(prev => ({
      ...prev,
      apiKey: e.target.value,
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        provider: formData.provider,
        model: formData.model,
      }

      // Only include apiKey if provided and if the provider requires it
      if (formData.apiKey && providers[formData.provider]?.requiresKey) {
        payload.apiKey = formData.apiKey
      }

      const response = await axios.post('/api/llm/configure', payload)
      setSuccess(`LLM configured: ${formData.provider} | ${formData.model}`)
      setAiStatus(response.data)
      onStatusChange?.(response.data)

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save LLM configuration')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const currentProvider = providers[formData.provider]
  const requiresKey = currentProvider?.requiresKey

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl max-h-96 overflow-y-auto z-50">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">LLM Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Status Info */}
          {aiStatus && (
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/50 text-emerald-200 text-sm flex items-start gap-2">
              <Check size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Current Configuration</div>
                <div className="text-xs text-emerald-300">
                  Provider: <span className="font-mono">{aiStatus.provider}</span> | Model:{' '}
                  <span className="font-mono">{aiStatus.model}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/50 text-red-200 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/50 text-emerald-200 text-sm flex items-start gap-2">
              <Check size={16} className="mt-0.5 flex-shrink-0" />
              <div>{success}</div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-400">Loading...</span>
            </div>
          ) : (
            <>
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  LLM Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(providers).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleProviderChange(key)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        formData.provider === key
                          ? 'bg-sky-900/40 border-sky-500 text-sky-100'
                          : 'bg-slate-800/50 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="font-medium text-sm">{config.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              {currentProvider && (
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Model
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentProvider.models.map(model => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleModelChange(model)}
                        className={`p-2 rounded-lg border text-sm transition-colors ${
                          formData.model === model
                            ? 'bg-emerald-900/40 border-emerald-500 text-emerald-100'
                            : 'bg-slate-800/50 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* API Key Input (if required) */}
              {requiresKey && (
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={handleApiKeyChange}
                    placeholder={`Enter ${formData.provider} API key`}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-gray-600 focus:border-sky-500 focus:outline-none text-sm"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Leave empty to use existing key
                  </div>
                </div>
              )}

              {!requiresKey && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-white/10 text-gray-300 text-sm">
                  ✓ No API key required for {formData.provider}
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white transition-colors text-sm font-medium flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
