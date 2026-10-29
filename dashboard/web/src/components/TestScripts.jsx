import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const FOLDERS = [
  { name: 'Locators', path: 'Locators', icon: '📍' },
  { name: 'Pages', path: 'pages', icon: '📄' },
  { name: 'Tests', path: 'tests', icon: '🧪' },
  { name: 'Utils', path: 'utils', icon: '🛠️' },
  { name: 'Test Data', path: 'Test_Data', icon: '📊' },
]

/**
 * POM Generation Order (per instruction.md and Orchestrator-Agent.md):
 * 1. Locators (no dependencies)
 * 2. Page Objects (imports from locators)
 * 3. Test Data (standalone)
 * 4. Test Scripts (imports from page objects + test data)
 */
const GENERATION_ORDER = [
  { step: 1, label: 'Locators', icon: '📍', description: 'Centralized CSS/aria selectors' },
  { step: 2, label: 'Page Objects', icon: '📄', description: 'POM classes importing locators' },
  { step: 3, label: 'Test Data', icon: '📊', description: 'JSON test vectors' },
  { step: 4, label: 'Test Scripts', icon: '🧪', description: 'Playwright spec importing pages + data' },
]

export default function TestScripts() {
  const [selectedFolder, setSelectedFolder] = useState('Locators')
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Generation state
  const [showGenerator, setShowGenerator] = useState(false)
  const [issueKey, setIssueKey] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genLogs, setGenLogs] = useState([])
  const [genResult, setGenResult] = useState(null)
  const [genError, setGenError] = useState(null)
  const [availableSpecs, setAvailableSpecs] = useState([])
  const [loadingSpecs, setLoadingSpecs] = useState(false)

  // Feature file generation state
  const [currentFeatureFile, setCurrentFeatureFile] = useState(null)
  const [featureIssueKey, setFeatureIssueKey] = useState('')

  // Load files for selected folder
  useEffect(() => {
    loadFolder()
  }, [selectedFolder])

  // Load available spec files for the story selector
  useEffect(() => {
    if (showGenerator) loadAvailableSpecs()
  }, [showGenerator])

  const loadAvailableSpecs = async () => {
    setLoadingSpecs(true)
    try {
      const resp = await axios.get('/api/structure')
      const allFiles = resp.data.files || []
      const specs = allFiles
        .filter(f => f.startsWith('specs/') && f.endsWith('-TEST-CASES.md'))
        .map(f => {
          const match = f.match(/specs\/(.+)-TEST-CASES\.md$/)
          return match ? match[1] : null
        })
        .filter(Boolean)
      setAvailableSpecs(specs)
    } catch {
      setAvailableSpecs([])
    } finally {
      setLoadingSpecs(false)
    }
  }

  const loadFolder = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/structure')
      const allFiles = response.data.files || []
      const filtered = allFiles.filter(f => f.startsWith(selectedFolder + '/')).sort()
      setFiles(filtered)
      setSelectedFile(null)
      setFileContent('')
    } catch (err) {
      setError('Failed to load files: ' + err.message)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const loadFileContent = async (filePath) => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`/api/file-content?path=${encodeURIComponent(filePath)}`)
      setFileContent(response.data.content || '')
      setSelectedFile(filePath)
      
      // Detect if this is a feature file and extract issue key
      if (filePath.endsWith('.feature')) {
        setCurrentFeatureFile(filePath)
        // Extract issue key from filename (e.g., "KAN-3.feature" -> "KAN-3")
        const filename = filePath.split('/').pop()
        const match = filename.match(/^([A-Z]+-\d+)\.feature$/)
        if (match) {
          setFeatureIssueKey(match[1])
        }
      } else {
        setCurrentFeatureFile(null)
        setFeatureIssueKey('')
      }
    } catch {
      try {
        const fileResponse = await axios.post('/api/read-file', { path: filePath })
        setFileContent(fileResponse.data.content || '')
        setSelectedFile(filePath)
        
        // Same feature file detection for fallback method
        if (filePath.endsWith('.feature')) {
          setCurrentFeatureFile(filePath)
          const filename = filePath.split('/').pop()
          const match = filename.match(/^([A-Z]+-\d+)\.feature$/)
          if (match) {
            setFeatureIssueKey(match[1])
          }
        } else {
          setCurrentFeatureFile(null)
          setFeatureIssueKey('')
        }
      } catch (e) {
        setError('Failed to load file: ' + e.message)
        setFileContent('')
        setCurrentFeatureFile(null)
        setFeatureIssueKey('')
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate Test Scripts following the Orchestrator-Agent workflow:
   * 1. Read saved test cases from specs/[STORY_ID]-TEST-CASES.md
   * 2. Call /api/generate-test-automation (SSE stream)
   * 3. Backend generates: Locators → Page Objects → Test Data → Test Scripts
   * 4. All files follow instruction.md POM guidelines
   */
  const handleGenerateScripts = useCallback(async () => {
    const key = issueKey.trim().toUpperCase()
    if (!key) return

    setGenerating(true)
    setGenLogs([])
    setGenResult(null)
    setGenError(null)

    const addLog = (text, cls = '') => {
      setGenLogs(prev => [...prev, { text, cls, ts: Date.now() }])
    }

    try {
      // Step 1: Load test cases from saved specs file
      addLog(`📄 Loading test cases from specs/${key}-TEST-CASES.md...`, 'info')
      let testCases = { positive: [], negative: [], edge: [] }
      let summary = key

      try {
        const specRes = await axios.get(`/api/specs/file?fileName=${key}-TEST-CASES.md`)
        if (specRes.data?.content) {
          // Parse test cases from the markdown file
          const parsed = parseTestCasesFromMarkdown(specRes.data.content)
          testCases = parsed
          addLog(`✅ Loaded ${(parsed.positive?.length || 0) + (parsed.negative?.length || 0) + (parsed.edge?.length || 0)} test case(s) from specs file`, 'ok')
        }
      } catch {
        addLog('⚠️ TEST-CASES.md not found. Will generate with default structure...', 'warn')
      }

      // Step 2: Fetch issue summary from Jira (optional)
      try {
        const issueResp = await axios.get(`/api/jira/issue/${key}`)
        if (issueResp.data?.summary) {
          summary = issueResp.data.summary
          addLog(`✅ Fetched issue summary: ${summary}`, 'ok')
        }
      } catch {
        addLog('⚠️ Could not fetch Jira issue — using issue key as summary', 'warn')
      }

      // Step 3: Call /api/generate-test-automation with SSE streaming
      addLog('🚀 Starting POM-based test automation generation...', 'info')
      addLog('📐 Following instruction.md: Locators → Pages → Test Data → Scripts', 'info')

      const response = await fetch('/api/generate-test-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey: key, testCases, summary }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneData = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const dl = part.split('\n').find(l => l.startsWith('data:'))
          if (!dl) continue
          try {
            const msg = JSON.parse(dl.slice(5))
            if (msg.type === 'log') {
              const cls = /✅|generated|written|success/i.test(msg.data) ? 'ok'
                : /❌|error|failed/i.test(msg.data) ? 'err'
                : /⚙|generating|fetching/i.test(msg.data) ? 'info'
                : /⚠|warning/i.test(msg.data) ? 'warn' : ''
              addLog(msg.data, cls)
            } else if (msg.type === 'done') {
              doneData = msg.data
            } else if (msg.type === 'error') {
              addLog('❌ ' + msg.data, 'err')
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      if (doneData && !doneData.error) {
        setGenResult(doneData)
        addLog('', '')
        addLog('✅ Test automation generation complete!', 'ok')
        addLog('📁 Files generated following POM structure (instruction.md):', 'ok')
        addLog(`   1. Locators → centralized selectors`, 'ok')
        addLog(`   2. Page Objects → reusable UI interactions`, 'ok')
        addLog(`   3. Test Data → JSON test vectors`, 'ok')
        addLog(`   4. Test Scripts → Playwright spec with imports`, 'ok')
        // Refresh file list
        loadFolder()
      } else {
        setGenError(doneData?.error || 'Generation failed')
        addLog('❌ Generation failed: ' + (doneData?.error || 'Unknown error'), 'err')
      }
    } catch (err) {
      setGenError(err.message)
      addLog('❌ ' + err.message, 'err')
    } finally {
      setGenerating(false)
    }
  }, [issueKey])

  /**
   * Generate Test Scripts FROM Feature File
   * Parses the currently viewed feature file and generates test automation from scenarios
   */
  const handleGenerateScriptsFromFeature = useCallback(async () => {
    if (!currentFeatureFile || !featureIssueKey) {
      setGenError('No feature file selected')
      return
    }

    setGenerating(true)
    setGenLogs([])
    setGenResult(null)
    setGenError(null)

    const addLog = (text, cls = '') => {
      setGenLogs(prev => [...prev, { text, cls, ts: Date.now() }])
    }

    try {
      const key = featureIssueKey.toUpperCase()
      addLog(`📄 Parsing feature file: ${currentFeatureFile}...`, 'info')

      // Parse feature file to extract test cases
      const parseRes = await axios.post('/api/parse-feature-file', {
        filePath: currentFeatureFile
      })

      if (!parseRes.data.ok || !parseRes.data.testCases) {
        throw new Error('Failed to parse feature file scenarios')
      }

      const parsedTestCases = parseRes.data.testCases
      addLog(`✅ Parsed ${parsedTestCases.length} scenario(s) from feature file`, 'ok')

      // Organize test cases by type
      const testCases = {
        positive: parsedTestCases.filter(tc => tc.type === 'Positive'),
        negative: parsedTestCases.filter(tc => tc.type === 'Negative'),
        edge: parsedTestCases.filter(tc => tc.type === 'Edge')
      }

      addLog(`📊 Test cases: ${testCases.positive.length} positive, ${testCases.negative.length} negative, ${testCases.edge.length} edge`, 'info')

      // Extract feature summary from feature file
      const featureMatch = fileContent.match(/Feature:\s*([^\n]+)/)
      const summary = featureMatch ? featureMatch[1].trim() : key

      addLog('', '')
      addLog('🚀 Starting POM-based test automation generation...', 'info')
      addLog('📐 Following instruction.md: Locators → Pages → Test Data → Scripts', 'info')

      // Call generate-test-automation with parsed scenarios
      const response = await fetch('/api/generate-test-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey: key, testCases, summary }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneData = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const dl = part.split('\n').find(l => l.startsWith('data:'))
          if (!dl) continue
          try {
            const msg = JSON.parse(dl.slice(5))
            if (msg.type === 'log') {
              const cls = /✅|generated|written|success/i.test(msg.data) ? 'ok'
                : /❌|error|failed/i.test(msg.data) ? 'err'
                : /⚙|generating|fetching/i.test(msg.data) ? 'info'
                : /⚠|warning/i.test(msg.data) ? 'warn' : ''
              addLog(msg.data, cls)
            } else if (msg.type === 'done') {
              doneData = msg.data
            } else if (msg.type === 'error') {
              addLog('❌ ' + msg.data, 'err')
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      if (doneData && !doneData.error) {
        setGenResult(doneData)
        addLog('', '')
        addLog('✅ Test automation generation from feature file complete!', 'ok')
        addLog('📁 Files generated following POM structure (instruction.md):', 'ok')
        addLog(`   1. Locators → centralized selectors`, 'ok')
        addLog(`   2. Page Objects → reusable UI interactions`, 'ok')
        addLog(`   3. Test Data → JSON test vectors`, 'ok')
        addLog(`   4. Test Scripts → Playwright spec with imports`, 'ok')
        // Refresh file list
        loadFolder()
      } else {
        setGenError(doneData?.error || 'Generation failed')
        addLog('❌ Generation failed: ' + (doneData?.error || 'Unknown error'), 'err')
      }
    } catch (err) {
      setGenError(err.message)
      addLog('❌ ' + err.message, 'err')
    } finally {
      setGenerating(false)
    }
  }, [currentFeatureFile, featureIssueKey, fileContent])

  /**
   * Generate Test Scripts following the Orchestrator-Agent workflow:
   * 1. Read saved test cases from specs/[STORY_ID]-TEST-CASES.md
   * 2. Call /api/generate-test-automation (SSE stream)
   * 3. Backend generates: Locators → Page Objects → Test Data → Test Scripts
   * 4. All files follow instruction.md POM guidelines
   */
  const handleGenerateScriptsOld = useCallback(async () => {
    const key = issueKey.trim().toUpperCase()
    if (!key) return

    setGenerating(true)
    setGenLogs([])
    setGenResult(null)
    setGenError(null)

    const addLog = (text, cls = '') => {
      setGenLogs(prev => [...prev, { text, cls, ts: Date.now() }])
    }

    try {
      // Step 1: Load test cases from saved specs file
      addLog(`📄 Loading test cases from specs/${key}-TEST-CASES.md...`, 'info')
      let testCases = { positive: [], negative: [], edge: [] }
      let summary = key

      try {
        const specRes = await axios.get(`/api/specs/file?fileName=${key}-TEST-CASES.md`)
        if (specRes.data?.content) {
          // Parse test cases from the markdown file
          const parsed = parseTestCasesFromMarkdown(specRes.data.content)
          testCases = parsed
          addLog(`✅ Loaded ${(parsed.positive?.length || 0) + (parsed.negative?.length || 0) + (parsed.edge?.length || 0)} test case(s) from specs file`, 'ok')
        }
      } catch {
        addLog('⚠️ TEST-CASES.md not found. Will generate with default structure...', 'warn')
      }

      // Step 2: Fetch issue summary from Jira (optional)
      try {
        const issueResp = await axios.get(`/api/jira/issue/${key}`)
        if (issueResp.data?.summary) {
          summary = issueResp.data.summary
          addLog(`✅ Fetched issue summary: ${summary}`, 'ok')
        }
      } catch {
        addLog('⚠️ Could not fetch Jira issue — using issue key as summary', 'warn')
      }

      // Step 3: Call /api/generate-test-automation with SSE streaming
      addLog('🚀 Starting POM-based test automation generation...', 'info')
      addLog('📐 Following instruction.md: Locators → Pages → Test Data → Scripts', 'info')

      const response = await fetch('/api/generate-test-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey: key, testCases, summary }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneData = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const dl = part.split('\n').find(l => l.startsWith('data:'))
          if (!dl) continue
          try {
            const msg = JSON.parse(dl.slice(5))
            if (msg.type === 'log') {
              const cls = /✅|generated|written|success/i.test(msg.data) ? 'ok'
                : /❌|error|failed/i.test(msg.data) ? 'err'
                : /⚙|generating|fetching/i.test(msg.data) ? 'info'
                : /⚠|warning/i.test(msg.data) ? 'warn' : ''
              addLog(msg.data, cls)
            } else if (msg.type === 'done') {
              doneData = msg.data
            } else if (msg.type === 'error') {
              addLog('❌ ' + msg.data, 'err')
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      if (doneData && !doneData.error) {
        setGenResult(doneData)
        addLog('', '')
        addLog('✅ Test automation generation complete!', 'ok')
        addLog('📁 Files generated following POM structure (instruction.md):', 'ok')
        addLog(`   1. Locators → centralized selectors`, 'ok')
        addLog(`   2. Page Objects → reusable UI interactions`, 'ok')
        addLog(`   3. Test Data → JSON test vectors`, 'ok')
        addLog(`   4. Test Scripts → Playwright spec with imports`, 'ok')
        // Refresh file list
        loadFolder()
      } else {
        setGenError(doneData?.error || 'Generation failed')
        addLog('❌ Generation failed: ' + (doneData?.error || 'Unknown error'), 'err')
      }
    } catch (err) {
      setGenError(err.message)
      addLog('❌ ' + err.message, 'err')
    } finally {
      setGenerating(false)
    }
  }, [issueKey])

  return (
    <div className="space-y-6">
      {/* Title + Generate Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Test Scripts</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate and manage POM-based test automation code
          </p>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            showGenerator
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {showGenerator ? '✕ Close' : '⚡ Generate Test Scripts'}
        </button>
      </div>

      {/* Generation Panel */}
      {showGenerator && (
        <div className="bg-gray-800/50 border border-sky-700/30 rounded-lg overflow-hidden">
          {/* Generation Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-sky-900/20">
            <h3 className="text-sm font-semibold text-sky-300 flex items-center gap-2">
              <span>⚡</span> Generate Test Scripts (POM Workflow)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Follows instruction.md &amp; Orchestrator-Agent process: reads saved test cases, then generates Locators → Page Objects → Test Data → Test Scripts
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* POM Order Indicator */}
            <div className="flex items-center gap-1 flex-wrap">
              {GENERATION_ORDER.map((step, i) => (
                <div key={step.step} className="flex items-center gap-1">
                  <span className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-gray-300" title={step.description}>
                    {step.icon} {step.label}
                  </span>
                  {i < GENERATION_ORDER.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                </div>
              ))}
            </div>

            {/* Story Selector */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-400 mb-1">Story / Issue Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={issueKey}
                    onChange={e => setIssueKey(e.target.value)}
                    placeholder="e.g. VB-3"
                    className="flex-1 px-3 py-2 text-sm bg-gray-900 border border-white/10 rounded text-gray-200 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                    disabled={generating}
                  />
                  {availableSpecs.length > 0 && (
                    <select
                      value={issueKey}
                      onChange={e => setIssueKey(e.target.value)}
                      className="px-3 py-2 text-sm bg-gray-900 border border-white/10 rounded text-gray-200 focus:border-sky-500 focus:outline-none"
                      disabled={generating}
                    >
                      <option value="">— Saved Specs —</option>
                      {availableSpecs.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
                {loadingSpecs && <span className="text-xs text-gray-500 mt-1">Loading saved specs…</span>}
              </div>

              <button
                onClick={handleGenerateScriptsOld}
                disabled={generating || !issueKey.trim()}
                className="px-5 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? '⏳ Generating…' : '⚡ Generate'}
              </button>
            </div>

            {/* Generation Log */}
            {genLogs.length > 0 && (
              <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-black/30 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Generation Log</span>
                  {genResult && (
                    <span className="text-xs text-emerald-400">✅ Complete</span>
                  )}
                  {genError && (
                    <span className="text-xs text-red-400">❌ Failed</span>
                  )}
                </div>
                <div className="p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
                  {genLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`${
                        log.cls === 'ok' ? 'text-emerald-400'
                          : log.cls === 'err' ? 'text-red-400'
                          : log.cls === 'warn' ? 'text-amber-400'
                          : log.cls === 'info' ? 'text-sky-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-generation next steps */}
            {genResult && (
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4 text-xs text-emerald-200/80 space-y-1">
                <p className="font-semibold text-emerald-300">🔧 Next Steps (per Orchestrator-Agent workflow):</p>
                <p>1. Review and edit generated files in the file browser below</p>
                <p>2. Update selectors with actual UI locators from the target application</p>
                <p>3. Run the test from the dashboard.</p>
                <p>4. The named Playwright HTML report opens automatically with execution screenshots and video.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - File Browser */}
      <div className="grid grid-cols-12 gap-6">
        {/* Folder Sidebar */}
        <div className="col-span-12 md:col-span-2">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Folders
            </div>
            {FOLDERS.map(folder => (
              <button
                key={folder.path}
                onClick={() => setSelectedFolder(folder.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === folder.path
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                <span className="mr-2">{folder.icon}</span>
                {folder.name}
              </button>
            ))}
          </div>
        </div>

        {/* Files and Editor */}
        <div className="col-span-12 md:col-span-10">
          <div className="grid grid-cols-12 gap-6">
            {/* Files List */}
            <div className="col-span-12 md:col-span-3">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden h-96 md:h-full flex flex-col">
                <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/50">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Files
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loading && (
                    <div className="p-4 text-gray-400 text-sm">Loading…</div>
                  )}
                  {error && !selectedFile && (
                    <div className="p-4 text-red-400 text-xs">{error}</div>
                  )}
                  {files.length === 0 && !loading && (
                    <div className="p-4 text-gray-500 text-xs">No files found</div>
                  )}
                  {files.map(file => (
                    <button
                      key={file}
                      onClick={() => loadFileContent(file)}
                      className={`w-full text-left px-4 py-2 text-xs border-b border-gray-700/50 transition-colors hover:bg-gray-700/30 ${
                        selectedFile === file
                          ? 'bg-sky-500/10 text-sky-300 border-l-2 border-l-sky-500'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="font-mono">{file.split('/').pop()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* File Viewer */}
            <div className="col-span-12 md:col-span-9">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden h-96 md:h-full flex flex-col">
                <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      File Viewer
                    </div>
                    {selectedFile && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">{selectedFile}</div>
                    )}
                  </div>
                  
                  {/* Generate Test Scripts from Feature File Button */}
                  {currentFeatureFile && featureIssueKey && (
                    <button
                      onClick={handleGenerateScriptsFromFeature}
                      disabled={generating}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Generate test scripts from ${currentFeatureFile}`}
                    >
                      {generating ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Generating…
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          Generate from Feature
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {!selectedFile ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                      Select a file to view
                    </div>
                  ) : (
                    <pre className="flex-1 p-4 font-mono text-xs bg-gray-950 text-gray-300 overflow-auto border-0 whitespace-pre-wrap break-words">
                      {fileContent || 'No content'}
                    </pre>
                  )}
                </div>

                {error && selectedFile && (
                  <div className="px-4 py-2 bg-red-900/20 border-t border-red-700/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Parse test cases from a markdown spec file.
 * Extracts positive, negative, and edge test cases matching the format
 * generated by the Orchestrator workflow.
 */
function parseTestCasesFromMarkdown(markdown) {
  const testCases = { positive: [], negative: [], edge: [] }
  if (!markdown) return testCases

  // Split on test case block boundaries — supports both formats:
  //   #### Test Case: AIR-1-TC_P01   (new format used by Orchestrator)
  //   ## Test Case ID: TC_001        (legacy format)
  const blocks = markdown.split(/(?=^#### Test Case:\s|^## Test Case ID:\s)/m)

  for (const block of blocks) {
    const idMatch = block.match(/(?:####\s*Test Case:\s*|##\s*Test Case ID:\s*)(\S+)/i)
    if (!idMatch) continue

    const id = idMatch[1]
    const titleMatch = block.match(/\*\*Title\*\*:?\s*(.+)/i)
    const title = (titleMatch?.[1] || id).trim()

    const typeMatch = block.match(/\*\*Type\*\*:?\s*([^\n]+)/i)
    const typeRaw   = (typeMatch?.[1] || '').trim().split(/[\/\s]/)[0].toLowerCase()
    const type      = typeRaw.startsWith('pos') ? 'Positive'
                    : typeRaw.startsWith('neg') ? 'Negative'
                    : typeRaw.startsWith('edg') ? 'Edge'
                    : 'Positive'

    const prioMatch = block.match(/\*\*Priority\*\*:?\s*(.+)/i)
    const priority  = (prioMatch?.[1] || 'Medium').trim().split(/[\/\s]/)[0]

    const preMatch = block.match(/\*\*Preconditions\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n####|$)/i)
    const preconditions = (preMatch?.[1] || '').trim()

    const stepsWithResults = []
    const tableRows = [...block.matchAll(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|?\s*$/gm)]
    if (tableRows.length) {
      for (const [, , action, result] of tableRows) {
        if (!action || action === 'Action' || action.startsWith('---') || action.startsWith(':')) continue
        stepsWithResults.push({ action: action.trim(), result: result.trim() })
      }
    } else {
      const stepsSection = block.match(/\*\*Test Steps\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n####|$)/i)
      if (stepsSection?.[1]) {
        for (const line of stepsSection[1].split('\n')) {
          const m = line.trim().match(/^\d+[.)]\s*(.+)/)
          if (m) stepsWithResults.push({ action: m[1].trim(), result: '' })
        }
      }
    }

    const dataMatch = block.match(/\*\*Test Data\*\*:?\s*```json\s*([\s\S]*?)```/i)
    let testData
    if (dataMatch) {
      try { testData = JSON.parse(dataMatch[1]) } catch { testData = {} }
    }

    const tc = {
      id, title, type, priority, preconditions,
      steps: stepsWithResults.map(s => s.action),
      stepsWithResults,
      ...(testData !== undefined ? { testData } : {}),
    }

    if (type === 'Positive') testCases.positive.push(tc)
    else if (type === 'Negative') testCases.negative.push(tc)
    else testCases.edge.push(tc)
  }

  return testCases
}
