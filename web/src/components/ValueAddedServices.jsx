import React, { useState } from 'react'
import FrameworkMigrator from './FrameworkMigrator'
import TensaiImporter from './TensaiImporter'
import SelfHealing from './SelfHealing'
import UserSettings from './UserSettings'

const HEALER_FEATURES = {
  headline: 'Playwright AI Healer',
  tagline: 'An AI-powered autonomous test healer — repairs broken locators, dismisses popups, detects missing steps, and generates healing reports.',
  badge: 'Never force-passes tests. Only repairs structural issues.',
  features: [
    {
      icon: '🚫',
      title: 'Popup Handler',
      desc: 'Automatically dismisses cookie banners, modals, and consent dialogs that block test execution.',
      color: 'from-rose-500 to-red-600',
    },
    {
      icon: '🎯',
      title: 'Locator Healer',
      desc: 'Detects broken locators, uses live DOM snapshot + AI to find the correct replacement. Patches source files in-place with up to 3 retries.',
      color: 'from-sky-500 to-blue-600',
    },
    {
      icon: '🔍',
      title: 'Step Validator',
      desc: 'Identifies missing navigation or interaction steps and outdated page objects, then patches test and page-object files automatically.',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: '📊',
      title: 'HTML Healing Report',
      desc: 'Generates a detailed per-run healing log with summary cards, per-entry tables showing original vs healed values and attempt counts.',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: '🔌',
      title: 'MCP Plugin',
      desc: 'Exposes all capabilities as MCP tools consumable by any MCP-compatible client including Kiro and Claude Desktop.',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: '🩹',
      title: 'Full Heal',
      desc: 'Runs all healing steps — popup handling, step validation, and locator repair — in a single call.',
      color: 'from-green-500 to-emerald-700',
    },
  ],
  tools: [
    { name: 'handle_popups',     desc: 'Dismiss all visible popups on a URL' },
    { name: 'heal_locator',      desc: 'Repair a broken locator using live DOM + AI' },
    { name: 'validate_step',     desc: 'Detect missing steps / outdated page objects and patch files' },
    { name: 'get_page_snapshot', desc: 'Capture DOM/accessibility snapshot for debugging' },
    { name: 'full_heal',         desc: 'Run all healing steps in one call' },
  ],
  envVars: [
    { key: 'AI_PROVIDER',          default: 'openai',                       desc: 'openai or anthropic' },
    { key: 'OPENAI_API_KEY',       default: '—',                            desc: 'OpenAI API key' },
    { key: 'OPENAI_MODEL',         default: 'gpt-4o',                       desc: 'Model name' },
    { key: 'ANTHROPIC_API_KEY',    default: '—',                            desc: 'Anthropic API key' },
    { key: 'HEALER_MAX_RETRIES',   default: '3',                            desc: 'Max heal attempts per issue' },
    { key: 'HEALER_LOG_DIR',       default: './healing-logs',               desc: 'HTML report output directory' },
  ],
}

function HealerModal({ onClose, onOpen }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-gray-950 shadow-2xl shadow-emerald-500/10">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-5 bg-gray-950 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-2xl flex-shrink-0">
              🩹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{HEALER_FEATURES.headline}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  ● LIVE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 max-w-lg">{HEALER_FEATURES.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Safety note */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-400 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-300">{HEALER_FEATURES.badge}</p>
          </div>

          {/* Feature cards */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Core Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEALER_FEATURES.features.map(f => (
                <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-lg flex-shrink-0`}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white mb-0.5">{f.title}</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MCP Tools table */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">MCP Tools</p>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400">
                    <th className="text-left px-4 py-2.5 font-medium">Tool</th>
                    <th className="text-left px-4 py-2.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {HEALER_FEATURES.tools.map(t => (
                    <tr key={t.name} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-mono text-sky-300 whitespace-nowrap">{t.name}</td>
                      <td className="px-4 py-2.5 text-gray-400">{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Env vars */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Environment Variables</p>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400">
                    <th className="text-left px-4 py-2.5 font-medium">Variable</th>
                    <th className="text-left px-4 py-2.5 font-medium">Default</th>
                    <th className="text-left px-4 py-2.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {HEALER_FEATURES.envVars.map(e => (
                    <tr key={e.key} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-mono text-emerald-300 whitespace-nowrap">{e.key}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">{e.default}</td>
                      <td className="px-4 py-2.5 text-gray-400">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 bg-gray-950 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors"
          >
            Close
          </button>
          <button
            onClick={onOpen}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20"
          >
            Open Self Healing Tool →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ValueAddedServices() {
  const [selectedService, setSelectedService] = useState(null)
  const [showHealerModal, setShowHealerModal] = useState(false)

  const services = [
    {
      id: 'migrator',
      name: 'Framework Migrator',
      icon: '🔄',
      description: 'Convert Selenium tests to Playwright',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 'tensai',
      name: 'Tensai-Script Importer',
      icon: '📥',
      description: 'Convert Python Playwright scripts to TypeScript',
      color: 'from-indigo-600 to-sky-600'
    },
    {
      id: 'coverage',
      name: 'Coverage Analyzer',
      icon: '📊',
      description: 'Analyze test coverage metrics',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      id: 'performance',
      name: 'Performance Monitor',
      icon: '⚡',
      description: 'Monitor test execution performance',
      color: 'from-yellow-600 to-orange-600'
    },
    {
      id: 'token-counter',
      name: 'Token Counter',
      icon: '🪙',
      description: 'Track and analyze AI token usage across test runs',
      color: 'from-emerald-600 to-teal-600'
    },
    {
      id: 'mobile-integrator',
      name: 'Mobile Integrator',
      icon: '📱',
      description: 'Integrate and run tests on mobile devices',
      color: 'from-rose-600 to-red-600'
    },
    {
      id: 'self-healing',
      name: 'Self Healing',
      icon: '🩹',
      description: 'AI-powered test repair via playwright-ai-healer MCP',
      color: 'from-green-500 to-emerald-700',
      live: true
    },
    {
      id: 'user-settings',
      name: 'User Settings',
      icon: '⚙️',
      description: 'Manage profile, MCP & LLM configuration, and environment',
      color: 'from-indigo-500 to-purple-600'
    }
  ]

  const BackButton = () => (
    <button
      onClick={() => setSelectedService(null)}
      className="mb-4 px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 transition-colors"
    >
      ← Back to Services
    </button>
  )

  const handleCardClick = (id) => {
    if (id === 'self-healing') {
      setShowHealerModal(true)
    } else {
      setSelectedService(id)
    }
  }

  if (selectedService === 'observability') return <div><BackButton /><TestObservability /></div>
  if (selectedService === 'migrator') return <div><BackButton /><FrameworkMigrator /></div>
  if (selectedService === 'tensai')   return <div><BackButton /><TensaiImporter /></div>
  if (selectedService === 'self-healing') return <div><BackButton /><SelfHealing /></div>
  if (selectedService === 'user-settings') return <div><BackButton /><UserSettings /></div>

  return (
    <>
      {/* Healer feature modal */}
      {showHealerModal && (
        <HealerModal
          onClose={() => setShowHealerModal(false)}
          onOpen={() => { setShowHealerModal(false); setSelectedService('self-healing') }}
        />
      )}

      <div className="space-y-6">
        <div className="dashboard-card">
          <h3 className="text-lg font-bold text-white mb-2">Value Added Services</h3>
          <p className="text-sm text-gray-400">Enhance your testing workflow with specialized tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <button
              key={service.id}
              onClick={() => handleCardClick(service.id)}
              className="dashboard-card group hover:shadow-lg hover:shadow-white/10 transition-all duration-300 text-left relative"
            >
              {service.live && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  ● LIVE
                </span>
              )}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                {service.icon}
              </div>
              <h4 className="font-semibold text-white mb-1">{service.name}</h4>
              <p className="text-xs text-gray-400">{service.description}</p>
              <div className="mt-3 flex items-center text-sky-400 text-xs font-medium">
                Open <span className="ml-1">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
