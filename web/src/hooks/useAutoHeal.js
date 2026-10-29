/**
 * useAutoHeal — runs a test file and self-heals failures with the real healer.
 *
 * When a run fails, it:
 *   1. Posts the Playwright failure output to POST /api/self-healing/auto-heal.
 *      That endpoint re-opens the application under test (URL taken from the
 *      page object or BASE_URL), compares the failed step with the live page,
 *      and writes a backed-up patch to the page object, locators, or spec.
 *   2. Re-runs the test only when a patch was written.
 *   3. Repeats up to MAX_REPAIRS times, then stops and reports that human
 *      review is needed.
 *
 * The healer endpoints full-heal, heal-locator and handle-popups are not
 * healers: they only write a log entry. They are not called here.
 */

const API = 'http://localhost:4000'
const MAX_REPAIRS = 3

/**
 * Core SSE runner (same as TestExplorer's runSSE, kept here to avoid circular deps)
 */
export function runSSE(url, method, body, onLine, onDone) {
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async response => {
    if (!response.ok) {
      onLine('❌ Server error: ' + response.status, 'fail')
      onDone(1, [], null)
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const allLines = []
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
          if (msg.type === 'log' || msg.type === 'start') { onLine(msg.data); allLines.push(msg.data) }
          if (msg.type === 'error') { onLine('❌ ' + msg.data); allLines.push('❌ ' + msg.data) }
          if (msg.type === 'done') onDone(msg.data.exitCode, allLines, msg.data)
        } catch (_) {}
      }
    }
  }).catch(e => {
    onLine('❌ Cannot reach server: ' + e.message)
    onDone(1, [], null)
  })
}

/** Run once and resolve with the exit code, the streamed lines, and the done payload. */
function runOnce(url, body, onLine) {
  return new Promise(resolve => {
    runSSE(
      url, 'POST', body,
      line => onLine(line),
      (code, lines, doneData) => resolve({ code, lines, doneData }),
    )
  })
}

/** Ask the real healer to repair the spec. Resolves with { patched, reason }. */
async function requestRepair({ file, failureOutput, onLine }) {
  try {
    const res = await fetch(`${API}/api/self-healing/auto-heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, failureOutput }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const reason = data.error || `healer returned HTTP ${res.status}`
      onLine(`⚠️ Healer could not run: ${reason}`)
      return { patched: false, reason }
    }
    if (data.patched) {
      onLine(`✅ Patched: ${data.patchSummary || file}`)
      ;(data.filesUpdated || []).forEach(f => onLine(`   📝 Updated ${f}`))
      ;(data.changes || []).forEach(c => onLine(`   ✎ ${c}`))
      return { patched: true, reason: null }
    }
    const reason = data.reason || data.analysis || 'No applicable repair was identified'
    onLine(`⚠️ Healer could not apply a repair: ${reason}`)
    return { patched: false, reason }
  } catch (err) {
    onLine(`⚠️ Healer request failed: ${err.message}`)
    return { patched: false, reason: err.message }
  }
}

/**
 * Run a test file with automatic self-healing on failure.
 *
 * @param {object} opts
 * @param {string} opts.file         - relative spec file path
 * @param {string} [opts.appUrl]     - unused; the healer resolves the application URL itself
 * @param {function} opts.onLine     - (line: string) => void  — log line callback
 * @param {function} opts.onDone     - (exitCode: number, doneData: object) => void
 * @param {string} [opts.testName]   - optional grep filter for single test
 * @param {boolean} [opts.headed]    - run headed
 */
export async function runWithAutoHeal({ file, onLine, onDone, testName, headed }) {
  const runEndpoint = headed
    ? `${API}/api/run-tests/headed`
    : `${API}/api/run-tests/file`
  const body = { file, testName, headed: !!headed }

  let result = await runOnce(runEndpoint, body, onLine)
  let repairs = 0

  while (result.code !== 0 && repairs < MAX_REPAIRS) {
    repairs++
    onLine('')
    onLine(`🩹 Healer repair ${repairs} of ${MAX_REPAIRS}: re-checking the application against the failed step...`)

    const failureOutput = result.lines
      .filter(l => l && (/error|fail|timeout|locator|selector|expect|✗|✘|❌|popup|overlay|banner|consent/i.test(l)))
      .slice(0, 60)
      .join('\n')

    const repair = await requestRepair({ file, failureOutput, onLine })
    if (!repair.patched) {
      onLine('❌ Self-heal stopped: no verified repair was written. Human review is needed.')
      break
    }

    onLine('🔄 Re-running test after repair ' + repairs + '...')
    result = await runOnce(runEndpoint, body, onLine)
  }

  if (result.code === 0) {
    onLine(repairs > 0 ? `✅ Self-heal successful — passing after ${repairs} repair(s).` : '✅ Passed.')
  } else if (repairs >= MAX_REPAIRS) {
    onLine(`❌ Still failing after ${MAX_REPAIRS} repair attempts. Human review is needed.`)
  }
  onDone(result.code, result.doneData)
}
