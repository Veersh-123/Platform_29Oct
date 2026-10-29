import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

export default function TestDataTable() {
  const [files, setFiles]       = useState([])
  const [contents, setContents] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    axios.get('/api/testdata')
      .then(r => {
        setFiles(r.data.files || [])
        setContents(r.data.contents || {})
        if (!selected && r.data.files?.length) setSelected(r.data.files[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selected])

  useEffect(() => { fetchData() }, [])

  const data = contents[selected]

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading test data…</div>

  if (!files.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-3xl mb-2">🗂</div>
        <p>No test data files found in <code className="text-xs bg-white/5 px-1 rounded">Test_Data/</code></p>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* ── File list ── */}
      <div className="w-56 flex-shrink-0">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Data Files</div>
        <div className="space-y-1">
          {files.map(f => (
            <div
              key={f}
              onClick={() => setSelected(f)}
              className={`rounded-md px-3 py-2 cursor-pointer text-sm transition-colors truncate ${
                selected === f
                  ? 'bg-white/10 border border-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
              title={f}
            >
              📄 {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content panel ── */}
      <div className="flex-1 min-w-0">
        {!selected && (
          <div className="text-gray-500 text-sm p-4">Select a data file to view its contents</div>
        )}

        {selected && data === null && (
          <div className="text-red-400 text-sm p-4">⚠️ Could not parse this file.</div>
        )}

        {selected && data !== null && (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-mono">Test_Data/{selected}</div>
            </div>

            {typeof data === 'object' && !Array.isArray(data) && (
              <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 bg-white/5 rounded px-3 py-2">
                    <div className="text-blue-400 text-sm font-mono w-32 flex-shrink-0">{key}</div>
                    <div className="text-emerald-300 text-sm font-mono break-all">{JSON.stringify(value)}</div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(data) && data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {Object.keys(data[0]).map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 uppercase px-3 py-2 border-b border-white/5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, ri) => (
                      <tr key={ri} className="border-b border-white/5 hover:bg-white/5">
                        {Object.values(row).map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-300 font-mono text-xs">{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {typeof data !== 'object' && (
              <pre className="text-xs text-gray-300 font-mono bg-black/30 p-3 rounded overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
