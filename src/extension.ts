import * as vscode from 'vscode';
import { TestController } from './testController';
/**
 * Activates the TurboTest Explorer extension
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create and initialize the test controller
  const testController = new TestController(context);

  // Register refresh command
  const refreshCommand = vscode.commands.registerCommand('turboTestExplorer.refresh', () => {
    testController.refreshTests();
  });

  // Register run all tests command
  const runAllTestsCommand = vscode.commands.registerCommand('turboTestExplorer.runAllTests', () => {
    testController.runAllTests();
  });

  // Add disposables to context
  context.subscriptions.push(
    testController,
    refreshCommand,
    runAllTestsCommand
  );
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
  // Cleanup will be handled by TestController's dispose method
}