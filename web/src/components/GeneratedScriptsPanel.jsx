import { useEffect, useState } from 'react'
import axios from 'axios'

export default function GeneratedScriptsPanel({ issueKey, sourceType, onClose }) {
  const [scripts, setScripts] = useState({})
  const [selectedScript, setSelectedScript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const normalize = (key) => {
    const clean = key.replace(/[^a-zA-Z0-9]/g, '')
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
  }
  const pascal = normalize(issueKey)

  const localFolder = sourceType === 'LocalHost' ? `LocalHost/${issueKey}` : ''
  const filePrefix = localFolder ? `${localFolder}/` : ''
  const specPath = localFolder
    ? `tests/${localFolder}/${issueKey}-Script.spec.ts`
    : `tests/${issueKey}/${issueKey}-Script.spec.ts`
  const FILE_CATEGORIES = [
    { key: 'spec', name: 'Spec File (.spec.ts)', icon: '🧪', path: specPath },
    { key: 'locators', name: 'Locators', icon: '📍', path: `Locators/${filePrefix}${issueKey}-Locators.ts` },
    { key: 'pageObject', name: 'Page Object', icon: '📄', path: `pages/${filePrefix}${issueKey}-Page.ts` },
    { key: 'testData', name: 'Test Data', icon: '📊', path: `Test_Data/${filePrefix}${issueKey}-test-data.json` },
  ]

  useEffect(() => {
    if (!issueKey) return

    const loadScripts = async () => {
      setLoading(true)
      setError(null)
      setScripts({})

      try {
        const results = {}
        for (const category of FILE_CATEGORIES) {
          try {
            const response = await axios.get(`/api/file-content?path=${encodeURIComponent(category.path)}`)
            results[category.key] = { ...category, content: response.data.content || '', exists: true }
          } catch {
            results[category.key] = { ...category, content: '', exists: false }
          }
        }
        setScripts(results)
        const firstAvailable = Object.keys(results).find(key => results[key].exists)
        if (firstAvailable) setSelectedScript(firstAvailable)
      } catch (e) {
        setError('Failed to load generated scripts: ' + e.message)
      } finally {
        setLoading(false)
      }
    }

    loadScripts()
  }, [issueKey])

  const handleSelectScript = (key) => {
    if (!scripts[key].exists) return
    setSelectedScript(key)
  }

  if (!issueKey) return null

  const availableScripts = Object.entries(scripts).filter(([_, s]) => s.exists)

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <h3 className="text-sm font-semibold text-gray-200">Generated Scripts</h3>
          <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{issueKey}</span>
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-200 transition-colors">✕</button>
      </div>

      {/* Content */}
      <div className="flex h-96">
        {/* Left: File list */}
        <div className="w-40 flex-shrink-0 border-r border-white/10 bg-black/20 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-gray-400">Loading…</div>
          ) : error ? (
            <div className="p-3 text-xs text-red-400">{error}</div>
          ) : availableScripts.length === 0 ? (
            <div className="p-3 text-xs text-gray-500">No scripts generated yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {availableScripts.map(([key, script]) => (
                <button
                  key={key}
                  onClick={() => handleSelectScript(key)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    selectedScript === key
                      ? 'bg-sky-500/20 text-sky-300 border-l-2 border-l-sky-500'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                  title={script.path}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{script.icon}</span>
                    <span className="truncate font-mono text-xs">{script.name.split(' ')[0]}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: File Viewer */}
        <div className="flex-1 flex flex-col bg-black/40">
          {selectedScript && scripts[selectedScript] ? (
            <>
              <div className="px-4 py-2 border-b border-white/10 bg-black/50">
                <div className="text-xs font-mono text-gray-400 truncate">
                  {scripts[selectedScript].path}
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <pre className="flex-1 w-full px-3 py-2 bg-black/60 text-gray-300 font-mono text-xs overflow-auto whitespace-pre-wrap break-words">
                  {scripts[selectedScript].content || '(empty file)'}
                </pre>
              </div>
            </>
          ) : !loading && availableScripts.length > 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-xs">Select a file to view</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
