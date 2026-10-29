import React, { useState, useCallback } from 'react'
import axios from 'axios'

/**
 * GenerateScriptsButton Component
 * 
 * Triggers the test automation generation workflow:
 * 1. Reads saved test cases from specs/{issueKey}-TEST-CASES.md
 * 2. Generates Locators, Page Objects, Test Data, and Test Scripts
 * 3. Displays progress, errors, and results
 * 
 * Usage:
 * <GenerateScriptsButton issueKey="AS-1" onSuccess={() => console.log('Done')} />
 */
export default function GenerateScriptsButton({ issueKey, sourceType, sourceFile, onSuccess, className = '' }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)

  const handleGenerateScripts = useCallback(async () => {
    if (!issueKey?.trim()) {
      setError('Issue key is required')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)
    setLogs([])
    setShowLogs(true)

    try {
      const response = await fetch('/api/generate-test-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueKey: issueKey.toUpperCase(),
          sourceType,
          sourceFile,
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      const newLogs = []
      let hasError = false
      let successMessage = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'log') {
              newLogs.push(data.data)
              setLogs([...newLogs])
            } else if (data.type === 'error') {
              hasError = true
              newLogs.push(`❌ ${data.data}`)
              setLogs([...newLogs])
            } else if (data.type === 'done') {
              if (data.data.success) {
                successMessage = data.data.message || '✅ Test scripts generated successfully!'
              } else {
                hasError = true
                setError(data.data.message || 'Failed to generate test scripts')
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', line, e)
          }
        }
      }

      if (!hasError && successMessage) {
        setSuccess(successMessage)
        if (onSuccess) {
          onSuccess({ success: true, message: successMessage })
        }
      }
    } catch (e) {
      const errorMsg = e.message || 'Failed to generate test scripts'
      setError(errorMsg)
      console.error('Generate scripts error:', e)
    } finally {
      setGenerating(false)
    }
  }, [issueKey, onSuccess])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Button */}
      <button
        onClick={handleGenerateScripts}
        disabled={generating || !issueKey?.trim()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Generating Scripts…
          </>
        ) : (
          <>
            <span>⚡</span>
            Generate Test Scripts
          </>
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-300 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          ❌ {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-800 rounded px-3 py-2">
          {success}
        </div>
      )}

      {/* Logs section */}
      {showLogs && logs.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
            <span className="text-xs font-semibold text-gray-400">Generation Logs</span>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showLogs ? '▼' : '▶'}
            </button>
          </div>
          {showLogs && (
            <div className="max-h-48 overflow-y-auto p-3 space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="text-xs text-gray-400 font-mono">
                  {log.includes('✅') && <span className="text-emerald-400">{log}</span>}
                  {log.includes('❌') && <span className="text-red-400">{log}</span>}
                  {log.includes('ℹ️') && <span className="text-blue-400">{log}</span>}
                  {!log.includes('✅') && !log.includes('❌') && !log.includes('ℹ️') && (
                    <span>{log}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
