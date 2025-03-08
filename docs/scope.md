# TurboTest Explorer – Scoping Document

## 1. Overview

TurboTest Explorer will integrate the Node.js native test runner (for TypeScript/JavaScript spec files) with VS Code’s Testing API. Using the self-hosted test provider as a blueprint, we’ll strip out unnecessary features and tailor it to our Turbo monorepo (with npm workspaces) environment. The goal is a purpose-built solution that auto-detects the current package and runs tests scoped only to that package.

## 2. Goals
- Purpose-Built: Create a streamlined test explorer that works only for our stack.
- Scoped Test Discovery: Automatically detect and run tests within the active package.
- Leverage Turborepo: Use turbo run test --filter=<package> to execute tests, taking advantage of caching.
- Simple Integration: Adapt the self-hosted test provider’s core concepts for our needs without excess complexity.

## 3. Key Features
1.	Test Discovery
  - Utilize VS Code’s Testing API to create a TestController.
  - Scan only the active package (determined from the current file’s location) for spec files (e.g., *.spec.ts, *.spec.js).
2.	Scoped Test Execution
  - Run tests via Turborepo commands scoped to the detected package.
  - Parse and display results using a JSON reporter from the Node.js native test runner.
3.	UI Integration
  - Present tests in VS Code’s Test Explorer.
  - Provide CodeLens buttons and gutter decorations for immediate feedback.
4.	Simplified Workflow
  - Default to running tests for the package currently being developed.
  - Offer a manual override command to run tests across the entire monorepo when needed.

## 4. Architecture & Components

### Core Modules:
- Extension Entry (extension.ts):
- Initializes the extension and registers the TestController.
- Test Controller:
- Manages discovery and presentation of tests using the VS Code Testing API.
- Test Runner:
- Executes tests using the Turbo command (turbo run test --filter=<package>).
- Processes test output to update the Test Explorer.
- Package Detection Utility:
- Implements logic to determine the current package from the active file.
- Reads the nearest package.json to extract the package name.
- UI Enhancements:
- Implements CodeLens and gutter decorations to display test statuses.

### Considerations:
- Simplicity Over Flexibility:
Since this is built for a specific stack, unnecessary features from the self-hosted blueprint will be removed.
- Monorepo Adaptation:
Accurate detection of the active package is critical. The package detection logic should gracefully handle files outside a workspace (falling back to manual selection or full-repo execution).
- Turborepo Integration:
Ensure that Turbo’s caching behavior is leveraged for efficiency. Provide options to force reruns if needed.

5. Proposed File Structure

```
TurboTestExplorer/
├── src/
│   ├── extension.ts          # Main entry point & activation logic
│   ├── testController.ts     # Manages test discovery for the active package
│   ├── testRunner.ts         # Executes Turbo test commands and parses results
│   ├── packageDetector.ts    # Logic to identify the current package from active files
│   ├── ui/
│   │   ├── decorations.ts    # Gutter icon implementation
│   │   ├── codeLens.ts       # Provides CodeLens buttons for run/debug actions
│   ├── config.ts             # Handles configuration and settings
│   ├── utils.ts              # Helper functions and common utilities
│   ├── custom-types/
│   │   ├── TypeA.d.ts        # Type definitions for TypeA
│   │   ├── TypeB.d.ts        # Type definitions for TypeB
├── specs/
│   ├── extension.spec.ts      // Specs for extension.ts
│   ├── testController.spec.ts // Specs for testController.ts
│   ├── testRunner.spec.ts     // Specs for testRunner.ts
│   ├── packageDetector.spec.ts// Specs for packageDetector.ts
│   ├── ui/
│   │   ├── decorations.spec.ts// Specs for decorations.ts
│   │   ├── codeLens.spec.ts   // Specs for codeLens.ts
├── package.json              # Extension metadata and dependencies
├── tsconfig.json             # TypeScript configuration
├── tsconfig.json             # TypeScript configuration
├── .vscode/
│   ├── launch.json           # Debug configuration for extension development
│   ├── settings.json         # Recommended workspace settings
└── README.md  `              # Documentation and usage instructions

```

## 6. Reference Implementation: Microsoft’s Self-Hosted Test Provider

### Overview:
The Microsoft self-hosted test provider (available in the VS Code repository) serves as our blueprint. It demonstrates how to use the VS Code Testing API for test discovery, execution, and result reporting. [repo](https://github.com/microsoft/vscode/tree/main/.vscode/extensions/vscode-selfhost-test-provider/src)

### Key Points of Reference:
- Test Controller & Discovery:
It uses a comprehensive test controller to handle hierarchical test structures.
- Result Reporting:
It leverages robust mechanisms to parse test output and update the UI.
- Flexibility & Extensibility:
The reference implementation is designed to be generic and flexible for a wide range of scenarios.

### Differences in Our Approach:
- Scope & Specificity:
We’re limiting our solution to running tests for a single package at a time, which simplifies many aspects of test discovery and execution.
- Monorepo & Turborepo Focus:
Our implementation integrates with Turborepo and npm workspaces, leveraging caching and scoped test runs—functionality not present in the generic reference.
- Simplified Codebase:
By stripping out features that aren’t needed for our specific workflow, we reduce complexity and focus on essential functionality.

### Challenges & Considerations:
- Accurate Package Detection:
Adapting the generic discovery mechanism to reliably detect the current package in a monorepo.
- Turbo Integration:
Ensuring that our test runner correctly leverages Turborepo’s caching and filtering features.
- Maintenance:
Keeping the extension lightweight while still providing enough extensibility for potential future enhancements.