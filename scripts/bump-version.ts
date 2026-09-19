import fs from 'node:fs';
import path from 'node:path';

const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/;

interface PackageJson {
  version: string;
  packages?: Record<string, { version?: string }>;
  [key: string]: unknown;
}

interface ManifestJson {
  version: string;
  [key: string]: unknown;
}

export function parseAndValidateVersion(rawVersion: string | undefined): string {
  if (!rawVersion) {
    throw new Error('Version argument is required. Usage: tsx scripts/bump-version.ts <version>');
  }

  const cleanVersion = rawVersion.replace(/^v/, '');
  if (!SEMVER_REGEX.test(cleanVersion)) {
    throw new Error(
      `Version "${rawVersion}" is not a valid semantic version (e.g. 1.4.2 or v1.4.2).`
    );
  }

  return cleanVersion;
}

function updateJsonFile<T extends Record<string, unknown>>(
  fullPath: string,
  updater: (content: T) => void
): void {
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target file not found: ${fullPath}`);
  }

  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(fileContent) as T;
  updater(parsed);
  const updatedJson = JSON.stringify(parsed, null, 2) + '\n';
  fs.writeFileSync(fullPath, updatedJson, 'utf8');
  console.log(`Updated ${fullPath}`);
}

export function bumpVersion(targetVersion: string, baseDir: string = process.cwd()): string {
  const version = parseAndValidateVersion(targetVersion);
  console.log(`Bumping version to ${version}...`);

  updateJsonFile<PackageJson>(path.resolve(baseDir, 'package.json'), (data) => {
    data.version = version;
  });

  updateJsonFile<PackageJson>(path.resolve(baseDir, 'package-lock.json'), (data) => {
    data.version = version;
    if (data.packages && data.packages['']) {
      data.packages[''].version = version;
    }
  });

  updateJsonFile<ManifestJson>(path.resolve(baseDir, 'manifest.json'), (data) => {
    data.version = version;
  });

  updateJsonFile<ManifestJson>(path.resolve(baseDir, 'manifest.firefox.json'), (data) => {
    data.version = version;
  });

  console.log(`Successfully bumped all version files to ${version}`);
  return version;
}

// Only execute when run directly from command line
if (process.argv[1]?.includes('bump-version')) {
  try {
    bumpVersion(process.argv[2]);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}
