import { it, describe, beforeEach, afterEach } from 'node:test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore
import { expect } from 'chai';
import { detectPackage } from '../src/packageDetector';

describe('Testsuite: Package Detector', () => {
  // Temporary directory for test files with unique identifier to prevent conflicts
  const tempDir = path.join(
    os.tmpdir(),
    `turbo-test-explorer-tests-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  );

  beforeEach(() => {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory with improved error handling
    if (fs.existsSync(tempDir)) {
      try {
        // Close all file handles before deletion
        // Allow some time for handles to be released
        setTimeout(() => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn(`Failed to remove temp directory (delayed attempt): ${e}`);
            // Not failing the test on cleanup issues
          }
        }, 100);

        // Also try immediate removal
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`Failed to remove temp directory: ${e}`);
        // Not failing the test on cleanup issues
      }
    }
  });

  it('should detect package from workspace path with package.json', () => {
    // Create a test package
    const packagePath = path.join(tempDir, 'test-package');
    fs.mkdirSync(packagePath, { recursive: true });

    // Create package.json
    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify({ name: 'test-package', version: '1.0.0' }, null, 2)
    );

    // Test detecting package
    const pkg = detectPackage(packagePath);

    // Verify the results
    expect(pkg).to.not.be.undefined;
    expect(pkg?.name).to.equal('test-package');
    expect(pkg?.path).to.equal(packagePath);
  });

  it('should return undefined for path without package.json', () => {
    // Create an empty directory
    const emptyPath = path.join(tempDir, 'empty-dir');
    fs.mkdirSync(emptyPath, { recursive: true });

    // Test detecting package
    const pkg = detectPackage(emptyPath);

    // Verify the results
    expect(pkg).to.be.undefined;
  });

  it('should return undefined when package.json has no name property', () => {
    // Create a package with no name in package.json
    const packagePath = path.join(tempDir, 'unnamed-package');
    fs.mkdirSync(packagePath, { recursive: true });

    // Create package.json without name
    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );

    // Test detecting package
    const pkg = detectPackage(packagePath);

    // Verify the results
    expect(pkg).to.be.undefined;
  });

  it('should handle errors gracefully', () => {
    // Create invalid path that will cause an error
    const invalidPath = 'invalid-path';

    // Test detecting package with invalid path
    const pkg = detectPackage(invalidPath);

    // Verify the results
    expect(pkg).to.be.undefined;
  });
});