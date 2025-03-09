import { describe, it, test, beforeEach, afterEach } from 'node:test';
import * as path from 'path';
// @ts-ignore
import { expect } from 'chai';
import { detectPackage } from '../src/packageDetector';
import { findTestFiles } from '../src/findTestFiles';
import { testController } from '../src/testController';

// Attach functions to objects so we can mock them
const packageDetectorModule = { detectPackage };
const findTestFilesModule = { findTestFiles };

describe('Testsuite: Test Controller', () => {
  let detectPackageMock: any;
  let findTestFilesMock: any;
  let mockConsumer: any;
  beforeEach(() => {
    detectPackageMock = test.mock.method(packageDetectorModule, 'detectPackage');
    findTestFilesMock = test.mock.method(findTestFilesModule, 'findTestFiles');
    mockConsumer = {
      addTestItem: test.mock.fn(),
      clearItems: test.mock.fn(),
      runTests: test.mock.fn(() => Promise.resolve())
    };
  });
  describe('#basic tests', () => {
    it('should initialize and create test items for detected packages', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return ['/mock/workspace/src/file1.spec.ts', '/mock/workspace/src/file2.spec.ts'];
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify function returns expected interface
      expect(controller).to.be.an('object');
      expect(controller).to.have.property('refresh').that.is.a('function');
      expect(controller).to.have.property('dispose').that.is.a('function');

      // Verify detectPackage was called with correct arguments
      expect(detectPackageMock.mock.calls.length).to.equal(1);
      expect(detectPackageMock.mock.calls[0].arguments[0]).to.equal(mockWorkspacePath);

      // Verify findTestFiles was called with correct arguments
      expect(findTestFilesMock.mock.calls.length).to.equal(1);
      expect(findTestFilesMock.mock.calls[0].arguments[0]).to.equal(mockPackage.path);

      // Verify clearItems was called
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(1);
    });

    it('should handle an empty workspace path gracefully', async (test) => {
      // Mock workspace path provider
      const getWorkspacePath = () => '';

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return null;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return [];
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify detectPackage was NOT called with empty path (implementation returns early)
      expect(detectPackageMock.mock.calls.length).to.equal(0);

      // Verify clearItems was still called
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(1);

      // Verify findTestFiles was not called due to empty workspace path
      expect(findTestFilesMock.mock.calls.length).to.equal(0);

      // Verify function returns expected interface
      expect(controller).to.be.an('object');
      expect(controller).to.have.property('refresh').that.is.a('function');
      expect(controller).to.have.property('dispose').that.is.a('function');
    });

    it('should handle missing package detection gracefully', async (test) => {
      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return null; // No package detected
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return [];
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify detectPackage was called with correct workspace path
      expect(detectPackageMock.mock.calls.length).to.equal(1);
      expect(detectPackageMock.mock.calls[0].arguments[0]).to.equal(mockWorkspacePath);

      // Verify clearItems was called
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(1);

      // Verify findTestFiles was not called due to no package detected
      expect(findTestFilesMock.mock.calls.length).to.equal(0);
    });

    it('should correctly determine if a file is a test file based on patterns', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      // Different test file patterns to validate pattern matching
      const testPatterns = ['**/*.test.ts', '**/*.spec.js'];

      // Files that match our patterns
      const testFiles = [
        '/mock/workspace/src/component.test.ts',
        '/mock/workspace/src/service.spec.js'
      ];

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => testPatterns,
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify findTestFiles was called with correct patterns
      expect(findTestFilesMock.mock.calls.length).to.equal(1);
      expect(findTestFilesMock.mock.calls[0].arguments[1]).to.deep.equal(testPatterns);

      // Verify consumer.addTestItem was called once with the package item
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Verify the package item has two children (our test files)
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];
      expect(packageItem.children.length).to.equal(2);
    });
  });

  describe('#refresh functionality tests', () => {
    it('should clear existing items and maps before refreshing', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return ['/mock/workspace/src/file1.spec.ts'];
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Initial refresh happens during initialization
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(1);

      // Call refresh again
      controller.refresh();

      // Verify clearItems was called again
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(2);

      // Verify detectPackage and findTestFiles were called again
      expect(detectPackageMock.mock.calls.length).to.equal(2);
      expect(findTestFilesMock.mock.calls.length).to.equal(2);
    });

    it('should properly create test items for each test file found', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/nested/file2.spec.ts',
        '/mock/workspace/test/file3.spec.js'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify consumer.addTestItem was called with package item
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Get the package item passed to addTestItem
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];

      // Verify package item has correct properties
      expect(packageItem.id).to.equal(`package:${mockPackage.name}`);
      expect(packageItem.label).to.equal(mockPackage.name);

      // Verify all test files were added as children
      expect(packageItem.children.length).to.equal(testFiles.length);

      // Verify each file item has correct properties
      testFiles.forEach((filePath, index) => {
        const fileItem = packageItem.children[index];
        expect(fileItem.label).to.equal(path.basename(filePath));
        expect(fileItem.uri).to.equal(filePath);
      });
    });

    it('should correctly build the test hierarchy with parent-child relationships', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/nested/file2.spec.ts'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify consumer.addTestItem was called with package item
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Get the package item passed to addTestItem
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];

      // Verify hierarchy (package -> files)
      expect(packageItem.children.length).to.equal(testFiles.length);

      // Verify file1 is a child of package
      // @ts-ignore
      const file1Item = packageItem.children.find(item => item.label === 'file1.spec.ts');
      expect(file1Item).to.not.be.undefined;
      expect(file1Item?.uri).to.equal(testFiles[0]);

      // Verify file2 is a child of package
      // @ts-ignore
      const file2Item = packageItem.children.find(item => item.label === 'file2.spec.ts');
      expect(file2Item).to.not.be.undefined;
      expect(file2Item?.uri).to.equal(testFiles[1]);
    });
  });

  describe('#file handling tests', () => {
    it('should generate correct file IDs with relative paths', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/nested/file2.spec.ts'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Get the package item passed to addTestItem
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];

      // Verify file1 has correct ID with relative path
      // @ts-ignore
      const file1Item = packageItem.children.find(item => item.label === 'file1.spec.ts');
      expect(file1Item?.id).to.equal('file:src/file1.spec.ts');

      // Verify file2 has correct ID with relative path
      // @ts-ignore
      const file2Item = packageItem.children.find(item => item.label === 'file2.spec.ts');
      expect(file2Item?.id).to.equal('file:src/nested/file2.spec.ts');
    });

    it('should track all discovered tests in the map', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/nested/file2.spec.ts',
        '/mock/workspace/test/file3.spec.js'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      // Create a spy on Map.prototype.set to track map operations
      const originalMapSet = Map.prototype.set;
      let mapSetCalls = 0;
      Map.prototype.set = function (...args) {
        mapSetCalls++;
        return originalMapSet.apply(this, args);
      };

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Restore original Map.prototype.set
      Map.prototype.set = originalMapSet;

      // Verify set was called for each test file (one call per test file)
      expect(mapSetCalls).to.equal(testFiles.length);
    });
  });

  describe('#lifecycle tests', () => {
    it('should dispose and clear all resources when dispose is called', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/file2.spec.ts'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      // Create a spy on Map.prototype.clear
      const originalMapClear = Map.prototype.clear;
      let mapClearCalls = 0;
      Map.prototype.clear = function () {
        mapClearCalls++;
        // @ts-ignore
        return originalMapClear.apply(this, arguments);
      };

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Initial map clear during refresh
      expect(mapClearCalls).to.equal(1);

      // Call dispose
      controller.dispose();

      // Verify map was cleared again during dispose
      expect(mapClearCalls).to.equal(2);

      // Restore original Map.prototype.clear
      Map.prototype.clear = originalMapClear;
    });
  });

  describe('#edge cases', () => {
    it('should handle finding zero test files', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return []; // No test files found
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify consumer.addTestItem was called with package item
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Verify package item has no children
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];
      expect(packageItem.children.length).to.equal(0);
    });

    it('should handle custom test patterns correctly', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      // Custom test patterns
      const customPatterns = ['**/*.custom.ts', '**/*.test.js'];

      // Files that match our custom patterns
      const testFiles = [
        '/mock/workspace/src/component.custom.ts',
        '/mock/workspace/src/service.test.js'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => customPatterns, // Use custom patterns
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Verify findTestFiles was called with our custom patterns
      expect(findTestFilesMock.mock.calls.length).to.equal(1);
      expect(findTestFilesMock.mock.calls[0].arguments[1]).to.deep.equal(customPatterns);

      // Verify consumer.addTestItem was called with package item
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Verify package item has correct children
      const packageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];
      expect(packageItem.children.length).to.equal(testFiles.length);
      expect(packageItem.children[0].label).to.equal('component.custom.ts');
      expect(packageItem.children[1].label).to.equal('service.test.js');
    });

    it('should handle multiple refreshes without duplicating test items', async (test) => {
      // Mock return values
      const mockPackage = {
        name: 'test-package',
        path: '/mock/workspace'
      };

      // Mock workspace path provider
      const mockWorkspacePath = '/mock/workspace';
      const getWorkspacePath = () => mockWorkspacePath;

      const testFiles = [
        '/mock/workspace/src/file1.spec.ts',
        '/mock/workspace/src/file2.spec.ts'
      ];

      // Configure mocks
      detectPackageMock.mock.mockImplementation(() => {
        return mockPackage;
      });

      findTestFilesMock.mock.mockImplementation(() => {
        return testFiles;
      });

      const controller = testController(
        getWorkspacePath,
        mockConsumer,
        () => ['**/*.spec.ts', '**/*.spec.js'],
        packageDetectorModule.detectPackage,
        findTestFilesModule.findTestFiles
      );

      // Initial setup - verify addTestItem was called once
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Get initial package item
      const initialPackageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];
      expect(initialPackageItem.children.length).to.equal(2);

      // Reset call counts to track the next refresh
      mockConsumer.addTestItem.mock.resetCalls();
      mockConsumer.clearItems.mock.resetCalls();

      // Perform refresh
      controller.refresh();

      // Verify clearItems was called to remove existing items
      expect(mockConsumer.clearItems.mock.calls.length).to.equal(1);

      // Verify addTestItem was called exactly once after refresh
      expect(mockConsumer.addTestItem.mock.calls.length).to.equal(1);

      // Get refreshed package item
      const refreshedPackageItem = mockConsumer.addTestItem.mock.calls[0].arguments[0];
      expect(refreshedPackageItem.children.length).to.equal(2);
    });
  });
});