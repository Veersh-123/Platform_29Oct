/**
 * TensaiExecutor - Bridge to execute Tensai Python scripts from TypeScript
 * Provides integration between TypeScript Playwright tests and Python Tensai framework
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface TensaiScriptResult {
  success: boolean;
  status: string;
  duration: number;
  output: string;
  errors: string[];
  script: string;
}

export class TensaiExecutor {
  private pythonPath: string;
  private frameworkPath: string;
  private logsDir: string;

  constructor(options?: {
    pythonPath?: string;
    frameworkPath?: string;
    logsDir?: string;
  }) {
    this.pythonPath = options?.pythonPath || 'python';
    this.frameworkPath = options?.frameworkPath || path.join(process.cwd(), 'TensaiNG_Framework');
    this.logsDir = options?.logsDir || path.join(this.frameworkPath, 'logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Execute a single Tensai Python script
   */
  async executeSingle(
    scriptPath: string,
    options?: {
      headless?: boolean;
      timeout?: number;
      browserType?: string;
    }
  ): Promise<TensaiScriptResult> {
    const startTime = Date.now();
    const absoluteScriptPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(process.cwd(), scriptPath);

    if (!fs.existsSync(absoluteScriptPath)) {
      return {
        success: false,
        status: 'failed',
        duration: 0,
        output: '',
        errors: [`Script not found: ${absoluteScriptPath}`],
        script: scriptPath,
      };
    }

    const runScript = path.join(this.frameworkPath, 'run.py');

    try {
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} "${runScript}" "${absoluteScriptPath}"`,
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        status: 'completed',
        duration,
        output: stdout,
        errors: stderr ? [stderr] : [],
        script: scriptPath,
      };
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      
      return {
        success: false,
        status: 'failed',
        duration,
        output: error.stdout || '',
        errors: [
          error.message,
          error.stderr || '',
        ].filter(Boolean),
        script: scriptPath,
      };
    }
  }

  /**
   * Execute multiple Tensai Python scripts in sequence
   */
  async executeBatch(
    scriptPaths: string[],
    options?: {
      headless?: boolean;
      timeout?: number;
      stopOnError?: boolean;
    }
  ): Promise<TensaiScriptResult[]> {
    const results: TensaiScriptResult[] = [];

    for (const scriptPath of scriptPaths) {
      const result = await this.executeSingle(scriptPath, options);
      results.push(result);

      if (!result.success && options?.stopOnError) {
        console.log('Stopping execution due to error');
        break;
      }
    }

    return results;
  }

  /**
   * Execute a Tensai script with streaming output (useful for debugging)
   */
  async executeWithStreaming(
    scriptPath: string,
    onOutput?: (data: string) => void,
    onError?: (data: string) => void
  ): Promise<TensaiScriptResult> {
    const startTime = Date.now();
    const absoluteScriptPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(process.cwd(), scriptPath);

    if (!fs.existsSync(absoluteScriptPath)) {
      return {
        success: false,
        status: 'failed',
        duration: 0,
        output: '',
        errors: [`Script not found: ${absoluteScriptPath}`],
        script: scriptPath,
      };
    }

    return new Promise((resolve) => {
      const runScript = path.join(this.frameworkPath, 'run.py');
      const child = spawn(this.pythonPath, [runScript, absoluteScriptPath], {
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (onOutput) {
          onOutput(text);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (onError) {
          onError(text);
        }
      });

      child.on('close', (code) => {
        const duration = (Date.now() - startTime) / 1000;
        
        resolve({
          success: code === 0,
          status: code === 0 ? 'completed' : 'failed',
          duration,
          output: stdout,
          errors: stderr ? [stderr] : [],
          script: scriptPath,
        });
      });

      child.on('error', (error) => {
        const duration = (Date.now() - startTime) / 1000;
        
        resolve({
          success: false,
          status: 'failed',
          duration,
          output: stdout,
          errors: [error.message, stderr].filter(Boolean),
          script: scriptPath,
        });
      });
    });
  }

  /**
   * Print formatted results
   */
  printResults(results: TensaiScriptResult | TensaiScriptResult[]): void {
    const resultArray = Array.isArray(results) ? results : [results];

    console.log('\n' + '='.repeat(80));
    console.log('TENSAI EXECUTION RESULTS');
    console.log('='.repeat(80));

    resultArray.forEach((result, index) => {
      console.log(`\n[Script ${index + 1}] ${result.script}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Duration: ${result.duration.toFixed(2)}s`);

      if (result.errors.length > 0) {
        console.log(`  Errors:`);
        result.errors.forEach((error) => {
          console.log(`    - ${error.substring(0, 200)}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    const total = resultArray.length;
    const passed = resultArray.filter((r) => r.success).length;
    console.log(`Summary: ${passed}/${total} scripts passed`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get latest log file
   */
  getLatestLog(): string | null {
    if (!fs.existsSync(this.logsDir)) {
      return null;
    }

    const files = fs.readdirSync(this.logsDir)
      .filter(f => f.startsWith('execution_') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.logsDir, f),
        time: fs.statSync(path.join(this.logsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0].path : null;
  }

  /**
   * Read log content
   */
  readLog(logPath: string): string {
    if (fs.existsSync(logPath)) {
      return fs.readFileSync(logPath, 'utf-8');
    }
    return '';
  }
}

// Export singleton instance
export const tensaiExecutor = new TensaiExecutor();
