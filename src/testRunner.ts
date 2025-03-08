import { buildCommand } from './testRunner/index';
import { executeTestCommand } from './testRunner/executeTestCommand';

/**
 * Run tests for a specific package using provided dependencies
 */
export async function testRunner(
  packageName: string,
  packagePath: string,
  workspaceInfo: WorkspaceInfo,
  outputHandler: OutputHandler,
  options: TestRunOptions = {}
): Promise<TestResult[]> {
  try {
    const turboBinaryPath = workspaceInfo.getTurboBinaryPath();
    const command = buildCommand(turboBinaryPath, packageName, options);

    outputHandler.appendLine(`Running tests: ${command}`);
    outputHandler.show(true);

    return new Promise(function handleTestExecution(resolve, reject) {
      const cwd = workspaceInfo.getRootPath();

      function handleStdout(data: string): void {
        outputHandler.append(data);
      }

      function handleStderr(data: string): void {
        outputHandler.append(data);
      }

      function handleError(error: Error): void {
        outputHandler.appendLine(`Error: ${error.message}`);
        reject(error);
      }

      function handleComplete(results: TestResult[]): void {
        outputHandler.appendLine(`Tests completed with ${results.length} results`);
        resolve(results);
      }

      executeTestCommand(command, cwd, {
        onStdout: handleStdout,
        onStderr: handleStderr,
        onError: handleError,
        onComplete: handleComplete
      });
    });
  } catch (error) {
    outputHandler.appendLine(`Error running tests: ${error}`);
    throw error;
  }
}