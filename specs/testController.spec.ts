// filepath: /Users/drew/src/vscode/turbo-test-explorer/specs/testController.spec.ts
import { it, describe, beforeEach, afterEach, mock } from 'node:test';
import { expect } from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TestController } from '../src/testController';
import { TestRunner } from '../src/testRunner';
import * as packageDetector from '../src/packageDetector';
import { createTempPackage, createTestFile, cleanupTempDir } from './helpers';

// Helper function to mock URI position conversion since getLineAndCharacter doesn't exist in the API
const getLineAndCharacterFromUri = (uri: vscode.Uri, offset: number): vscode.Position => {
  // For testing purposes, just return a position
  return new vscode.Position(Math.floor(offset / 10), offset % 10);
};

describe('Test Controller', () => {
  // Test data
  const tempDir = path.join(os.tmpdir(), 'turbo-test-explorer-test-controller');
  let mockContext: vscode.ExtensionContext;
  let mockTestController: any;
  let mockRunProfile: any;
  let controller: TestController;

  // Mock the function used by the implementation (moved inside the describe block after controller is declared)
  let testItem: any;
  let testRunRequest: any;
  let testRun: any;

  beforeEach(() => {
    // Create temp directory if it doesn't exist
    fs.mkdirSync(tempDir, { recursive: true });

    // Mock VS Code TestController
    testItem = {
      id: 'test-1',
      label: 'Test 1',
      uri: vscode.Uri.file('/test/file.spec.ts'),
      children: {
        add: mock.fn(),
        forEach: mock.fn(),
        get: mock.fn(),
        replace: mock.fn(),
        delete: mock.fn(),
      }
    };

    mockTestController = {
      items: {
        add: mock.fn(),
        delete: mock.fn(),
        replace: mock.fn(),
        forEach: mock.fn(),
        get: mock.fn(),
        size: 0,
        has: (id: string) => false,
        entries: function* () { yield* []; }
      },
      createTestItem: mock.fn(() => testItem),
      resolveHandler: null as any,
      createRunProfile: mock.fn(),
      createTestRun: mock.fn(),
      dispose: mock.fn(),
    };

    mockRunProfile = {
      runHandler: null as any,
    };

    mockTestController.createRunProfile.mockImplementation(() => mockRunProfile);

    testRun = {
      enqueued: mock.fn(),
      started: mock.fn(),
      passed: mock.fn(),
      failed: mock.fn(),
      skipped: mock.fn(),
      end: mock.fn(),
    };

    mockTestController.createTestRun.mockImplementation(() => testRun);

    // Mock VS Code tests API
    mock.method(vscode.tests, 'createTestController', () => mockTestController);

    // Mock TestRunner
    mock.method(TestRunner.prototype, 'runTests', async () => [
      {
        name: 'Test 1',
        duration_ms: 10,
        status: 'passed',
      }
    ]);

    // Mock file system watcher
    const mockWatcher = {
      onDidChange: mock.fn(() => ({ dispose: mock.fn() })),
      onDidCreate: mock.fn(() => ({ dispose: mock.fn() })),
      onDidDelete: mock.fn(() => ({ dispose: mock.fn() })),
      dispose: mock.fn(),
    };
    mock.method(vscode.workspace, 'createFileSystemWatcher', () => mockWatcher);

    // Mock window.onDidChangeActiveTextEditor
    mock.method(vscode.window, 'onDidChangeActiveTextEditor', () => ({ dispose: mock.fn() }));

    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/extension/path',
      extensionUri: vscode.Uri.file('/extension/path'),
      globalStoragePath: '/global/storage',
      storagePath: '/storage/path',
      globalState: {
        get: mock.fn(),
        update: mock.fn(),
        keys: mock.fn(() => []),
        setKeysForSync: mock.fn()
      },
      workspaceState: {
        get: mock.fn(),
        update: mock.fn(),
        keys: mock.fn(() => [])
      },
      secrets: {
        get: mock.fn(),
        store: mock.fn(),
        delete: mock.fn(),
        onDidChange: mock.fn(() => ({ dispose: mock.fn() }))
      },
      extensionMode: vscode.ExtensionMode.Development,
      logPath: '/log/path',
      storageUri: vscode.Uri.file('/storage'),
      globalStorageUri: vscode.Uri.file('/global/storage'),
      logUri: vscode.Uri.file('/log'),
      asAbsolutePath: mock.fn((p) => path.join('/extension/path', p)),
      environmentVariableCollection: {
        persistent: false,
        getScoped: mock.fn(),
        description: undefined,
        replace: mock.fn(),
        append: mock.fn(),
        prepend: mock.fn(),
        get: mock.fn(),
        forEach: mock.fn(),
        delete: mock.fn(),
        clear: mock.fn(),
        [Symbol.iterator]: function* () { yield* []; }
      },
      extension: {
        id: 'test-extension',
        extensionUri: vscode.Uri.file('/extension/path'),
        extensionPath: '/extension/path',
        isActive: true,
        packageJSON: {},
        extensionKind: vscode.ExtensionKind.UI,
        exports: undefined,
        activate: mock.fn()
      },
      languageModelAccessInformation: {} as any
    };

    // Detect package stub
    mock.method(packageDetector, 'detectCurrentPackage', async () => ({
      name: 'test-package',
      path: '/path/to/package'
    }));

    // Create test controller with mocked dependencies
    // Create test controller with mocked dependencies
    controller = new TestController(mockContext);

    // Mock the getLineAndCharacterFromOffset method after controller is initialized
    mock.method(controller as any, 'getLineAndCharacterFromOffset', getLineAndCharacterFromUri);
  });

  afterEach(() => {
    mock.restoreAll();
    cleanupTempDir(tempDir);
  });


  it('should discover tests in current package on active editor change', async () => {
    // Setup the stub for detectPackage
    mock.method(packageDetector, 'detectPackage', async () => ({
      name: 'active-package',
      path: '/path/to/active-package'
    }));

    // Create a mock for the file system with dummy test files
    mock.method(require('glob'), 'sync', () => [
      '/path/to/active-package/src/components/component.spec.ts',
      '/path/to/active-package/src/utils/util.spec.ts'
    ]);

    // Mock fs.readFileSync for parsing test files
    mock.method(fs, 'readFileSync', () =>
      `describe('Test Suite', () => {
        it('should pass test 1', () => {});
        it('should pass test 2', () => {});
      });`
    );

    // Create a mock active editor
    const mockEditor = {
      document: {
        fileName: '/path/to/active-package/src/index.ts',
        uri: vscode.Uri.file('/path/to/active-package/src/index.ts')
      }
    };

    // Call the handler directly as if an editor changed
    await (controller as any).onActiveEditorChanged(mockEditor);

    // Verify that test items were created
    expect(mockTestController.createTestItem.mock.calls.length).to.be.greaterThan(0);
  });

  it('should run tests when requested', async () => {
    // Create a test run request
    testRunRequest = new vscode.TestRunRequest([testItem]);

    // Setup test item with package data
    testItem.data = {
      packageName: 'test-package',
      packagePath: '/path/to/package'
    };

    // Mock findTestItemById to return our test item
    mock.method(controller as any, 'findTestItemById', () => testItem);

    // Call runTests directly
    await (controller as any).runTests(testRunRequest, { cancel: false }, { debug: false });

    // Verify test run was created and used
    expect(mockTestController.createTestRun.mock.calls.length).to.equal(1);
    expect(testRun.enqueued.mock.calls.length).to.equal(1);
    expect(testRun.enqueued.mock.calls[0].arguments[0]).to.equal(testItem);
    expect(testRun.started.mock.calls.length).to.equal(1);
    expect(testRun.started.mock.calls[0].arguments[0]).to.equal(testItem);
    // Verify test run was completed
    expect(testRun.end.mock.calls.length).to.equal(1);
  });

  it('should parse test file and extract tests', async () => {
    // Create a test package with a test file
    const packagePath = createTempPackage(tempDir, 'test-parse-pkg');
    const testFilePath = createTestFile(
      packagePath,
      'src/test.spec.ts',
      `
      describe('Test Suite', () => {
        it('should pass test 1', () => {});
        it('should pass test 2', () => {});
        
        describe('Nested Suite', () => {
          test('should work', () => {});
        });
      });
      `
    );

    // Create a test file item 
    const fileItem = {
      id: 'test-parse-pkg/src/test.spec.ts',
      label: 'test.spec.ts',
      uri: vscode.Uri.file(testFilePath),
      children: {
        add: mock.fn(),
        forEach: mock.fn(),
        get: mock.fn(),
      },
      data: {
        packageName: 'test-parse-pkg',
        packagePath: packagePath
      }
    }
    // Set up mock for position conversion
    mock.method(controller as any, 'getLineAndCharacterFromOffset', () => new vscode.Position(1, 0));
    // No need to add a method to URI object, we're already mocking the controller's method

    // Reset the createTestItem stub
    mockTestController.createTestItem.mock.resetCalls();
    mockTestController.createTestItem.mockImplementation(() => testItem);

    // Call parseTestFile
    await (controller as any).parseTestFile(fileItem);

    // Verify test items were created for suites and tests
    // Should be 4 items: Test Suite, test 1, test 2, Nested Suite, nested test
    expect(mockTestController.createTestItem.mock.calls.length).to.be.greaterThan(0);
    expect(fileItem.children.add.mock.calls.length).to.be.greaterThan(0);
  });

  it('should handle test file changes', async () => {
    // Setup to find existing test item
    const uri = vscode.Uri.file('/path/to/package/test.spec.ts');
    mock.method(controller as any, 'findTestItemByUri', () => ({
      id: 'test-package/test.spec.ts',
      uri
    }));

    // Mock detectPackage to return when called with the file path
    mock.method(packageDetector, 'detectPackage', async () => ({
      name: 'test-package',
      path: '/path/to/package'
    }));

    // Create stub for parseTestFile
    mock.method(controller as any, 'parseTestFile', async () => { });

    // Call onFileChanged
    await (controller as any).onFileChanged(uri);

    // Verify the test item was found and deleted
    expect((controller as any).findTestItemByUri.mock.calls.length).to.equal(1);
    expect((controller as any).findTestItemByUri.mock.calls[0].arguments[0]).to.equal(uri);

    // Verify a new test item was created and parsed
    expect((controller as any).parseTestFile.mock.calls.length).to.equal(1);
  });

  it('should refresh tests when requested', async () => {
    // Setup stub for discoverTestsInCurrentPackage
    mock.method(controller as any, 'discoverTestsInCurrentPackage', async () => { });

    // Call refreshTests
    await controller.refreshTests();

    // Verify tests were cleared and discovered again
    expect(mockTestController.items.replace.mock.calls.length).to.equal(1);
    expect((controller as any).discoverTestsInCurrentPackage.mock.calls.length).to.equal(1);
  });

  it('should dispose all resources', () => {
    // Call dispose
    controller.dispose();

    // Verify test controller is disposed
    expect(mockTestController.dispose.mock.calls.length).to.equal(1);
  });
});