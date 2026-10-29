/**
 * Inspector Agent - Analyzes Live Application UI to Generate Locators
 * 
 * Uses Playwright to inspect application UI and Claude vision
 * to identify elements and suggest CSS selectors
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as winston from 'winston';
import { createLogger } from './logger';

export interface UIElement {
  id: string;
  role: string;
  text: string;
  tagName: string;
  className: string;
  dataTestId?: string;
  ariaLabel?: string;
  placeholder?: string;
  type?: string;
  selectors: {
    css: string;
    xpath: string;
  };
}

export interface LocatorSuggestion {
  elementId: string;
  semanticName: string;
  primarySelector: string;
  fallbackSelectors: string[];
  section: string;
  reasoning: string;
  confidence: number;
}

/**
 * Inspector Agent for analyzing live UI
 */
export class InspectorAgent {
  private logger: winston.Logger;
  private browser?: Browser;

  constructor() {
    this.logger = createLogger('inspector-agent');
  }

  /**
   * Start browser and navigate to application
   */
  async setupBrowser(appUrl: string): Promise<Page> {
    this.logger.info(`Starting browser and navigating to: ${appUrl}`);
    
    this.browser = await chromium.launch({ headless: false });
    const page = await this.browser.newPage();
    
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    this.logger.info('✓ Browser ready and page loaded');
    
    return page;
  }

  /**
   * Extract all interactive elements from the page
   */
  async extractPageElements(page: Page): Promise<UIElement[]> {
    this.logger.info('Extracting UI elements from page...');

    const elements = await page.evaluate(() => {
      const interactiveSelectors = [
        'button', 'a', 'input', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="tab"]',
        '[onclick]', '[data-testid]'
      ];

      const foundElements: any[] = [];
      const seen = new Set<string>();

      interactiveSelectors.forEach(selector => {
        try {
          const nodeList = document.querySelectorAll(selector);
          nodeList.forEach((el: Element) => {
            const key = el.outerHTML.substring(0, 100); // Unique key
            if (!seen.has(key) && foundElements.length < 50) { // Limit to 50 elements
              seen.add(key);
              
              const htmlEl = el as HTMLElement;
              foundElements.push({
                tagName: el.tagName.toLowerCase(),
                text: (el.textContent || '').trim().substring(0, 50),
                className: el.className,
                dataTestId: el.getAttribute('data-testid'),
                ariaLabel: el.getAttribute('aria-label'),
                type: el.getAttribute('type'),
                placeholder: el.getAttribute('placeholder'),
                role: el.getAttribute('role'),
                id: el.id,
              });
            }
          });
        } catch (e) {
          // Selector may not be valid, skip
        }
      });

      return foundElements;
    });

    this.logger.info(`✓ Found ${elements.length} interactive elements`);
    return elements.map((el, idx) => ({
      id: `element_${idx}`,
      ...el,
      selectors: { css: '', xpath: '' },
    }));
  }

  /**
   * Take screenshot for visual analysis
   */
  async takeScreenshot(page: Page, filename: string = 'ui-inspection'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = `screenshots/${filename}-${timestamp}.png`;
    
    await page.screenshot({ path: filepath });
    this.logger.info(`✓ Screenshot saved: ${filepath}`);
    
    return filepath;
  }

  /**
   * Analyze elements with Claude vision and generate locator suggestions
   */
  async analyzeElementsWithAI(
    elements: UIElement[],
    appName: string,
    storyId: string,
    screenshotPath: string
  ): Promise<LocatorSuggestion[]> {
    this.logger.info('Sending elements to Claude for locator analysis...');

    // Read screenshot as base64
    const screenshotBuffer = fs.readFileSync(screenshotPath);
    const screenshotBase64 = screenshotBuffer.toString('base64');

    const prompt = `
# UI Element Locator Generation

## Application: ${appName}
## Story: ${storyId}

## UI Elements Detected (in screenshot):

${elements.map((el, idx) => `
### ${idx + 1}. ${el.role || el.tagName.toUpperCase()}
- Text: "${el.text}"
- Class: ${el.className}
- Data-testid: ${el.dataTestId || 'N/A'}
- Aria-label: ${el.ariaLabel || 'N/A'}
- Type: ${el.type || 'N/A'}
- Placeholder: ${el.placeholder || 'N/A'}
`).join('\n')}

## Task:
For each element visible in the screenshot, provide:

1. A semantic name (e.g., "Login Button", "Email Input", "Search Bar")
2. The best CSS selector (primary)
3. 3-4 alternative CSS selectors (fallbacks)
4. Which section it belongs to (AUTH, FORMS, NAVIGATION, SEARCH, etc)
5. Confidence level (high/medium/low)
6. Brief reasoning for the selectors

## Selector Guidelines:
- Prefer text-based: \`button:has-text("Login")\`
- Use role: \`[role="button"]\`
- Use data attributes: \`[data-testid="submit-btn"]\`
- Use name/id: \`input[name="email"]\`, \`#username\`
- Use class combinations: \`button[class*="primary"]\`
- Avoid position-based selectors
- Avoid overly specific selectors

## Output Format:
\`\`\`json
{
  "locators": [
    {
      "elementId": "element_0",
      "semanticName": "Login Button",
      "section": "AUTH",
      "primarySelector": "button:has-text(\\"Login\\")",
      "fallbackSelectors": [
        "button[type=\\"submit\\"]",
        "button[class*=\\"login\\"]",
        "[data-testid=\\"login-btn\\"]",
        "button:nth-of-type(1)"
      ],
      "reasoning": "Text-based selector is most reliable, with fallbacks to type, class, and testid",
      "confidence": 0.95
    }
  ]
}
\`\`\`

Return ONLY valid JSON, no other text.
`;

    // Call Claude API with vision
    const response = await this.callClaudeWithVision(prompt, screenshotBase64);
    
    try {
      const parsed = JSON.parse(response);
      this.logger.info(`✓ AI generated ${parsed.locators.length} locator suggestions`);
      return parsed.locators;
    } catch (e) {
      this.logger.error(`Failed to parse AI response: ${e}`);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Call Claude API with vision capability
   */
  private callClaudeWithVision(prompt: string, imageBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        reject(new Error('AI_API_KEY not set in environment'));
      }

      const data = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const response = JSON.parse(responseData);
              const content = response.content?.[0]?.text || '';
              resolve(content);
            } else {
              const error = JSON.parse(responseData);
              reject(new Error(`Claude API error: ${error.error?.message}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Claude response: ${e}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Generate locator TypeScript file from suggestions
   */
  async generateLocatorFile(
    suggestions: LocatorSuggestion[],
    pageName: string,
    outputDir: string = 'locators'
  ): Promise<string> {
    // Group by section
    const sections: { [key: string]: LocatorSuggestion[] } = {};
    
    suggestions.forEach((suggestion) => {
      if (!sections[suggestion.section]) {
        sections[suggestion.section] = [];
      }
      sections[suggestion.section].push(suggestion);
    });

    // Generate TypeScript code
    let code = `/**
 * ${pageName} Locators
 * 
 * Auto-generated by Inspector Agent
 * Generated at: ${new Date().toISOString()}
 * 
 * Locators are organized by semantic sections with multiple
 * selector fallbacks for self-healing resilience.
 */

`;

    // Generate sections
    Object.entries(sections).forEach(([section, elements]) => {
      code += `const ${section}_LOCATORS = {\n`;
      
      elements.forEach((el) => {
        const allSelectors = [el.primarySelector, ...el.fallbackSelectors]
          .map((s) => `'${s}'`)
          .join(', ');
        
        code += `  /**\n`;
        code += `   * ${el.semanticName}\n`;
        code += `   * Confidence: ${Math.round(el.confidence * 100)}%\n`;
        code += `   * ${el.reasoning}\n`;
        code += `   */\n`;
        code += `  ${el.semanticName.replace(/\s+/g, '')}: ${allSelectors},\n\n`;
      });
      
      code += `};\n\n`;
    });

    // Export statement
    code += `export const ${pageName}Locators = {\n`;
    Object.keys(sections).forEach((section) => {
      code += `  ...${section}_LOCATORS,\n`;
    });
    code += `};\n`;

    // Save to file
    const filename = `${pageName}.locators.ts`;
    const filepath = path.join(outputDir, filename);
    
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filepath, code, 'utf-8');
    
    this.logger.info(`✓ Locator file saved: ${filepath}`);
    return filepath;
  }

  /**
   * Close browser
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.logger.info('✓ Browser closed');
    }
  }

  /**
   * Full inspection workflow
   */
  async inspectAndGenerateLocators(
    appUrl: string,
    appName: string,
    storyId: string,
    pageName: string
  ): Promise<{ locatorsFile: string; suggestions: LocatorSuggestion[] }> {
    try {
      // 1. Setup browser
      const page = await this.setupBrowser(appUrl);

      // 2. Extract elements
      const elements = await this.extractPageElements(page);

      // 3. Take screenshot
      const screenshotPath = await this.takeScreenshot(page, `${pageName}-inspection`);

      // 4. Analyze with AI
      const suggestions = await this.analyzeElementsWithAI(
        elements,
        appName,
        storyId,
        screenshotPath
      );

      // 5. Generate locator file
      const locatorsFile = await this.generateLocatorFile(suggestions, pageName);

      this.logger.info('✓ Inspection complete');
      return { locatorsFile, suggestions };
    } finally {
      await this.cleanup();
    }
  }
}

export default InspectorAgent;
