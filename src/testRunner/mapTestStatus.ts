/**
 * Map test status from Node.js native test runner to our format
 */
export function mapTestStatus(status: string): TestResultStatus {
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
};