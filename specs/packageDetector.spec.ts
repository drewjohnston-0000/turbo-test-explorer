import { it, describe, beforeEach, afterEach } from 'node:test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import { detectPackage } from '../src/packageDetector';
import { createTempPackage, createTestFile, cleanupTempDir } from './helpers';

describe('Package Detector', () => {
  // Temporary directory for test files
  const tempDir = path.join(os.tmpdir(), 'turbo-test-explorer-tests');

  beforeEach(() => {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    cleanupTempDir(tempDir);
  });

  it('should detect package for a file in package root', async () => {
    // Create a test package
    const packagePath = createTempPackage(tempDir, 'test-package');

    // Create a test file
    const filePath = createTestFile(packagePath, 'index.js', 'console.log("Hello");');

    // Test detecting package
    const pkg = await detectPackage(filePath);

    // Verify the results
    expect(pkg).to.not.be.undefined;
    expect(pkg?.name).to.equal('test-package');
    expect(pkg?.path).to.equal(packagePath);
  });

  it('should detect package for a file in nested directory', async () => {
    // Create a test package
    const packagePath = createTempPackage(tempDir, 'nested-package');

    // Create nested directories and test file
    const filePath = createTestFile(
      packagePath,
      'src/utils/helper.js',
      'console.log("Hello");'
    );

    // Test detecting package
    const pkg = await detectPackage(filePath);

    // Verify the results
    expect(pkg).to.not.be.undefined;
    expect(pkg?.name).to.equal('nested-package');
    expect(pkg?.path).to.equal(packagePath);
  });

  it('should return undefined for a file not in a package', async () => {
    // Create a file outside any package
    const filePath = path.join(tempDir, 'standalone.js');
    fs.writeFileSync(filePath, 'console.log("Standalone");');

    // Test detecting package
    const pkg = await detectPackage(filePath);

    // Verify the results
    expect(pkg).to.be.undefined;
  });

  it('should detect parent package for a file in subpackage without package.json', async () => {
    // Create a parent package
    const parentPackagePath = createTempPackage(tempDir, 'parent-package');

    // Create a directory that looks like a subpackage but has no package.json
    const subPackagePath = path.join(parentPackagePath, 'packages/sub-package');
    fs.mkdirSync(subPackagePath, { recursive: true });

    // Create a test file in the subpackage
    const filePath = createTestFile(
      subPackagePath,
      'index.js',
      'console.log("Subpackage");'
    );

    // Test detecting package
    const pkg = await detectPackage(filePath);

    // Verify the results - should find the parent package
    expect(pkg).to.not.be.undefined;
    expect(pkg?.name).to.equal('parent-package');
    expect(pkg?.path).to.equal(parentPackagePath);
  });

  it('should handle package.json with no name property', async () => {
    // Create a package with no name in package.json
    const packagePath = path.join(tempDir, 'unnamed-package');
    fs.mkdirSync(packagePath, { recursive: true });

    // Create package.json without name
    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );

    // Create a test file
    const filePath = createTestFile(packagePath, 'index.js', 'console.log("Unnamed");');

    // Test detecting package
    const pkg = await detectPackage(filePath);

    // Verify the results - should be undefined as no valid package name found
    expect(pkg).to.be.undefined;
  });
});