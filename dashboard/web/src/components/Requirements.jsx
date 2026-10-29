import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

const SOURCE_OPTIONS = [
  { value: '',           label: 'Select Source…' },
  { value: 'localhost',  label: 'LocalHost' },
  { value: 'ado',        label: 'Azure DevOps' },
  { value: 'jira',       label: 'Jira' },
]

function getAvailableSourceOptions(selectedTool) {
  // Always include the placeholder and localhost
  const baseOptions = [{ value: '', label: 'Select Source…' }, { value: 'localhost', label: 'LocalHost' }]
  
  // Add the selected tool
  if (selectedTool === 'JIRA') {
    baseOptions.push({ value: 'jira', label: 'Jira' })
  } else if (selectedTool === 'AZURE') {
    baseOptions.push({ value: 'ado', label: 'Azure DevOps' })
  }
  
  return baseOptions
}

const ACCEPTED_EXTS = '.docx,.pdf,.xlsx,.xls,.csv,.txt'
const MAX_FOLDER_NAME = 12

function buildTree(items) {
  const map = {}
  items.forEach(i => { map[i.id] = { ...i, children: [] } })
  const roots = []
  items.forEach(i => {
    if (i.parentId && map[i.parentId]) map[i.parentId].children.push(map[i.id])
    else roots.push(map[i.id])
  })
  return roots
}

let _idSeq = Date.now()
function newId() { return String(++_idSeq) }

// ── File viewer for binary/rich formats ──────────────────────────────────────

function FileViewer({ file, onClose }) {
  const [content, setContent]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true); setError(null); setContent(null)
    axios.get(`/api/requirements/content?file=${encodeURIComponent(file.path || file.name)}`)
      .then(r => setContent(r.data.content))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false))
  }, [file.path, file.name])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0b1b2a] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white truncate">{file.name}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <div className="text-gray-400 text-sm text-center py-8">Parsing file…</div>}
          {error   && <div className="text-red-400 text-sm text-center py-8">⚠️ {error}</div>}
          {!loading && !error && content !== null && (
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{content}</pre>
          )}
          {!loading && !error && content === null && (
            <div className="text-gray-500 text-sm text-center py-8">No preview available for this file type.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LocalHost Left Pane ───────────────────────────────────────────────────────

function LocalHostPane({ items, setItems, selectedFile, setSelectedFile, onGenerateTests }) {
  const [draggingId, setDraggingId]     = useState(null)
  const [editingId, setEditingId]       = useState(null)
  const [editName, setEditName]         = useState('')
  const [nameError, setNameError]       = useState('')
  const [openFolders, setOpenFolders]   = useState(() => new Set())
  const [viewingFile, setViewingFile]   = useState(null)  // server-side file for viewer

  const tree = buildTree(items)

  function handleDelete(id) {
    const toDelete = new Set()
    function collect(nid) {
      toDelete.add(nid)
      items.filter(i => i.parentId === nid).forEach(c => collect(c.id))
    }
    collect(id)
    setItems(prev => prev.filter(i => !toDelete.has(i.id)))
    if (selectedFile && toDelete.has(selectedFile.id)) setSelectedFile(null)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditName(item.name)
    setNameError('')
  }

  function commitEdit(id) {
    const node = items.find(i => i.id === id)
    // Enforce folder name limit
    if (node?.type === 'folder' && editName.length > MAX_FOLDER_NAME) {
      setNameError(`Max ${MAX_FOLDER_NAME} characters`)
      return
    }
    if (!editName.trim()) { setEditingId(null); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i))
    setEditingId(null)
    setNameError('')
  }

  function handleNameChange(val, nodeType) {
    if (nodeType === 'folder' && val.length > MAX_FOLDER_NAME) {
      setNameError(`Max ${MAX_FOLDER_NAME} characters`)
    } else {
      setNameError('')
    }
    setEditName(val)
  }

  function addFolder(parentId) {
    const id = newId()
    setItems(prev => [...prev, { id, name: 'New Folder', type: 'folder', parentId: parentId || null, children: [] }])
    setEditingId(id)
    setEditName('New Folder')
    setNameError('')
  }

  function addFile(parentId) {
    const id = newId()
    setItems(prev => [...prev, { id, name: 'New File.txt', type: 'file', parentId: parentId || null, content: '' }])
    setEditingId(id)
    setEditName('New File.txt')
    setNameError('')
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) return
    const target = items.find(i => i.id === targetId)
    if (!target || target.type !== 'folder') return
    setItems(prev => prev.map(i => i.id === draggingId ? { ...i, parentId: targetId } : i))
    setDraggingId(null)
  }

  function toggleFolder(id) {
    setOpenFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderNode(node, level = 0) {
    const isSelected = selectedFile?.id === node.id
    const pad = level * 14
    const isFolder = node.type === 'folder'
    // Determine if it's a server-synced file (has a relPath) for viewer
    const hasServerPath = !!node.relPath

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1 px-1 rounded group cursor-pointer transition-colors ${isSelected ? 'bg-sky-500/20' : 'hover:bg-white/5'}`}
          style={{ paddingLeft: `${8 + pad}px` }}
          draggable
          onDragStart={() => setDraggingId(node.id)}
          onDragOver={e => { if (isFolder) e.preventDefault() }}
          onDrop={e => handleDrop(e, node.id)}
          onClick={() => !isFolder && setSelectedFile(node)}
        >
          {isFolder ? (
            <button className="w-4 text-gray-400 text-xs flex-shrink-0" onClick={e => { e.stopPropagation(); toggleFolder(node.id) }}>
              {openFolders.has(node.id) ? '▾' : '▸'}
            </button>
          ) : <span className="w-4 flex-shrink-0" />}

          <span className="text-xs flex-shrink-0">{isFolder ? '📁' : '📄'}</span>

          {editingId === node.id ? (
            <div className="flex-1 flex flex-col min-w-0">
              <input
                autoFocus
                className="flex-1 bg-transparent border-b border-sky-400 text-xs text-white outline-none"
                value={editName}
                maxLength={isFolder ? MAX_FOLDER_NAME : undefined}
                onChange={e => handleNameChange(e.target.value, node.type)}
                onBlur={() => commitEdit(node.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(node.id); if (e.key === 'Escape') { setEditingId(null); setNameError('') } }}
                onClick={e => e.stopPropagation()}
              />
              {nameError && <span className="text-red-400 text-xs">{nameError}</span>}
            </div>
          ) : (
            <span className={`flex-1 text-xs truncate ${!isFolder ? 'text-gray-300' : 'text-gray-200 font-medium'}`}>{node.name}</span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
            {isFolder && (
              <>
                <button title="Add file" className="text-gray-400 hover:text-sky-300 text-xs px-1" onClick={e => { e.stopPropagation(); addFile(node.id) }}>+📄</button>
                <button title="Add folder" className="text-gray-400 hover:text-sky-300 text-xs px-1" onClick={e => { e.stopPropagation(); addFolder(node.id) }}>+📁</button>
              </>
            )}
            {!isFolder && hasServerPath && (
              <button title="View file" className="text-gray-400 hover:text-sky-300 text-xs px-1" onClick={e => { e.stopPropagation(); setViewingFile(node) }}>👁️</button>
            )}
            <button title="Rename" className="text-gray-400 hover:text-yellow-300 text-xs px-1" onClick={e => { e.stopPropagation(); startEdit(node) }}>✏️</button>
            <button title="Delete" className="text-gray-400 hover:text-red-400 text-xs px-1" onClick={e => { e.stopPropagation(); handleDelete(node.id) }}>🗑️</button>
          </div>
        </div>

        {isFolder && openFolders.has(node.id) && node.children?.length > 0 && (
          <div>{node.children.map(c => renderNode(c, level + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-2 py-2 border-b border-white/10">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Files</span>
          <div className="flex gap-1">
            <button title="New folder at root" className="text-xs text-gray-400 hover:text-sky-300 px-1.5 py-0.5 rounded border border-white/10 hover:border-sky-400/40" onClick={() => addFolder(null)}>+📁</button>
            <button title="New file at root"   className="text-xs text-gray-400 hover:text-sky-300 px-1.5 py-0.5 rounded border border-white/10 hover:border-sky-400/40" onClick={() => addFile(null)}>+📄</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {tree.length === 0 && <div className="text-xs text-gray-500 px-3 py-4 text-center">No files yet.<br/>Upload files or create new ones.</div>}
          {tree.map(n => renderNode(n))}
        </div>
        {selectedFile && (
          <div className="p-2 border-t border-white/10">
            <button onClick={() => onGenerateTests(selectedFile)} className="w-full text-xs px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors">
              ⚡ Generate Tests
            </button>
          </div>
        )}
      </div>
      {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </>
  )
}

// ── File Display (read-only viewer for in-memory files) ────────────────────

function FileEditor({ file }) {
  // Read-only viewer for binary uploaded files
  const isBinary = /\.(xlsx|xls|pdf|docx)$/i.test(file.name)
  if (isBinary && file.relPath) {
    return <FileViewer file={file} onClose={() => {}} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs">📄</span>
          <span className="text-sm font-semibold text-gray-200">{file.name}</span>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <pre className="w-full h-full min-h-[300px] bg-black/20 border border-white/10 rounded p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
          {file.content || 'No content'}
        </pre>
      </div>
    </div>
  )
}

// ── IssueSelector (ADO / Jira board browser) ─────────────────────────────────

function IssueSelector({ toolType, onSelect, selectedKey, showModal, setShowModal }) {
  const [projects, setProjects]               = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [view, setView]                       = useState('all')
  const [columns, setColumns]                 = useState([])
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState(null)
  const [assigneeFilter, setAssigneeFilter]   = useState('all')
  const [statusFilter, setStatusFilter]       = useState('all')
  const [typeFilter, setTypeFilter]           = useState('all')
  const [assigneeList, setAssigneeList]       = useState([])
  const [statusList, setStatusList]           = useState([])
  const [typeList, setTypeList]               = useState([])

  useEffect(() => {
    if (!toolType || toolType === 'localhost') return
    const endpoint = toolType === 'ado' ? '/api/ado/projects' : '/api/jira/projects'
    axios.get(endpoint)
      .then(r => { const p = r.data.projects || []; setProjects(p); if (p.length) setSelectedProject(p[0].key) })
      .catch(() => setError(`${toolType.toUpperCase()} not configured`))
  }, [toolType])

  useEffect(() => {
    if (!selectedProject || !toolType || toolType === 'localhost') return
    setLoading(true); setError(null)
    const endpoint = toolType === 'ado' ? '/api/ado/board' : '/api/jira/board'
    axios.get(`${endpoint}?project=${selectedProject}&view=${view}`)
      .then(r => {
        setColumns(r.data.columns || [])
        if (toolType === 'jira') {
          const all = (r.data.columns || []).flatMap(c => c.issues)
          setAssigneeList([...new Set(all.map(i => i.assigneeDisplayName).filter(Boolean))])
          setStatusList([...new Set(all.map(i => i.status).filter(Boolean))])
          setTypeList([...new Set(all.map(i => i.issueType).filter(Boolean))])
        }
      })
      .catch(e => setError(e.response?.data?.error || `Failed to load board`))
      .finally(() => setLoading(false))
  }, [selectedProject, view, toolType])

  if (!showModal) return null

  let allIssues = columns.flatMap(c => c.issues)
  if (toolType === 'jira') {
    if (assigneeFilter !== 'all') allIssues = allIssues.filter(i => i.assigneeDisplayName === assigneeFilter)
    if (statusFilter   !== 'all') allIssues = allIssues.filter(i => i.status === statusFilter)
    if (typeFilter     !== 'all') allIssues = allIssues.filter(i => i.issueType === typeFilter)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0b1b2a] border border-white/10 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Select a {toolType === 'ado' ? 'Work Item' : 'User Story'}</h3>
          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="px-4 py-3 border-b border-white/10 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {projects.length > 0 && (
              <select className="select text-xs" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                {projects.map(p => <option key={p.key} value={p.key}>{p.key} — {p.name}</option>)}
              </select>
            )}
            <select className="select text-xs" value={view} onChange={e => setView(e.target.value)}>
              <option value="all">All Issues</option>
              {toolType === 'jira' ? <><option value="sprint">Sprint</option><option value="backlog">Backlog</option></> : <option value="sprint">Current Sprint</option>}
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
            {loading && <span className="text-xs text-gray-400">Loading…</span>}
          </div>
          {toolType === 'jira' && (
            <div className="flex flex-wrap gap-2">
              <select className="select text-xs" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}><option value="all">All Assignees</option>{assigneeList.map(a => <option key={a} value={a}>{a}</option>)}</select>
              <select className="select text-xs" value={statusFilter}   onChange={e => setStatusFilter(e.target.value)}><option value="all">All Statuses</option>{statusList.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select className="select text-xs" value={typeFilter}     onChange={e => setTypeFilter(e.target.value)}><option value="all">All Types</option>{typeList.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
          )}
        </div>
        {error && <div className="mx-4 mt-2 p-2 rounded bg-red-900/20 border border-red-800 text-red-300 text-xs">{error}</div>}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {allIssues.length === 0 && !loading && <div className="text-sm text-gray-500 text-center py-6">No issues found.</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allIssues.map(issue => (
              <div key={issue.key} onClick={() => { onSelect(issue); setShowModal(false) }}
                className={`rounded-md border px-3 py-2 cursor-pointer transition-all text-sm ${selectedKey === issue.key ? 'border-sky-500 bg-sky-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center gap-1.5">
                  {issue.issueTypeIcon && <img src={issue.issueTypeIcon} alt="" className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="font-mono text-xs text-sky-400 font-semibold">{issue.key}</span>
                </div>
                <div className="text-xs text-gray-300 mt-1 line-clamp-2">{issue.summary}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                  <span>{issue.status}</span>
                  {issue.priority && <><span>·</span><span>{issue.priority}</span></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RequirementDetail ─────────────────────────────────────────────────────────

function RequirementDetail({ issue, onGenerateTests }) {
  return (
    <div className="dashboard-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sky-400 font-bold text-sm">{issue.key}</span>
            {issue.status    && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">{issue.status}</span>}
            {issue.priority  && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">{issue.priority}</span>}
            {issue.issueType && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">{issue.issueType}</span>}
          </div>
          <h3 className="text-base font-semibold text-white mt-1">{issue.summary}</h3>
          {issue.assignee && <div className="text-xs text-gray-400 mt-1">Assignee: <span className="text-gray-300">{issue.assignee}</span></div>}
        </div>
        <button onClick={() => onGenerateTests(issue)}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors">
          ⚡ Generate Tests
        </button>
      </div>
      {issue.description && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Description / Acceptance Criteria</div>
          <div className="bg-black/20 rounded-md p-3 text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-white/5">
            {issue.description}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Requirements Component ───────────────────────────────────────────────

export default function Requirements({ onNavigateToTestCases, selectedTestTool }) {
  const [source, setSource]                   = useState('')
  const [showModal, setShowModal]             = useState(false)
  const [selectedIssue, setSelectedIssue]     = useState(null)
  const [localhostItems, setLocalhostItems]   = useState([])
  const [selectedFile, setSelectedFile]       = useState(null)
  const [folderCreateName, setFolderCreateName] = useState('')
  const [folderNameError, setFolderNameError] = useState('')
  const fileInputRef = useRef(null)
  
  const availableSources = getAvailableSourceOptions(selectedTestTool)

  function handleSourceChange(val) {
    setSource(val); setSelectedIssue(null); setSelectedFile(null)
    if (val === 'ado' || val === 'jira') setShowModal(true)
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    for (const file of files) {
      let content = ''
      if (/\.(txt|csv|md)$/i.test(file.name)) content = await file.text()
      else content = `[Binary file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`

      const newItem = { id: newId(), name: file.name, type: 'file', parentId: null, content }

      // Upload to server
      try {
        const formData = new FormData()
        formData.append('file', file)
        const r = await axios.post('/api/requirements/upload', formData, {
          headers: { 'Content-Type': `multipart/form-data; boundary=${formData._boundary || ''}` }
        }).catch(async () => {
          // fallback: text upload
          return axios.post('/api/requirements/upload-json', { name: file.name, content })
        })
        if (r.data?.relPath) newItem.relPath = r.data.relPath
      } catch (_) {}

      setLocalhostItems(prev => [...prev, newItem])
    }
    e.target.value = ''
  }

  function handleGenerateTests(issueOrFile) {
    const req = issueOrFile.key
      ? { key: issueOrFile.key, summary: issueOrFile.summary, description: issueOrFile.description || '' }
      : { key: issueOrFile.name, summary: issueOrFile.name, description: issueOrFile.content || '' }
    if (onNavigateToTestCases) onNavigateToTestCases(req)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Requirements</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select a source to load or manage requirements</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select className="select text-sm" value={source} onChange={e => handleSourceChange(e.target.value)}>
            {availableSources.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {source === 'localhost' && (
            <>
              <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTS} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors border border-indigo-500/40">
                📁 Upload (.docx, .pdf, .xlsx, .xls, .csv, .txt)
              </button>
            </>
          )}

          {(source === 'ado' || source === 'jira') && (
            <button onClick={() => setShowModal(true)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-gray-300 hover:text-white hover:border-sky-400/40 transition-colors">
              🔍 Browse {source === 'ado' ? 'Azure DevOps' : 'Jira'}
            </button>
          )}
        </div>
      </div>

      {!source && (
        <div className="text-center text-gray-500 py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-400">Select a source to get started</p>
          <p className="text-xs mt-1">Choose LocalHost, Azure DevOps, or Jira from the dropdown above</p>
        </div>
      )}

      {source === 'localhost' && (
        <div className="flex gap-4 h-[600px]">
          <div className="w-64 flex-shrink-0 bg-[#0b1b2a] border border-white/10 rounded-lg overflow-hidden flex flex-col">
            <LocalHostPane
              items={localhostItems}
              setItems={setLocalhostItems}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              onGenerateTests={handleGenerateTests}
            />
          </div>
          <div className="flex-1 bg-[#0b1b2a] border border-white/10 rounded-lg overflow-hidden flex flex-col">
            {selectedFile ? (
              <FileEditor
                file={selectedFile}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm">Select a file to view</p>
                  <p className="text-xs mt-1 text-gray-600">Or upload files using the Upload button above</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(source === 'ado' || source === 'jira') && (
        <div className="space-y-4">
          {!selectedIssue && !showModal && (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">{source === 'ado' ? '🔵' : '🟣'}</div>
              <p className="text-sm font-medium text-gray-400">No requirement selected</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-sky-400 hover:text-sky-300 border border-sky-500/30 px-4 py-1.5 rounded transition-colors">
                Browse {source === 'ado' ? 'Azure DevOps' : 'Jira'} →
              </button>
            </div>
          )}
          {selectedIssue && <RequirementDetail issue={selectedIssue} onGenerateTests={handleGenerateTests} />}
        </div>
      )}

      {(source === 'ado' || source === 'jira') && (
        <IssueSelector toolType={source} onSelect={issue => { setSelectedIssue(issue); setShowModal(false) }}
          selectedKey={selectedIssue?.key} showModal={showModal} setShowModal={setShowModal} />
      )}
    </div>
  )
}
