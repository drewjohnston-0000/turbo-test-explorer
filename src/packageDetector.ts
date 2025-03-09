import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets package information from package.json at the root of the workspace
 */
export function detectPackage(workspacePath: string): DetectedPackage | undefined {
  console.log(`🧪 [PackageDetector] Detecting package at path: ${workspacePath}`);

  try {
    // First try direct package.json in the workspace path
    const packageJsonPath = path.join(workspacePath, 'package.json');
    console.log(`🧪 [PackageDetector] Looking for package.json at: ${packageJsonPath}`);

    if (fs.existsSync(packageJsonPath)) {
      console.log(`🧪 [PackageDetector] Found package.json at: ${packageJsonPath}`);
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.name) {
        console.log(`🧪 [PackageDetector] Detected package: ${packageJson.name}`);
        return {
          name: packageJson.name,
          path: workspacePath
        };
      }
    } else {
      console.log(`🧪 [PackageDetector] No package.json found at: ${packageJsonPath}`);
      return undefined;
    }

    console.log(`🧪 [PackageDetector] No valid package detected at: ${workspacePath}`);
    return undefined;
  } catch (err) {
    console.error(`🧪 [PackageDetector] Error reading package.json: ${err}`);
    return undefined;
  }
}