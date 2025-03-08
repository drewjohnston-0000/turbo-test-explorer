import { mapTestStatus } from '../testRunner/index';
/**
 * Parse the JSON output from the Node.js test runner
 */
export function parseTestResults(output: string): TestResult[] {
  try {
    // The output might contain other logs before the JSON
    const jsonStart = output.indexOf('{');
    if (jsonStart < 0) {
      throw new Error('No JSON output found in test results');
    }

    const jsonString = output.substring(jsonStart);
    const result = JSON.parse(jsonString);

    // Extract test results from the parsed JSON
    const testResults: TestResult[] = [];

    // Navigate through the test result structure
    if (result.tests) {
      for (const test of result.tests) {
        testResults.push({
          name: test.name,
          displayName: test.displayName,
          duration_ms: test.duration,
          status: mapTestStatus(test.status),
          error: test.error ? {
            message: test.error.message,
            stack: test.error.stack
          } : undefined
        });
      }
    }
    return testResults;
  } catch (error) {
    console.error(`Failed to parse test results: ${error}`);
    throw error;
  }
}