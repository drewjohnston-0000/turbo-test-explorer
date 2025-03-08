import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets package information from package.json at the root of the workspace
 */
export function detectPackage(workspacePath: string): DetectedPackage | undefined {
  try {
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.name) {
        return {
          name: packageJson.name,
          path: workspacePath
        };
      }
    }

    return undefined;
  } catch (err) {
    console.error(`Error reading package.json: ${err}`);
    return undefined;
  }
}