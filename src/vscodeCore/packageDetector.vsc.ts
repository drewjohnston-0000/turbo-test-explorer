import * as vscode from 'vscode';
import { detectPackage } from '../packageDetector';

/**
 * Gets the package containing the active editor file
 */
export function detectCurrentPackage(): DetectedPackage | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  // For now, just use the first workspace folder
  const workspacePath = workspaceFolders[0].uri.fsPath;
  return detectPackage(workspacePath);
}
