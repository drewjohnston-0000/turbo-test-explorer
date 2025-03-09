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

describe('Test Controller', () => {
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
});