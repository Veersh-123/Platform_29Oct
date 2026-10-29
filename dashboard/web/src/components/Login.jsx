import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState('credentials') // credentials, toolSelect
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testTool, setTestTool] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tool-specific credentials — pre-populated from server .env
  const [toolUrl, setToolUrl] = useState('')
  const [toolUsername, setToolUsername] = useState('')
  const [toolPassword, setToolPassword] = useState('')
  const [validateLoading, setValidateLoading] = useState(false)
  const [validateError, setValidateError] = useState('')

  // Load existing env config from server so the user doesn't have to retype known values
  useEffect(() => {
    axios.get('/api/env/read').then(r => {
      const d = r.data || {}
      if (d.JIRA_BASE_URL)  setToolUrl(d.JIRA_BASE_URL)
      if (d.JIRA_EMAIL)     setToolUsername(d.JIRA_EMAIL)
      // JIRA_API_TOKEN is masked as '***set***' — leave password blank so user
      // confirms it, but pre-fill URL + email to save typing
    }).catch(() => {/* ignore — server may not be running yet */})
  }, [])

  function handleCredentialsSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }

    // Move to tool selection step
    setStep('toolSelect')
  }

  async function handleToolSelection(tool) {
    setTestTool(tool)
    
    if (tool === 'NA') {
      // Skip tool configuration, login directly
      handleFinalLogin({ tool: 'NA', credentials: { username, password } })
    }
    // For Jira: URL + email are already pre-populated from useEffect.
    // For Azure: clear Jira-specific fields so user enters ADO org URL
    if (tool === 'AZURE') {
      setToolUrl(prev => prev.includes('atlassian') ? '' : prev)
      setToolUsername('')
      setToolPassword('')
    }
  }

  async function validateToolCredentials() {
    setValidateError('')
    setValidateLoading(true)

    try {
      if (testTool === 'JIRA') {
        // /api/jira/validate validates AND persists credentials to .env + process.env
        const response = await axios.post('/api/jira/validate', {
          url: toolUrl,
          username: toolUsername,
          password: toolPassword
        })
        if (response.data?.ok) {
          handleFinalLogin({
            tool: 'JIRA',
            credentials: { username, password, toolUrl, toolUsername, toolPassword }
          })
        } else {
          setValidateError(response.data?.error || 'Jira validation failed')
        }
      } else if (testTool === 'AZURE') {
        // /api/ado/validate validates AND persists credentials to .env + process.env
        const response = await axios.post('/api/ado/validate', {
          url: toolUrl,
          username: toolUsername,
          password: toolPassword
        })
        if (response.data?.ok) {
          handleFinalLogin({
            tool: 'AZURE',
            credentials: { username, password, toolUrl, toolUsername, toolPassword }
          })
        } else {
          setValidateError(response.data?.error || 'Azure DevOps validation failed')
        }
      }
    } catch (err) {
      setValidateError(err.response?.data?.error || `Failed to validate ${testTool} credentials`)
    } finally {
      setValidateLoading(false)
    }
  }

  function handleFinalLogin(loginData) {
    // Store credentials and selected tool in sessionStorage or pass to parent
    sessionStorage.setItem('selectedTestTool', loginData.tool)
    sessionStorage.setItem('userCredentials', JSON.stringify(loginData.credentials))
    
    // Call parent callback
    if (onLoginSuccess) {
      onLoginSuccess(loginData)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f4b] to-[#0f1b35] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10">
        {/* Animated Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 mb-6 shadow-2xl shadow-sky-500/30 relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></div>
            <span className="text-white font-bold text-4xl relative z-10">H</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Hexaware</h1>
          <p className="text-base text-gray-400 font-light">Test Orchestration Platform</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500/60"></div>
            <span className="text-xs text-gray-500 uppercase tracking-widest">Enterprise Testing</span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60"></div>
          </div>
        </div>

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5 shadow-2xl hover:border-white/20 transition-all duration-300">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-sm text-gray-400">Enter your credentials to get started</p>
            </div>
            
            {error && (
              <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">🔐</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-sky-500/30 mt-8 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Continue
                    <span>→</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-xs text-gray-500 text-center pt-2">
              Secure login with enterprise credentials
            </div>
          </form>
        )}

        {/* Step 2: Tool Selection */}
        {step === 'toolSelect' && !testTool && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="space-y-2 mb-7">
                <h2 className="text-2xl font-bold text-white">Select Test Management Tool</h2>
                <p className="text-sm text-gray-400">Choose where your test requirements are stored</p>
              </div>

              <div className="grid gap-3">
                {/* Jira Option */}
                <button
                  onClick={() => handleToolSelection('JIRA')}
                  className="group relative p-5 rounded-xl border border-white/10 hover:border-purple-500/50 bg-white/5 hover:bg-purple-500/10 transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-purple-600/0 group-hover:from-purple-600/10 group-hover:to-purple-600/5 transition-all duration-300"></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">🟣</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">Jira</h3>
                      <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors mt-1">Connect to your Jira instance for requirement management</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-purple-400 transition-colors">→</span>
                  </div>
                </button>

                {/* Azure Option */}
                <button
                  onClick={() => handleToolSelection('AZURE')}
                  className="group relative p-5 rounded-xl border border-white/10 hover:border-blue-500/50 bg-white/5 hover:bg-blue-500/10 transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/10 group-hover:to-blue-600/5 transition-all duration-300"></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">🔵</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">Azure DevOps</h3>
                      <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors mt-1">Connect to your Azure DevOps instance for work items</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-blue-400 transition-colors">→</span>
                  </div>
                </button>

                {/* Local Option */}
                <button
                  onClick={() => handleToolSelection('NA')}
                  className="group relative p-5 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/10 transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 to-emerald-600/0 group-hover:from-emerald-600/10 group-hover:to-emerald-600/5 transition-all duration-300"></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">⊗</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">Not Applicable</h3>
                      <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors mt-1">Skip tool configuration and use local storage</p>
                    </div>
                    <span className="text-gray-600 group-hover:text-emerald-400 transition-colors">→</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('credentials')}
              className="w-full py-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-300"
            >
              ← Back to Login
            </button>
          </div>
        )}

        {/* Step 3: Tool Credentials */}
        {step === 'toolSelect' && testTool && testTool !== 'NA' && (
          <form
            onSubmit={e => { e.preventDefault(); validateToolCredentials() }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-1 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{testTool === 'JIRA' ? '🟣' : '🔵'}</span>
                <h2 className="text-2xl font-bold text-white">{testTool === 'JIRA' ? 'Jira' : 'Azure DevOps'} Credentials</h2>
              </div>
              <p className="text-sm text-gray-400">Enter your credentials to validate access</p>
            </div>

            {validateError && (
              <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                <span>{validateError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200">
                {testTool === 'JIRA' ? 'Jira' : 'Azure DevOps'} URL
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">🔗</span>
                <input
                  type="url"
                  value={toolUrl}
                  onChange={e => setToolUrl(e.target.value)}
                  placeholder={testTool === 'JIRA' ? 'https://your-jira.atlassian.net' : 'https://dev.azure.com/yourorg'}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                <input
                  type="text"
                  value={toolUsername}
                  onChange={e => setToolUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200">Password or API Token</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">🔐</span>
                <input
                  type="password"
                  value={toolPassword}
                  onChange={e => setToolPassword(e.target.value)}
                  placeholder="Enter your password or API token"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={validateLoading || !toolUrl || !toolUsername || !toolPassword}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-sky-500/30 mt-8 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                {validateLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Validating...
                  </>
                ) : (
                  <>
                    Login to {testTool === 'JIRA' ? 'Jira' : 'Azure DevOps'}
                    <span>→</span>
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTestTool('')}
              className="w-full py-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-300"
            >
              ← Back to Tool Selection
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            🔒 Your credentials are securely processed and encrypted
          </p>
        </div>
      </div>
    </div>
  )
}
