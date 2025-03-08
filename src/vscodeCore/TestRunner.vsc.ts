import * as vscode from 'vscode';
import { testRunner } from '../testRunner';

/**
 * VS Code implementation of the OutputHandler
 */
export const createVSCodeOutputHandler = (): OutputHandler => {
  const outputChannel = vscode.window.createOutputChannel('TurboTest Explorer');

  return {
    append: (text: string) => outputChannel.append(text),
    appendLine: (text: string) => outputChannel.appendLine(text),
    show: (preserveFocus?: boolean) => outputChannel.show(preserveFocus),
    //  dispose: () => outputChannel.dispose()
  };
};

/**
 * VS Code implementation of the WorkspaceInfo
 */
export const createVSCodeWorkspaceInfo = (): WorkspaceInfo => {
  return {
    getRootPath: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
    getTurboBinaryPath: () => {
      const config = vscode.workspace.getConfiguration('turboTestExplorer');
      return config.get<string>('turboBinaryPath') || 'npx turbo';
    }
  };
};

/**
 * Run tests with VS Code integrations
 */
export const runTestsWithVSCode = async (
  pkg: DetectedPackage,
  options: TestRunOptions = {}
): Promise<TestResult[]> => {
  const outputHandler = createVSCodeOutputHandler();
  const workspaceInfo = createVSCodeWorkspaceInfo();

  return testRunner(
    pkg.name,
    pkg.path,
    workspaceInfo,
    outputHandler,
    options
  );
};