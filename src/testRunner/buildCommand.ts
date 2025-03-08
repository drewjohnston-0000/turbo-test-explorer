/**
 * Build the test command with appropriate arguments
 */
import * as path from 'path';
export function buildCommand(turboBinaryPath: string, packageName: string, options: TestRunOptions): string {
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