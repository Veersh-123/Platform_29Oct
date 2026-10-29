import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

const STATUS_COLOR = {
  idle:    'text-gray-400',
  running: 'text-blue-400',
  passed:  'text-emerald-400',
  failed:  'text-red-400',
}

function StatusBadge({ status }) {
  const labels = { idle: 'Idle', running: 'Running…', passed: 'Passed', failed: 'Failed' }
  const bg = {
    idle:    'bg-white/5 text-gray-400',
    running: 'bg-blue-500/20 text-blue-300',
    passed:  'bg-emerald-500/20 text-emerald-300',
    failed:  'bg-red-500/20 text-red-300',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg[status] || bg.idle}`}>
      {labels[status] || status}
    </span>
  )
}

function LogPanel({ lines, status, reportData }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lines])

  if (!lines.length) return null

  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-white/5">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/5">
        <span className="text-xs text-gray-400 font-mono uppercase">Live Output</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {status === 'passed' && reportData?.playwrightReport && (
            <a
              href={reportData.playwrightReport}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              📊 HTML Report
            </a>
          )}
          {status === 'failed' && reportData?.playwrightReport && (
            <a
              href={reportData.playwrightReport}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              📊 View Report
            </a>
          )}
        </div>
      </div>
      <div ref={ref} className="bg-black/40 font-mono text-xs p-3 max-h-48 overflow-y-auto space-y-0.5">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              /passed|✓|✔/.test(l) ? 'text-emerald-400' :
              /failed|✗|✘|error/i.test(l) ? 'text-red-400' :
              /running|started|playwright/i.test(l) ? 'text-blue-400' :
              'text-gray-400'
            }
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

function runSSE(url, method, body, onLine, onDone) {
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async response => {
    if (!response.ok) {
      onLine('❌ Server error: ' + response.status, 'fail')
      onDone(1)
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const part of parts) {
        const dataLine = part.split('\n').find(l => l.startsWith('data:'))
        if (!dataLine) continue
        try {
          const msg = JSON.parse(dataLine.slice(5))
          if (msg.type === 'log' || msg.type === 'start') onLine(msg.data)
          if (msg.type === 'error') onLine('❌ ' + msg.data)
          if (msg.type === 'done') onDone(msg.data.exitCode, msg.data)
        } catch (_) {}
      }
    }
  }).catch(e => {
    onLine('❌ Cannot reach server: ' + e.message)
    onDone(1)
  })
}

export default function TestExplorer() {
  const [specs, setSpecs]         = useState([])
  const [selected, setSelected]   = useState(null)   // selected spec file path
  const [selectedSuite, setSelectedSuite] = useState(null) // selected suite for filtering
  const [loading, setLoading]     = useState(true)
  const [runState, setRunState]   = useState({})      // { [file]: { status, lines, reportData } }
  const [globalRun, setGlobalRun] = useState({ status: 'idle', lines: [], reportData: {} })
  const [selectedTests, setSelectedTests] = useState({}) // { [testIndex]: true/false }
  const [regressionSuite, setRegressionSuite] = useState([]) // tracks tests in regression suite
  const [showScheduler, setShowScheduler] = useState(false) // scheduler modal visibility
  const [testRunStatus, setTestRunStatus] = useState({}) // { [testIndex]: 'idle'|'running'|'passed'|'failed' }
  const [suiteDropdown, setSuiteDropdown] = useState({}) // { [testIndex]: false } - dropdown visibility
  const [testLogs, setTestLogs] = useState({}) // { [testKey]: [lines] } - individual test logs
  const [testReports, setTestReports] = useState({}) // { [testKey]: reportData }
  const [schedulerTime, setSchedulerTime] = useState('17:54') // HH:MM format (05:54 PM = 17:54)
  const [scheduledSuite, setScheduledSuite] = useState('') // 'Regression' or 'Smoke'
  const [scheduleStatus, setScheduleStatus] = useState(null) // { message, type: 'success'|'error' }
  const [scheduledJobs, setScheduledJobs] = useState([]) // track scheduled jobs

  useEffect(() => {
    axios.get('/api/tests')
      .then(r => {
        setSpecs(r.data.specs || [])
        if (r.data.specs?.length) setSelected(r.data.specs[0].file)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load scheduled jobs on mount
  useEffect(() => {
    const loadJobs = () => {
      axios.get('http://localhost:4000/api/schedule-tests')
        .then(r => setScheduledJobs(r.data.jobs || []))
        .catch(err => console.log('Failed to load scheduled jobs'))
    }
    loadJobs()
    // Poll for updates every 30 seconds
    const interval = setInterval(loadJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  const selectedSpec = specs.find(s => s.file === selected)

  function startRun(file) {
    setRunState(prev => ({ ...prev, [file]: { status: 'running', lines: [], reportData: {} } }))
    runSSE(
      'http://localhost:4000/api/run-tests/file',
      'POST',
      { file },
      line => setRunState(prev => ({
        ...prev,
        [file]: { ...prev[file], status: 'running', lines: [...(prev[file]?.lines || []), line] }
      })),
      (code, doneData) => {
        const resultStatus = code === 0 ? 'passed' : 'failed'
        setRunState(prev => ({
          ...prev,
          [file]: { 
            ...prev[file], 
            status: resultStatus,
            reportData: {
              playwrightReport: doneData?.reportUrl ? new URL(doneData.reportUrl, 'http://localhost:4000').href : null
            }
          }
        }))
      }
    )
  }

  function startAllRuns() {
    setGlobalRun({ status: 'running', lines: [], reportData: {} })
    runSSE(
      'http://localhost:4000/api/run-tests',
      'POST',
      null,
      line => setGlobalRun(prev => ({ ...prev, lines: [...prev.lines, line] })),
      (code, doneData) => {
        const resultStatus = code === 0 ? 'passed' : 'failed'
        setGlobalRun(prev => ({ 
          ...prev, 
          status: resultStatus,
          reportData: {
            playwrightReport: doneData?.reportUrl ? new URL(doneData.reportUrl, 'http://localhost:4000').href : null
          }
        }))
      }
    )
  }

  // Toggle test case selection
  function toggleTestSelection(testIndex) {
    setSelectedTests(prev => ({ ...prev, [testIndex]: !prev[testIndex] }))
  }

  // Add selected tests to regression suite
  function addToRegressionSuite() {
    if (!selectedSpec) return
    const newTests = []
    Object.entries(selectedTests).forEach(([idx, selected]) => {
      if (selected) {
        const test = selectedSpec.tests[parseInt(idx)]
        newTests.push({ ...test, id: `${selected}-${idx}` })
      }
    })
    setRegressionSuite(prev => [...prev, ...newTests])
    setSelectedTests({}) // Clear selection
  }

  // Run individual test case in headed mode
  function runTestHeaded(testIndex) {
    if (!selectedSpec) return
    const testKey = `${selected}-${testIndex}`
    setTestRunStatus(prev => ({ ...prev, [testKey]: 'running' }))
    setTestLogs(prev => ({ ...prev, [testKey]: [] }))
    
    runSSE(
      'http://localhost:4000/api/run-tests/headed',
      'POST',
      { file: selectedSpec.file, testIndex, headed: true },
      line => {
        // Update individual test logs
        setTestLogs(prev => ({
          ...prev,
          [testKey]: [...(prev[testKey] || []), line]
        }))
      },
      (code, doneData) => {
        const resultStatus = code === 0 ? 'passed' : 'failed'
        const reportUrl = doneData?.reportUrl ? new URL(doneData.reportUrl, 'http://localhost:4000').href : null
        setTestRunStatus(prev => ({ ...prev, [testKey]: resultStatus }))
        setTestReports(prev => ({
          ...prev,
          [testKey]: {
            playwrightReport: reportUrl
          }
        }))
      }
    )
  }

  // Add test to regression suite
  function addTestToSuite(testIndex, suiteName) {
    if (!selectedSpec) return
    const test = selectedSpec.tests[testIndex]
    const testItem = {
      ...test,
      id: `${selected}-${testIndex}-${Date.now()}`,
      sourceFile: selected,
      sourceIndex: testIndex
    }
    if (suiteName === 'Regression') {
      setRegressionSuite(prev => [...prev, testItem])
    }
    setSuiteDropdown(prev => ({ ...prev, [testIndex]: false }))
  }

  // Toggle suite dropdown
  function toggleSuiteDropdown(testIndex) {
    setSuiteDropdown(prev => ({ ...prev, [testIndex]: !prev[testIndex] }))
  }

  // Schedule suite execution
  async function scheduleExecution() {
    if (!schedulerTime || !scheduledSuite || regressionSuite.length === 0) {
      setScheduleStatus({ message: 'Please select time and suite with tests', type: 'error' })
      return
    }

    try {
      const response = await axios.post('http://localhost:4000/api/schedule-tests', {
        time: schedulerTime,
        suite: scheduledSuite,
        tests: regressionSuite
      })
      
      setScheduleStatus({ message: `✓ Tests scheduled for ${schedulerTime}`, type: 'success' })
      
      // Refresh scheduled jobs
      const jobsResponse = await axios.get('http://localhost:4000/api/schedule-tests')
      setScheduledJobs(jobsResponse.data.jobs || [])
      
      setTimeout(() => {
        setShowScheduler(false)
        setScheduleStatus(null)
      }, 2000)
    } catch (err) {
      setScheduleStatus({ message: '✗ Failed to schedule: ' + (err.response?.data?.error || err.message), type: 'error' })
    }
  }

  // Cancel scheduled job
  async function cancelScheduledJob(jobId) {
    try {
      await axios.delete(`http://localhost:4000/api/schedule-tests/${jobId}`)
      // Refresh scheduled jobs
      const response = await axios.get('http://localhost:4000/api/schedule-tests')
      setScheduledJobs(response.data.jobs || [])
    } catch (err) {
      console.error('Failed to cancel job:', err)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-400 text-sm">Loading test files…</div>
  }

  if (!specs.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-3xl mb-2">🧪</div>
        <p>No spec files found in <code className="text-xs bg-white/5 px-1 rounded">tests/</code></p>
        <p className="text-xs mt-1">Make sure the server is running and tests exist.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left: file list ── */}
      <div className="w-64 flex-shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Spec Files</span>
          <button
            onClick={startAllRuns}
            disabled={globalRun.status === 'running'}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶ Run All
          </button>
        </div>

        {/* Suite Filter Dropdown */}
        <div className="mb-3">
          <select
            value={selectedSuite || ''}
            onChange={(e) => setSelectedSuite(e.target.value || null)}
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">All Suites</option>
            <option value="Regression">Regression</option>
            <option value="Smoke">Smoke</option>
            <option value="Sanity">Sanity</option>
          </select>
        </div>

        {specs
          .filter(spec => !selectedSuite || spec.suite === selectedSuite)
          .map(spec => {
          const rs = runState[spec.file]
          return (
            <div
              key={spec.file}
              onClick={() => setSelected(spec.file)}
              className={`rounded-md px-3 py-2.5 cursor-pointer transition-colors mb-1 ${
                selected === spec.file
                  ? 'bg-white/10 border border-white/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-mono text-gray-300 truncate">{spec.file.replace('tests/', '')}</div>
                {rs && <StatusBadge status={rs.status} />}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{spec.tests.length} test{spec.tests.length !== 1 ? 's' : ''}</div>
            </div>
          )
        })}

        {/* Global run log */}
        {globalRun.lines.length > 0 && (
          <div className="mt-3">
            <LogPanel lines={globalRun.lines} status={globalRun.status} reportData={globalRun.reportData} />
          </div>
        )}
      </div>

      {/* ── Right: spec detail ── */}
      {selectedSpec && (
        <div className="flex-1 min-w-0">
          <div className="dashboard-card mb-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-400 font-mono mb-1">{selectedSpec.file}</div>
                <h3 className="text-lg font-semibold text-white">{selectedSpec.suite}</h3>
                {selectedSpec.pageObject && (
                  <div className="text-xs text-gray-500 mt-0.5">Page Object: <span className="text-blue-400">{selectedSpec.pageObject}</span></div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                  title="Open Scheduler"
                >
                  ⏱ Schedule
                </button>
                <button
                  onClick={() => startRun(selectedSpec.file)}
                  disabled={runState[selectedSpec.file]?.status === 'running'}
                  className="flex-shrink-0 text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runState[selectedSpec.file]?.status === 'running' ? '⏳ Running…' : '▶ Run Suite'}
                </button>
              </div>
            </div>

            {/* Test case list with scrollbar */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {selectedSpec.tests.map((t, i) => {
                const testKey = `${selected}-${i}`
                const status = testRunStatus[testKey] || 'idle'
                const logs = testLogs[testKey] || []
                const report = testReports[testKey] || {}
                
                return (
                  <div key={i} className="rounded-md bg-white/5 border border-white/5 p-3">
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedTests[i] || false}
                        onChange={() => toggleTestSelection(i)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      
                      {/* Test info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-sm">#{i + 1}</span>
                          <span className="text-sm text-gray-200 font-medium">{t.name}</span>
                          <StatusBadge status={status} />
                        </div>
                        {t.steps.length > 0 && (
                          <ul className="mt-2 space-y-0.5 pl-5">
                            {t.steps.map((step, si) => (
                              <li key={si} className="text-xs text-gray-500 before:content-['→'] before:mr-1.5 before:text-gray-600">
                                {step}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Run button */}
                        <button
                          onClick={() => runTestHeaded(i)}
                          disabled={status === 'running'}
                          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Run test in headed mode"
                        >
                          {status === 'running' ? '⏳' : '▶'}
                        </button>

                        {/* View Report Link */}
                        {(status === 'passed' || status === 'failed') && report.playwrightReport && (
                          <a
                            href={report.playwrightReport}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold"
                            title="View Last Run Report"
                          >
                            📊 Report
                          </a>
                        )}

                        {/* Add to Suite dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => toggleSuiteDropdown(i)}
                            className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-semibold"
                          >
                            + Suite
                          </button>
                          {suiteDropdown[i] && (
                            <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-white/10 rounded-md shadow-lg z-10">
                              <button
                                onClick={() => addTestToSuite(i, 'Regression')}
                                className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                              >
                                Regression Suite
                              </button>
                              <button
                                onClick={() => addTestToSuite(i, 'Smoke')}
                                className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                              >
                                Smoke Suite
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Individual test logs */}
                    {logs.length > 0 && (
                      <div className="mt-3 rounded bg-black/30 p-2 border border-white/5">
                        <div className="text-xs text-gray-400 mb-1 font-mono">Output:</div>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {logs.map((line, li) => (
                            <div
                              key={li}
                              className={
                                /passed|✓|✔/.test(line) ? 'text-emerald-400' :
                                /failed|✗|✘|error/i.test(line) ? 'text-red-400' :
                                'text-gray-400'
                              }
                            >
                              <span className="text-xs font-mono">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Test data */}
            {selectedSpec.testData && (
              <div className="mt-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Test Data</div>
                <div className="bg-black/30 rounded-md p-3 font-mono text-xs text-gray-300 overflow-auto max-h-40">
                  {Object.entries(selectedSpec.testData).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-blue-400">{k}:</span>
                      <span className="text-emerald-300">{JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Run log for this file */}
          {runState[selectedSpec.file]?.lines.length > 0 && (
            <LogPanel lines={runState[selectedSpec.file].lines} status={runState[selectedSpec.file].status} reportData={runState[selectedSpec.file].reportData} />
          )}

          {/* Source code toggle */}
          <SourceView src={selectedSpec.src} />
        </div>
      )}

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-6 w-96 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-4">Schedule Test Suite</h3>
              
              {/* Time Input */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase mb-2 block">Execution Time (HH:MM)</label>
                <input
                  type="time"
                  value={schedulerTime}
                  onChange={(e) => setSchedulerTime(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Suite Selection */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase mb-2 block">Test Suite</label>
                <select
                  value={scheduledSuite}
                  onChange={(e) => setScheduledSuite(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select suite...</option>
                  <option value="Regression">Regression Suite</option>
                  <option value="Smoke">Smoke Suite</option>
                </select>
              </div>

              {/* Tests in Suite */}
              {regressionSuite.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs text-gray-400 uppercase mb-2 block">Tests to Run ({regressionSuite.length})</label>
                  <div className="bg-gray-800 rounded border border-white/5 p-2 max-h-40 overflow-y-auto space-y-1">
                    {regressionSuite.map((test, i) => (
                      <div key={i} className="text-xs text-gray-300">✓ {test.name}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Message */}
              {scheduleStatus && (
                <div className={`mb-4 p-2 rounded text-xs ${
                  scheduleStatus.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {scheduleStatus.message}
                </div>
              )}

              {/* Scheduled Jobs List */}
              {scheduledJobs.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs text-gray-400 uppercase mb-2 block">Scheduled Jobs</label>
                  <div className="bg-gray-800 rounded border border-white/5 p-2 max-h-40 overflow-y-auto space-y-2">
                    {scheduledJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between text-xs p-1.5 bg-black/30 rounded">
                        <div>
                          <div className="text-gray-300">{job.time} - {job.suite} Suite</div>
                          <div className="text-gray-500 text-xs">{job.tests.length} tests</div>
                        </div>
                        <button
                          onClick={() => cancelScheduledJob(job.id)}
                          className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={scheduleExecution}
                  className="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                >
                  Schedule
                </button>
                <button
                  onClick={() => setShowScheduler(false)}
                  className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceView({ src }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {open ? '▾ Hide source' : '▸ View source'}
      </button>
      {open && (
        <pre className="mt-2 bg-black/40 border border-white/5 rounded-md p-3 text-xs text-gray-400 font-mono overflow-auto max-h-64">
          {src}
        </pre>
      )}
    </div>
  )
}
