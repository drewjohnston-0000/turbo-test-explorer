import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts a glob pattern to a RegExp pattern
  */
function globPatternToRegex(pattern: string): RegExp {
  // Escape special characters except * and **
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  // Replace ** with a placeholder
  const withDoubleStarPlaceholder = escaped.replace(/\*\*/g, '__DOUBLE_STAR__');

  // Replace single * with regex for non-slash characters
  const withSingleStar = withDoubleStarPlaceholder.replace(/\*/g, '[^/]*');

  // Replace ** placeholder with regex for any characters including slashes
  const withDoubleStars = withSingleStar.replace(/__DOUBLE_STAR__/g, '.*');

  // Create regex that matches the entire string
  return new RegExp(`^${withDoubleStars}$`);
}

/**
 * Recursively scans directory for files matching patterns
 */
function scanDirectory(
  dir: string,
  patterns: RegExp[],
  results: string[] = []
): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, patterns, results);
      } else if (entry.isFile()) {
        // Check if the file name matches any pattern
        // Important fix here: we should check the filename against patterns, not the relative path
        if (patterns.some(pattern => pattern.test(entry.name))) {
          results.push(fullPath);
        }
      }
    }

    return results;
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error}`);
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
  try {
    if (!fs.existsSync(packagePath) || !fs.statSync(packagePath).isDirectory()) {
      return [];
    }

    // CRITICAL FIX: Glob patterns like **/*.spec.ts should be simplified to just *.spec.ts 
    // since we're scanning directories recursively already
    const simplePatterns = patterns.map(pattern => {
      // Remove **/ from the pattern as we handle directory traversal separately
      return pattern.replace(/\*\*\//, '');
    });

    // Convert simplified patterns to regex for matching
    const regexPatterns = simplePatterns.map(globPatternToRegex);

    // Scan the directory recursively
    return scanDirectory(packagePath, regexPatterns);
  } catch (error) {
    console.error(`Error finding test files: ${error}`);
    return [];
  }
}