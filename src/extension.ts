import type * as vscode from 'vscode';
import { testControllerVSCode } from './vscodeCore/testController.vsc';

/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('TurboTest Explorer activating');

  // Create the test controller
  const controller = testControllerVSCode(context);
  context.subscriptions.push(controller);

  console.log('TurboTest Explorer activated');
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
  console.log('TurboTest Explorer deactivating');
}