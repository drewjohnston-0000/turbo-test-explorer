import { it, describe, beforeEach, afterEach } from 'node:test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore
import { expect } from 'chai';
import { findTestFiles } from '../src/findTestFiles';

describe('Find Test Files', () => {
  // Temporary directory for test files
  const tempDir = path.join(os.tmpdir(), 'turbo-test-explorer-tests');

  beforeEach(() => {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should find test files matching default patterns', () => {
    // Create test files
    const file1 = createTestFile(tempDir, 'example.spec.ts', '// Test file 1');
    const file2 = createTestFile(tempDir, 'another.spec.js', '// Test file 2');
    const file3 = createTestFile(tempDir, 'regular.ts', '// Not a test file');

    // Verify files were actually created before proceeding
    expect(fs.existsSync(file1), `File ${file1} should exist`).to.be.true;
    expect(fs.existsSync(file2), `File ${file2} should exist`).to.be.true;
    expect(fs.existsSync(file3), `File ${file3} should exist`).to.be.true;

    // Ensure file system has synchronized
    fs.fsyncSync(fs.openSync(file1, 'r'));
    fs.fsyncSync(fs.openSync(file2, 'r'));

    // Find test files
    const testFiles = findTestFiles(tempDir);

    // Verify the results
    expect(testFiles).to.have.lengthOf(2);
    expect(testFiles).to.include(path.join(tempDir, 'example.spec.ts'));
    expect(testFiles).to.include(path.join(tempDir, 'another.spec.js'));
    expect(testFiles).to.not.include(path.join(tempDir, 'regular.ts'));
  });

  it('should find test files in subdirectories', () => {
    // Create nested test files
    createTestFile(tempDir, 'test/nested/deep.spec.ts', '// Deep test file');
    createTestFile(tempDir, 'test/shallow.spec.js', '// Shallow test file');
    createTestFile(tempDir, 'root.spec.ts', '// Root test file');

    // Find test files
    const testFiles = findTestFiles(tempDir);

    // Verify the results
    expect(testFiles).to.have.lengthOf(3);
    expect(testFiles).to.include(path.join(tempDir, 'test/nested/deep.spec.ts'));
    expect(testFiles).to.include(path.join(tempDir, 'test/shallow.spec.js'));
    expect(testFiles).to.include(path.join(tempDir, 'root.spec.ts'));
  });

  it('should find test files with custom patterns', () => {
    // Create test files with different extensions
    createTestFile(tempDir, 'example.test.ts', '// Custom test file');
    createTestFile(tempDir, 'example.spec.ts', '// Standard test file');

    // Find test files with custom pattern
    const testFiles = findTestFiles(tempDir, ['**/*.test.ts']);

    // Verify the results
    expect(testFiles).to.have.lengthOf(1);
    expect(testFiles).to.include(path.join(tempDir, 'example.test.ts'));
    expect(testFiles).to.not.include(path.join(tempDir, 'example.spec.ts'));
  });

  it('should return empty array for empty directory', () => {
    const emptyDir = path.join(tempDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const testFiles = findTestFiles(emptyDir);
    expect(testFiles).to.be.an('array').that.is.empty;
  });

  it('should return empty array for invalid path', () => {
    const invalidPath = path.join(tempDir, 'non-existent-directory');

    const testFiles = findTestFiles(invalidPath);
    expect(testFiles).to.be.an('array').that.is.empty;
  });
});

/**
 * Helper to create test files with directories
 */
function createTestFile(baseDir: string, filePath: string, content: string): string {
  const fullPath = path.join(baseDir, filePath);
  const directory = path.dirname(fullPath);

  // Create directory if it doesn't exist
  fs.mkdirSync(directory, { recursive: true });

  // Write file content
  fs.writeFileSync(fullPath, content);

  return fullPath;
}