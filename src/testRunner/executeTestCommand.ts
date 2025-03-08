import * as cp from 'child_process';
import { parseTestResults } from '../testRunner/index';

/**
 * Execute a test command and return results
 */
export function executeTestCommand(
  command: string,
  cwd: string,
  callbacks: {
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    onError?: (error: Error) => void;
    onComplete?: (results: TestResult[]) => void;
  }
): cp.ChildProcess {
  // Execute the test command
  const process = cp.exec(
    command,
    { cwd, maxBuffer: 1024 * 1024 * 10 }, // 10MB buffer
    (error, stdout, stderr) => {
      if (stderr && callbacks.onStderr) {
        callbacks.onStderr(stderr);
      }

      if (error && !stdout && callbacks.onError) {
        callbacks.onError(error);
        return;
      }
      try {
        // Parse the JSON test results
        const results = parseTestResults(stdout);
        if (callbacks.onComplete) {
          callbacks.onComplete(results);
        }
      } catch (parseError) {
        if (callbacks.onError) {
          callbacks.onError(parseError as Error);
        }
      }
    }
  );
  // Stream test output in real-time
  if (process.stdout) {
    process.stdout.on('data', (data: Buffer) => {
      callbacks.onStdout?.(data.toString());
    });
  }
  if (process.stderr && callbacks.onStderr) {
    process.stderr.on('data', (data: Buffer) => {
      callbacks.onStderr?.(data.toString());
    });
  }
  return process;
}