import * as path from 'path';
import { detectPackage } from './packageDetector';
import { findTestFiles } from './findTestFiles';

/**
 * Simple debug logger function with configurable levels
 */
function createLogger(name: string, enabled = true) {
  return {
    debug: (message: string, ...data: unknown[]) => {
      if (enabled) console.debug(`[DEBUG][${name}] ${message}`, ...data);
    },
    info: (message: string, ...data: unknown[]) => {
      if (enabled) console.info(`[INFO][${name}] ${message}`, ...data);
    },
    warn: (message: string, ...data: unknown[]) => {
      if (enabled) console.warn(`[WARN][${name}] ${message}`, ...data);
    },
    error: (message: string, ...data: unknown[]) => {
      if (enabled) console.error(`[ERROR][${name}] ${message}`, ...data);
    }
  };
}

// Create logger for this module
const log = createLogger('testController', true);

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
  getTestPatterns: () => string[] = () => ['**/*.spec.ts', '**/*.spec.js'],
  detectPackageFunc = detectPackage,
  findTestFilesFunc = findTestFiles
): { refresh: () => void; dispose: () => void } {
  log.info('Initializing test controller');

  // Track discovered test files
  const discoveredTests = new Map<string, TestItem>();
  console.log('Created empty discoveredTests map');

  /**
   * Determine if a file is a test file based on configured patterns
   */
  function isTestFile(filePath: string): boolean {
    console.log(`Checking if file is a test file: ${filePath}`);
    const patterns = getTestPatterns();
    const fileName = path.basename(filePath);
    console.log(`Checking file ${fileName} against patterns: ${patterns.join(', ')}`);

    const result = patterns.some(pattern => {
      const simplifiedPattern = pattern.replace(/\*\*\//, '');
      const suffix = simplifiedPattern.replace(/\*/g, '.*');
      const regex = new RegExp(suffix.replace('.', '\\.'));
      const isMatch = regex.test(fileName);
      console.log(`  Pattern ${pattern} -> regex ${regex} -> match: ${isMatch}`);
      return isMatch;
    });

    console.log(`File ${fileName} is ${result ? '' : 'not '}a test file`);
    return result;
  }

  /**
   * Refresh and discover tests in the workspace
   */
  function refreshTests(): void {
    log.info('Refreshing tests');

    // Clear existing tests
    console.log('Clearing existing test items');
    consumer.clearItems();
    discoveredTests.clear();

    // Get workspace path
    const workspacePath = getWorkspacePath();
    log.info(`Workspace path: ${workspacePath}`);
    if (!workspacePath) {
      log.warn('No workspace path available, aborting refresh');
      return;
    }

    // Detect package
    console.log(`Detecting package at path: ${workspacePath}`);
    const pkg = detectPackageFunc(workspacePath);
    if (!pkg) {
      log.warn('No package detected in workspace, aborting refresh');
      return;
    }
    log.info(`Detected package: ${pkg.name} at ${pkg.path}`);

    // Create root test item for package
    console.log('Creating root test item for package');
    const packageItem: TestItem = {
      id: `package:${pkg.name}`,
      label: pkg.name,
      uri: pkg.path,
      children: []
    };
    console.log(`Created package item: ${JSON.stringify(packageItem, null, 2)}`);

    // Find test files in package
    const patterns = getTestPatterns();
    log.info(`Finding test files in package with patterns: ${patterns.join(', ')}`);
    const testFiles = findTestFilesFunc(pkg.path, patterns);
    log.info(`Found ${testFiles.length} test files`);
    console.log(`Test files: ${JSON.stringify(testFiles, null, 2)}`);

    // Create test items for files
    console.log('Creating test items for files');
    for (const filePath of testFiles) {
      console.log(`Adding test file: ${filePath}`);
      addTestFile(filePath, packageItem);
    }

    // Add to consumer
    log.info(`Adding package item with ${packageItem.children.length} test files to consumer`);
    consumer.addTestItem(packageItem);
    log.info('Refresh completed successfully');
  }

  /**
   * Add a test file to the test tree
   */
  function addTestFile(
    filePath: string,
    parent: TestItem
  ): void {
    console.log(`Adding test file: ${filePath} to parent: ${parent.id}`);
    const relativePath = path.relative(getWorkspacePath(), filePath);
    const id = `file:${relativePath}`;
    const fileName = path.basename(filePath);
    console.log(`File ID: ${id}, fileName: ${fileName}`);

    // Create test item for file
    const fileItem: TestItem = {
      id,
      label: fileName,
      uri: filePath,
      children: []
    };
    console.log(`Created file item: ${JSON.stringify(fileItem, null, 2)}`);

    // Add to parent and track
    parent.children.push(fileItem);
    discoveredTests.set(id, fileItem);
    console.log(`Added file item to parent and tracked. Total tracked tests: ${discoveredTests.size}`);
  }

  // Initial refresh
  log.info('Performing initial test refresh');
  refreshTests();
  log.info('Initial test refresh completed');

  // Return the controller interface
  console.log('Returning controller interface');
  return {
    refresh: () => {
      log.info('Manual refresh triggered');
      refreshTests();
    },
    dispose: () => {
      log.info('Disposing test controller');
      discoveredTests.clear();
      console.log('Test controller disposed');
    }
  };
}