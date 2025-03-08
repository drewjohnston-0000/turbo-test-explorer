import * as path from 'path';
import { detectPackage } from './packageDetector';
import { findTestFiles } from './findTestFiles';

/**
 * Represents a test item in our system
 */
type TestItem = {
  id: string;
  label: string;
  uri: string;
  children: TestItem[];
};

/**
 * Abstraction for test controller consumers
 */
type TestControllerConsumer = {
  addTestItem: (item: TestItem) => void;
  clearItems: () => void;
  runTests: (items: TestItem[]) => Promise<void>;
};

/**
 * Creates and manages test items based on workspace content
 */
export function testController(
  getWorkspacePath: () => string,
  consumer: TestControllerConsumer,
  getTestPatterns: () => string[] = () => ['**/*.spec.ts', '**/*.spec.js']
): { refresh: () => void; dispose: () => void } {
  // Track discovered test files
  const discoveredTests = new Map<string, TestItem>();

  /**
   * Determine if a file is a test file based on configured patterns
   */
  function isTestFile(filePath: string): boolean {
    const patterns = getTestPatterns();
    const fileName = path.basename(filePath);

    return patterns.some(pattern => {
      const simplifiedPattern = pattern.replace(/\*\*\//, '');
      const suffix = simplifiedPattern.replace(/\*/g, '.*');
      const regex = new RegExp(suffix.replace('.', '\\.'));
      return regex.test(fileName);
    });
  }

  /**
   * Refresh and discover tests in the workspace
   */
  function refreshTests(): void {
    // Clear existing tests
    consumer.clearItems();
    discoveredTests.clear();

    // Get workspace path
    const workspacePath = getWorkspacePath();
    if (!workspacePath) {
      return;
    }

    // Detect package
    const pkg = detectPackage(workspacePath);
    if (!pkg) {
      return;
    }

    // Create root test item for package
    const packageItem: TestItem = {
      id: `package:${pkg.name}`,
      label: pkg.name,
      uri: pkg.path,
      children: []
    };

    // Find test files in package
    const patterns = getTestPatterns();
    const testFiles = findTestFiles(pkg.path, patterns);

    // Create test items for files
    for (const filePath of testFiles) {
      addTestFile(filePath, packageItem);
    }

    // Add to consumer
    consumer.addTestItem(packageItem);
  }

  /**
   * Add a test file to the test tree
   */
  function addTestFile(
    filePath: string,
    parent: TestItem
  ): void {
    const relativePath = path.relative(getWorkspacePath(), filePath);
    const id = `file:${relativePath}`;
    const fileName = path.basename(filePath);

    // Create test item for file
    const fileItem: TestItem = {
      id,
      label: fileName,
      uri: filePath,
      children: []
    };

    // Add to parent and track
    parent.children.push(fileItem);
    discoveredTests.set(id, fileItem);
  }

  // Initial refresh
  refreshTests();

  // Return the controller interface
  return {
    refresh: refreshTests,
    dispose: () => {
      // Nothing to dispose in this implementation
    }
  };
}