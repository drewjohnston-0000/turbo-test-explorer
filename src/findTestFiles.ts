import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts a glob pattern to a RegExp pattern
 */
function globPatternToRegex(pattern: string): RegExp {
  console.log(`🧪 [findTestFiles] Converting glob pattern to regex: ${pattern}`);

  // Escape special characters except * and **
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  // Replace ** with a placeholder
  const withDoubleStarPlaceholder = escaped.replace(/\*\*/g, '__DOUBLE_STAR__');

  // Replace single * with regex for any characters
  const withSingleStar = withDoubleStarPlaceholder.replace(/\*/g, '.*');

  // Replace ** placeholder with regex for any characters including slashes
  const withDoubleStars = withSingleStar.replace(/__DOUBLE_STAR__/g, '.*');

  // Create regex that matches the entire string
  const regex = new RegExp(withDoubleStars);
  console.log(`🧪 [findTestFiles] Converted pattern ${pattern} to regex ${regex}`);
  return regex;
}

/**
 * Recursively scans directory for files matching patterns
 */
function scanDirectory(
  dir: string,
  patterns: RegExp[],
  results: string[] = []
): string[] {
  console.log(`🧪 [findTestFiles] Scanning directory: ${dir}`);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    console.log(`🧪 [findTestFiles] Found ${entries.length} entries in ${dir}`);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories to avoid performance issues
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          console.log(`🧪 [findTestFiles] Skipping directory: ${entry.name}`);
          continue;
        }

        // Recursively scan subdirectories
        scanDirectory(fullPath, patterns, results);
      } else if (entry.isFile()) {
        // Check if the file matches any pattern
        const matches = patterns.some(pattern => pattern.test(entry.name));
        if (matches) {
          console.log(`🧪 [findTestFiles] Found matching test file: ${entry.name}`);
          results.push(fullPath);
        }
      }
    }

    return results;
  } catch (error) {
    console.error(`🧪 [findTestFiles] Error scanning directory ${dir}: ${error}`);
    return results;
  }
}

/**
 * Finds test files in a package directory based on patterns
 */
export function findTestFiles(
  packagePath: string,
  patterns: string[] = ['**/*.spec.ts', '**/*.spec.js']
): string[] {
  console.log(`🧪 [findTestFiles] Finding test files in ${packagePath} with patterns: ${patterns.join(', ')}`);

  try {
    if (!fs.existsSync(packagePath)) {
      console.error(`🧪 [findTestFiles] Package path does not exist: ${packagePath}`);
      return [];
    }

    if (!fs.statSync(packagePath).isDirectory()) {
      console.error(`🧪 [findTestFiles] Package path is not a directory: ${packagePath}`);
      return [];
    }

    // Convert patterns to simplified regex patterns
    const simplePatterns = patterns.map(pattern => {
      // Extract the filename pattern part (e.g., "*.spec.ts" from "**/*.spec.ts")
      const filePattern = pattern.split('/').pop() || pattern;
      return filePattern;
    });

    console.log(`🧪 [findTestFiles] Simplified patterns: ${simplePatterns.join(', ')}`);

    // Convert simplified patterns to regex for matching
    const regexPatterns = simplePatterns.map(globPatternToRegex);

    // Scan the directory recursively
    const results = scanDirectory(packagePath, regexPatterns);
    console.log(`🧪 [findTestFiles] Found ${results.length} test files`);

    return results;
  } catch (error) {
    console.error(`🧪 [findTestFiles] Error finding test files: ${error}`);
    return [];
  }
}