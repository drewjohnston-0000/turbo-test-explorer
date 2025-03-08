import path from 'path';
import { Uri } from '../vscode.mock';

/**
 * Type definition for mock workspace folder
 */
export type MockWorkspaceFolder = {
  uri: Uri;
  name: string;
  index: number;
};

/**
 * Creates a mock workspace folder for testing
 */
export function createMockWorkspace(folderPath: string): MockWorkspaceFolder {
  return {
    uri: Uri.file(folderPath),
    name: path.basename(folderPath),
    index: 0
  };
}