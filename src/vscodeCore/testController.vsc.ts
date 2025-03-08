import * as vscode from 'vscode';
import * as path from 'path';
import { testController } from '../testController';

/**
 * Creates and manages a VS Code Test Controller for the workspace
 */
export function testControllerVSCode(
  context: vscode.ExtensionContext
): vscode.Disposable {
  // Create the TestController instance
  const controller = vscode.tests.createTestController(
    'turboTestExplorer',
    'TurboTest Explorer'
  );

  // Track VS Code test items
  const testItemsMap = new Map<string, vscode.TestItem>();

  // Create consumer implementation that connects to VS Code
  interface TestItemModel {
    id: string;
    label: string;
    uri: string;
    children: TestItemModel[];
  }

  interface Consumer {
    addTestItem(item: TestItemModel): void;
    clearItems(): void;
    runTests(items: TestItemModel[]): Promise<void>;
  }

  const consumer: Consumer = {
    addTestItem: (item: TestItemModel): void => {
      const vsCodeItem = createVSCodeTestItem(item);
      controller.items.add(vsCodeItem);
    },

    clearItems: (): void => {
      controller.items.replace([]);
      testItemsMap.clear();
    },

    runTests: async (items: TestItemModel[]): Promise<void> => {
      const run = controller.createTestRun({
        include: [],
        exclude: [],
        profile: undefined,
        preserveFocus: false
      });

      for (const item of items) {
        const vsCodeItem = testItemsMap.get(item.id);
        if (vsCodeItem) {
          run.started(vsCodeItem);

          // Simple simulation for MVP
          await new Promise<void>(resolve => setTimeout(resolve, 500));

          run.passed(vsCodeItem, 500);
        }
      }

      run.end();
    }
  };

  // Function to convert our TestItem to VS Code TestItem
  function createVSCodeTestItem(item: TestItemModel) {
    if (testItemsMap.has(item.id)) {
      return testItemsMap.get(item.id)!;
    }

    const vsCodeItem = controller.createTestItem(
      item.id,
      item.label,
      vscode.Uri.file(item.uri)
    );

    // Add children
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        const childItem = createVSCodeTestItem(child);
        vsCodeItem.children.add(childItem);
      }
    }

    // Store in map
    testItemsMap.set(item.id, vsCodeItem);

    return vsCodeItem;
  }

  // Get workspace path function
  const getWorkspacePath = () => {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  };

  // Get test patterns function
  const getTestPatterns = () => {
    const config = vscode.workspace.getConfiguration('turboTestExplorer');
    return config.get<string[]>('testMatch') || ['**/*.spec.ts', '**/*.spec.js'];
  };

  // Create the core controller
  const core = testController(getWorkspacePath, consumer, getTestPatterns);

  // Add run profile
  controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    async (request, token) => {
      const queue = [];

      // Collect test items to run
      if (request.include) {
        for (const item of request.include) {
          // Map back to our internal model
          const id = item.id;

          // In a real implementation, we'd map these to our internal model
          // For MVP, we'll just simulate running
          queue.push({ id });
        }
      }

      // Create a run
      const run = controller.createTestRun(request);

      // Process queue
      for (const item of queue) {
        if (token.isCancellationRequested) break;

        const vsCodeItem = testItemsMap.get(item.id);
        if (vsCodeItem) {
          run.started(vsCodeItem);

          // Simple simulation
          await new Promise(resolve => setTimeout(resolve, 500));

          run.passed(vsCodeItem);
        }
      }

      run.end();
    },
    true
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('turboTestExplorer.refresh', () => {
      core.refresh();
    })
  );

  // Watch for changes to test files
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(e => {
      const fileName = path.basename(e.fileName);
      const patterns = getTestPatterns();

      const isTestFile = patterns.some(pattern => {
        const simplifiedPattern = pattern.replace(/\*\*\//, '');
        const suffix = simplifiedPattern.replace(/\*/g, '.*');
        const regex = new RegExp(suffix.replace('.', '\\.'));
        return regex.test(fileName);
      });

      if (isTestFile) {
        core.refresh();
      }
    })
  );

  // Return disposable
  return {
    dispose: () => {
      controller.dispose();
      core.dispose();
    }
  };
}