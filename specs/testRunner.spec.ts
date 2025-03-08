import { it, describe, beforeEach, afterEach, mock } from 'node:test';
import { expect } from 'chai';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { TestRunner, TestRunOptions } from '../src/testRunner';
import { DetectedPackage } from '../src/custom-types/DetectedPackage';

describe('Test Runner', () => {
  let runner: TestRunner;
  let originalExec: typeof cp.exec;
  let mockOutputChannel: any;

  // Sample test package
  const samplePackage: DetectedPackage = {
    name: 'test-package',
    path: '/path/to/test-package'
  };

  beforeEach(() => {
    // Save original exec function
    originalExec = cp.exec;

    // Mock the output channel
    mockOutputChannel = {
      appendLine: mock.fn(),
      append: mock.fn(),
      show: mock.fn(),
      dispose: mock.fn()
    };

    // Create a mock window.createOutputChannel
    mock.method(vscode.window, 'createOutputChannel', () => mockOutputChannel);

    // Mock child_process.exec
    mock.method(cp, 'exec', (
      command: string,
      options: cp.ExecOptions | undefined,
      callback?: (error: cp.ExecException | null, stdout: string, stderr: string) => void
    ) => {
      if (callback) {
        callback(null, '{}', '');
      }
      return {
        stdout: { on: mock.fn() } as any,
        stderr: { on: mock.fn() } as any
      };
    });

    // Create test runner instance
    runner = new TestRunner();
  });

  afterEach(() => {
    // Restore all mocks
    mock.restoreAll();
    // No need to manually restore cp.exec as mock.restoreAll() handles it
  });

  it('should build the correct test command for a package', () => {
    // Use a private method testing technique: create a spy on the buildCommand method
    const originalBuildCommand = (runner as any).buildCommand;
    const buildCommandSpy = mock.method(runner as any, 'buildCommand', originalBuildCommand);

    // Configure mock to return test results
    const mockResult = JSON.stringify({
      tests: [
        { name: 'Test 1', status: 'pass', duration: 10 }
      ]
    });

    mock.method(cp, 'exec', (command, options, callback) => {
      if (callback) {
        callback(null, mockResult, '');
      }
      return {
        stdout: { on: mock.fn() } as any,
        stderr: { on: mock.fn() } as any
      };
    });

    // Run tests
    runner.runTests(samplePackage);

    // Verify buildCommand was called with correct arguments
    expect(buildCommandSpy.mock.calls.length).to.equal(1);
    expect(buildCommandSpy.mock.calls[0].arguments[1]).to.equal(samplePackage.name);

    // Verify command format
    const result = buildCommandSpy.mock.results[0].value;
    expect(result).to.include(`--filter=${samplePackage.name}`);
    expect(result).to.include('--reporter=json');
  });

  it('should build command with test IDs when specified', () => {
    // Use a private method testing technique: create a spy on the buildCommand method
    const originalBuildCommand = (runner as any).buildCommand;
    const buildCommandSpy = mock.method(runner as any, 'buildCommand', originalBuildCommand);

    // Options with specific test IDs
    const options: TestRunOptions = {
      testIds: ['package/path/testFile/testName1', 'package/path/testFile/testName2'],
      debug: false
    };

    // Configure mock to return test results
    mock.method(cp, 'exec', (command, options, callback) => {
      if (callback) {
        callback(null, '{}', '');
      }
      return {
        stdout: { on: mock.fn() } as any,
        stderr: { on: mock.fn() } as any
      };
    });

    // Run tests with specific IDs
    runner.runTests(samplePackage, options);

    // Verify command contains test names
    const cmd = buildCommandSpy.mock.results[0].value;
    expect(cmd).to.include('--test="testName1"');
    expect(cmd).to.include('--test="testName2"');
  });

  it('should parse test results correctly', async () => {
    // Mock JSON test results
    const mockTestOutput = JSON.stringify({
      tests: [
        {
          name: 'test case 1',
          displayName: 'Test Case 1',
          status: 'pass',
          duration: 15
        },
        {
          name: 'test case 2',
          displayName: 'Test Case 2',
          status: 'fail',
          duration: 25,
          error: {
            message: 'Expected true to equal false',
            stack: 'Error: Expected true to equal false\n    at Context.<anonymous> (/path/to/file.js:123:45)'
          }
        },
        {
          name: 'test case 3',
          displayName: 'Test Case 3',
          status: 'skip',
          duration: 0
        }
      ]
    });

    // Configure mock to return test results
    mock.method(cp, 'exec', (command, options, callback) => {
      if (callback) {
        callback(null, mockTestOutput, '');
      }
      return {
        stdout: { on: mock.fn() } as any,
        stderr: { on: mock.fn() } as any
      };
    });

    // Run tests and get results
    const results = await runner.runTests(samplePackage);

    // Verify results are parsed correctly
    expect(results).to.have.lengthOf(3);

    // Test 1
    expect(results[0].name).to.equal('test case 1');
    expect(results[0].status).to.equal('passed');
    expect(results[0].duration_ms).to.equal(15);

    // Test 2
    expect(results[1].name).to.equal('test case 2');
    expect(results[1].status).to.equal('failed');
    expect(results[1].duration_ms).to.equal(25);
    expect(results[1].error).to.exist;
    expect(results[1].error?.message).to.equal('Expected true to equal false');

    // Test 3
    expect(results[2].name).to.equal('test case 3');
    expect(results[2].status).to.equal('skipped');
  });

  it('should handle errors when running tests', async () => {
    // Configure mock to simulate a command error
    mock.method(cp, 'exec', (command, options, callback) => {
      if (callback) {
        callback(new Error('Command failed') as any, '', 'Error: Command failed');
      }
      return {
        stdout: { on: mock.fn() } as any,
        stderr: { on: mock.fn() } as any
      };
    });

    // Verify error is thrown
    try {
      await runner.runTests(samplePackage);
      // Should not reach here
      expect.fail('Expected an error but none was thrown');
    } catch (error) {
      // Error should be caught
      expect(error).to.exist;
    }

    // Verify error was logged to output channel
    expect(mockOutputChannel.appendLine.mock.calls).to.have.lengthOf.at.least(1);
    expect(mockOutputChannel.appendLine.mock.calls[0].arguments[0]).to.include('Error executing tests');
  });

  it('should clean up resources on dispose', () => {
    // Call dispose
    runner.dispose();

    // Verify output channel was disposed
    expect(mockOutputChannel.dispose.mock.calls.length).to.equal(1);
  });
});