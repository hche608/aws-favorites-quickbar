/**
 * Unit tests for DOM builder - creates service link elements
 *
 * Key change: `classes` parameter is now required.
 * createServiceLink(service, classes) — no fallback to DEFAULT_CSS_CLASSES.
 */

import * as fc from 'fast-check';
import { createServiceLink } from '../../../src/quickbar/dom-builder';
import { Service, AWSFavoriteClasses } from '../../../src/types';
import { teardownDOM } from '../../helpers/dom-helpers';
import { createSampleService } from '../../helpers/fixtures';

/**
 * Sample CSS classes used in tests (simulating extracted classes from native AWS favorites)
 */
const sampleClasses: AWSFavoriteClasses = {
  li: 'globalNav-1283',
  anchor: 'globalNav-1215 globalNav-1284 globalNav-1285',
  mainContainer: 'globalNav-1286',
  iconWrapper: 'globalNav-1290 globalNav-1288 globalNav-1289',
  icon: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289',
  label: 'globalNav-12107 globalNav-1287'
};

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
      const element = createServiceLink(service, sampleClasses);

      expect(element).not.toBeNull();
      expect(element?.tagName).toBe('LI');
      expect(element?.getAttribute('data-service-id')).toBe(service.id);
      expect(element?.getAttribute('data-source')).toBe('user');

      const anchor = element?.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor?.href).toContain(service.consoleUrl);
    });

    it('should return null when service is null', () => {
      const element = createServiceLink(null as any, sampleClasses);
      expect(element).toBeNull();
    });

    it('should return null when service has no id', () => {
      const service = { name: 'Test', consoleUrl: 'https://example.com' } as any;
      const element = createServiceLink(service, sampleClasses);
      expect(element).toBeNull();
    });

    it('should use service id as uppercase name when name is empty', () => {
      const service: Service = {
        id: 'test-service',
        name: '',
        iconUrl: '',
        consoleUrl: ''
      };
      const element = createServiceLink(service, sampleClasses);

      expect(element).not.toBeNull();
      expect(element?.getAttribute('data-service-id')).toBe('test-service');

      const anchor = element?.querySelector('a');
      expect(anchor?.href).toContain('test-service');

      const label = element?.querySelector('span');
      expect(label?.textContent).toBe('TEST-SERVICE');
    });

    it('should apply the provided CSS classes', () => {
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
      const element = createServiceLink(service, sampleClasses);

      const icon = element?.querySelector('img');
      expect(icon?.onerror).not.toBeNull();

      // Trigger error handler
      if (icon?.onerror) {
        icon.onerror(new Event('error'));
      }

      // Should use placeholder icon
      expect(icon?.src).toContain('data:image/svg+xml');
    });

    it('should include all required attributes on anchor element', () => {
      const service = createSampleService({ id: 's3' });
      const element = createServiceLink(service, sampleClasses);

      const anchor = element?.querySelector('a');
      expect(anchor?.getAttribute('target')).toBe('_top');
      expect(anchor?.getAttribute('aria-disabled')).toBe('false');
      expect(anchor?.getAttribute('role')).toBe('button');
      expect(anchor?.getAttribute('data-testid')).toBe('awsc-nav-favorites-bar-s3');
      expect(anchor?.getAttribute('tabindex')).toBe('0');
    });

    it('should use placeholder icon when iconUrl is null', () => {
      const service = createSampleService({ iconUrl: null });
      const element = createServiceLink(service, sampleClasses);

      const icon = element?.querySelector('img');
      expect(icon?.src).toContain('data:image/svg+xml');
    });

    it('should set data-source from service source property', () => {
      const service = createSampleService({ source: 'recent' });
      const element = createServiceLink(service, sampleClasses);

      expect(element?.getAttribute('data-source')).toBe('recent');
    });

    /**
     * Property-based test: for any valid service + classes, the DOM structure is consistent
     */
    it('should maintain consistent structure for any valid service object', () => {
      const serviceArbitrary = fc.record({
        id: fc.stringOf(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')
          ),
          { minLength: 2, maxLength: 20 }
        ),
        name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        iconUrl: fc
          .option(fc.webUrl({ validSchemes: ['https'] }), { nil: null })
          .map((url) => url || ''),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }).map((url) => {
          return url
            .replace(/\/\.\//g, '/')
            .replace(/\/\.$/g, '')
            .replace(/\/$/, '');
        })
      });

      fc.assert(
        fc.property(serviceArbitrary, (service: Service) => {
          const element = createServiceLink(service, sampleClasses);

          expect(element).not.toBeNull();
          expect(element?.getAttribute('data-service-id')).toBe(service.id);

          const anchor = element?.querySelector('a');
          expect(anchor).not.toBeNull();

          const normalizedHref = anchor?.href.replace(/\/$/, '') || '';
          const normalizedUrl = service.consoleUrl.replace(/\/$/, '');
          expect(normalizedHref).toContain(normalizedUrl);

          const img = element?.querySelector('img');
          expect(img).not.toBeNull();

          const label = element?.querySelector('span');
          expect(label).not.toBeNull();
          expect(label?.textContent).toBe(service.name);
        }),
        { numRuns: 100 }
      );
    });
  });
});
