import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bumpVersion, parseAndValidateVersion } from '../../../scripts/bump-version';

describe('bump-version script', () => {
  describe('parseAndValidateVersion', () => {
    it('should parse standard semantic version without prefix', () => {
      expect(parseAndValidateVersion('1.4.2')).toBe('1.4.2');
    });

    it('should strip leading v from version string', () => {
      expect(parseAndValidateVersion('v1.4.2')).toBe('1.4.2');
      expect(parseAndValidateVersion('v2.0.0')).toBe('2.0.0');
    });

    it('should support prerelease semantic version', () => {
      expect(parseAndValidateVersion('1.5.0-beta.1')).toBe('1.5.0-beta.1');
      expect(parseAndValidateVersion('v1.5.0-rc.2')).toBe('1.5.0-rc.2');
    });

    it('should throw error when version is undefined or empty', () => {
      expect(() => parseAndValidateVersion(undefined)).toThrow('Version argument is required');
      expect(() => parseAndValidateVersion('')).toThrow('Version argument is required');
    });

    it('should throw error for invalid version strings', () => {
      expect(() => parseAndValidateVersion('invalid')).toThrow('not a valid semantic version');
      expect(() => parseAndValidateVersion('1.2')).toThrow('not a valid semantic version');
      expect(() => parseAndValidateVersion('v1.2.3.4')).toThrow('not a valid semantic version');
    });
  });

  describe('bumpVersion file updates', () => {
    it('should update version in package.json, package-lock.json, and both manifests', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-test-'));

      try {
        const initialPkg = {
          name: 'test-app',
          version: '1.0.0'
        };
        const initialPkgLock = {
          name: 'test-app',
          version: '1.0.0',
          packages: {
            '': { version: '1.0.0' }
          }
        };
        const initialManifest = {
          manifest_version: 3,
          name: 'test-manifest',
          version: '1.0.0'
        };
        const initialFirefoxManifest = {
          manifest_version: 3,
          name: 'test-firefox-manifest',
          version: '1.0.0'
        };

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify(initialPkg, null, 2) + '\n'
        );
        fs.writeFileSync(
          path.join(tempDir, 'package-lock.json'),
          JSON.stringify(initialPkgLock, null, 2) + '\n'
        );
        fs.writeFileSync(
          path.join(tempDir, 'manifest.json'),
          JSON.stringify(initialManifest, null, 2) + '\n'
        );
        fs.writeFileSync(
          path.join(tempDir, 'manifest.firefox.json'),
          JSON.stringify(initialFirefoxManifest, null, 2) + '\n'
        );

        const result = bumpVersion('v2.1.3', tempDir);
        expect(result).toBe('2.1.3');

        const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
        const updatedPkgLock = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package-lock.json'), 'utf8')
        );
        const updatedManifest = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'manifest.json'), 'utf8')
        );
        const updatedFirefoxManifest = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'manifest.firefox.json'), 'utf8')
        );

        expect(updatedPkg.version).toBe('2.1.3');
        expect(updatedPkgLock.version).toBe('2.1.3');
        expect(updatedPkgLock.packages[''].version).toBe('2.1.3');
        expect(updatedManifest.version).toBe('2.1.3');
        expect(updatedFirefoxManifest.version).toBe('2.1.3');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should throw error when target file does not exist', () => {
      const emptyTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-empty-'));
      try {
        expect(() => bumpVersion('1.4.2', emptyTempDir)).toThrow('Target file not found');
      } finally {
        fs.rmSync(emptyTempDir, { recursive: true, force: true });
      }
    });
  });
});
