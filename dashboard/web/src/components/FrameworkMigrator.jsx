import React, { useState, useEffect, useRef } from 'react'

export default function FrameworkMigrator() {
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [viewMode, setViewMode] = useState('iframe') // 'landing' | 'iframe' | 'upload'
  const [uploadState, setUploadState] = useState('idle') // 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  const [uploadProgress, setUploadProgress] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [migrationResult, setMigrationResult] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [logs, setLogs] = useState([])
  const fileInputRef = useRef(null)

  const MIGRATOR_URL = 'http://localhost:5174/app/'
  const BACKEND_URL = 'http://localhost:5174'

  // Check if migrator service is running
  useEffect(() => {
    const checkMigratorService = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const response = await fetch(`${BACKEND_URL}/health`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        if (response.ok) {
          setConnectionStatus('connected')
        } else {
          // Try the app route as fallback
          try {
            const r2 = await fetch(MIGRATOR_URL, { mode: 'no-cors' })
            setConnectionStatus('connected')
          } catch {
            setConnectionStatus('disconnected')
          }
        }
      } catch (error) {
        // Try no-cors as fallback to just detect server is up
        try {
          await fetch(`${BACKEND_URL}/`, { mode: 'no-cors' })
          setConnectionStatus('connected')
        } catch {
          setConnectionStatus('disconnected')
        }
      }
    }

    checkMigratorService()
    const interval = setInterval(checkMigratorService, 8000)
    return () => clearInterval(interval)
  }, [])

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }])
  }

  const handleOpenInNewTab = () => {
    window.open(MIGRATOR_URL, '_blank')
  }

  const handleOpenInline = () => {
    setViewMode('iframe')
  }

  const handleShowUpload = () => {
    setViewMode('upload')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file)
      addLog(`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info')
    } else {
      addLog('Please select a valid .zip file', 'error')
    }
  }

  const handleUploadAndMigrate = async () => {
    if (!selectedFile) {
      addLog('No file selected', 'error')
      return
    }

    setUploadState('uploading')
    setUploadProgress('Uploading ZIP file...')
    addLog('Starting upload...', 'info')

    try {
      // Step 1: Upload the ZIP file
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`)
      }

      const uploadData = await uploadRes.json()
      const sid = uploadData.sessionId || uploadData.session_id
      const storedName = uploadData.file?.storedName || uploadData.storedName || uploadData.fileName
      setSessionId(sid)
      addLog(`✅ Upload complete. Session: ${sid}`, 'success')

      // Step 2: Analysis
      setUploadState('processing')
      setUploadProgress('Analyzing framework...')
      addLog('Analyzing Selenium framework...', 'info')

      const analysisRes = await fetch(`${BACKEND_URL}/api/analysis/${sid}`)
      if (analysisRes.ok) {
        const analysis = await analysisRes.json()
        setAnalysisResult(analysis)
        addLog(`✅ Analysis complete: ${analysis.framework || 'Selenium'} detected`, 'success')
      } else {
        addLog('⚠️ Analysis endpoint not available, continuing with migration...', 'warn')
      }

      // Step 3: Migration
      setUploadProgress('Migrating to Playwright...')
      addLog('Starting migration to Playwright TypeScript...', 'info')

      const migrateRes = await fetch(`${BACKEND_URL}/api/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, zipFileName: storedName }),
      })

      if (!migrateRes.ok) {
        throw new Error(`Migration failed: ${migrateRes.status}`)
      }

      const migrateData = await migrateRes.json()
      setMigrationResult(migrateData)
      setUploadState('done')
      setUploadProgress('Migration complete!')
      addLog('✅ Migration completed successfully!', 'success')

    } catch (err) {
      setUploadState('error')
      setUploadProgress(`Error: ${err.message}`)
      addLog(`❌ ${err.message}`, 'error')
    }
  }

  const handleDownload = async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/download/${sessionId}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `playwright-migrated-${sessionId}.zip`
        a.click()
        URL.revokeObjectURL(url)
        addLog('✅ Download started', 'success')
      }
    } catch (err) {
      addLog(`❌ Download failed: ${err.message}`, 'error')
    }
  }

  const resetUpload = () => {
    setUploadState('idle')
    setUploadProgress('')
    setSelectedFile(null)
    setSessionId(null)
    setAnalysisResult(null)
    setMigrationResult(null)
    setLogs([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Iframe view ──
  if (viewMode === 'iframe') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('landing')}
            className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300"
          >
            ← Back
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="px-3 py-1.5 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold"
          >
            Open in New Tab ↗
          </button>
        </div>
        <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: '75vh' }}>
          <iframe
            src={MIGRATOR_URL}
            title="Framework Migrator"
            className="w-full h-full"
            style={{ border: 'none', background: '#0a1628' }}
          />
        </div>
      </div>
    )
  }

  // ── Upload view ──
  if (viewMode === 'upload') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('landing')}
            className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300"
          >
            ← Back
          </button>
          <h3 className="text-lg font-bold text-white">Upload & Migrate</h3>
          <div></div>
        </div>

        {/* Upload Card */}
        <div className="dashboard-card border-2 border-dashed border-sky-500/40 bg-gradient-to-br from-sky-900/10 to-indigo-900/10">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📦</div>
            <h4 className="text-lg font-semibold text-white mb-2">Upload Selenium Project ZIP</h4>
            <p className="text-xs text-gray-400 mb-4">Supports Selenium Java (TestNG, JUnit) and Python (Pytest) projects</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              id="zip-upload"
            />

            {!selectedFile ? (
              <label
                htmlFor="zip-upload"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer transition-all transform hover:scale-105"
              >
                📁 Select ZIP File
              </label>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
                  <span>📄</span>
                  <span>{selectedFile.name}</span>
                  <span className="text-xs text-gray-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleUploadAndMigrate}
                    disabled={uploadState === 'uploading' || uploadState === 'processing'}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {uploadState === 'uploading' ? '⏳ Uploading...' :
                     uploadState === 'processing' ? '⚙️ Processing...' :
                     uploadState === 'done' ? '✅ Done' :
                     '🚀 Upload & Migrate'}
                  </button>
                  <button
                    onClick={resetUpload}
                    className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {uploadProgress && (
              <div className={`mt-4 text-sm font-medium ${
                uploadState === 'error' ? 'text-red-400' :
                uploadState === 'done' ? 'text-green-400' :
                'text-sky-400'
              }`}>
                {uploadProgress}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <div className="dashboard-card">
            <h4 className="text-sm font-semibold text-white mb-3">📊 Analysis Result</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {analysisResult.framework && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-xs text-gray-500">Framework</div>
                  <div className="text-sm text-white font-medium">{analysisResult.framework}</div>
                </div>
              )}
              {analysisResult.language && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-xs text-gray-500">Language</div>
                  <div className="text-sm text-white font-medium">{analysisResult.language}</div>
                </div>
              )}
              {analysisResult.testCount != null && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-xs text-gray-500">Tests Found</div>
                  <div className="text-sm text-white font-medium">{analysisResult.testCount}</div>
                </div>
              )}
              {analysisResult.complexity && (
                <div className="bg-white/5 rounded p-2">
                  <div className="text-xs text-gray-500">Complexity</div>
                  <div className="text-sm text-white font-medium">{analysisResult.complexity}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Download */}
        {uploadState === 'done' && sessionId && (
          <div className="dashboard-card border border-green-700/50 bg-green-900/10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-green-300">✅ Migration Complete</h4>
                <p className="text-xs text-gray-400 mt-1">Your Playwright TypeScript project is ready to download</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm"
              >
                ⬇️ Download ZIP
              </button>
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="dashboard-card">
            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Migration Logs</h4>
            <div className="bg-black/40 rounded-lg p-3 max-h-48 overflow-y-auto border border-white/5 font-mono">
              {logs.map((log, i) => (
                <div key={i} className={`text-xs mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warn' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  <span className="text-gray-600 mr-2">[{log.time}]</span>{log.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Landing view ──
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">🔄 Framework Migrator</h2>
            <p className="text-sm text-gray-400">Convert Selenium to Playwright TypeScript</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            connectionStatus === 'connected'
              ? 'bg-green-900/30 border border-green-700 text-green-300'
              : connectionStatus === 'disconnected'
              ? 'bg-red-900/30 border border-red-700 text-red-300'
              : 'bg-yellow-900/30 border border-yellow-700 text-yellow-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'disconnected' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}></span>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'disconnected' ? 'Service Offline' :
             'Checking...'}
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Open in new tab */}
        <div className="dashboard-card border-2 border-sky-500/30 bg-gradient-to-br from-sky-900/20 to-indigo-900/20 cursor-pointer hover:border-sky-400/50 transition-all"
             onClick={handleOpenInNewTab}>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-bold text-white mb-2">Open in New Tab</h3>
            <p className="text-xs text-gray-400 mb-4">Launch the full Migrator UI at localhost:5174</p>
            <span className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold text-sm inline-block">
              Launch ↗
            </span>
          </div>
        </div>

        {/* Upload ZIP inline */}
        <div className="dashboard-card border-2 border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20 cursor-pointer hover:border-green-400/50 transition-all"
             onClick={handleShowUpload}>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-bold text-white mb-2">Upload ZIP Here</h3>
            <p className="text-xs text-gray-400 mb-4">Upload Selenium ZIP and migrate directly</p>
            <span className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm inline-block">
              Upload & Migrate
            </span>
          </div>
        </div>
      </div>

      {/* Embed inline option */}
      <div className="dashboard-card border border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-pink-900/10 cursor-pointer hover:border-purple-400/50 transition-all"
           onClick={handleOpenInline}>
        <div className="flex items-center gap-4 py-2">
          <div className="text-3xl">🖥️</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">Open Inline (Embedded)</h4>
            <p className="text-xs text-gray-400">View the Migrator UI embedded within this panel</p>
          </div>
          <span className="px-3 py-1.5 rounded bg-purple-600 text-white font-semibold text-xs">Open</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card">
          <div className="text-3xl mb-3">📋</div>
          <h4 className="text-sm font-semibold text-white mb-2">Supported Frameworks</h4>
          <p className="text-xs text-gray-400">Selenium Java, Python, TestNG, JUnit, Pytest</p>
        </div>
        <div className="dashboard-card">
          <div className="text-3xl mb-3">✨</div>
          <h4 className="text-sm font-semibold text-white mb-2">Output Format</h4>
          <p className="text-xs text-gray-400">TypeScript + Playwright + Page Objects</p>
        </div>
        <div className="dashboard-card">
          <div className="text-3xl mb-3">⚡</div>
          <h4 className="text-sm font-semibold text-white mb-2">Features</h4>
          <p className="text-xs text-gray-400">Zip upload, pattern detection, auto download</p>
        </div>
      </div>
    </div>
  )
}
