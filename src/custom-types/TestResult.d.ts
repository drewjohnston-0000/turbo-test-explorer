type TestResult = {
  name: string;
  displayName?: string;
  duration_ms: number;
  status: TestResultStatus;
  error?: {
    message: string;
    stack?: string;
  };
};

type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'todo';