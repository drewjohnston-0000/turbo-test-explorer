import * as vscode from 'vscode';
import * as path from 'path';
import { testController } from '../testController';

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

  interface Consumer {
    addTestItem(item: TestItemModel): void;
    clearItems(): void;
    runTests(items: TestItemModel[]): Promise<void>;
  }

  const consumer: Consumer = {
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
      const run = controller.createTestRun({
        include: [],
        exclude: [],
        profile: undefined,
        preserveFocus: false
      });
      console.log('Created test run');

      for (const item of items) {
        const vsCodeItem = testItemsMap.get(item.id);
        if (vsCodeItem) {
          console.log(`Starting test: ${item.id}`);
          run.started(vsCodeItem);

          // Simple simulation for MVP
          console.log(`Simulating test execution for ${item.id}`);
          await new Promise<void>(resolve => setTimeout(resolve, 500));

          console.log(`Test passed: ${item.id} (500ms)`);
          run.passed(vsCodeItem, 500);
        } else {
          console.log(`Test item not found in map: ${item.id}`);
        }
      }

      console.log('Ending test run');
      run.end();
    }
  };

  // Function to convert our TestItem to VS Code TestItem
  function createVSCodeTestItem(item: TestItemModel) {
    console.log(`Creating VS Code test item for: ${item.id}`);

    if (testItemsMap.has(item.id)) {
      console.log(`Reusing existing test item: ${item.id}`);
      return testItemsMap.get(item.id)!;
    }

    const vsCodeItem = controller.createTestItem(
      item.id,
      item.label,
      vscode.Uri.file(item.uri)
    );
    console.log(`Created new VS Code test item: ${item.id}`);

    // Add children
    if (item.children && item.children.length > 0) {
      console.log(`Processing ${item.children.length} children for ${item.id}`);
      for (const child of item.children) {
        const childItem = createVSCodeTestItem(child);
        vsCodeItem.children.add(childItem);
      }
      console.log(`Added all children to ${item.id}`);
    }

    // Store in map
    testItemsMap.set(item.id, vsCodeItem);
    console.log(`Added ${item.id} to test items map, map size: ${testItemsMap.size}`);

    return vsCodeItem;
  }

  // Get workspace path function
  const getWorkspacePath = () => {
    const path = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    console.log(`Workspace path: ${path}`);
    return path;
  };

  // Get test patterns function
  const getTestPatterns = () => {
    const config = vscode.workspace.getConfiguration('turboTestExplorer');
    const patterns = config.get<string[]>('testMatch') || ['**/*.spec.ts', '**/*.spec.js'];
    console.log(`Test patterns: ${patterns.join(', ')}`);
    return patterns;
  };

  // Create the core controller
  console.log('Creating core test controller');
  const core = testController(getWorkspacePath, consumer, getTestPatterns);
  console.log('Core test controller created');

  // Add run profile
  console.log('Adding run profile');
  controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    async (request, token) => {
      console.log('Run profile executed', {
        includeCount: request.include?.length || 0,
        excludeCount: request.exclude?.length || 0
      });

      const queue = [];

      // Collect test items to run
      if (request.include) {
        for (const item of request.include) {
          // Map back to our internal model
          const id = item.id;
          console.log(`Adding test to queue: ${id}`);
          // In a real implementation, we'd map these to our internal model
          // For MVP, we'll just simulate running
          queue.push({ id });
        }
      }

      console.log(`Queue prepared with ${queue.length} tests`);

      // Create a run
      const run = controller.createTestRun(request);
      console.log('Test run created');

      // Process queue
      for (const item of queue) {
        if (token.isCancellationRequested) {
          console.log('Run cancellation requested, stopping');
          break;
        }

        const vsCodeItem = testItemsMap.get(item.id);
        if (vsCodeItem) {
          console.log(`Starting test execution: ${item.id}`);
          run.started(vsCodeItem);

          // Simple simulation
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Test execution completed: ${item.id}`);

          run.passed(vsCodeItem);
          console.log(`Marked test as passed: ${item.id}`);
        } else {
          console.log(`Test item not found for execution: ${item.id}`);
        }
      }

      console.log('Ending test run');
      run.end();
    },
    true
  );
  console.log('Run profile added');

  // Register refresh command
  console.log('Registering refresh command');
  context.subscriptions.push(
    vscode.commands.registerCommand('turboTestExplorer.refresh', () => {
      console.log('Refresh command triggered');
      core.refresh();
      console.log('Refresh completed');
    })
  );

  // Watch for changes to test files
  console.log('Setting up file watcher for test files');
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(e => {
      const fileName = path.basename(e.fileName);
      console.log(`File saved: ${fileName}`);

      const patterns = getTestPatterns();

      const isTestFile = patterns.some(pattern => {
        const simplifiedPattern = pattern.replace(/\*\*\//, '');
        const suffix = simplifiedPattern.replace(/\*/g, '.*');
        const regex = new RegExp(suffix.replace('.', '\\.'));
        return regex.test(fileName);
      });

      if (isTestFile) {
        console.log(`Test file detected, refreshing: ${fileName}`);
        core.refresh();
        console.log('Refresh after test file change completed');
      } else {
        console.log(`Not a test file, skipping refresh: ${fileName}`);
      }
    })
  );

  console.log('Test Controller initialization complete');
  // Return disposable
  return {
    dispose: () => {
      console.log('Disposing test controller');
      controller.dispose();
      core.dispose();
      console.log('Test controller disposed');
    }
  };
}