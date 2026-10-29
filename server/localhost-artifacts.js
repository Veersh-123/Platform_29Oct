'use strict';

const fs = require('fs');
const path = require('path');

function resolveLocalStory(rootDir, sourceFile) {
  if (typeof sourceFile !== 'string' || !sourceFile.trim()) {
    throw new Error('sourceFile is required for LocalHost requirements');
  }

  const requirementsDir = path.resolve(rootDir, 'Requirements');
  const normalizedFile = sourceFile.replace(/[\\/]+/g, path.sep);
  if (path.isAbsolute(normalizedFile) || /^[a-z]:/i.test(normalizedFile)) {
    throw new Error('sourceFile must be a path relative to Requirements');
  }

  const absoluteFile = path.resolve(requirementsDir, normalizedFile);
  const relativeFile = path.relative(requirementsDir, absoluteFile);
  if (!relativeFile || relativeFile === '..' || relativeFile.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFile)) {
    throw new Error('sourceFile must resolve to a file inside Requirements');
  }
  if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
    throw new Error('LocalHost requirement file was not found');
  }
  const realRequirementsDir = fs.realpathSync(requirementsDir);
  const realFile = fs.realpathSync(absoluteFile);
  const realRelativeFile = path.relative(realRequirementsDir, realFile);
  if (!realRelativeFile || realRelativeFile === '..' || realRelativeFile.startsWith(`..${path.sep}`) || path.isAbsolute(realRelativeFile)) {
    throw new Error('sourceFile must resolve to a file inside Requirements');
  }

  const stem = path.basename(absoluteFile, path.extname(absoluteFile));
  const folderName = stem.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  if (!folderName) throw new Error('LocalHost requirement filename has no usable characters');

  return {
    issueKey: folderName,
    folderName,
    sourceFile: relativeFile.split(path.sep).join('/'),
    artifactFolder: path.posix.join('LocalHost', folderName),
  };
}

function ensureLocalArtifactDirectories(rootDir, artifactFolder) {
  const directories = ['specs', 'tests', 'Locators', 'Test_Data', 'pages'];
  for (const directory of directories) {
    fs.mkdirSync(path.join(rootDir, directory, ...artifactFolder.split('/')), { recursive: true });
  }
}

function splitTopLevel(source, delimiter) {
  const parts = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let parens = 0;
  let brackets = 0;
  let braces = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') parens += 1;
    else if (char === ')') parens -= 1;
    else if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    else if (char === '{') braces += 1;
    else if (char === '}') braces -= 1;
    else if (char === delimiter && parens === 0 && brackets === 0 && braces === 0) {
      parts.push(source.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function extractObjectBody(source, exportName) {
  const escapedName = exportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*\\{`);
  const match = declaration.exec(source);
  if (!match) throw new Error(`Locator source must export ${exportName} as an object literal.`);

  const openingBrace = source.indexOf('{', match.index);
  let quote = '';
  let escaped = false;
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return source.slice(openingBrace + 1, index);
  }
  throw new Error(`Locator source for ${exportName} has an unterminated object literal.`);
}

function formatLocatorArtifact(source, exportName) {
  const exportCount = (source.match(/export\s+(?:const|let|var|class|function)\s+/g) || []).length;
  if (exportCount !== 1 || source.includes('export class ')) {
    throw new Error('Locator source must contain exactly one exported locator object.');
  }

  const body = extractObjectBody(source, exportName);
  const properties = splitTopLevel(body, ',')
    .map(property => property.trim())
    .filter(Boolean)
    .map(property => {
      const [key, ...valueParts] = splitTopLevel(property, ':');
      const value = valueParts.join(':').trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(key.trim()) || !value || key.trim().startsWith('...')) {
        throw new Error('Locator object properties must use named keys and explicit selector values.');
      }
      return `  ${key.trim()}: ${value},`;
    });
  if (!properties.length) throw new Error('Locator object must define at least one selector.');
  if (new Set(properties.map(property => property.match(/^\s*([^:]+):/)[1])).size !== properties.length) {
    throw new Error('Locator object contains duplicate selector keys.');
  }
  return `export const ${exportName} = {\n${properties.join('\n')}\n};\n`;
}

function parseTestCaseData(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      return { input: value };
    }
  }
  return {};
}

function buildLocalTestData(storyId, summary, testCases, requirementText = '') {
  const allCases = ['positive', 'negative', 'edge'].flatMap(category => testCases[category] || []);
  const fallbackUrl = `${requirementText}\n${allCases.flatMap(testCase => testCase.steps || []).join('\n')}`
    .match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/[),.;]+$/, '');
  const cases = allCases.map(testCase => {
    const data = parseTestCaseData(testCase.testData);
    if (!Object.keys(data).length) {
      const steps = (testCase.steps || []).filter(step => !/password|secret|token/i.test(step));
      const selectedValues = [...new Set(steps.flatMap(step =>
        [...step.matchAll(/["']([^"'\\n]{1,100})["']/g)].map(match => match[1].trim())
      ))];
      if (fallbackUrl) data.url = fallbackUrl;
      if (selectedValues.length) data.inputs = selectedValues;
      if (!Object.keys(data).length) data.scenario = testCase.title || testCase.id;
    }
    return {
      testCaseId: testCase.id,
      label: `${testCase.id} — ${testCase.title}`,
      title: testCase.title,
      type: testCase.type || 'Positive',
      data,
    };
  });
  return {
    storyId,
    summary: summary || storyId,
    generatedOn: new Date().toISOString(),
    ...(fallbackUrl ? { baseUrl: fallbackUrl } : {}),
    testCases: cases,
    metadata: {
      totalCases: cases.length,
      positive: (testCases.positive || []).length,
      negative: (testCases.negative || []).length,
      edge: (testCases.edge || []).length,
    },
  };
}

module.exports = {
  resolveLocalStory,
  ensureLocalArtifactDirectories,
  formatLocatorArtifact,
  buildLocalTestData,
};
