import * as vscode from 'vscode';
import { testControllerVSCode } from './vscodeCore/testController.vsc';

/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('🧪 TurboTest Explorer activating 🧪');

  // Add logging to check workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;
  console.log(`🧪 Workspace folders available: ${workspaceFolders?.length || 0}`);
  if (workspaceFolders && workspaceFolders.length > 0) {
    console.log(`🧪 First workspace folder: ${workspaceFolders[0].uri.fsPath}`);
  }

  // Create the test controller
  const controller = testControllerVSCode(context);
  context.subscriptions.push(controller);

  // Register command to force test discovery
  context.subscriptions.push(
    vscode.commands.registerCommand('turboTestExplorer.discoverTests', () => {
      console.log('🧪 Force test discovery command triggered');
      vscode.commands.executeCommand('turboTestExplorer.refresh');
    })
  );

  // Show notification to help with troubleshooting
  vscode.window.showInformationMessage('TurboTest Explorer activated. If not visible, check Debug Console (View > Debug Console) for logs.');

  // Trigger initial test discovery
  setTimeout(() => {
    console.log('🧪 Triggering initial test discovery');
    vscode.commands.executeCommand('turboTestExplorer.refresh');
  }, 2000);

  console.log('🧪 TurboTest Explorer activated 🧪');
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
  console.log('🧪 TurboTest Explorer deactivating 🧪');
}