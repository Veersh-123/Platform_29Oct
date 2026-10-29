/**
 * Wrapper that loads .env from the project root, then spawns the
 * Framework-migrator MCP server. This allows mcp.json to reference
 * environment variables defined in .env without requiring them to be
 * set as system-level env vars.
 *
 * Usage in mcp.json:
 *   "command": "node",
 *   "args": ["<path-to-project>/ADO_Connector/run-mcp-migrator.js"]
 */

const path   = require('path');
const dotenv = require('dotenv');

// Load .env from the project root (two levels up from this file)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serverJs = process.env.SELENIUM_MCP_SERVER_JS;
if (!serverJs) {
  console.error('SELENIUM_MCP_SERVER_JS is not set in .env');
  process.exit(1);
}

// Delegate to the actual MCP server
require(serverJs);
