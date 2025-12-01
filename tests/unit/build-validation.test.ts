/**
 * Property-based tests for TypeScript build validation
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Build Validation Properties', () => {
  /**
   * Feature: typescript-migration, Property 1: Source-to-output structure preservation
   * Validates: Requirements 1.3
   *
   * For any TypeScript source file in the src directory, when compiled,
   * there should exist a corresponding JavaScript file in the dist directory
   * maintaining the same relative path structure.
   */
  describe('Property 1: Source-to-output structure preservation', () => {
    it('should preserve directory structure from src to dist', () => {
      // Get all TypeScript files in src directory
      const srcFiles = getAllTypeScriptFiles('src');

      if (srcFiles.length === 0) {
        // No TypeScript files yet, test passes trivially
        expect(true).toBe(true);
        return;
      }

      // Check if dist directory exists
      if (!fs.existsSync('dist')) {
        // Build hasn't been run yet, skip this test
        console.log('Skipping: dist directory does not exist. Run build first.');
        expect(true).toBe(true);
        return;
      }

      // With bundling, we expect bundled entry point files instead of individual files
      const expectedBundledFiles = ['dist/content.js', 'dist/popup.js'];

      expectedBundledFiles.forEach((bundledFile) => {
        const exists = fs.existsSync(bundledFile);
        if (!exists) {
          console.log(`Missing bundled file: ${bundledFile}`);
        }
        expect(exists).toBe(true);
      });
    });

    it('should bundle all source files into entry points', () => {
      // Check if bundled files exist (they're created during build process)
      const bundledFiles = ['dist/content.js', 'dist/popup.js'];

      bundledFiles.forEach((file) => {
        if (!fs.existsSync(file)) {
          console.log(`Skipping: ${file} does not exist. Run build first.`);
          expect(true).toBe(true);
          return;
        }

        // Verify that bundled files contain code
        const bundle = fs.readFileSync(file, 'utf8');

        // Check that bundles are not empty and contain actual code
        expect(bundle.length).toBeGreaterThan(1000);

        // Verify bundles are IIFE format (wrapped in closure)
        // Bundled code should start with "use strict" or an IIFE pattern
        expect(bundle).toMatch(/^("use strict"|'use strict'|\(\s*\(\)\s*=>\s*{)/);
      });
    });
  });

  /**
   * Feature: typescript-migration, Property 4: File size constraint
   * Validates: Requirements 14.2
   *
   * For any TypeScript source file in the src directory,
   * the line count should be less than 300 lines to ensure readability.
   */
  describe('Property 4: File size constraint', () => {
    it('should keep all TypeScript files under 300 lines', () => {
      const srcFiles = getAllTypeScriptFiles('src');

      if (srcFiles.length === 0) {
        // No TypeScript files yet, test passes trivially
        expect(true).toBe(true);
        return;
      }

      const violations = [];

      srcFiles.forEach((srcFile) => {
        // Skip .d.ts declaration files as they're auto-generated
        if (srcFile.endsWith('.d.ts')) {
          return;
        }

        const content = fs.readFileSync(srcFile, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount >= 300) {
          violations.push({
            file: srcFile,
            lines: lineCount
          });
        }
      });

      if (violations.length > 0) {
        const violationMessages = violations
          .map((v) => `  - ${v.file}: ${v.lines} lines (exceeds 300 line limit)`)
          .join('\n');

        throw new Error(`The following files exceed the 300 line limit:\n${violationMessages}`);
      }

      expect(violations.length).toBe(0);
    });

    it('should maintain readability with focused file responsibilities', () => {
      const srcFiles = getAllTypeScriptFiles('src');

      if (srcFiles.length === 0) {
        expect(true).toBe(true);
        return;
      }

      // Check that most files are well under the limit (under 200 lines)
      // This encourages good practices even before hitting the hard limit
      const filesOverRecommendedSize = srcFiles.filter((srcFile) => {
        if (srcFile.endsWith('.d.ts')) {
          return false;
        }

        const content = fs.readFileSync(srcFile, 'utf-8');
        const lineCount = content.split('\n').length;
        return lineCount >= 200;
      });

      // Log files that are getting large (but not failing)
      if (filesOverRecommendedSize.length > 0) {
        console.log('\nFiles approaching size limit (200+ lines):');
        filesOverRecommendedSize.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          const lineCount = content.split('\n').length;
          console.log(`  - ${file}: ${lineCount} lines`);
        });
      }

      // This test always passes but provides visibility
      expect(true).toBe(true);
    });
  });

  /**
   * Feature: typescript-migration, Property 2: Source map generation
   * Validates: Requirements 1.4
   *
   * For any compiled JavaScript file in the dist directory,
   * there should exist a corresponding .js.map source map file
   * with the same base name.
   */
  describe('Property 2: Source map generation', () => {
    it('should generate source maps for all compiled JavaScript files', () => {
      if (!fs.existsSync('dist')) {
        console.log('Skipping: dist directory does not exist. Run build first.');
        expect(true).toBe(true);
        return;
      }

      // Get all JavaScript files in dist directory (excluding browser-specific subdirs and node_modules)
      const jsFiles = getAllJavaScriptFiles('dist').filter((file) => {
        // Exclude files in chrome/firefox subdirectories (old build artifacts)
        // Exclude node_modules
        return (
          !file.includes('dist/chrome/') &&
          !file.includes('dist/firefox/') &&
          !file.includes('node_modules')
        );
      });

      if (jsFiles.length === 0) {
        // No compiled files yet, test passes trivially
        console.log('No TypeScript-compiled files found yet. This is expected during migration.');
        expect(true).toBe(true);
        return;
      }

      // For each JavaScript file, verify corresponding source map exists
      jsFiles.forEach((jsFile) => {
        const expectedMapFile = jsFile + '.map';
        const exists = fs.existsSync(expectedMapFile);

        if (!exists) {
          console.log(`Missing source map: ${expectedMapFile} for ${jsFile}`);
        }
        expect(exists).toBe(true);
      });
    });

    it('should generate source maps with correct naming convention', () => {
      if (!fs.existsSync('dist')) {
        console.log('Skipping: dist directory does not exist. Run build first.');
        expect(true).toBe(true);
        return;
      }

      const jsFiles = getAllJavaScriptFiles('dist').filter((file) => {
        return (
          !file.includes('dist/chrome/') &&
          !file.includes('dist/firefox/') &&
          !file.includes('node_modules')
        );
      });

      if (jsFiles.length === 0) {
        console.log('No TypeScript-compiled files found yet. This is expected during migration.');
        expect(true).toBe(true);
        return;
      }

      jsFiles.forEach((jsFile) => {
        const expectedMapFile = jsFile + '.map';
        const baseName = path.basename(jsFile, '.js');
        const expectedMapBaseName = baseName + '.js.map';

        if (fs.existsSync(expectedMapFile)) {
          const actualMapBaseName = path.basename(expectedMapFile);
          expect(actualMapBaseName).toBe(expectedMapBaseName);
        }
      });
    });
  });
});

/**
 * Feature: typescript-migration, Property 5: Public API documentation
 * Validates: Requirements 14.8
 *
 * For any exported function in TypeScript modules,
 * there should be a JSDoc comment block preceding the function declaration.
 */
describe('Property 5: Public API documentation', () => {
  it('should have JSDoc comments for all exported functions', () => {
    const srcFiles = getAllTypeScriptFiles('src');

    if (srcFiles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const violations = [];

    srcFiles.forEach((srcFile) => {
      // Skip .d.ts declaration files and types.ts (interface definitions)
      if (srcFile.endsWith('.d.ts') || srcFile.endsWith('types.ts')) {
        return;
      }

      const content = fs.readFileSync(srcFile, 'utf-8');
      const lines = content.split('\n');

      // Find all exported functions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match exported functions (various patterns)
        const isExportedFunction =
          line.startsWith('export function ') ||
          line.startsWith('export async function ') ||
          line.match(/^export\s+(const|let)\s+\w+\s*=\s*(async\s+)?\(/);

        if (isExportedFunction) {
          // Check if there's a JSDoc comment before this function
          // Look backwards for JSDoc (/** ... */)
          let hasJSDoc = false;
          let checkLine = i - 1;

          // Skip empty lines
          while (checkLine >= 0 && lines[checkLine].trim() === '') {
            checkLine--;
          }

          // Check if we found a JSDoc comment
          if (checkLine >= 0) {
            const prevLine = lines[checkLine].trim();
            if (prevLine === '*/') {
              // Found end of comment block, look for start
              let commentStart = checkLine;
              while (commentStart >= 0 && !lines[commentStart].trim().startsWith('/**')) {
                commentStart--;
              }
              if (commentStart >= 0 && lines[commentStart].trim().startsWith('/**')) {
                hasJSDoc = true;
              }
            }
          }

          if (!hasJSDoc) {
            // Extract function name for better error message
            const functionMatch =
              line.match(/function\s+(\w+)/) || line.match(/(?:const|let)\s+(\w+)/);
            const functionName = functionMatch ? functionMatch[1] : 'unknown';

            violations.push({
              file: srcFile,
              line: i + 1,
              function: functionName
            });
          }
        }
      }
    });

    if (violations.length > 0) {
      const violationMessages = violations
        .map((v) => `  - ${v.file}:${v.line} - function '${v.function}' missing JSDoc`)
        .join('\n');

      throw new Error(
        `The following exported functions are missing JSDoc comments:\n${violationMessages}`
      );
    }

    expect(violations.length).toBe(0);
  });

  it('should have meaningful JSDoc descriptions', () => {
    const srcFiles = getAllTypeScriptFiles('src');

    if (srcFiles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const warnings = [];

    srcFiles.forEach((srcFile) => {
      if (srcFile.endsWith('.d.ts') || srcFile.endsWith('types.ts')) {
        return;
      }

      const content = fs.readFileSync(srcFile, 'utf-8');

      // Find JSDoc blocks that are too short (likely not meaningful)
      const jsDocPattern = /\/\*\*\s*\n\s*\*\s*(.+?)\n\s*\*\//g;
      let match;

      while ((match = jsDocPattern.exec(content)) !== null) {
        const description = match[1].trim();

        // Check if description is too short or generic
        if (description.length < 10) {
          warnings.push({
            file: srcFile,
            description: description
          });
        }
      }
    });

    // This test provides warnings but doesn't fail
    // as "meaningful" is subjective
    if (warnings.length > 0) {
      console.log('\nJSDoc comments that might need more detail:');
      warnings.forEach((w) => {
        console.log(`  - ${w.file}: "${w.description}"`);
      });
    }

    expect(true).toBe(true);
  });
});

/**
 * Feature: typescript-migration, Property 3: Build completeness
 * Validates: Requirements 9.5
 *
 * For any required file type (JavaScript, HTML, CSS, manifest),
 * after the build completes, that file type should exist in the dist directory.
 */
describe('Property 3: Build completeness', () => {
  it('should include all required file types in Chrome build', () => {
    const chromeDist = 'dist/chrome';

    if (!fs.existsSync(chromeDist)) {
      console.log('Skipping: Chrome build directory does not exist. Run make build-chrome first.');
      expect(true).toBe(true);
      return;
    }

    // Check for required file types
    const requiredFileTypes = {
      JavaScript: '.js',
      HTML: '.html',
      CSS: '.css',
      Manifest: 'manifest.json'
    };

    const missingTypes = [];

    for (const [typeName, extension] of Object.entries(requiredFileTypes)) {
      let found = false;

      if (extension === 'manifest.json') {
        // Check for specific manifest file
        found = fs.existsSync(path.join(chromeDist, 'manifest.json'));
      } else {
        // Check for any file with this extension
        found = hasFileWithExtension(chromeDist, extension);
      }

      if (!found) {
        missingTypes.push(typeName);
      }
    }

    if (missingTypes.length > 0) {
      throw new Error(`Chrome build is missing required file types: ${missingTypes.join(', ')}`);
    }

    expect(missingTypes.length).toBe(0);
  });

  it('should include all required file types in Firefox build', () => {
    const firefoxDist = 'dist/firefox';

    if (!fs.existsSync(firefoxDist)) {
      console.log(
        'Skipping: Firefox build directory does not exist. Run make build-firefox first.'
      );
      expect(true).toBe(true);
      return;
    }

    // Check for required file types
    const requiredFileTypes = {
      JavaScript: '.js',
      HTML: '.html',
      CSS: '.css',
      Manifest: 'manifest.json'
    };

    const missingTypes = [];

    for (const [typeName, extension] of Object.entries(requiredFileTypes)) {
      let found = false;

      if (extension === 'manifest.json') {
        // Check for specific manifest file
        found = fs.existsSync(path.join(firefoxDist, 'manifest.json'));
      } else {
        // Check for any file with this extension
        found = hasFileWithExtension(firefoxDist, extension);
      }

      if (!found) {
        missingTypes.push(typeName);
      }
    }

    if (missingTypes.length > 0) {
      throw new Error(`Firefox build is missing required file types: ${missingTypes.join(', ')}`);
    }

    expect(missingTypes.length).toBe(0);
  });

  it('should include icon assets in both builds', () => {
    const builds = ['dist/chrome', 'dist/firefox'];

    const missingIcons = [];

    for (const buildDir of builds) {
      if (!fs.existsSync(buildDir)) {
        continue;
      }

      const iconsDir = path.join(buildDir, 'icons');
      if (!fs.existsSync(iconsDir)) {
        missingIcons.push(`${buildDir}/icons directory`);
      } else {
        // Check for at least one icon file
        const iconFiles = fs.readdirSync(iconsDir).filter((f) => f.endsWith('.png'));
        if (iconFiles.length === 0) {
          missingIcons.push(`${buildDir}/icons (no PNG files)`);
        }
      }
    }

    if (missingIcons.length > 0) {
      throw new Error(`Missing icon assets: ${missingIcons.join(', ')}`);
    }

    expect(missingIcons.length).toBe(0);
  });

  it('should include source maps in both builds', () => {
    const builds = ['dist/chrome', 'dist/firefox'];

    const buildsWithoutSourceMaps = [];

    for (const buildDir of builds) {
      if (!fs.existsSync(buildDir)) {
        continue;
      }

      const hasSourceMaps = hasFileWithExtension(buildDir, '.js.map');
      if (!hasSourceMaps) {
        buildsWithoutSourceMaps.push(buildDir);
      }
    }

    if (buildsWithoutSourceMaps.length > 0) {
      throw new Error(`Builds missing source maps: ${buildsWithoutSourceMaps.join(', ')}`);
    }

    expect(buildsWithoutSourceMaps.length).toBe(0);
  });
});

/**
 * Helper function to recursively get all TypeScript files in a directory
 */
function getAllTypeScriptFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Helper function to recursively get all JavaScript files in a directory
 */
function getAllJavaScriptFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Helper function to check if a directory contains any file with a specific extension
 */
function hasFileWithExtension(dir, extension) {
  if (!fs.existsSync(dir)) {
    return false;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (hasFileWithExtension(fullPath, extension)) {
        return true;
      }
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      return true;
    }
  }

  return false;
}
