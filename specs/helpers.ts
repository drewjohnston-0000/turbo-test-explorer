import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Creates a mock workspace folder for testing
 */
export const createMockWorkspace = (folderPath: string): vscode.WorkspaceFolder => {
  return {
    uri: vscode.Uri.file(folderPath),
    name: path.basename(folderPath),
    index: 0
  };
};

/**
 * Creates a temporary package.json file structure
 * @returns The path to the created package
 */
export const createTempPackage = (
  tempDir: string,
  packageName: string,
  packageJsonContent: Record<string, unknown> = {}
): string => {
  const packagePath = path.join(tempDir, packageName);

  // Create package directory
  fs.mkdirSync(packagePath, { recursive: true });

  // Create package.json
  const packageJson = {
    name: packageName,
    version: '1.0.0',
    ...packageJsonContent
  };

  fs.writeFileSync(
    path.join(packagePath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  return packagePath;
};

/**
 * Creates a simple test file for testing purposes
 */
export const createTestFile = (
  packagePath: string,
  fileName: string,
  content: string
): string => {
  const filePath = path.join(packagePath, fileName);
  const dirPath = path.dirname(filePath);

  // Create directory if needed
  fs.mkdirSync(dirPath, { recursive: true });

  // Write file content
  fs.writeFileSync(filePath, content);

  return filePath;
};

/**
 * Cleanup temporary test files and directories
 */
export const cleanupTempDir = (dirPath: string): void => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const currentPath = path.join(dirPath, file);

      if (fs.statSync(currentPath).isDirectory()) {
        cleanupTempDir(currentPath);
      } else {
        fs.unlinkSync(currentPath);
      }
    }

    fs.rmdirSync(dirPath);
  }
};