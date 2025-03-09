import * as vscode from 'vscode';
import * as path from 'path';
import { testController } from '../testController';
import { detectPackage } from '../packageDetector';
import { findTestFiles } from '../findTestFiles';

/**
 * Creates and manages a VS Code Test Controller for the workspace
 */
export function testControllerVSCode(
  context: vscode.ExtensionContext
): vscode.Disposable {
  console.log('Initializing TestController for VS Code');

  // Create the TestController instance
  const controller = vscode.tests.createTestController(
    'turboTestExplorer',
    'TurboTest Explorer'
  );
  console.log('Created test controller instance');

  // Track VS Code test items
  const testItemsMap = new Map<string, vscode.TestItem>();

  // Create consumer implementation that connects to VS Code
  interface TestItemModel {
    id: string;
    label: string;
    uri: string;
    children: TestItemModel[];
  }

  const consumer = {
    addTestItem: (item: TestItemModel): void => {
      console.log(`Adding test item: ${item.id} - ${item.label}`);
      const vsCodeItem = createVSCodeTestItem(item);
      controller.items.add(vsCodeItem);
      console.log(`Added test item to controller: ${item.id}`);
    },

    clearItems: (): void => {
      console.log('Clearing all test items');
      controller.items.replace([]);
      testItemsMap.clear();
      console.log(`Test items map cleared, size now: ${testItemsMap.size}`);
    },

    runTests: async (items: TestItemModel[]): Promise<void> => {
      console.log(`Running tests for ${items.length} items`);
      const run = controller.createTestRun(new vscode.TestRunRequest());

      for (const item of items) {
        const vsCodeItem = testItemsMap.get(item.id);
        if (vsCodeItem) {
          run.started(vsCodeItem);

          // TODO: Integrate with actual test runner here
          // For now, just mark tests as passed for demonstration
          await new Promise(resolve => setTimeout(resolve, 500));

          run.passed(vsCodeItem);
        }
      }

      run.end();
    }
  };

  /**
   * Converts our model to VS Code TestItem
   */
  function createVSCodeTestItem(item: TestItemModel): vscode.TestItem {
    // If we already have this item, return it
    if (testItemsMap.has(item.id)) {
      return testItemsMap.get(item.id)!;
    }

    // Create a new test item
    const vsCodeItem = controller.createTestItem(
      item.id,
      item.label,
      vscode.Uri.file(item.uri)
    );

    // Add children recursively
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
      console.log('Test run requested');

      const itemsToRun: TestItemModel[] = [];
      const collectItemsToRun = (item: vscode.TestItem) => {
        // Find our model equivalent
        const id = item.id;
        const queue: vscode.TestItem[] = [item];

        while (queue.length > 0) {
          const current = queue.shift()!;
          const vsCodeItem = testItemsMap.get(current.id);

          if (vsCodeItem) {
            const modelItem: TestItemModel = {
              id: vsCodeItem.id,
              label: vsCodeItem.label,
              uri: vsCodeItem.uri?.fsPath || '',
              children: []
            };
            itemsToRun.push(modelItem);
          }

          // Add children to queue
          // biome-ignore lint/complexity/noForEach: co-pilot did it
          current.children.forEach(child => queue.push(child));
        }
      };

      // If specific tests are selected, run only those
      if (request.include) {
        request.include.forEach(collectItemsToRun);
      } else {
        // Otherwise run all tests
        controller.items.forEach(collectItemsToRun);
      }

      // Run the tests
      await consumer.runTests(itemsToRun);
    },
    true // Make this the default profile
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('turboTestExplorer.refresh', () => {
      console.log('Manual refresh command triggered');
      core.refresh();
    })
  );

  // Watch for file changes
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(e => {
      const fileName = path.basename(e.fileName);
      const patterns = getTestPatterns();

      // Simple check if this might be a test file
      const couldBeTestFile = patterns.some(pattern => {
        const suffix = pattern.replace(/^\*\*\//, '').replace(/\*/g, '');
        return fileName.endsWith(suffix);
      });

      if (couldBeTestFile) {
        console.log(`Test file ${fileName} changed, refreshing tests`);
        core.refresh();
      }
    })
  );

  // Return disposable
  return {
    dispose: () => {
      console.log('Disposing VS Code test controller');
      controller.dispose();
      core.dispose();
    }
  };
}