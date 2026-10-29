'use strict';

const ROOT = require('node:path').resolve(__dirname, '..');
const { parseRepairResponse } = require('./script-repair');

function createRepairWorkspace(repairFiles) {
  const files = new Map();
  const proposals = new Map();
  let totalContentLength = 0;
  for (const item of repairFiles || []) {
    if (!item || typeof item.file !== 'string' || typeof item.content !== 'string') {
      throw new Error('Copilot repair workspace files require a path and content.');
    }
    const file = item.file.replace(/\\/g, '/').replace(/^\.\//, '');
    if (file.startsWith('/') || /^[a-z]:/i.test(file) || file.split('/').includes('..')
      || !/\.(?:spec\.)?(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(file)) {
      throw new Error(`Copilot repair workspace rejected an out-of-scope file: ${file}`);
    }
    if (item.content.length > 100000) {
      throw new Error(`Copilot repair workspace source exceeds the 100 KB limit: ${file}`);
    }
    totalContentLength += item.content.length;
    if (totalContentLength > 500000) {
      throw new Error('Copilot repair workspace source exceeds the 500 KB total limit.');
    }
    if (files.has(file)) throw new Error(`Copilot repair workspace contains a duplicate file: ${file}`);
    files.set(file, { content: item.content, editable: item.editable === true });
  }

  return {
    files,
    proposals,
    readFile(file) {
      const entry = files.get(String(file || '').replace(/\\/g, '/').replace(/^\.\//, ''));
      if (!entry) throw new Error('That file is not in this test repair workspace.');
      return entry.content;
    },
    proposeFileUpdate(file, content) {
      const normalizedFile = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '');
      const entry = files.get(normalizedFile);
      if (!entry || !entry.editable) {
        throw new Error('Copilot can propose changes only to the selected test and its imported page/locator files.');
      }
      if (typeof content !== 'string' || !content.trim() || content.length > 100000) {
        throw new Error('A proposed repair must contain complete non-empty file contents under 100 KB.');
      }
      proposals.set(normalizedFile, content);
      return { accepted: true, file: normalizedFile };
    },
  };
}

function isSupportedNodeVersion(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return (major === 20 && minor >= 19) || (major >= 22 && (major > 22 || minor >= 12));
}

async function withCopilotClient(callback) {
  if (!isSupportedNodeVersion()) {
    throw new Error(
      `GitHub Copilot SDK requires Node.js ^20.19.0 or >=22.12.0; current runtime is ${process.versions.node}.`,
    );
  }

  const { CopilotClient } = await import('@github/copilot-sdk');
  const client = new CopilotClient({ workingDirectory: ROOT });
  await client.start();
  try {
    return await callback(client);
  } finally {
    await client.stop();
  }
}

async function getCopilotStatus() {
  if (!isSupportedNodeVersion()) {
    return {
      supported: true,
      configured: false,
      authenticated: false,
      message: `Copilot SDK requires Node.js ^20.19.0 or >=22.12.0; current runtime is ${process.versions.node}.`,
    };
  }

  try {
    return await withCopilotClient(async client => {
      const auth = await client.getAuthStatus();
      return {
        supported: true,
        configured: auth.isAuthenticated,
        authenticated: auth.isAuthenticated,
        account: auth.isAuthenticated ? auth.login || null : null,
        authType: auth.isAuthenticated ? auth.authType || null : null,
        message: auth.statusMessage || (auth.isAuthenticated
          ? 'GitHub Copilot CLI is authenticated.'
          : 'Sign in to GitHub Copilot CLI to use Copilot from the dashboard.'),
      };
    });
  } catch (error) {
    console.error('Unable to check GitHub Copilot SDK authentication:', error.message);
    return {
      supported: true,
      configured: false,
      authenticated: false,
      message: `GitHub Copilot is unavailable: ${error.message}`,
    };
  }
}

async function generateWithCopilot(prompt, model, options = {}) {
  return withCopilotClient(async client => {
    const repairWorkspace = options.repairFiles
      ? createRepairWorkspace(options.repairFiles)
      : null;
    const { defineTool } = repairWorkspace
      ? await import('@github/copilot-sdk')
      : {};
    const session = await client.createSession({
      workingDirectory: ROOT,
      availableTools: repairWorkspace
        ? ['custom:read_repair_file', 'custom:propose_repair']
        : [],
      ...(repairWorkspace ? {
        toolSearch: { enabled: false },
        tools: [
          defineTool('read_repair_file', {
            description: 'Read one source file already allow-listed for the current failing Playwright test. This is read-only.',
            parameters: {
              type: 'object',
              properties: { file: { type: 'string' } },
              required: ['file'],
              additionalProperties: false,
            },
            skipPermission: true,
            handler: ({ file }) => repairWorkspace.readFile(file),
          }),
          defineTool('propose_repair', {
            description: 'Submit a complete proposed replacement for the selected spec or one of its imported page/locator files. This stages a proposal; the server validates and applies accepted changes.',
            parameters: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['file', 'content'],
              additionalProperties: false,
            },
            skipPermission: true,
            handler: ({ file, content }) => repairWorkspace.proposeFileUpdate(file, content),
          }),
        ],
      } : {}),
      ...(model ? { model } : {}),
    });
    try {
      const response = await session.sendAndWait(prompt, 180000);
      const content = response?.data?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('GitHub Copilot returned an empty response.');
      }
      if (!repairWorkspace || repairWorkspace.proposals.size === 0) return content;

      const repair = parseRepairResponse(content);
      const proposedFiles = Array.isArray(repair.updatedFiles) ? repair.updatedFiles : [];
      const mergedFiles = new Map(proposedFiles
        .filter(item => item && typeof item.file === 'string')
        .map(item => [item.file.replace(/\\/g, '/').replace(/^\.\//, ''), item]));
      for (const [file, proposedContent] of repairWorkspace.proposals) {
        const specFile = /\.spec\.(?:ts|js)$/i.test(file);
        if (specFile) repair.updatedScript = proposedContent;
        else mergedFiles.set(file, { file, content: proposedContent });
      }
      repair.updatedFiles = [...mergedFiles.values()];
      return JSON.stringify(repair);
    } finally {
      await session.disconnect();
    }
  });
}

module.exports = {
  createRepairWorkspace,
  generateWithCopilot,
  getCopilotStatus,
  isSupportedNodeVersion,
};
