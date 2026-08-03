/**
 * Unit tests for quickbar injector
 *
 * Key changes:
 * - Injection returns false when no CSS template available (no native pinned service)
 * - No hardcoded fallback CSS classes — requires native pinned service
 * - Tests provide native pinned service structure for CSS extraction
 */

import { injectServices } from '../../../src/quickbar/injector';
import { Service } from '../../../src/types';
import { teardownDOM, createMockElement } from '../../helpers/dom-helpers';
import { createSampleServices } from '../../helpers/fixtures';

/**
 * Helper: creates a quickbar with a native pinned service for CSS extraction
 */
function createQuickbarWithNativeFavorite(serviceId: string = 'cloudformation'): HTMLOListElement {
  const quickbar = document.createElement('ol');
  quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

  const li = createMockElement('li', { className: 'native-li-class' });
  const anchor = createMockElement('a', {
    className: 'native-anchor-class',
    'data-testid': `awsc-nav-favorites-bar-${serviceId}`
  });
  const mainContainer = createMockElement('div', { className: 'native-container-class' });
  const iconWrapper = createMockElement('div', { className: 'native-icon-wrapper-class' });
  const icon = createMockElement('img', { className: 'native-icon-class' });
  const label = createMockElement('span', { className: 'native-label-class' });

  iconWrapper.appendChild(icon);
  mainContainer.appendChild(iconWrapper);
  mainContainer.appendChild(label);
  anchor.appendChild(mainContainer);
  li.appendChild(anchor);
  quickbar.appendChild(li);

  return quickbar;
}

describe('Quickbar Injector', () => {
  beforeEach(() => {
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('injectServices', () => {
    it('should inject services when a native pinned service exists for CSS extraction', async () => {
      const quickbar = createQuickbarWithNativeFavorite();
      document.body.appendChild(quickbar);

      const services = createSampleServices(3);
      const result = await injectServices(services, quickbar);

      expect(result).toBe(true);

      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(3);
    });

    it('should return true when services array is empty', async () => {
      const quickbar = createQuickbarWithNativeFavorite();
      document.body.appendChild(quickbar);

      const result = await injectServices([], quickbar);
      expect(result).toBe(true);
    });

    it('should return true when services is null', async () => {
      const quickbar = createQuickbarWithNativeFavorite();
      document.body.appendChild(quickbar);

      const result = await injectServices(null as any, quickbar);
      expect(result).toBe(true);
    });

    it('should return false when no native pinned service exists (no CSS template)', async () => {
      // Quickbar without any native pinned services
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const services = createSampleServices(2);
      const result = await injectServices(services, quickbar);

      expect(result).toBe(false);

      // No items should be injected
      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(0);
    });

    it('should filter out duplicates of native AWS favorites', async () => {
      const quickbar = createQuickbarWithNativeFavorite('s3');
      document.body.appendChild(quickbar);

      // Try to inject services including S3 (which is already native)
      const services: Service[] = [
        { id: 's3', name: 'S3', iconUrl: '', consoleUrl: 'https://console.aws.amazon.com/s3/home' },
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: '',
          consoleUrl: 'https://console.aws.amazon.com/ec2/home'
        }
      ];

      const result = await injectServices(services, quickbar);

      expect(result).toBe(true);

      // Should only inject EC2, not S3 (S3 is already native)
      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(1);
      expect(injectedItems[0].getAttribute('data-service-id')).toBe('ec2');
    });

    it('should apply CSS classes extracted from native favorites', async () => {
      const quickbar = createQuickbarWithNativeFavorite('cloudformation');
      document.body.appendChild(quickbar);

      const services: Service[] = [
        {
          id: 'lambda',
          name: 'Lambda',
          iconUrl: '',
          consoleUrl: 'https://console.aws.amazon.com/lambda/home'
        }
      ];

      const result = await injectServices(services, quickbar);

      expect(result).toBe(true);

      const injectedItem = quickbar.querySelector('[data-service-id="lambda"]');
      expect(injectedItem).not.toBeNull();
      expect(injectedItem?.className).toBe('native-li-class');
    });

    it('should remove previously injected services before adding new ones', async () => {
      const quickbar = createQuickbarWithNativeFavorite();
      document.body.appendChild(quickbar);

      // First injection
      const services1: Service[] = [
        { id: 's3', name: 'S3', iconUrl: '', consoleUrl: 'https://console.aws.amazon.com/s3/home' }
      ];
      await injectServices(services1, quickbar);
      expect(quickbar.querySelectorAll('[data-source]').length).toBe(1);

      // Second injection with different services
      const services2: Service[] = [
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: '',
          consoleUrl: 'https://console.aws.amazon.com/ec2/home'
        },
        {
          id: 'lambda',
          name: 'Lambda',
          iconUrl: '',
          consoleUrl: 'https://console.aws.amazon.com/lambda/home'
        }
      ];
      await injectServices(services2, quickbar);

      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(2);
      expect(quickbar.querySelector('[data-service-id="s3"]')).toBeNull();
      expect(quickbar.querySelector('[data-service-id="ec2"]')).not.toBeNull();
      expect(quickbar.querySelector('[data-service-id="lambda"]')).not.toBeNull();
    });

    it('should return false when quickbar is not found', async () => {
      const services = createSampleServices(2);

      // Don't create a quickbar element — function will timeout waiting
      const result = await injectServices(services);

      expect(result).toBe(false);
    }, 15000);

    it('should handle case-insensitive duplicate filtering', async () => {
      // Native favorite has uppercase ID in testid
      const quickbar = createQuickbarWithNativeFavorite('S3');
      document.body.appendChild(quickbar);

      // Try to inject service with lowercase id
      const services: Service[] = [
        { id: 's3', name: 'S3', iconUrl: '', consoleUrl: 'https://console.aws.amazon.com/s3/home' }
      ];

      const result = await injectServices(services, quickbar);

      expect(result).toBe(true);

      // Should not inject s3 because S3 already exists (case-insensitive)
      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(0);
    });
  });
});
