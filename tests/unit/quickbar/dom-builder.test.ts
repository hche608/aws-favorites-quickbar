/**
 * Unit tests for DOM builder - creates service link elements
 */

import * as fc from 'fast-check';
import { createServiceLink } from '../../../src/quickbar/dom-builder';
import { Service, AWSFavoriteClasses } from '../../../src/types';
import { teardownDOM } from '../../helpers/dom-helpers';
import { createSampleService } from '../../helpers/fixtures';

describe('DOM Builder', () => {
  beforeEach(() => {
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('createServiceLink', () => {
    it('should create a service link element with correct structure', () => {
      const service = createSampleService();
      const element = createServiceLink(service);

      expect(element).not.toBeNull();
      expect(element?.tagName).toBe('LI');
      expect(element?.getAttribute('data-service-id')).toBe(service.id);
      expect(element?.getAttribute('data-source')).toBe('user');

      const anchor = element?.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor?.href).toContain(service.consoleUrl);
    });

    it('should return null when service is null', () => {
      const element = createServiceLink(null as any);
      expect(element).toBeNull();
    });

    it('should return null when service has no id', () => {
      const service = { name: 'Test', consoleUrl: 'https://example.com' } as any;
      const element = createServiceLink(service);
      expect(element).toBeNull();
    });

    it('should use default values for missing properties', () => {
      const service: Service = {
        id: 'test-service',
        name: '',
        iconUrl: '',
        consoleUrl: ''
      };
      const element = createServiceLink(service);

      expect(element).not.toBeNull();
      expect(element?.getAttribute('data-service-id')).toBe('test-service');

      const anchor = element?.querySelector('a');
      expect(anchor?.href).toContain('test-service');

      const label = element?.querySelector('span');
      expect(label?.textContent).toBe('TEST-SERVICE');
    });

    it('should apply custom CSS classes when provided', () => {
      const service = createSampleService();
      const customClasses: AWSFavoriteClasses = {
        li: 'custom-li',
        anchor: 'custom-anchor',
        mainContainer: 'custom-container',
        iconWrapper: 'custom-icon-wrapper',
        icon: 'custom-icon',
        label: 'custom-label'
      };

      const element = createServiceLink(service, customClasses);

      expect(element?.className).toBe('custom-li');

      const anchor = element?.querySelector('a');
      expect(anchor?.className).toBe('custom-anchor');

      const mainContainer = anchor?.querySelector('div');
      expect(mainContainer?.className).toBe('custom-container');
    });

    it('should set up error handler for icon loading', () => {
      const service = createSampleService({ iconUrl: 'https://example.com/icon.png' });
      const element = createServiceLink(service);

      const icon = element?.querySelector('img');
      expect(icon?.onerror).not.toBeNull();

      // Trigger error handler
      const originalSrc = icon?.src;
      if (icon?.onerror) {
        icon.onerror(new Event('error'));
      }

      expect(icon?.src).not.toBe(originalSrc);
      expect(icon?.src).toContain('data:image/svg+xml');
    });

    it('should include all required attributes on anchor element', () => {
      const service = createSampleService({ id: 's3' });
      const element = createServiceLink(service);

      const anchor = element?.querySelector('a');
      expect(anchor?.getAttribute('target')).toBe('_top');
      expect(anchor?.getAttribute('aria-disabled')).toBe('false');
      expect(anchor?.getAttribute('role')).toBe('button');
      expect(anchor?.getAttribute('data-testid')).toBe('awsc-nav-favorites-bar-s3');
      expect(anchor?.getAttribute('tabindex')).toBe('0');
    });

    /**
     * Property-based test for DOM builder structure consistency
     * Feature: test-coverage, Property 4: DOM builder structure consistency
     * Validates: Requirements 3.2
     */
    it('should maintain consistent structure for any valid service object', () => {
      const serviceArbitrary = fc.record({
        id: fc.stringOf(
          fc.constantFrom(
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'i',
            'j',
            'k',
            'l',
            'm',
            'n',
            'o',
            'p',
            'q',
            'r',
            's',
            't',
            'u',
            'v',
            'w',
            'x',
            'y',
            'z',
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '-'
          ),
          { minLength: 2, maxLength: 20 }
        ),
        name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        iconUrl: fc
          .option(fc.webUrl({ validSchemes: ['https'] }), { nil: null })
          .map((url) => url || ''),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }).map((url) => {
          // Normalize URL to match browser behavior:
          // - Remove path segments with dots (browsers normalize these)
          // - Remove trailing slashes
          // - Remove /. at the end (browsers normalize this to empty)
          return url
            .replace(/\/\.\//g, '/')
            .replace(/\/\.$/g, '')
            .replace(/\/$/, '');
        })
      });

      fc.assert(
        fc.property(serviceArbitrary, (service: Service) => {
          const element = createServiceLink(service);

          // Element should exist
          expect(element).not.toBeNull();

          // Should have data-service-id matching the service ID
          expect(element?.getAttribute('data-service-id')).toBe(service.id);

          // Should contain an anchor tag
          const anchor = element?.querySelector('a');
          expect(anchor).not.toBeNull();

          // Anchor should have the service URL (normalize both for comparison)
          const normalizedHref = anchor?.href.replace(/\/$/, '') || '';
          const normalizedUrl = service.consoleUrl.replace(/\/$/, '');
          expect(normalizedHref).toContain(normalizedUrl);

          // Should have an image element
          const img = element?.querySelector('img');
          expect(img).not.toBeNull();

          // Should have a label with service name
          const label = element?.querySelector('span');
          expect(label).not.toBeNull();
          expect(label?.textContent).toBe(service.name);
        }),
        { numRuns: 100 }
      );
    });
  });
});
