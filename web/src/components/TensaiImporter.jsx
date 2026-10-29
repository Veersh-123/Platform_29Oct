import React, { useState, useRef } from 'react'

export default function TensaiImporter() {
  const [filePath, setFilePath] = useState('')
  const [pythonSource, setPythonSource] = useState('')
  const [convertedTS, setConvertedTS] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // idle | converting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [mode, setMode] = useState('path') // 'path' | 'upload' | 'paste'
  const fileInputRef = useRef(null)

  const API_URL = 'http://localhost:4000'
  const TENSAI_APP_URL = 'http://localhost:8765'

  const handleConvertFromPath = async () => {
    if (!filePath.trim()) { setErrorMsg('Please enter a file path'); return }
    setStatus('converting')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/tensai/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Conversion failed')
      setConvertedTS(data.typescript)
      setFileName(data.fileName)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.py')) { setErrorMsg('Please select a .py file'); return }
    setStatus('converting')
    setErrorMsg('')
    try {
      const text = await file.text()
      const res = await fetch(`${API_URL}/api/tensai/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pythonSource: text, filePath: file.name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Conversion failed')
      setConvertedTS(data.typescript)
      setFileName(data.fileName)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleConvertFromPaste = async () => {
    if (!pythonSource.trim()) { setErrorMsg('Please paste Python source code'); return }
    setStatus('converting')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/tensai/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pythonSource })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Conversion failed')
      setConvertedTS(data.typescript)
      setFileName(data.fileName)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleDownload = () => {
    if (!convertedTS) return
    const blob = new Blob([convertedTS], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'converted.spec.ts'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFilePath('')
    setPythonSource('')
    setConvertedTS('')
    setFileName('')
    setStatus('idle')
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">📥 Tensai-Script Importer</h2>
            <p className="text-sm text-gray-400">Convert Python Playwright scripts to TypeScript specs</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-green-900/30 border border-green-700 text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Ready
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2">
        {[
          { id: 'path', label: '📁 File Path', desc: 'Enter path to .py file' },
          { id: 'upload', label: '📤 Upload File', desc: 'Upload .py file' },
          { id: 'paste', label: '📋 Paste Code', desc: 'Paste Python code' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setStatus('idle'); setErrorMsg('') }}
            className={`flex-1 p-3 rounded-lg border transition-all text-left ${
              mode === m.id
                ? 'border-sky-500 bg-sky-900/20 text-white'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
            }`}
          >
            <div className="text-sm font-semibold">{m.label}</div>
            <div className="text-xs mt-0.5 opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="dashboard-card">
        {mode === 'path' && (
          <div className="space-y-3">
            <label className="text-sm text-gray-300 font-medium">Python Script File Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                placeholder="C:/path/to/your/script.py"
                className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-gray-500 text-sm focus:border-sky-500 focus:outline-none"
              />
              <button
                onClick={handleConvertFromPath}
                disabled={status === 'converting'}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
              >
                {status === 'converting' ? '⏳ Converting...' : '🔄 Convert'}
              </button>
            </div>
            <p className="text-xs text-gray-500">Enter the absolute path to a Python Playwright (.py) script on your machine</p>
          </div>
        )}

        {mode === 'upload' && (
          <div className="space-y-3">
            <label className="text-sm text-gray-300 font-medium">Upload Python Script</label>
            <div className="border-2 border-dashed border-sky-500/40 rounded-lg p-6 text-center bg-sky-900/5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".py"
                onChange={handleFileUpload}
                className="hidden"
                id="tensai-upload"
              />
              <label
                htmlFor="tensai-upload"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer transition-all transform hover:scale-105"
              >
                📁 Choose .py File
              </label>
              <p className="text-xs text-gray-500 mt-3">Select a Python Playwright script to convert</p>
            </div>
          </div>
        )}

        {mode === 'paste' && (
          <div className="space-y-3">
            <label className="text-sm text-gray-300 font-medium">Paste Python Source Code</label>
            <textarea
              value={pythonSource}
              onChange={e => setPythonSource(e.target.value)}
              placeholder="Paste your Python Playwright script here..."
              rows={10}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-gray-500 text-sm font-mono focus:border-sky-500 focus:outline-none resize-y"
            />
            <button
              onClick={handleConvertFromPaste}
              disabled={status === 'converting'}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
            >
              {status === 'converting' ? '⏳ Converting...' : '🔄 Convert to TypeScript'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="dashboard-card border border-red-700/50 bg-red-900/10">
          <p className="text-sm text-red-400">❌ {errorMsg}</p>
        </div>
      )}

      {/* Result */}
      {status === 'done' && convertedTS && (
        <div className="space-y-3">
          <div className="dashboard-card border border-green-700/50 bg-green-900/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-green-300">✅ Conversion Complete</h4>
                <p className="text-xs text-gray-400 mt-0.5">Output: {fileName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all"
                >
                  ⬇️ Download .ts
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="dashboard-card">
            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Generated TypeScript</h4>
            <div className="bg-black/50 rounded-lg p-4 max-h-80 overflow-y-auto border border-white/5">
              <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">{convertedTS}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      {status === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="dashboard-card">
            <div className="text-3xl mb-3">🐍</div>
            <h4 className="text-sm font-semibold text-white mb-2">Python Input</h4>
            <p className="text-xs text-gray-400">Accepts Tensai/Python Playwright scripts</p>
          </div>
          <div className="dashboard-card">
            <div className="text-3xl mb-3">📝</div>
            <h4 className="text-sm font-semibold text-white mb-2">TypeScript Output</h4>
            <p className="text-xs text-gray-400">Generates Playwright Test TypeScript specs</p>
          </div>
          <div className="dashboard-card">
            <div className="text-3xl mb-3">⬇️</div>
            <h4 className="text-sm font-semibold text-white mb-2">Download Ready</h4>
            <p className="text-xs text-gray-400">One-click download of converted .spec.ts file</p>
          </div>
        </div>
      )}
    </div>
  )
}
