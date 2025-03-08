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
   - Write unit tests for each module using the Node.js native test runner with chai for assertions
   - Functions should be named the same as their containing files
   - Each file should contain exactly one exported function
   - Prefer named function declarations over anonymous arrow functions
   - Follow the instructions in the `specs/README.md` for writing tests
   - Ensure every piece of code is free of TypeScript compiler and linting errors

5. **Code Organization Guidelines:**
   - Type definitions go in `src/custom-types/` with one type per file (no exports needed)
   - VS Code-specific code belongs in `src/vscodeCore/`
   - Core testable logic goes in `src/` and should avoid VS Code dependencies
   - Test mocks go in `specs/mocks/` folder
   - Two spaces for indentation
   - Prefer type definitions over interfaces
   - Prefer functional programming over classes
   - Keep files under 200 lines

6. **Project Structure:**  
   Follow this simplified file structure:

```
TurboTestExplorer/
.
├── README.md
├── biome.json
├── docs
│   ├── prompt.md
│   ├── scope.md
│   └── test-explorer-study.md
├── import-map.json
├── package-lock.json
├── package.json
├── specs
│   ├── README.md
│   ├── helpers
│   │   └── testHelpers.ts
│   ├── mocks
│   │   ├── TestRunner.vsc.mock.ts
│   │   ├── helpers
│   │   │   └── workspaceHelper.ts
│   │   └── vscode.mock.ts
│   ├── packageDetector.spec.ts
│   ├── testController.spec.ts
│   ├── testRunner
│   │   └── executeTestCommand.spec.ts
│   ├── testRunner.spec.ts
│   └── utils
│       ├── buildCommand.spec.ts
│       ├── mapTestStatus.spec.ts
│       └── parseTestResults.spec.ts
├── src
│   ├── custom-types
│   │   ├── DetectedPackage.d.ts
│   │   ├── OutputHandler.d.ts
│   │   ├── TestItemType.d.ts
│   │   ├── TestResult.d.ts
│   │   ├── TestRunOptions.d.ts
│   │   └── WorkspaceInfo.d.ts
│   ├── extension.ts
│   ├── packageDetector.ts
│   ├── testController.ts
│   ├── testRunner
│   │   └── executeTestCommand.ts
│   ├── testRunner.ts
│   ├── utils
│   │   ├── buildCommand.ts
│   │   ├── index.ts
│   │   ├── mapTestStatus.ts
│   │   └── parseTestResults.ts
│   └── vscodeCore
│       └── TestRunner.vsc.ts
└── tsconfig.json
```

7. **Development Priority:**
   - **Eating our own dog food**: The first priority is to get the extension working on its own codebase - we want to be able to use TurboTest Explorer to test TurboTest Explorer itself.
   - Start with the critical functionality needed for the core test discovery and execution
   - Focus on making the extension functional for our own development workflow first
   - Once it works for our own development, expand to handle more general cases

8. **Development Guidelines:**  

- Use TypeScript for all code.
- Follow TDD practices: for each feature, write tests that describe the desired behavior before writing the implementation.
- Ensure code quality: no compiler or linting errors.
- Optimize for a specific workflow (scoped to the current package) rather than a fully generic solution.
- Leverage the Microsoft self-hosted test provider as a blueprint but strip out any features not needed for this specific stack.

Begin by writing unit tests for pure utility functions first, then move to core logic that depends on them. VS Code integrations should be tested last. Keep each module focused on a single responsibility, and ensure all functions are properly named and documented. Ensure all tests pass before considering any feature complete.

Please generate the tests for a utility function following the established patterns.
