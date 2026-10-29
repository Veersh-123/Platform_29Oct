import { useState, useEffect } from 'react'
import axios from 'axios'
import { Eye, EyeOff, Check, AlertCircle, X, Plus, Edit2, Trash2 } from 'lucide-react'

export default function UserSettings({ initialTab = 'profile', onAIStatusChange } = {}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  // Profile Settings State
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
  })
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // MCP Configuration State
  const [mcpBasePath, setMcpBasePath] = useState('')
  const [isEditingMcp, setIsEditingMcp] = useState(false)
  const [mcpPathTemp, setMcpPathTemp] = useState('')

  // LLM Configuration State
  const [llmConfigs, setLlmConfigs] = useState([])
  const [showAddLlmForm, setShowAddLlmForm] = useState(false)
  const [editingLlm, setEditingLlm] = useState(null)
  const [llmFormData, setLlmFormData] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)
  const [aiStatusError, setAiStatusError] = useState('')
  const [aiForm, setAiForm] = useState({ provider: 'groq', apiKey: '', model: '' })
  const [newLlmData, setNewLlmData] = useState({
    name: '', command: 'node', args: '',
    env: { AI_PROVIDER: '', OPENAI_API_KEY: '', HEALER_MAX_RETRIES: '3', HEALER_LOG_DIR: './healing-logs' }
  })

  // Environment State
  const [environment, setEnvironment] = useState({
    url: '',
    browser: 'chromium',
  })
  const [browserOptions] = useState(['chromium', 'firefox', 'webkit'])

  // Load user data on mount
  useEffect(() => {
    loadUserProfile()
    loadMcpConfig()
    loadAIStatus()
  }, [])

  async function loadAIStatus() {
    try {
      const response = await axios.get('/api/llm/status')
      const status = response.data
      setAiStatus(status)
      onAIStatusChange?.(status)
      setAiStatusError('')
      setAiForm(current => ({
        ...current,
        provider: status.provider || current.provider,
        model: status.model || current.model,
      }))
    } catch (err) {
      setAiStatusError(err.response?.data?.error || 'Unable to read the project LLM configuration')
    }
  }

  async function handleAIConfigurationSave(event) {
    event.preventDefault()
    const isCopilot = aiForm.provider === 'copilot'
    if (!isCopilot && !aiForm.apiKey.trim()) {
      showNotification('Enter the provider API key to verify and save the configuration', 'error')
      return
    }
    if (!isCopilot && !aiForm.model.trim()) {
      showNotification('Enter a model name', 'error')
      return
    }

    setLoading(true)
    try {
      await axios.post('/api/llm/connect', {
        provider: aiForm.provider,
        apiKey: aiForm.apiKey.trim(),
        model: aiForm.model.trim(),
      })
      setAiForm(current => ({ ...current, apiKey: '' }))
      await loadAIStatus()
      showNotification('Project LLM verified and saved. Dashboard AI features will use it.', 'success')
    } catch (err) {
      showNotification(err.response?.data?.error || 'LLM configuration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load user profile
  async function loadUserProfile() {
    try {
      const response = await axios.get('/api/user/profile')
      setProfile(response.data.profile)
      setEnvironment(response.data.environment || environment)
    } catch (err) {
      console.log('Profile not found, using defaults')
    }
  }

  // Load MCP configuration
  async function loadMcpConfig() {
    try {
      const response = await axios.get('/api/mcp/config')
      const basePath = response.data.basePath || ''
      setMcpBasePath(basePath)
      setMcpPathTemp(basePath)
      setLlmConfigs(response.data.llmConfigs || [])
    } catch (err) {
      console.log('MCP config not available')
    }
  }

  // Update profile
  async function handleProfileUpdate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/user/profile', profile)
      showNotification('Profile updated successfully', 'success')
    } catch (err) {
      showNotification('Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update password
  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      showNotification('New passwords do not match', 'error')
      return
    }
    if (passwordChange.newPassword.length < 8) {
      showNotification('Password must be at least 8 characters', 'error')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/user/password', passwordChange)
      showNotification('Password changed successfully', 'success')
      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      showNotification('Failed to update password', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update environment settings
  async function handleEnvironmentUpdate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/user/environment', environment)
      showNotification('Environment settings updated', 'success')
    } catch (err) {
      showNotification('Failed to update environment', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update MCP base path
  async function handleMcpBasePathUpdate() {
    try {
      setLoading(true)
      await axios.post('/api/mcp/basepath', { basePath: mcpPathTemp })
      setMcpBasePath(mcpPathTemp)
      setIsEditingMcp(false)
      showNotification('MCP path updated successfully', 'success')
    } catch (err) {
      showNotification('Failed to update MCP path', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cancel MCP path editing
  function handleMcpPathCancel() {
    setMcpPathTemp(mcpBasePath)
    setIsEditingMcp(false)
  }

  // Add new LLM
  async function handleAddLlm(e) {
    e.preventDefault()
    if (!newLlmData.name || !newLlmData.args) {
      showNotification('Name and path are required', 'error')
      return
    }
    try {
      setLoading(true)
      await axios.post('/api/llm/add', { llmData: newLlmData })
      showNotification('LLM saved successfully', 'success')
      setShowAddLlmForm(false)
      setNewLlmData({ name: '', command: 'node', args: '', env: { AI_PROVIDER: '', OPENAI_API_KEY: '', HEALER_MAX_RETRIES: '3', HEALER_LOG_DIR: './healing-logs' } })
      loadMcpConfig()
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to save LLM', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update LLM
  async function handleLlmUpdate() {
    if (!llmFormData?.name) { showNotification('LLM name is required', 'error'); return }
    try {
      setLoading(true)
      await axios.post('/api/llm/update', { oldName: editingLlm.name, llmData: llmFormData })
      showNotification('LLM updated successfully', 'success')
      setEditingLlm(null); setLlmFormData(null)
      loadMcpConfig()
    } catch (err) {
      showNotification('Failed to update LLM', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Delete LLM
  async function handleLlmDelete(name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      setLoading(true)
      await axios.post('/api/llm/delete', { name })
      showNotification('LLM deleted', 'success')
      loadMcpConfig()
    } catch (err) {
      showNotification('Failed to delete LLM', 'error')
    } finally {
      setLoading(false)
    }
  }

  function showNotification(msg, type) {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  function togglePasswordVisibility(field) {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl">
          ⚙️
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">User Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your profile, MCP & LLM configuration, and environment settings</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm">{notification.msg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {['profile', 'mcp', 'environment'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'profile' && '👤 Profile Settings'}
            {tab === 'mcp' && '🔌 MCP & LLM Configuration'}
            {tab === 'environment' && '🌍 Environment'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Basic Profile */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">👤</span>
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Role</label>
                <select
                  value={profile.role}
                  onChange={e => setProfile({ ...profile, role: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                >
                  <option value="">Select role</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="Automation Lead">Automation Lead</option>
                  <option value="Test Manager">Test Manager</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                  placeholder="john@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🔐</span>
              Change Password
            </h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordChange.currentPassword}
                    onChange={e => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordChange.newPassword}
                    onChange={e => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordChange.confirmPassword}
                    onChange={e => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MCP & LLM Tab */}
      {activeTab === 'mcp' && (
        <div className="space-y-6">

          {/* MCP Configuration Path */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🔌</span>
              MCP Configuration Path
            </h2>
            {!isEditingMcp ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <input
                    type="text"
                    value={mcpBasePath}
                    disabled
                    className="flex-1 bg-transparent text-white font-mono text-sm outline-none cursor-default"
                  />
                </div>
                <button
                  onClick={() => setIsEditingMcp(true)}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={mcpPathTemp}
                  onChange={e => setMcpPathTemp(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors font-mono text-sm"
                  placeholder="C:/Users/.../mcp.json"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleMcpBasePathUpdate}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={handleMcpPathCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Project LLM used by dashboard AI workflows */}
          <div className="bg-white/5 border border-sky-500/20 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-xl">🧠</span>
                  Project AI Provider
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Dashboard test-case, script, and healing workflows use the provider and model from the project root .env. Credentials stay on the server and are never sent to the browser. Copilot uses its CLI account, not the model selected in a VS Code Chat session.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAIStatus}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-200 text-xs rounded-lg"
              >
                Refresh status
              </button>
            </div>

            {aiStatusError ? (
              <p role="alert" className="text-sm text-red-300">{aiStatusError}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2.5 py-1 rounded-full border ${
                  aiStatus?.configured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {aiStatus?.provider === 'copilot'
                    ? (aiStatus?.authenticated ? 'Authenticated' : 'Not authenticated')
                    : (aiStatus?.configured ? 'Key present' : 'Not configured')}
                </span>
                <span className="text-gray-300">
                  Provider: <strong className="text-white">{aiStatus?.provider || 'None'}</strong>
                </span>
                <span className="text-gray-300">
                Model: <strong className="text-white font-mono">{aiStatus?.model || (aiStatus?.provider === 'copilot' ? 'Copilot default' : 'Not selected')}</strong>
                </span>
                {aiStatus?.supported === false && (
                  <span role="alert" className="text-amber-300">
                    Unsupported provider in project configuration.
                  </span>
                )}
                {aiStatus?.message && (
                  <span className={aiStatus?.authenticated ? 'text-emerald-300' : 'text-amber-300'}>
                    {aiStatus.message}
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleAIConfigurationSave} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="project-ai-provider" className="block text-xs text-gray-400 mb-1">Provider</label>
                <select
                  id="project-ai-provider"
                  value={aiForm.provider}
                  onChange={event => setAiForm(current => ({
                    ...current,
                    provider: event.target.value,
                    model: event.target.value === 'groq'
                      ? 'openai/gpt-oss-120b'
                      : event.target.value === 'ollama'
                        ? 'gpt-oss:120b'
                        : event.target.value === 'claude'
                          ? 'claude-3-sonnet-20240229'
                          : event.target.value === 'copilot'
                            ? ''
                            : 'gpt-4o',
                  }))}
                  className="w-full bg-gray-800 border border-white/10 rounded px-2 py-2 text-white text-sm"
                >
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama Cloud</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="copilot">GitHub Copilot</option>
                </select>
              </div>
              <div>
                <label htmlFor="project-ai-model" className="block text-xs text-gray-400 mb-1">Model</label>
                <input
                  id="project-ai-model"
                  type="text"
                  value={aiForm.model}
                  onChange={event => setAiForm(current => ({ ...current, model: event.target.value }))}
                  maxLength={160}
                  required={aiForm.provider !== 'copilot'}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-white text-sm font-mono"
                  placeholder={aiForm.provider === 'groq'
                    ? 'openai/gpt-oss-120b'
                    : aiForm.provider === 'ollama'
                      ? 'gpt-oss:120b'
                    : aiForm.provider === 'claude'
                      ? 'claude-3-sonnet-20240229'
                      : aiForm.provider === 'copilot'
                        ? 'Copilot default (leave blank)'
                        : 'gpt-4o'}
                />
              </div>
              {aiForm.provider === 'copilot' ? (
                <p className="self-end text-xs text-gray-400">
                  Uses the local Copilot SDK runtime and CLI sign-in; no API key is needed. Sign in with <code>copilot</code> then <code>/login</code>. Leave Model blank for Copilot's default.
                </p>
              ) : (
                <div>
                  <label htmlFor="project-ai-key" className="block text-xs text-gray-400 mb-1">API key (not shown after save)</label>
                  <input
                    id="project-ai-key"
                    type="password"
                    value={aiForm.apiKey}
                    onChange={event => setAiForm(current => ({ ...current, apiKey: event.target.value }))}
                    autoComplete="new-password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-white text-sm"
                    placeholder={aiForm.provider === 'ollama' ? 'Enter Ollama Cloud API key' : 'Enter provider API key'}
                  />
                </div>
              )}
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                >
                  {loading ? 'Verifying…' : 'Verify & save project LLM'}
                </button>
              </div>
            </form>
          </div>

          {/* MCP command/environment definitions are separate from the project .env provider above. */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">🤖</span>
                MCP Agent Launch Configurations
              </h2>
              <button
                onClick={() => setShowAddLlmForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition-colors"
              >
                <Plus size={13} /> Add LLM
              </button>
            </div>
            <p className="text-xs text-gray-400">
              These entries define MCP process commands and environments. Dashboard AI generation uses the project provider configured above.
            </p>

            {/* Add LLM Form */}
            {showAddLlmForm && (
              <form onSubmit={handleAddLlm} className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">New LLM</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newLlmData.name}
                      onChange={e => setNewLlmData({ ...newLlmData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                      placeholder="playwright-ai-healer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Command</label>
                    <select
                      value={newLlmData.command}
                      onChange={e => setNewLlmData({ ...newLlmData, command: e.target.value })}
                      className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="node">node</option>
                      <option value="python">python</option>
                      <option value="npx">npx</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Path / Args *</label>
                  <input
                    type="text"
                    value={newLlmData.args}
                    onChange={e => setNewLlmData({ ...newLlmData, args: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                    placeholder="C:/path/to/server.js"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
                    <input
                      type="text"
                      value={newLlmData.env.AI_PROVIDER}
                      onChange={e => setNewLlmData({ ...newLlmData, env: { ...newLlmData.env, AI_PROVIDER: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                      placeholder="openai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={newLlmData.env.OPENAI_API_KEY}
                      onChange={e => setNewLlmData({ ...newLlmData, env: { ...newLlmData.env, OPENAI_API_KEY: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
                    <input
                      type="text"
                      value={newLlmData.env.HEALER_MAX_RETRIES}
                      onChange={e => setNewLlmData({ ...newLlmData, env: { ...newLlmData.env, HEALER_MAX_RETRIES: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Log Directory</label>
                    <input
                      type="text"
                      value={newLlmData.env.HEALER_LOG_DIR}
                      onChange={e => setNewLlmData({ ...newLlmData, env: { ...newLlmData.env, HEALER_LOG_DIR: e.target.value } })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save LLM'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLlmForm(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* LLM List */}
            <div className="space-y-2">
              {llmConfigs.length === 0 && !showAddLlmForm && (
                <p className="text-sm text-gray-500 text-center py-4">No LLMs configured. Click "Add LLM" to get started.</p>
              )}
              {llmConfigs.map(llm => (
                <div key={llm.name} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{llm.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{llm.command} {llm.args}</p>
                    {llm.env?.AI_PROVIDER && (
                      <p className="text-xs text-sky-400 mt-0.5">Provider: {llm.env.AI_PROVIDER}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => { setEditingLlm(llm); setLlmFormData(JSON.parse(JSON.stringify(llm))) }}
                      className="p-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleLlmDelete(llm.name)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LLM Edit Modal */}
      {editingLlm && llmFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-white/10">
              <h2 className="text-base font-bold text-white">Edit: {llmFormData.name}</h2>
              <button onClick={() => { setEditingLlm(null); setLlmFormData(null) }} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input type="text" value={llmFormData.name}
                    onChange={e => setLlmFormData({ ...llmFormData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Command</label>
                  <select value={llmFormData.command}
                    onChange={e => setLlmFormData({ ...llmFormData, command: e.target.value })}
                    className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-white text-sm">
                    <option value="node">node</option>
                    <option value="python">python</option>
                    <option value="npx">npx</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Path / Args</label>
                <input type="text" value={llmFormData.args}
                  onChange={e => setLlmFormData({ ...llmFormData, args: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
                  <input type="text" value={llmFormData.env?.AI_PROVIDER || ''}
                    onChange={e => setLlmFormData({ ...llmFormData, env: { ...llmFormData.env, AI_PROVIDER: e.target.value } })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">API Key</label>
                  <input type="password" value={llmFormData.env?.OPENAI_API_KEY || ''}
                    onChange={e => setLlmFormData({ ...llmFormData, env: { ...llmFormData.env, OPENAI_API_KEY: e.target.value } })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
                  <input type="text" value={llmFormData.env?.HEALER_MAX_RETRIES || ''}
                    onChange={e => setLlmFormData({ ...llmFormData, env: { ...llmFormData.env, HEALER_MAX_RETRIES: e.target.value } })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Log Directory</label>
                  <input type="text" value={llmFormData.env?.HEALER_LOG_DIR || ''}
                    onChange={e => setLlmFormData({ ...llmFormData, env: { ...llmFormData.env, HEALER_LOG_DIR: e.target.value } })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm font-mono" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button onClick={handleLlmUpdate} disabled={loading}
                  className="flex-1 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button onClick={() => { setEditingLlm(null); setLlmFormData(null) }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'environment' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">🌍</span>
            Environment Configuration
          </h2>
          
          <form onSubmit={handleEnvironmentUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Environment URL</label>
              <input
                type="url"
                value={environment.url}
                onChange={e => setEnvironment({ ...environment, url: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
                placeholder="https://your-app.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Browser</label>
              <select
                value={environment.browser}
                onChange={e => setEnvironment({ ...environment, browser: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
              >
                {browserOptions.map(browser => (
                  <option key={browser} value={browser}>
                    {browser.charAt(0).toUpperCase() + browser.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save Environment'}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
