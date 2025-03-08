/**
 * Mock implementation of OutputHandler for testing
 */
export const createMockOutputHandler = (): OutputHandler & { getOutput: () => string } => {
  let outputContent = '';

  return {
    append: (text: string) => { outputContent += text; },
    appendLine: (text: string) => { outputContent += text + '\n'; },
    show: () => { },
    getOutput: () => outputContent
  };
};

/**
 * Mock implementation of WorkspaceInfo for testing
 */
export const createMockWorkspaceInfo = (
  rootPath = '/mock/workspace',
  turboBinaryPath = 'npx turbo'
): WorkspaceInfo => {
  return {
    getRootPath: () => rootPath,
    getTurboBinaryPath: () => turboBinaryPath
  };
};
