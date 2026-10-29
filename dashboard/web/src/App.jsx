import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import TreeView from './components/TreeView'
import TestExplorer from './components/TestExplorer'
import TestDataTable from './components/TestDataTable'
import Reports from './components/Reports'
import DashboardOverview from './components/DashboardOverview'
import ManualTestCases from './components/ManualTestCases'
import ServerControls from './components/ServerControls'
import Requirements from './components/Requirements'
import Login from './components/Login'
import ValueAddedServices from './components/ValueAddedServices'
import TestScripts from './components/TestScripts'
import LLMStatusWidget from './components/LLMStatusWidget'
import LLMProviderSelector from './components/LLMProviderSelector'
import axios from 'axios'

const TOP_TABS = [
  { id: 'dashboard',        label: 'Dashboard' },
  { id: 'requirements',     label: 'Requirements' },
  { id: 'explorer',         label: 'Test Explorer' },
  { id: 'manual-tests',     label: 'Test Cases' },
  { id: 'test-scripts',     label: 'Test Scripts' },
  { id: 'reports',          label: 'Reports' },
  { id: 'data',             label: 'Test Data' },
  { id: 'services',         label: 'Value Added Services' },
  { id: 'structure',        label: 'Project Structure' },
  { id: 'llm',              label: 'LLM Settings' },
]

export default function App() {
  const [active, setActive]       = useState('explorer')
  const [structure, setStructure] = useState(null)
  const [stats, setStats]         = useState(null)
  const [serverOk, setServerOk]   = useState(null)   // null=checking, true, false
  // Pre-selected requirement passed from Requirements tab → Test Cases tab
  const [pendingRequirement, setPendingRequirement] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedTestTool, setSelectedTestTool] = useState(null)

  // Check login status on mount
  useEffect(() => {
    const tool = sessionStorage.getItem('selectedTestTool')
    if (tool) {
      setIsLoggedIn(true)
      setSelectedTestTool(tool)
    }
  }, [])

  function handleLoginSuccess(loginData) {
    setIsLoggedIn(true)
    setSelectedTestTool(loginData.tool)
  }

  // Fetch stats for header badges
  useEffect(() => {
    axios.get('/api/stats')
      .then(r => { setStats(r.data); setServerOk(true) })
      .catch(() => setServerOk(false))
  }, [])

  // Fetch structure lazily when that tab is first opened
  useEffect(() => {
    if (active === 'structure' && !structure) {
      axios.get('/api/structure').then(r => setStructure(r.data)).catch(() => {})
    }
  }, [active, structure])

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              H
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-widest">Hexaware</div>
              <div className="text-sm font-semibold text-gray-200">Project 10</div>
            </div>
          </div>

          {/* Live stats badges */}
          <div className="hidden md:flex items-center gap-3">
            {serverOk === false && (
              <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800 px-2 py-1 rounded">
                Backend offline — run: <code className="font-mono">cd server &amp;&amp; node index.js</code>
              </span>
            )}
            {stats && (
              <>
                <Pill label="Specs" value={stats.specFiles} />
                <Pill label="Tests" value={stats.totalTests} />
                <Pill
                  label="Passed"
                  value={stats.passed}
                  color={stats.passed > 0 ? 'text-emerald-400' : undefined}
                />
                <Pill
                  label="Failed"
                  value={stats.failed}
                  color={stats.failed > 0 ? 'text-red-400' : undefined}
                />
              </>
            )}
            <div className="border-l border-white/10 pl-3">
              <LLMStatusWidget />
            </div>
          </div>

          {/* Controls */}
          <div className="controls flex items-center gap-2 flex-shrink-0">
            {selectedTestTool && (
              <span className="text-xs px-2 py-1 rounded border border-sky-500/40 bg-sky-500/10 text-sky-300">
                {selectedTestTool === 'JIRA' && '🟣 Jira'}
                {selectedTestTool === 'AZURE' && '🔵 Azure DevOps'}
                {selectedTestTool === 'NA' && '⊗ Local'}
              </span>
            )}
            <LLMStatusWidget />
            <select className="select text-xs">
              <option>Chromium</option>
              <option>Firefox</option>
              <option>WebKit</option>
            </select>
            <select className="select text-xs">
              <option>DEV</option>
              <option>STAGE</option>
              <option>PROD</option>
            </select>
            <button
              onClick={() => {
                sessionStorage.clear()
                setIsLoggedIn(false)
                setSelectedTestTool(null)
              }}
              className="text-xs px-3 py-1.5 rounded bg-red-900/20 hover:bg-red-900/40 border border-red-700 text-red-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab Nav ── */}
      <nav className="px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center gap-1">
          {TOP_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                active === tab.id
                  ? 'border-sky-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-7xl mx-auto">

          {active === 'dashboard' && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <DashboardOverview />
                <ServerControls />
              </div>
              <div className="col-span-12 lg:col-span-8">
                <div className="dashboard-card h-full min-h-48">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-4">Quick Info</div>
                  <div className="space-y-2 text-sm text-gray-400">
                    <InfoRow label="Framework"    value="Playwright + Cucumber + TypeScript" />
                    <InfoRow label="Test Runner"  value="@playwright/test + Cucumber.js" />
                    <InfoRow label="Reporter"     value="Playwright HTML report with screenshots and video" />
                    <InfoRow label="Browser"      value="Chromium (Desktop Chrome)" />
                    <InfoRow label="Target App"   value="ServiceNow — Insurance Underwriting" />
                    <InfoRow label="Test Timeout" value="30 000 ms" />
                    <InfoRow label="Pattern"      value="Page Object Model (POM) + Cucumber BDD" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === 'explorer'      && <TestExplorer />}
          {active === 'manual-tests'  && <ManualTestCases selectedTestTool={selectedTestTool} preloadedRequirement={pendingRequirement} onRequirementConsumed={() => setPendingRequirement(null)} />}
          {active === 'test-scripts'  && <TestScripts />}
          {active === 'requirements'  && (
            <Requirements
              selectedTestTool={selectedTestTool}
              onNavigateToTestCases={req => {
                setPendingRequirement(req)
                setActive('manual-tests')
              }}
            />
          )}
          {active === 'reports'       && <Reports />}
          {active === 'data'     && <TestDataTable />}
          {active === 'services'      && <ValueAddedServices />}
          {active === 'llm'           && <LLMProviderSelector />}
          {active === 'structure' && (
            structure
              ? <TreeView data={structure} />
              : <div className="text-gray-400 text-sm">Loading project structure…</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Pill({ label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-2.5 py-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value ?? '–'}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-gray-500 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  )
}
