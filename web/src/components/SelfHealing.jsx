import React, { useState, useRef } from 'react'

const API = 'http://localhost:4000'

function LogLine({ line }) {
  const isError = /error|fail|broken/i.test(line)
  const isSuccess = /healed|fixed|success|repaired/i.test(line)
  return (
    <div className={`text-xs font-mono ${isError ? 'text-red-400' : isSuccess ? 'text-emerald-400' : 'text-gray-300'}`}>
      {line}
    </div>
  )
}

export default function SelfHealing() {
  const [url, setUrl]               = useState('')
  const [testFile, setTestFile]     = useState('')
  const [failedStep, setFailedStep] = useState('')
  const [errorMsg, setErrorMsg]     = useState('')
  const [brokenLocator, setBrokenLocator] = useState('')
  const [mode, setMode]             = useState('full') // 'full' | 'locator' | 'popup'
  const [status, setStatus]         = useState('idle') // idle | running | done | error
  const [logs, setLogs]             = useState([])
  const [result, setResult]         = useState(null)
  const logRef = useRef(null)

  const append = (msg) => {
    setLogs(prev => [...prev, msg])
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  const runHeal = async () => {
    if (!url || !testFile) return
    setStatus('running')
    setLogs([])
    setResult(null)
    append(`🔧 Starting ${mode === 'full' ? 'Full Heal' : mode === 'locator' ? 'Locator Repair' : 'Popup Handler'}...`)
    append(`📄 Test: ${testFile}`)
    append(`🔗 URL: ${url}`)
    try {
      const payload = { url, testFilePath: testFile, failedStep: failedStep || '', errorMessage: errorMsg }
      if (mode === 'locator') payload.brokenLocator = brokenLocator

      const endpoint =
        mode === 'full'    ? `${API}/api/self-healing/full-heal`    :
        mode === 'locator' ? `${API}/api/self-healing/heal-locator`  :
                             `${API}/api/self-healing/handle-popups`

      append(`⚡ Calling playwright-ai-healer MCP...`)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Healing failed')

      append(`✅ Healing complete.`)
      if (data.healedLocator)  append(`🎯 Healed Locator: ${data.healedLocator}`)
      if (data.patchApplied)   append(`📝 Patch applied to: ${data.patchApplied}`)
      if (data.popupsHandled)  append(`🚫 Popups dismissed: ${data.popupsHandled}`)
      if (data.summary)        append(`📋 ${data.summary}`)
      setResult(data)
      setStatus('done')
    } catch (err) {
      append(`❌ Error: ${err.message}`)
      setStatus('error')
    }
  }

  const clear = () => { setLogs([]); setResult(null); setStatus('idle') }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xl">
            🩹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Self Healing</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                ● LIVE
              </span>
            </div>
            <p className="text-xs text-gray-400">AI-powered test repair via playwright-ai-healer MCP</p>
          </div>
        </div>

        {/* MCP Badge */}
        <div className="mt-3 flex flex-wrap gap-2">
          {['handle_popups','heal_locator','validate_step','full_heal','get_page_snapshot'].map(tool => (
            <span key={tool} className="px-2 py-0.5 rounded text-[10px] bg-sky-900/40 text-sky-300 border border-sky-700/40 font-mono">
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <div className="dashboard-card">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Healing Mode</p>
        <div className="flex gap-2">
          {[
            { id: 'full',    label: 'Full Heal',      icon: '🩹', desc: 'Popup + step + locator repair' },
            { id: 'locator', label: 'Locator Repair', icon: '🎯', desc: 'Fix a specific broken selector' },
            { id: 'popup',   label: 'Popup Handler',  icon: '🚫', desc: 'Detect & dismiss overlays' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                mode === m.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <div className="text-lg mb-1">{m.icon}</div>
              <div className="text-xs font-semibold">{m.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="dashboard-card space-y-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Configuration</p>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Target URL *</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://your-app.com/page"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Test File Path *</label>
          <input
            value={testFile}
            onChange={e => setTestFile(e.target.value)}
            placeholder="tests/KAN-1/KAN-1-Script.spec.ts"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Failed Step (optional)</label>
          <input
            value={failedStep}
            onChange={e => setFailedStep(e.target.value)}
            placeholder="Leave blank to analyze the whole spec file"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {mode === 'locator' && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Broken Locator</label>
            <input
              value={brokenLocator}
              onChange={e => setBrokenLocator(e.target.value)}
              placeholder="#old-broken-selector"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Error Message (optional)</label>
          <textarea
            value={errorMsg}
            onChange={e => setErrorMsg(e.target.value)}
            placeholder="Paste the test error output here..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={runHeal}
            disabled={status === 'running' || !url || !testFile}
            className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {status === 'running' ? '🔄 Healing...' : '🩹 Run Self Heal'}
          </button>
          <button
            onClick={clear}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log output */}
      {logs.length > 0 && (
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Healing Log</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
              status === 'done'    ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-red-500/20 text-red-400'
            }`}>
              {status === 'running' ? '⟳ Running' : status === 'done' ? '✓ Done' : '✗ Error'}
            </span>
          </div>
          <div
            ref={logRef}
            className="bg-black/40 rounded p-3 h-48 overflow-y-auto space-y-0.5 border border-white/5"
          >
            {logs.map((line, i) => <LogLine key={i} line={line} />)}
          </div>
        </div>
      )}

      {/* Result */}
      {result && status === 'done' && (
        <div className="dashboard-card border border-emerald-500/30">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-2">Healing Result</p>
          <pre className="text-xs text-gray-300 bg-black/30 rounded p-3 overflow-auto max-h-48 border border-white/5">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
