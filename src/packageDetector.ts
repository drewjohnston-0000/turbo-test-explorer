import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { DetectedPackage } from './custom-types/DetectedPackage';

/**
 * Finds the npm package containing the given file path
 * by searching upwards for the nearest package.json
 */
export const detectPackage = async (filePath: string): Promise<DetectedPackage | undefined> => {
  let currentDir = path.dirname(filePath);
  const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // Search upwards until we find a package.json or hit the workspace root
  while (currentDir && (!rootPath || currentDir.startsWith(rootPath))) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    try {
      // Check if package.json exists
      if (fs.existsSync(packageJsonPath)) {
        // Read and parse the package.json file
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // If we have a valid package name, return the package info
        if (packageJson.name) {
          return {
            name: packageJson.name,
            path: currentDir
          };
        }
      }
    } catch (err) {
      // Log error but continue the search
      console.error(`Error reading package.json at ${packageJsonPath}:`, err);
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root of the filesystem
      break;
    }
    currentDir = parentDir;
  }

  // No package.json found
  return undefined;
};

/**
 * Gets the package containing the active editor file
 */
export const detectCurrentPackage = async (): Promise<DetectedPackage | undefined> => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return undefined;
  }

  return detectPackage(activeEditor.document.uri.fsPath);
};