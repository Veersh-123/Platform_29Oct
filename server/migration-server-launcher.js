/**
 * Migration Server Launcher
 * Starts the Selenium to Playwright migration backend server
 * This ensures the MigrationAgent backend is available when needed
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MIGRATION_SERVER_PATH = path.join(
  __dirname,
  '..',
  'Value added services',
  'MigrationAgent',
  'MigrationAgent',
  'selenium-playwruight-migration',
  'backend'
);

const MIGRATION_PORT = process.env.MIGRATION_PORT || 5000;

/**
 * Start the migration backend server
 */
function startMigrationServer() {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Starting Migration Server...`);
    console.log(`   Path: ${MIGRATION_SERVER_PATH}`);
    console.log(`   Port: ${MIGRATION_PORT}\n`);

    // Check if the migration server path exists
    if (!fs.existsSync(MIGRATION_SERVER_PATH)) {
      console.warn(`⚠️  Migration server path not found: ${MIGRATION_SERVER_PATH}`);
      console.warn(`   Migration backend will not be available`);
      resolve(null);
      return;
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(MIGRATION_SERVER_PATH, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.warn(`⚠️  node_modules not found in migration server`);
      console.warn(`   Skipping migration server startup`);
      console.warn(`   To enable: npm install in ${MIGRATION_SERVER_PATH}`);
      resolve(null);
      return;
    }

    // Start the migration backend server using npm start
    const migrationProcess = spawn('npm', ['start'], {
      cwd: MIGRATION_SERVER_PATH,
      env: {
        ...process.env,
        PORT: MIGRATION_PORT,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let startupTimeout = setTimeout(() => {
      console.log(
        `\n✅ Migration Server startup initiated on port ${MIGRATION_PORT}`
      );
      console.log(
        `   For full UI, visit: http://localhost:5174`
      );
      resolve(migrationProcess);
    }, 3000);

    migrationProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Migration] ${output}`);

      if (output.includes('listening') || output.includes('running')) {
        clearTimeout(startupTimeout);
        console.log(
          `✅ Migration Server ready on http://localhost:${MIGRATION_PORT}`
        );
        console.log(
          `🌐 Migration UI available at http://localhost:5174\n`
        );
        resolve(migrationProcess);
      }
    });

    migrationProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error(`[Migration Error] ${errorOutput}`);
    });

    migrationProcess.on('error', (error) => {
      console.warn(
        `⚠️  Migration Server warning: ${error.message}`
      );
      clearTimeout(startupTimeout);
      // Don't reject - allow platform to continue even if migration server fails
      resolve(null);
    });

    migrationProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(
          `⚠️  Migration Server exited with code ${code}`
        );
      }
    });
  });
}

module.exports = { startMigrationServer };
