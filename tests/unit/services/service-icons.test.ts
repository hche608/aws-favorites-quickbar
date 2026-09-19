/**
 * Unit tests for service-icons.ts
 */

import { getDefaultIconUrl, resolveServiceIcon } from '../../../src/services/service-icons';

describe('service-icons', () => {
  describe('getDefaultIconUrl', () => {
    it('should return CDN SVG URL for known services', () => {
      const s3Icon = getDefaultIconUrl('s3');
      expect(s3Icon).toContain('cdn.console.awsstatic.com');
      expect(s3Icon).toContain('.svg');

      const ec2Icon = getDefaultIconUrl('ec2');
      expect(ec2Icon).toContain('cdn.console.awsstatic.com');
    });

    it('should handle case-insensitive service IDs', () => {
      const s3Lower = getDefaultIconUrl('s3');
      const s3Upper = getDefaultIconUrl('S3');
      expect(s3Upper).toBe(s3Lower);
    });

    it('should return null for empty or unknown service ID', () => {
      expect(getDefaultIconUrl('')).toBeNull();
      expect(getDefaultIconUrl('non-existent-service-12345')).toBeNull();
    });
  });

  describe('resolveServiceIcon', () => {
    it('should prioritize valid live HTTPS icon URL over default', () => {
      const liveUrl = 'https://custom-cdn.example.com/icon.svg';
      const resolved = resolveServiceIcon('s3', liveUrl);
      expect(resolved).toBe(liveUrl);
    });

    it('should accept data: URI as live icon', () => {
      const dataUri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
      const resolved = resolveServiceIcon('s3', dataUri);
      expect(resolved).toBe(dataUri);
    });

    it('should use default icon if liveIconUrl is null or empty', () => {
      const resolvedNull = resolveServiceIcon('s3', null);
      expect(resolvedNull).toContain('cdn.console.awsstatic.com');

      const resolvedEmpty = resolveServiceIcon('s3', '');
      expect(resolvedEmpty).toContain('cdn.console.awsstatic.com');

      const resolvedUndefined = resolveServiceIcon('s3', undefined);
      expect(resolvedUndefined).toContain('cdn.console.awsstatic.com');
    });

    it('should return null for unknown service without live icon', () => {
      expect(resolveServiceIcon('unknown-service-xyz', null)).toBeNull();
    });
  });
});
