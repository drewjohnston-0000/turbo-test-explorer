import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import type { DetectedPackage } from './packageDetector';

/**
 * Test result data structure from Node.js native test runner JSON output
 */
export type TestResult = {
  name: string;
  displayName?: string;
  duration_ms: number;
  status: 'passed' | 'failed' | 'skipped' | 'todo';
  error?: {
    message: string;
    stack?: string;
  };
};

/**
 * Test execution options
 */
export type TestRunOptions = {
  testIds?: string[];
  debug?: boolean;
};

/**
 * Class that handles running tests via Turborepo
 */
export class TestRunner {
  private readonly outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('TurboTest Explorer');
  }

  /**
   * Run tests for a specific package
   */
  public async runTests(
    pkg: DetectedPackage,
    options: TestRunOptions = {}
  ): Promise<TestResult[]> {
    const config = vscode.workspace.getConfiguration('turboTestExplorer');
    const turboBinaryPath = config.get<string>('turboBinaryPath') || 'npx turbo';

    try {
      const command = this.buildCommand(turboBinaryPath, pkg.name, options);
      this.outputChannel.appendLine(`Running tests: ${command}`);
      this.outputChannel.show(true);

      return new Promise((resolve, reject) => {
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

        // Execute the test command
        const process = cp.exec(
          command,
          { cwd, maxBuffer: 1024 * 1024 * 10 }, // 10MB buffer
          (error, stdout, stderr) => {
            if (stderr) {
              this.outputChannel.appendLine(stderr);
            }

            if (error && !stdout) {
              this.outputChannel.appendLine(`Error executing tests: ${error.message}`);
              reject(error);
              return;
            }

            try {
              // Parse the JSON test results
              const results = this.parseTestResults(stdout);
              this.outputChannel.appendLine(`Tests completed with ${results.length} results`);
              resolve(results);
            } catch (parseError) {
              this.outputChannel.appendLine(`Error parsing test results: ${parseError}`);
              this.outputChannel.appendLine(`Raw output: ${stdout}`);
              reject(parseError);
            }
          }
        );

        // Stream test output in real-time
        if (process.stdout) {
          process.stdout.on('data', (data: Buffer) => {
            this.outputChannel.append(data.toString());
          });
        }

        if (process.stderr) {
          process.stderr.on('data', (data: Buffer) => {
            this.outputChannel.append(data.toString());
          });
        }
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error running tests: ${error}`);
      throw error;
    }
  }

  /**
   * Build the test command with appropriate arguments
   */
  private buildCommand(
    turboBinaryPath: string,
    packageName: string,
    options: TestRunOptions
  ): string {
    let command = `${turboBinaryPath} run test --filter=${packageName}`;

    // Add reporter to get JSON output
    command += ' -- --reporter=json';

    // Add specific test names if provided
    if (options.testIds && options.testIds.length > 0) {
      // The --test flag is used to run specific tests in Node.js test runner
      const testNames = options.testIds.map(id => {
        // Extract the test name from the ID
        const testName = path.basename(id);
        return `--test="${testName}"`;
      });

      command += ` ${testNames.join(' ')}`;
    }

    return command;
  }

  /**
   * Parse the JSON output from the Node.js test runner
   */
  private parseTestResults(output: string): TestResult[] {
    try {
      // The output might contain other logs before the JSON
      const jsonStart = output.indexOf('{');
      if (jsonStart < 0) {
        throw new Error('No JSON output found in test results');
      }

      const jsonString = output.substring(jsonStart);
      const result = JSON.parse(jsonString);

      // Extract test results from the parsed JSON
      // This structure may need to be adjusted based on the actual output format
      const testResults: TestResult[] = [];

      // Navigate through the test result structure
      if (result.tests) {
        for (const test of result.tests) {
          testResults.push({
            name: test.name,
            displayName: test.displayName,
            duration_ms: test.duration,
            status: this.mapTestStatus(test.status),
            error: test.error ? {
              message: test.error.message,
              stack: test.error.stack
            } : undefined
          });
        }
      }

      return testResults;
    } catch (error) {
      throw new Error(`Failed to parse test results: ${error}`);
    }
  }

  /**
   * Map test status from Node.js native test runner to our format
   */
  private mapTestStatus(status: string): 'passed' | 'failed' | 'skipped' | 'todo' {
    switch (status) {
      case 'pass':
        return 'passed';
      case 'fail':
        return 'failed';
      case 'skip':
        return 'skipped';
      case 'todo':
        return 'todo';
      default:
        return 'skipped';
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}