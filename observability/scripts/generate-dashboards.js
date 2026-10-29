#!/usr/bin/env node

/**
 * Dashboard Generation Script
 * Generates observability dashboards from test result files
 */

const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '../examples');
const DASHBOARD_DIR = path.join(__dirname, '../dashboard');
const OUTPUT_DIR = path.join(__dirname, '../../observability/dashboard');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Read Cucumber results
 */
function readCucumberResults() {
  const filePath = path.join(EXAMPLES_DIR, 'cucumber-results.json');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Cucumber results not found: ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Parse Cucumber results to extract metrics
 */
function parseCucumberMetrics(results) {
  let totalFeatures = 0;
  let totalScenarios = 0;
  let passedScenarios = 0;
  let failedScenarios = 0;
  let skippedScenarios = 0;
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;
  let skippedSteps = 0;
  let totalTime = 0;

  results.forEach(feature => {
    totalFeatures++;
    
    feature.elements?.forEach(scenario => {
      totalScenarios++;
      let scenarioPassed = true;
      let scenarioSkipped = false;

      scenario.steps?.forEach(step => {
        totalSteps++;
        const status = step.result?.status;
        
        if (status === 'passed') {
          passedSteps++;
        } else if (status === 'failed') {
          failedSteps++;
          scenarioPassed = false;
        } else if (status === 'skipped') {
          skippedSteps++;
          scenarioSkipped = true;
        }
        
        totalTime += step.result?.duration || 0;
      });

      if (scenarioSkipped) {
        skippedScenarios++;
      } else if (scenarioPassed) {
        passedScenarios++;
      } else {
        failedScenarios++;
      }
    });
  });

  return {
    totalFeatures,
    totalScenarios,
    passedScenarios,
    failedScenarios,
    skippedScenarios,
    totalSteps,
    passedSteps,
    failedSteps,
    skippedSteps,
    totalTime: totalTime / 1000000000, // Convert nanoseconds to seconds
    passRate: totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : 0
  };
}

/**
 * Generate HTML dashboard
 */
function generateDashboard(metrics, outputFile) {
  const timestamp = new Date().toLocaleString();
  const passPercentage = metrics.passRate;
  const failPercentage = ((metrics.failedScenarios / metrics.totalScenarios) * 100).toFixed(2);
  const skipPercentage = ((metrics.skippedScenarios / metrics.totalScenarios) * 100).toFixed(2);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Observability Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: #333;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      color: #1e3c72;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .timestamp {
      color: #666;
      font-size: 14px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      border-top: 4px solid #2a5298;
    }
    
    .metric-card.passed {
      border-top-color: #22c55e;
    }
    
    .metric-card.failed {
      border-top-color: #ef4444;
    }
    
    .metric-card.skipped {
      border-top-color: #f59e0b;
    }
    
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #1e3c72;
      margin: 10px 0;
    }
    
    .metric-label {
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .chart-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e3c72;
      margin-bottom: 20px;
    }
    
    canvas {
      max-height: 300px;
    }
    
    footer {
      background: rgba(255, 255, 255, 0.9);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    }
    
    .pass-rate {
      color: #22c55e;
      font-weight: bold;
    }
    
    .fail-rate {
      color: #ef4444;
      font-weight: bold;
    }
    
    .skip-rate {
      color: #f59e0b;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 Test Observability Dashboard</h1>
      <p class="timestamp">Generated: ${timestamp}</p>
    </header>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Features</div>
        <div class="metric-value">${metrics.totalFeatures}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Scenarios</div>
        <div class="metric-value">${metrics.totalScenarios}</div>
      </div>
      <div class="metric-card passed">
        <div class="metric-label">Passed</div>
        <div class="metric-value">${metrics.passedScenarios}</div>
      </div>
      <div class="metric-card failed">
        <div class="metric-label">Failed</div>
        <div class="metric-value">${metrics.failedScenarios}</div>
      </div>
      <div class="metric-card skipped">
        <div class="metric-label">Skipped</div>
        <div class="metric-value">${metrics.skippedScenarios}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Steps</div>
        <div class="metric-value">${metrics.totalSteps}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value pass-rate">${passPercentage}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Execution Time</div>
        <div class="metric-value">${metrics.totalTime.toFixed(2)}s</div>
      </div>
    </div>
    
    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">📊 Scenario Status Distribution</div>
        <canvas id="statusChart"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">📈 Step Results</div>
        <canvas id="stepsChart"></canvas>
      </div>
    </div>
    
    <footer>
      <p>Orchestrator Platform | Test Observability Integration</p>
      <p>Generated by Failure Analysis & Observability MCP Server</p>
    </footer>
  </div>
  
  <script>
    // Scenario Status Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${metrics.passedScenarios}, ${metrics.failedScenarios}, ${metrics.skippedScenarios}],
          backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
          borderColor: ['#16a34a', '#dc2626', '#d97706'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 },
              padding: 20
            }
          }
        }
      }
    });
    
    // Steps Chart
    const stepsCtx = document.getElementById('stepsChart').getContext('2d');
    new Chart(stepsCtx, {
      type: 'bar',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          label: 'Steps',
          data: [${metrics.passedSteps}, ${metrics.failedSteps}, ${metrics.skippedSteps}],
          backgroundColor: ['#22c55e', '#ef4444', '#f59e0b']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: { font: { size: 12 } }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;

  fs.writeFileSync(outputFile, html);
  console.log(`✅ Dashboard generated: ${outputFile}`);
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'all';
  
  console.log('\n📊 Observability Dashboard Generator\n');
  
  try {
    if (command === 'cucumber' || command === 'all') {
      console.log('Processing Cucumber results...');
      const cucumberResults = readCucumberResults();
      
      if (cucumberResults) {
        const metrics = parseCucumberMetrics(cucumberResults);
        console.log('\n📈 Cucumber Metrics:');
        console.log(`   Features: ${metrics.totalFeatures}`);
        console.log(`   Scenarios: ${metrics.totalScenarios} (${metrics.passedScenarios} passed, ${metrics.failedScenarios} failed, ${metrics.skippedScenarios} skipped)`);
        console.log(`   Pass Rate: ${metrics.passRate}%`);
        console.log(`   Steps: ${metrics.totalSteps} (${metrics.passedSteps} passed, ${metrics.failedSteps} failed, ${metrics.skippedSteps} skipped)`);
        
        const dashboardFile = path.join(OUTPUT_DIR, 'cucumber-dashboard.html');
        generateDashboard(metrics, dashboardFile);
      }
    }
    
    console.log('\n✨ Dashboard generation complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
