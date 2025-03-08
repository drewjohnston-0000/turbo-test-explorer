import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';
import { minimatch } from 'minimatch'
import { detectCurrentPackage, detectPackage } from './packageDetector';
import { type TestResult, TestRunner } from './testRunner';
import type { DetectedPackage } from './custom-types/DetectedPackage';
import type { TestItemType } from './custom-types/TestItemType';

/**
 * Manages test discovery and execution for the extension
 */
export class TestController implements vscode.Disposable {
  private readonly controller: vscode.TestController;
  private readonly runner: TestRunner;
  private readonly fileWatcher: vscode.FileSystemWatcher;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly testItemData = new Map<string, {
    type?: TestItemType;
    packageName?: string;
    packagePath?: string;
  }>();
  private currentTestRun: vscode.TestRun | undefined;

  constructor(context: vscode.ExtensionContext) {
    // Create VS Code test controller
    this.controller = vscode.tests.createTestController(
      'turboTestExplorer',
      'TurboTest Explorer'
    );

    // Create test runner
    this.runner = new TestRunner();

    // Watch for changes in test files
    const testPatterns = this.getTestPatterns();
    const pattern = `**/{${testPatterns.join(',')}}`;
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Set up file watching
    this.fileWatcher.onDidChange(this.onFileChanged, this, this.disposables);
    this.fileWatcher.onDidCreate(this.onFileChanged, this, this.disposables);
    this.fileWatcher.onDidDelete(this.onFileChanged, this, this.disposables);

    // Listen for active editor changes to detect current package
    vscode.window.onDidChangeActiveTextEditor(
      this.onActiveEditorChanged,
      this,
      this.disposables
    );

    // Set up resolver for test items
    this.controller.resolveHandler = async (item) => {
      if (!item) {
        // If no item is provided, discover tests for the current package
        await this.discoverTestsInCurrentPackage();
        return;
      }

      // If a test file item is provided, parse it to find tests
      if (this.getTestItemType(item) === 'file') {
        await this.parseTestFile(item);
      }
    };

    // Set up test run handler
    this.controller.createRunProfile(
      'Run Tests',
      vscode.TestRunProfileKind.Run,
      async (request, token) => {
        await this.runTests(request, token, { debug: false });
      },
      true
    );

    // Set up test debug handler
    this.controller.createRunProfile(
      'Debug Tests',
      vscode.TestRunProfileKind.Debug,
      async (request, token) => {
        await this.runTests(request, token, { debug: true });
      },
      true
    );

    // Initial test discovery for current editor
    this.onActiveEditorChanged(vscode.window.activeTextEditor);
  }

  /**
   * Get test file patterns from settings
   */
  private getTestPatterns(): string[] {
    const config = vscode.workspace.getConfiguration('turboTestExplorer');
    return config.get<string[]>('testMatch') || ['**/*.spec.ts', '**/*.spec.js'];
  }

  /**
   * Handle active editor changes
   */
  private async onActiveEditorChanged(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) return;

    // Check if file is a test file
    const isTestFile = this.getTestPatterns().some(pattern =>
      minimatch(editor.document.fileName, pattern)
    );

    if (isTestFile) {
      // If it's a test file, parse it directly
      const pkg = await detectPackage(editor.document.uri.fsPath);
      if (pkg) {
        const testItem = this.getOrCreateFileTestItem(editor.document.uri, pkg);
        await this.parseTestFile(testItem);
      }
    } else {
      // For non-test files, discover tests in the current package
      await this.discoverTestsInCurrentPackage();
    }
  }

  private getOrCreateFileTestItem(uri: vscode.Uri, pkg: DetectedPackage): vscode.TestItem {
    const existingItem = this.findTestItemByUri(uri);
    if (existingItem) {
      return existingItem;
    }

    // Create a new test item for the file
    const fileName = path.basename(uri.fsPath);
    const fileId = `${pkg.name}/${fileName}`;
    const fileItem = this.controller.createTestItem(fileId, fileName, uri);

    // Set metadata
    this.testItemData.set(fileItem.id, {
      type: 'file',
      packageName: pkg.name,
      packagePath: pkg.path
    });

    // Add to controller items
    this.controller.items.add(fileItem);

    return fileItem;
  }

  /**
   * Handle test file changes
   */
  private onFileChanged(uri: vscode.Uri): void {
    // Find existing test item for this file
    const existingItem = this.findTestItemByUri(uri);

    if (existingItem) {
      // Clear existing test items and re-parse
      this.controller.items.delete(existingItem.id);

      // Re-discover tests for the file's package
      detectPackage(uri.fsPath).then(pkg => {
        if (pkg) {
          const fileItem = this.getOrCreateFileTestItem(uri, pkg);
          this.parseTestFile(fileItem);
        }
      });
    }
  }

  /**
   * Find a test item by URI
   */
  private findTestItemByUri(uri: vscode.Uri): vscode.TestItem | undefined {
    const filePath = uri.fsPath;

    // Search through all test items to find matching file
    for (const [_, item] of this.controller.items) {
      // Check if this item has the same URI
      if (item.uri?.fsPath === filePath) {
        return item;
      }

      // Recursively check children
      const queue: vscode.TestItem[] = Array.from(item.children).map(([_, child]) => child);
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.uri?.fsPath === filePath) {
          return current;
        }

        queue.push(...Array.from(current.children).map(([_, child]) => child));
      }
    }

    return undefined;
  }

  /**
   * Run specified tests
   */
  private async runTests(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
    options: { debug: boolean }
  ): Promise<void> {
    const run = this.controller.createTestRun(request);
    this.currentTestRun = run;

    // Handle cancellation
    token.onCancellationRequested(() => {
      run.end();
    });

    try {
      const tests = request.include || Array.from(this.controller.items).map(([_, item]) => item);
      if (!tests.length) {
        run.end();
        return;
      }

      // Group test items by package
      const testsByPackage = new Map<string, { pkg: DetectedPackage; testIds: string[] }>();

      for (const test of tests) {
        // Extract package info from test item
        const packageName = this.getPackageNameFromTestItem(test);
        const packagePath = this.getPackagePathFromTestItem(test);

        if (packageName && packagePath) {
          const pkg = { name: packageName, path: packagePath };

          // Add test to the appropriate package group
          if (!testsByPackage.has(packageName)) {
            testsByPackage.set(packageName, { pkg, testIds: [] });
          }

          testsByPackage.get(packageName)!.testIds.push(test.id);

          // Mark test as enqueued
          run.enqueued(test);
        }
      }

      // Run tests for each package
      for (const [_, { pkg, testIds }] of testsByPackage.entries()) {
        // Mark tests as started
        for (const id of testIds) {
          const test = this.findTestItemById(id);
          if (test) {
            run.started(test);
          }
        }

        // Run tests for this package
        try {
          const results = await this.runner.runTests(pkg, {
            testIds,
            debug: options.debug
          });

          // Process results
          this.processTestResults(results, run);
        } catch (error) {
          console.error(`Error running tests for package ${pkg.name}:`, error);

          // Mark all tests as failed
          for (const id of testIds) {
            const test = this.findTestItemById(id);
            if (test) {
              run.failed(test, new vscode.TestMessage(`Failed to run test: ${error}`));
            }
          }
        }
      }
    } finally {
      run.end();
      this.currentTestRun = undefined;
    }
  }

  /**
   * Find test item by ID
   */
  private findTestItemById(id: string): vscode.TestItem | undefined {
    const parts = id.split('/');
    let current: vscode.TestItem | undefined;

    // Handle root level item
    if (this.controller.items.get(parts[0])) {
      current = this.controller.items.get(parts[0]);
    }

    // Navigate through the test tree
    for (let i = 1; current && i < parts.length; i++) {
      const childId = parts.slice(0, i + 1).join('/');
      let found = false;

      for (const [id, child] of current.children) {
        if (id === childId) {
          current = child;
          found = true;
          break;
        }
      }

      if (!found) {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Process test results and update the test run
   */
  private processTestResults(results: TestResult[], run: vscode.TestRun): void {
    for (const result of results) {
      // Find matching test item
      const testItem = this.findTestItemByName(result.name);

      if (testItem) {
        switch (result.status) {
          case 'passed':
            run.passed(testItem, result.duration_ms);
            break;
          case 'failed':
            const message = new vscode.TestMessage(result.error?.message || 'Test failed');
            if (result.error?.stack) {
              message.location = this.parseStackTraceLocation(result.error.stack, testItem);
            }
            run.failed(testItem, message, result.duration_ms);
            break;
          case 'skipped':
            run.skipped(testItem);
            break;
          case 'todo':
            run.skipped(testItem);
            break;
        }
      }
    }
  }

  /**
   * Parse stack trace to get error location
   */
  private parseStackTraceLocation(
    stack: string,
    testItem: vscode.TestItem
  ): vscode.Location | undefined {
    // Simple stack trace parser for Node.js format
    const stackLines = stack.split('\n');

    for (const line of stackLines) {
      // Common format: "    at Context.<anonymous> (path/to/file.js:123:45)"
      const match = line.match(/\s*at\s+.+\s+\(([^:]+):(\d+):(\d+)\)/);
      if (match) {
        const [_, file, lineStr, columnStr] = match;
        const line = Number.parseInt(lineStr, 10);
        const column = Number.parseInt(columnStr, 10);

        try {
          const uri = vscode.Uri.file(file);
          const pos = new vscode.Position(line - 1, column - 1);
          return new vscode.Location(uri, pos);
        } catch (error) {
          console.error('Error parsing stack trace location:', error);
        }
      }
    }

    // If we couldn't parse the stack trace, return the test item's location
    return testItem.uri ? new vscode.Location(testItem.uri, new vscode.Position(0, 0)) : undefined;
  }

  /**
   * Find test item by name
   */
  private findTestItemByName(name: string): vscode.TestItem | undefined {
    for (const [_, item] of Array.from(this.controller.items)) {
      // Check this item
      if (item.label === name || this.getTestItemFullName(item) === name) {
        return item;
      }

      // Check children recursively
      const queue: vscode.TestItem[] = Array.from(item.children).map(([_, child]) => child);
      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.label === name || this.getTestItemFullName(current) === name) {
          return current;
        }

        queue.push(...Array.from(current.children).map(([_, child]) => child));
      }
    }

    return undefined;
  }

  /**
   * Get full test name including parent suites
   */
  private getTestItemFullName(item: vscode.TestItem): string {
    const parts: string[] = [item.label];

    // Find parent test suites to build the full name
    const itemId = item.id;
    const idParts = itemId.split('/');

    let currentId = '';
    for (let i = 0; i < idParts.length - 1; i++) {
      if (currentId) {
        currentId += '/';
      }
      currentId += idParts[i];

      const parent = this.findTestItemById(currentId);
      if (parent && this.getTestItemType(parent) === 'suite') {
        parts.unshift(parent.label);
      }
    }

    // Return the full test name with parts joined by spaces
    return parts.join(' ');
  }

  /**
   * 
   * @param item 
   * @returns 
   */
  private getTestItemType(item: vscode.TestItem): TestItemType | undefined {
    return this.testItemData.get(item.id)?.type;
  }
  /**
   * Get package name from test item metadata
   */
  private getPackageNameFromTestItem(item: vscode.TestItem): string | undefined {
    // Try to get from current item
    const packageData = this.testItemData.get(item.id);
    if (packageData?.packageName) {
      return packageData.packageName;
    }

    // If not found, check parent items
    const idParts = item.id.split('/');
    while (idParts.length > 1) {
      idParts.pop();
      const parentId = idParts.join('/');
      const parent = this.findTestItemById(parentId);

      if (parent) {
        const parentData = this.testItemData.get(parentId);
        if (parentData?.packageName) {
          return parentData.packageName;
        }
      }
    }

    return undefined;
  }

  /**
   * Get package path from test item metadata
   */
  private getPackagePathFromTestItem(item: vscode.TestItem): string | undefined {
    // Try to get from current item
    const packageData = this.testItemData.get(item.id);
    if (packageData?.packagePath) {
      return packageData.packagePath;
    }

    // If not found, check parent items
    const idParts = item.id.split('/');
    while (idParts.length > 1) {
      idParts.pop();
      const parentId = idParts.join('/');
      const parent = this.findTestItemById(parentId);

      if (parent) {
        const parentData = this.testItemData.get(parentId);
        if (parentData?.packagePath) {
          return parentData.packagePath;
        }
      }
    }

    return undefined;
  }

  /**
   * Parse a test file to find tests
   */
  private async parseTestFile(fileItem: vscode.TestItem): Promise<void> {
    if (!fileItem.uri) return;

    try {
      // Read file content
      const content = fs.readFileSync(fileItem.uri.fsPath, 'utf-8');

      // Simple regex-based parsing for test blocks
      // Note: This is a basic implementation and may need to be enhanced
      // for more complex test structures

      // Find test blocks using regexp
      const testRegex = /(?:test|it)\s*\(\s*['"]([^'"]+)['"]/g;
      const suiteRegex = /(?:describe)\s*\(\s*['"]([^'"]+)['"]/g;

      let match: RegExpExecArray | null;

      // Extract test suites
      match = suiteRegex.exec(content);
      while (match !== null) {
        const suiteName = match[1];
        const suiteStartPos = match.index;
        const suiteId = `${fileItem.id}/${suiteName}`;

        // Create test suite item
        const suiteItem = this.controller.createTestItem(
          suiteId,
          suiteName,
          fileItem.uri
        );

        this.testItemData.set(suiteItem.id, {
          type: 'suite',
          packageName: this.getPackageNameFromTestItem(fileItem),
          packagePath: this.getPackagePathFromTestItem(fileItem)
        });

        fileItem.children.add(suiteItem);
        match = suiteRegex.exec(content);
      }
      // Extract tests
      testRegex.lastIndex = 0;
      match = testRegex.exec(content);
      while (match !== null) {
        testRegex.lastIndex = 0;
        while ((match = testRegex.exec(content)) !== null) {
          const testName = match[1];
          const testStartPos = match.index;
          const testId = `${fileItem.id}/${testName}`;

          // Create test item
          const testItem = this.controller.createTestItem(
            testId,
            testName,
            fileItem.uri
          );

          this.testItemData.set(testItem.id, {
            type: 'test',
            packageName: this.getPackageNameFromTestItem(fileItem),
            packagePath: this.getPackagePathFromTestItem(fileItem)
          });
          fileItem.children.add(testItem);
          match = testRegex.exec(content);
        }
      }
    } catch (err) {
      console.error(`Error parsing test file ${fileItem.uri.fsPath}:`, err);
    }
  }

  /**
   * Discover tests in the current package
   */
  private async discoverTestsInCurrentPackage(): Promise<void> {
    try {
      const pkg = await detectCurrentPackage();
      if (!pkg) {
        console.log('No package found for current file');
        return;
      }

      // Get test file patterns
      const testPatterns = this.getTestPatterns();
      const testFiles: string[] = [];

      // Find test files in the package
      for (const pattern of testPatterns) {
        const matches = glob.sync(pattern, {
          cwd: pkg.path,
          absolute: true
        });
        testFiles.push(...matches);
      }

      // Create test items for each file
      for (const file of testFiles) {
        const uri = vscode.Uri.file(file);
        const fileItem = this.getOrCreateFileTestItem(uri, pkg);

        // Parse test file to find tests
        await this.parseTestFile(fileItem);
      }
    } catch (err) {
      console.error('Error discovering tests:', err);
    }
  }

  /**
   * Refresh all discovered tests
   */
  public async refreshTests(): Promise<void> {
    // Clear existing tests
    this.controller.items.replace([]);

    // Discover new tests
    await this.discoverTestsInCurrentPackage();
  }

  /**
   * Run all tests in the monorepo
   */
  public async runAllTests(): Promise<void> {
    // Create a test run without specific tests
    const run = this.controller.createTestRun(new vscode.TestRunRequest());

    try {
      // Show message that this is not implemented yet
      vscode.window.showInformationMessage(
        'Running all monorepo tests is not yet implemented'
      );

      // TODO: Implement running tests for all packages in the monorepo
      // This would require discovering all packages and running tests for each

    } finally {
      run.end();
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.controller.dispose();
    this.runner.dispose();
    this.fileWatcher.dispose();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
  }
}