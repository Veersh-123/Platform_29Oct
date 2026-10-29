import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import GeneratedScriptsPanel from './GeneratedScriptsPanel'
import GenerateScriptsButton from './GenerateScriptsButton'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = {
  High:   'bg-red-500/20 text-red-300 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Low:    'bg-green-500/20 text-green-300 border-green-500/30',
}

const TYPE_COLOR = {
  Positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  Negative: 'bg-red-500/15 text-red-300 border-red-500/25',
  Edge:     'bg-purple-500/15 text-purple-300 border-purple-500/25',
}

const TYPE_ICON = { Positive: '✅', Negative: '❌', Edge: '⚡' }

function Badge({ label, colorClass }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
      {label}
    </span>
  )
}

// ── Issue Selector ────────────────────────────────────────────────────────────

function IssueSelector({ onSelect, selectedKey }) {
  const [projects, setProjects]             = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [view, setView]                     = useState('all')
  const [boardMeta, setBoardMeta]           = useState(null)   // { boardType, sprintName }
  const [columns, setColumns]               = useState([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [config, setConfig]                 = useState(null)

  // Load Jira config + default project
  useEffect(() => {
    axios.get('/api/jira/config')
      .then(r => {
        setConfig(r.data)
        if (r.data.projectKey) setSelectedProject(r.data.projectKey)
      })
      .catch(() => setError('Jira not configured — check .env settings'))
  }, [])

  // Load projects list (all types: scrum + kanban + software)
  useEffect(() => {
    if (!config?.configured) return
    axios.get('/api/jira/projects')
      .then(r => setProjects(r.data.projects || []))
      .catch(() => {})
  }, [config])

  // Load board when project or view changes
  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    setError(null)
    axios.get(`/api/jira/board?project=${selectedProject}&view=${view}`)
      .then(r => {
        setColumns(r.data.columns || [])
        setBoardMeta({ boardType: r.data.boardType, sprintName: r.data.sprintName })
      })
      .catch(e => setError(e.response?.data?.error || 'Failed to load Jira board'))
      .finally(() => setLoading(false))
  }, [selectedProject, view])

  const allIssues = columns.flatMap(c => c.issues)

  // Label helper for project type badge using boardType (scrum/kanban)
  const projectTypeBadge = (boardType) => {
    if (!boardType) return null
    const map = {
      scrum:  ['🏃 Scrum',  'bg-violet-500/15 text-violet-300 border-violet-500/30'],
      kanban: ['📋 Kanban', 'bg-sky-500/15 text-sky-300 border-sky-500/30'],
    }
    const [label, cls] = map[boardType] || [boardType, 'bg-white/10 text-gray-300 border-white/10']
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
        ⚠️ {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {projects.length > 0 && (
          <select
            className="select text-xs"
            value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); setBoardMeta(null) }}
          >
            {projects.map(p => {
              const BOARD_ICON = { scrum: '🏃', kanban: '📋' }
              const icon = BOARD_ICON[p.boardType] || '📁'
              return (
                <option key={p.key} value={p.key}>{icon} {p.key} — {p.name} [{p.boardType || 'unknown'}]</option>
              )
            })}
          </select>
        )}
        <select
          className="select text-xs"
          value={view}
          onChange={e => setView(e.target.value)}
        >
          <option value="all">All Issues</option>
          <option value="sprint">Current Sprint</option>
          <option value="backlog">Backlog</option>
          <option value="inprogress">In Progress</option>
          <option value="done">Done</option>
        </select>
        {/* Board type + active sprint badge */}
        {boardMeta?.boardType && projectTypeBadge(boardMeta.boardType)}
        {boardMeta?.sprintName && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/25">
            🏁 {boardMeta.sprintName}
          </span>
        )}
        {loading && <span className="text-xs text-gray-400">Loading…</span>}
      </div>

      {/* Issue list */}
      {!loading && allIssues.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-6">
          No issues found. Try a different view or project.
        </div>
      )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
        {allIssues.map(issue => (
          <div
            key={issue.key}
            onClick={() => onSelect(issue)}
            className={`rounded-md border px-3 py-2 cursor-pointer transition-all text-sm ${
              selectedKey === issue.key
                ? 'border-sky-500 bg-sky-500/10 text-white'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-sky-400 font-semibold flex-shrink-0">{issue.key}</span>
            </div>
            <div className="text-xs text-gray-300 mt-1 line-clamp-2">{issue.summary}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-gray-500">{issue.status}</span>
              {issue.priority && (
                <span className="text-xs text-gray-500">· {issue.priority}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ticket Detail Banner ──────────────────────────────────────────────────────

function TicketDetail({ issue }) {
  if (!issue) return null
  return (
    <div className="dashboard-card space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sky-400 font-bold text-sm">{issue.key}</span>
            {issue.status && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                {issue.status}
              </span>
            )}
            {issue.priority && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                {issue.priority}
              </span>
            )}
            {issue.issueType && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                {issue.issueType}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white mt-1">{issue.summary}</h3>
          {issue.assignee && (
            <div className="text-xs text-gray-400 mt-1">
              Assignee: <span className="text-gray-300">{issue.assignee}</span>
            </div>
          )}
        </div>
        {issue.url && (
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 border border-sky-500/30 px-2 py-1 rounded"
          >
            Open in Jira ↗
          </a>
        )}
      </div>

      {issue.description && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Description / Acceptance Criteria
          </div>
          <div className="bg-black/20 rounded-md p-3 text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-white/5">
            {issue.description}
          </div>
        </div>
      )}

      {issue.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {issue.labels.map(l => (
            <span key={l} className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Test Case Card ────────────────────────────────────────────────────────────

function TestCaseCard({ tc, onDelete, isSelected, onSelect, onUpdate }) {
  const [expanded, setExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: tc.title,
    preconditions: tc.preconditions || '',
    steps: tc.steps || [],
    expectedResult: tc.expectedResult || '',
  })
  const [editStepText, setEditStepText] = useState('')
  const [editResultText, setEditResultText] = useState('')

  // Parse expected result into lines
  const expectedResultLines = (tc.expectedResult || '')
    .split('\n')
    .filter(line => line.trim())

  const handleEnterEditMode = () => {
    setIsEditing(true)
    setEditStepText(editData.steps.join('\n'))
    setEditResultText(expectedResultLines.join('\n'))
  }

  const handleSaveEdit = () => {
    const updatedSteps = editStepText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s)
    const updatedResults = editResultText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r)

    onUpdate(tc.id, {
      ...tc,
      title: editData.title,
      preconditions: editData.preconditions,
      steps: updatedSteps,
      expectedResult: updatedResults.join('\n'),
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      title: tc.title,
      preconditions: tc.preconditions || '',
      steps: tc.steps || [],
      expectedResult: tc.expectedResult || '',
    })
    setIsEditing(false)
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${isSelected ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 bg-white/5'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Selection checkbox */}
        {!isEditing && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(tc.id, e.target.checked)}
            className="w-4 h-4 text-sky-600 bg-transparent border-gray-300 rounded focus:ring-sky-500 focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div 
          className={`flex items-center gap-2 flex-1 ${!isEditing ? 'cursor-pointer hover:bg-white/5 transition-colors rounded px-2 py-1 -mx-2 -my-1' : ''}`}
          onClick={() => !isEditing && setExpanded(o => !o)}
        >
          <span className="text-base flex-shrink-0">{TYPE_ICON[tc.type] || '🔬'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400 font-semibold">{tc.id}</span>
              <Badge label={tc.type}     colorClass={TYPE_COLOR[tc.type]     || ''} />
              <Badge label={tc.priority} colorClass={PRIORITY_COLOR[tc.priority] || ''} />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({...editData, title: e.target.value})}
                className="text-sm font-medium text-gray-200 mt-0.5 w-full bg-white/10 border border-white/20 rounded px-2 py-1"
                placeholder="Test case title"
              />
            ) : (
              <div className="text-sm font-medium text-gray-200 mt-0.5 truncate">{tc.title}</div>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-gray-500 text-sm">{expanded ? '▾' : '▸'}</span>
            </div>
          )}
        </div>
        
        {!isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); handleEnterEditMode() }}
              title="Edit this test case"
              className="text-xs px-2 py-1 rounded text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
            >
              ✎ Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(tc.id) }}
              title="Delete this test case"
              className="text-xs px-2 py-1 rounded text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            >
              ✕ Delete
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSaveEdit()}
              title="Save changes"
              className="text-xs px-2 py-1 rounded text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors font-semibold"
            >
              ✓ Save
            </button>
            <button
              onClick={handleCancel}
              title="Cancel editing"
              className="text-xs px-2 py-1 rounded text-gray-400 border border-gray-500/30 hover:bg-gray-500/20 hover:text-gray-300 transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-white/10 px-4 py-3 space-y-3">
          {/* Preconditions */}
          {(tc.preconditions || isEditing) && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Preconditions</div>
              {isEditing ? (
                <textarea
                  value={editData.preconditions}
                  onChange={(e) => setEditData({...editData, preconditions: e.target.value})}
                  className="text-xs text-gray-300 bg-white/10 border border-white/20 rounded px-3 py-2 w-full"
                  rows="3"
                  placeholder="Enter preconditions"
                />
              ) : (
                <div className="text-xs text-gray-300 bg-black/20 rounded px-3 py-2 border border-white/5 whitespace-pre-wrap">
                  {tc.preconditions}
                </div>
              )}
            </div>
          )}

          {/* Steps */}
          {(tc.steps?.length > 0 || isEditing) && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Test Steps</div>
              {isEditing ? (
                <textarea
                  value={editStepText}
                  onChange={(e) => setEditStepText(e.target.value)}
                  className="text-xs text-gray-300 bg-white/10 border border-white/20 rounded px-3 py-2 w-full font-mono"
                  rows="6"
                  placeholder="Enter steps (one per line)"
                />
              ) : tc.stepsWithResults?.length > 0 ? (
                // Render 3-column table: Step | Action | Expected Result
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1.5 px-2 text-gray-500 font-semibold w-8">#</th>
                        <th className="text-left py-1.5 px-2 text-gray-500 font-semibold w-1/2">Action</th>
                        <th className="text-left py-1.5 px-2 text-emerald-500 font-semibold">Expected Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tc.stepsWithResults.map((step, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                          <td className="py-1.5 px-2 text-sky-500 font-semibold align-top">{i + 1}</td>
                          <td className="py-1.5 px-2 text-gray-300 align-top">{step.action}</td>
                          <td className="py-1.5 px-2 text-emerald-300 align-top">{step.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Fallback: plain numbered list when no stepsWithResults
                <ol className="space-y-1">
                  {tc.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-300">
                      <span className="text-sky-500 font-semibold flex-shrink-0 w-5">{i + 1}.</span>
                      <span>{typeof step === 'string' ? step.replace(/^Step \d+:\s*/i, '') : step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Validations — only shown in edit mode; in view mode expected results are in the steps table above */}
          {isEditing && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Validations</div>
              <textarea
                value={editResultText}
                onChange={(e) => setEditResultText(e.target.value)}
                className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-500/30 rounded px-3 py-2 w-full font-mono"
                rows="6"
                placeholder="Enter validations (one per line)"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section Group ─────────────────────────────────────────────────────────────

function TestCaseSection({ title, icon, colorClass, cases, onDelete, selectedIds, onSelect, onSelectAll, onUpdate }) {
  const [open, setOpen] = useState(true)
  if (cases.length === 0) return null
  
  const selectedCount = cases.filter(tc => selectedIds.has(tc.id)).length
  const allSelected = selectedCount === cases.length && cases.length > 0
  const someSelected = selectedCount > 0 && selectedCount < cases.length
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={allSelected}
          ref={input => {
            if (input) input.indeterminate = someSelected
          }}
          onChange={(e) => onSelectAll(cases.map(tc => tc.id), e.target.checked)}
          className="w-4 h-4 text-sky-600 bg-transparent border-gray-300 rounded focus:ring-sky-500 focus:ring-2"
        />
        <div
          className="flex items-center gap-2 cursor-pointer select-none flex-1"
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-base">{icon}</span>
          <h4 className={`text-sm font-semibold ${colorClass}`}>{title}</h4>
          <span className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full">{cases.length}</span>
          {selectedCount > 0 && (
            <span className="text-xs bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-full border border-sky-500/30">
              {selectedCount} selected
            </span>
          )}
          <span className="text-gray-500 text-xs ml-auto">{open ? '▾' : '▸'}</span>
        </div>
      </div>
      {open && (
        <div className="space-y-2 ml-1">
          {cases.map(tc => (
            <TestCaseCard 
              key={tc.id} 
              tc={tc} 
              onDelete={onDelete}
              isSelected={selectedIds.has(tc.id)}
              onSelect={onSelect}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ManualTestCases({ preloadedRequirement, onRequirementConsumed, selectedTestTool }) {
  const [selectedIssue, setSelectedIssue]     = useState(null)
  const [issueDetail, setIssueDetail]         = useState(null)
  const [loadingDetail, setLoadingDetail]     = useState(false)
  const [testCases, setTestCases]             = useState(null)   // { positive, negative, edge }
  const [generating, setGenerating]           = useState(false)
  const [generateError, setGenerateError]     = useState(null)
  const [source, setSource]                   = useState(null)   // 'ai' | 'fallback'
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState(new Set()) // Track selected test case IDs
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [showGeneratedScripts, setShowGeneratedScripts] = useState(false)
  const [testsSaved, setTestsSaved] = useState(false) // Track if tests were just saved

  // Auto-load AND auto-generate when navigated from Requirements tab
  useEffect(() => {
    if (!preloadedRequirement) return

    const fakeIssue = {
      key:       preloadedRequirement.key,
      summary:   preloadedRequirement.summary,
      status:    '',
      priority:  '',
      issueType: 'Requirement',
      assignee:  '',
      labels:    [],
    }
    const detail = {
      ...fakeIssue,
      description: preloadedRequirement.description || '',
    }

    setSelectedIssue(fakeIssue)
    setIssueDetail(detail)
    setTestCases(null)
    setGenerateError(null)
    setSource(null)
    setSelectedTestCaseIds(new Set()) // Clear selections
    setSaveError(null)
    setSaveSuccess(null)
    if (onRequirementConsumed) onRequirementConsumed()

    // Auto-trigger generation immediately
    setGenerating(true)
    axios.post('/api/manual-test-cases/generate', {
      issueKey:    detail.key,
      summary:     detail.summary,
      description: detail.description || '',
    })
      .then(resp => {
        setTestCases(resp.data.testCases)
        setSource(resp.data.source)
      })
      .catch(e => {
        setGenerateError(e.response?.data?.error || 'Failed to generate test cases. Please try again.')
      })
      .finally(() => setGenerating(false))
  }, [preloadedRequirement])

  // When user picks an issue from the board, fetch full detail
  const handleSelectIssue = useCallback(issue => {
    setSelectedIssue(issue)
    setIssueDetail(null)
    setTestCases(null)
    setGenerateError(null)
    setSource(null)
    setSelectedTestCaseIds(new Set()) // Clear selections
    setSaveError(null)
    setSaveSuccess(null)
    setLoadingDetail(true)
    axios.get(`/api/jira/issue/${issue.key}`)
      .then(r => setIssueDetail(r.data))
      .catch(() => {
        // If detail fetch fails, use the board data we already have
        setIssueDetail({
          key:         issue.key,
          summary:     issue.summary,
          description: '',
          status:      issue.status,
          priority:    issue.priority,
          issueType:   issue.issueType,
          assignee:    issue.assignee,
          labels:      issue.labels || [],
          url:         null,
        })
      })
      .finally(() => setLoadingDetail(false))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!issueDetail) return
    setGenerating(true)
    setGenerateError(null)
    setTestCases(null)
    setSource(null)
    setSelectedTestCaseIds(new Set()) // Clear selections when regenerating
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const resp = await axios.post('/api/manual-test-cases/generate', {
        issueKey:    issueDetail.key,
        summary:     issueDetail.summary,
        description: issueDetail.description || '',
      })
      setTestCases(resp.data.testCases)
      setSource(resp.data.source)
      // Show generated scripts panel when generation completes
      setShowGeneratedScripts(true)
    } catch (e) {
      setGenerateError(e.response?.data?.error || 'Failed to generate test cases. Please try again.')
    } finally {
      setGenerating(false)
    }
  }, [issueDetail])

  const handleDelete = useCallback(id => {
    setTestCases(prev => {
      if (!prev) return prev
      return {
        positive: prev.positive.filter(tc => tc.id !== id),
        negative: prev.negative.filter(tc => tc.id !== id),
        edge:     prev.edge.filter(tc => tc.id !== id),
      }
    })
    // Also remove from selection
    setSelectedTestCaseIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])

  // Handle update test case
  const handleUpdateTestCase = useCallback((id, updatedTc) => {
    setTestCases(prev => {
      if (!prev) return prev
      return {
        positive: prev.positive.map(tc => tc.id === id ? updatedTc : tc),
        negative: prev.negative.map(tc => tc.id === id ? updatedTc : tc),
        edge:     prev.edge.map(tc => tc.id === id ? updatedTc : tc),
      }
    })
  }, [])

  // Handle individual test case selection
  const handleSelectTestCase = useCallback((id, isSelected) => {
    setSelectedTestCaseIds(prev => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  // Handle select all for a section
  const handleSelectAllInSection = useCallback((ids, isSelected) => {
    setSelectedTestCaseIds(prev => {
      const newSet = new Set(prev)
      if (isSelected) {
        ids.forEach(id => newSet.add(id))
      } else {
        ids.forEach(id => newSet.delete(id))
      }
      return newSet
    })
  }, [])

  // Handle save selected test cases to specs
  const handleSaveToSpecs = useCallback(async () => {
    if (!issueDetail || selectedTestCaseIds.size === 0) return
    
    // Get all test cases
    const allTestCases = [
      ...(testCases?.positive || []),
      ...(testCases?.negative || []),
      ...(testCases?.edge || [])
    ]
    
    // Filter to only selected test cases
    const selectedTestCases = allTestCases.filter(tc => selectedTestCaseIds.has(tc.id))
    
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    setTestsSaved(false)
    
    try {
      // STEP 1: Save test cases AND generate feature file from test cases
      setSaveSuccess('💾 Saving test cases and generating feature file...')
      const testsResp = await axios.post('/api/manual-test-cases/write-spec', {
        issueKey: issueDetail.key,
        testCases: selectedTestCases,
        summary: issueDetail.summary,
        description: issueDetail.description,
        acceptanceCriteria: issueDetail.acceptanceCriteria
      })
      
      // Completed successfully
      setSaveSuccess(`✅ Workflow Complete!\n🎭 Feature File: ${testsResp.data.featureFile}\n📄 Test Cases: ${testsResp.data.file}`)
      // Clear selections after successful save
      setSelectedTestCaseIds(new Set())
      // Mark tests as saved to show generate scripts button
      setTestsSaved(true)
    } catch (e) {
      setSaveError(e.response?.data?.error || 'Failed to save test cases or generate feature file')
    } finally {
      setSaving(false)
    }
  }, [issueDetail, testCases, selectedTestCaseIds])

  const totalCount = testCases
    ? (testCases.positive?.length || 0) + (testCases.negative?.length || 0) + (testCases.edge?.length || 0)
    : 0

  return (
    <div className="space-y-6">

      {/* ── Step 1: Select a Jira ticket ── */}
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-semibold text-gray-200">Step 1 — Select a Ticket</h3>
        </div>
        <IssueSelector
          onSelect={handleSelectIssue}
          selectedKey={selectedIssue?.key}
        />
      </div>

      {/* ── Ticket detail ── */}
      {(loadingDetail || issueDetail) && (
        <div>
          {loadingDetail
            ? <div className="text-xs text-gray-400 px-2">Loading ticket details…</div>
            : <TicketDetail issue={issueDetail} />
          }
        </div>
      )}

      {/* ── Step 2: Generate button ── */}
      {issueDetail && !loadingDetail && (
        <div className="dashboard-card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">⚗️</span>
                <h3 className="text-sm font-semibold text-gray-200">Step 2 — Generate Test Cases</h3>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Analyses the ticket's acceptance criteria and generates Positive, Negative, and Edge test cases.
                {source === 'ai' && (
                  <span className="ml-2 text-sky-400">✨ AI-powered</span>
                )}
                {source === 'fallback' && (
                  <span className="ml-2 text-yellow-400">⚡ Rule-based (set AI_PROVIDER + AI_API_KEY for AI generation)</span>
                )}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  Generating…
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Generate Test Cases
                </>
              )}
            </button>
          </div>

          {generateError && (
            <div className="mt-3 text-xs text-red-300 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              ❌ {generateError}
            </div>
          )}
        </div>
      )}

      {/* ── Generated Scripts Panel ── */}
      {showGeneratedScripts && issueDetail && (
        <GeneratedScriptsPanel
          issueKey={issueDetail.key}
          onClose={() => setShowGeneratedScripts(false)}
        />
      )}

      {/* ── Generated test cases ── */}
      {testCases && totalCount > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                Generated Test Cases
                <span className="ml-2 text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                  {totalCount} total
                </span>
              </h3>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-emerald-400">✅ {testCases.positive?.length || 0} Positive</span>
                <span className="text-red-400">❌ {testCases.negative?.length || 0} Negative</span>
                <span className="text-purple-400">⚡ {testCases.edge?.length || 0} Edge</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTestCaseIds.size > 0 && (
                <span className="text-xs text-sky-300 bg-sky-500/20 px-2 py-1 rounded border border-sky-500/30">
                  {selectedTestCaseIds.size} selected
                </span>
              )}
              <button
                onClick={handleSaveToSpecs}
                disabled={saving || selectedTestCaseIds.size === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving…
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save to Specs
                  </>
                )}
              </button>
              <button
                onClick={() => setTestCases(null)}
                className="text-xs text-gray-400 hover:text-gray-200 border border-white/10 px-2 py-1 rounded transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Save error message */}
          {saveError && (
            <div className="text-xs text-red-300 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              ❌ {saveError}
            </div>
          )}

          {/* Save success message */}
          {saveSuccess && (
            <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-800 rounded px-3 py-2">
              {saveSuccess}
            </div>
          )}

          {/* Generate Test Scripts button - shown after successful save */}
          {testsSaved && issueDetail && (
            <div className="dashboard-card bg-sky-900/20 border border-sky-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-base">📜</span>
                <div>
                  <h3 className="text-sm font-semibold text-sky-300">Step 3 — Generate Test Scripts</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Create Page Objects, Locators, Test Data, and Playwright test scripts from your saved test cases.
                  </p>
                </div>
              </div>
              <GenerateScriptsButton 
                issueKey={issueDetail.key} 
                onSuccess={() => {
                  // Show the generated scripts panel after successful generation
                  setShowGeneratedScripts(true)
                }}
                className="mb-2"
              />
              <button
                onClick={() => setTestsSaved(false)}
                className="text-xs text-gray-400 hover:text-gray-200 border border-white/10 px-2 py-1 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          <TestCaseSection
            title="Positive Test Cases"
            icon="✅"
            colorClass="text-emerald-400"
            cases={testCases.positive || []}
            onDelete={handleDelete}
            selectedIds={selectedTestCaseIds}
            onSelect={handleSelectTestCase}
            onSelectAll={handleSelectAllInSection}
            onUpdate={handleUpdateTestCase}
          />
          <TestCaseSection
            title="Negative Test Cases"
            icon="❌"
            colorClass="text-red-400"
            cases={testCases.negative || []}
            onDelete={handleDelete}
            selectedIds={selectedTestCaseIds}
            onSelect={handleSelectTestCase}
            onSelectAll={handleSelectAllInSection}
            onUpdate={handleUpdateTestCase}
          />
          <TestCaseSection
            title="Edge / Boundary Test Cases"
            icon="⚡"
            colorClass="text-purple-400"
            cases={testCases.edge || []}
            onDelete={handleDelete}
            selectedIds={selectedTestCaseIds}
            onSelect={handleSelectTestCase}
            onSelectAll={handleSelectAllInSection}
            onUpdate={handleUpdateTestCase}
          />
        </div>
      )}

      {/* Empty state after all deleted */}
      {testCases && totalCount === 0 && (
        <div className="text-center text-gray-500 py-10">
          <div className="text-3xl mb-2">🗑️</div>
          <p className="text-sm">All test cases have been deleted.</p>
          <button
            onClick={handleGenerate}
            className="mt-3 text-xs text-sky-400 hover:text-sky-300 border border-sky-500/30 px-3 py-1.5 rounded transition-colors"
          >
            Regenerate Test Cases
          </button>
        </div>
      )}

      {/* Initial empty state */}
      {!selectedIssue && (
        <div className="text-center text-gray-500 py-10">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-400">Select a ticket to get started</p>
          <p className="text-xs mt-1">
            Pick any ticket above, then click <strong className="text-gray-300">Generate Test Cases</strong>
          </p>
        </div>
      )}
    </div>
  )
}
