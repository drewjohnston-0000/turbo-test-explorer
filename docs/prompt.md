You are a professional TypeScript developer. Your task is to build a VS Code extension called "TurboTest Explorer" that integrates the Node.js native test runner (using a JSON reporter) with the VS Code Testing API. This extension is designed for a monorepo managed by Turborepo and npm workspaces. It should focus on running tests scoped to the current package based on the active file. Use a TDD approach: write tests first, then the implementation code. Ensure that all code has no compiler or linting errors. 

The extension should have the following core features:
1. **Test Discovery:**  
   - The extension should scan for test files (e.g., `*.spec.ts` and `*.spec.js`) only in the active package (the package that contains the file currently open in the editor).  
   - Use a helper module (e.g., `packageDetector.ts`) to determine the current package by finding the nearest `package.json` and reading its `name` field.

2. **Scoped Test Execution:**  
   - When a test run is initiated, the extension should execute tests using a command like `npx turbo run test --filter=<package> -- --reporter=json`.  
   - Parse the JSON output to update the Test Explorer with pass/fail statuses, durations, and error messages.

3. **VS Code UI Integration:**  
   - Use the VS Code Testing API to create a `TestController` that lists tests in a hierarchical structure.
   - Implement CodeLens actions for "Run Test" and "Debug Test" on test files or test cases.
   - Provide gutter decorations for test results (e.g., icons for passed/failed tests).

4. **TDD & Quality Requirements:**
   - Write unit tests for each module (e.g., package detection, test discovery, test execution, result parsing) using the Node.js native test runner.
   - Use chai for assertions.
   - Follow this template for each spec file:
     ```typescript
     import { describe, it, beforeEach, afterEach } from "node:test";
     import { expect } from "chai";
     
     describe("Extension", () => {
       describe("#extension_function", () => {
         it("Should be a function", () => {
           expect(myFunction).to.be.a("function");
         });
       });
     });
     ```
   - Ensure every piece of code is free of TypeScript compiler and linting errors.
   - Write small, incremental commits with meaningful messages.

5. **Project Structure:**  
   Follow this simplified file structure:

```
TurboTestExplorer/
├── src/
│   ├── extension.ts          // Entry point: initialize extension, register TestController
│   ├── testController.ts     // Manages test discovery and integration with VS Code Testing API
│   ├── testRunner.ts         // Executes Turbo test commands (calls npx turbo run test --filter=<package>)
│   ├── packageDetector.ts    // Contains logic to detect the current package from the active file’s location
│   ├── ui/
│   │   ├── decorations.ts    // Provides gutter decorations based on test results
│   │   ├── codeLens.ts       // Provides CodeLens actions for running and debugging tests
│   ├── config.ts             // Handles extension configuration settings (e.g., test file pattern)
│   ├── utils.ts              // Helper functions and common utilities
│   ├── types.ts              // Type definitions for the extension
├── specs/
│   ├── extension.spec.ts      // Specs for extension.ts
│   ├── testController.spec.ts // Specs for testController.ts
│   ├── testRunner.spec.ts     // Specs for testRunner.ts
│   ├── packageDetector.spec.ts// Specs for packageDetector.ts
│   ├── ui/
│   │   ├── decorations.spec.ts// Specs for decorations.ts
│   │   ├── codeLens.spec.ts   // Specs for codeLens.ts
├── package.json              // Extension metadata and dependencies
├── tsconfig.json             // TypeScript configuration
├── .vscode/
│   ├── launch.json           // Debug configuration for extension development
│   ├── settings.json         // Recommended VS Code settings
├── docs
│   ├── scope.json               // Detailed scope of the project
│   ├── test-explorer-study.json // Study on existing test explorer extensions
└── README.md                 // Documentation for the extension
```

6. **Development Guidelines:**  

- Use TypeScript for all code.
- Follow TDD practices: for each feature, write tests that describe the desired behavior before writing the implementation.
- Ensure code quality: no compiler or linting errors.
- Optimize for a specific workflow (scoped to the current package) rather than a fully generic solution.
- Leverage the Microsoft self-hosted test provider as a blueprint but strip out any features not needed for this specific stack.

Begin by writing unit tests for `packageDetector.ts` that verify the detection of the current package from a given file path. Then, implement `packageDetector.ts` accordingly. Continue similarly with test discovery and test execution modules. Provide code in small, incremental commits, ensuring that tests pass before moving to the next module.

Please generate the initial unit tests for `packageDetector.ts` using the Node.js native test runner with chai assertions.