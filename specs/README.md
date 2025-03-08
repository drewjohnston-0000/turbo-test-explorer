# Testing Documentation

## Testing Structure

This project uses Node.js native test runner with Chai assertions. Tests are organized to mirror the source structure:

```plaintext
specs/ 
├── utils/ # Tests for utility functions 
├── helpers/ # testing helpers
├── fixtures/ # Test fixtures for common test data
├── testRunner/ # Tests for test runner components 
├── mocks/ # Mock implementations for VS Code and other dependencies 
└── README.md # This documentation
```

## Testing Strategy

### Core Principles

1. **Separation of Concerns**: VS Code APIs are separated from core business logic
2. **Dependency Injection**: Core functions accept interfaces rather than concrete implementations
3. **One Function, One File**: Each function has its own file with a matching name
4. **Functional Programming**: Prefer pure functions over classes and avoid mutation

### Handling VS Code Dependencies

We follow these principles to make VS Code code testable:

1. Core logic is placed in the `src/` directory and should be testable without VS Code
2. VS Code specific code is placed in `src/vscodeCore/`
3. We use dependency injection for VS Code services

## Mocking Strategy

### VS Code Mocking

For VS Code APIs, we create minimal mocks in the `specs/mocks/` directory.

Example usage:

```typescript
import { createMockOutputHandler } from '../mocks/OutputHandler.mock';
import { createMockWorkspaceInfo } from '../mocks/WorkspaceInfo.mock';

const outputHandler = createMockOutputHandler();
const workspaceInfo = createMockWorkspaceInfo();

// Now use these in tests
```

### Child Process Mocking
For testing functions that call external processes:

```typescript
// Example from testRunner tests
const mockExec = (mockStdout: string, mockStderr = '', mockError: Error | null = null) => {
  const originalExec = cp.exec;
  cp.exec = (command, options, callback) => {
    setTimeout(() => {
      callback(mockError, mockStdout, mockStderr);
    }, 0);
    
    return { 
      stdout: { on: () => {} },
      stderr: { on: () => {} }
    } as any;
  };

  return () => { cp.exec = originalExec; };
};
```

## Test template

Here's a template for writing tests:
```typescript

// filepath: /specs/[directory]/[functionName].spec.ts
// @ts-ignore
import { expect } from "chai";
import { describe, it, beforeEach, afterEach } from "node:test";
import { functionName } from "../../src/[path-to-function]";

// If mocks are needed:
// import { createMockDependency } from "../mocks/Dependency.mock";

describe("Testsuite: functionName", () => {
  // Setup and teardown
  beforeEach(() => {
    // Setup code
  });
  
  afterEach(() => {
    // Teardown code
  });

  it("Should be a function", () => {
    expect(functionName).to.be.a("function");
  });

  it("Should [describe expected behavior]", () => {
    // Arrange
    const input = "test input";
    
    // Act
    const result = functionName(input);
    
    // Assert
    expect(result).to.equal("expected output");
  });
  
  it("Should handle error cases", () => {
    // Error handling tests
    expect(() => functionName(null)).to.throw();
  });
});
```

## Running Tests

To run tests, use the following command:

```bash
npm test
```

This will run all tests in the `specs/` directory.

To run a specific test file, use the following command:

```bash
npx tsc && node --import tsx --test --test-reporter spec specs/path/to/test.spec.ts
```
