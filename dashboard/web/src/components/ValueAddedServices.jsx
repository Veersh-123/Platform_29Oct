import React, { useState } from 'react'
import FrameworkMigrator from './FrameworkMigrator'
import TensaiImporter from './TensaiImporter'

export default function ValueAddedServices() {
  const [selectedService, setSelectedService] = useState(null)

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
    }
  ]

  if (selectedService === 'migrator') {
    return (
      <div>
        <button
          onClick={() => setSelectedService(null)}
          className="mb-4 px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 transition-colors"
        >
          ← Back to Services
        </button>
        <FrameworkMigrator />
      </div>
    )
  }

  if (selectedService === 'tensai') {
    return (
      <div>
        <button
          onClick={() => setSelectedService(null)}
          className="mb-4 px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 transition-colors"
        >
          ← Back to Services
        </button>
        <TensaiImporter />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-card">
        <h3 className="text-lg font-bold text-white mb-2">Value Added Services</h3>
        <p className="text-sm text-gray-400">Enhance your testing workflow with specialized tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => setSelectedService(service.id)}
            className="dashboard-card group hover:shadow-lg hover:shadow-white/10 transition-all duration-300 text-left"
          >
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
  )
}
