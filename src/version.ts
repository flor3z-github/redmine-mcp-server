import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface PackageMetadata {
  version?: unknown;
}

function readPackageVersion(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.resolve(currentDir, '..', 'package.json');

  try {
    const metadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageMetadata;
    if (typeof metadata.version === 'string' && metadata.version.length > 0) {
      return metadata.version;
    }
  } catch {
    // Fall back below when package metadata is unavailable.
  }

  return '0.0.0';
}

export const SERVER_VERSION = readPackageVersion();
