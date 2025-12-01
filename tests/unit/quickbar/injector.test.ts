/**
 * Unit tests for quickbar injector - injects services with duplicate filtering
 */

import { injectServices } from '../../../src/quickbar/injector';
import { Service } from '../../../src/types';
import { teardownDOM, createMockElement } from '../../helpers/dom-helpers';
import { createSampleServices } from '../../helpers/fixtures';

describe('Quickbar Injector', () => {
  beforeEach(() => {
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('injectServices', () => {
    it('should inject services into the quickbar', async () => {
      // Create quickbar
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const services = createSampleServices(3);
      const result = await injectServices(services, quickbar);

      expect(result).toBe(true);

      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(3);
    });

    it('should return true when services array is empty', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const result = await injectServices([], quickbar);
      expect(result).toBe(true);
    });

    it('should return true when services is null', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const result = await injectServices(null as any, quickbar);
      expect(result).toBe(true);
    });

    it('should filter out duplicates of native AWS favorites', async () => {
      // Create quickbar with native favorite
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Add native favorite with proper structure
      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', {
        className: 'globalNav-1215',
        'data-testid': 'awsc-nav-favorites-bar-s3'
      });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
      const iconWrapper = createMockElement('div', { className: 'globalNav-1290' });
      const icon = createMockElement('img', { className: 'globalNav-1291' });
      const label = createMockElement('span', { className: 'globalNav-12107' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      mainContainer.appendChild(label);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
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

      // Should only inject EC2, not S3
      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(1);
      expect(injectedItems[0].getAttribute('data-service-id')).toBe('ec2');
    });

    it('should apply CSS classes from native favorites when available', async () => {
      // Create quickbar with native favorite
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const li = createMockElement('li', { className: 'custom-li-class' });
      const anchor = createMockElement('a', { className: 'custom-anchor-class' });
      const mainContainer = createMockElement('div', { className: 'custom-container-class' });
      const iconWrapper = createMockElement('div', { className: 'custom-icon-wrapper-class' });
      const icon = createMockElement('img', { className: 'custom-icon-class' });
      const label = createMockElement('span', { className: 'custom-label-class' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      mainContainer.appendChild(label);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
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
      expect(injectedItem?.className).toBe('custom-li-class');
    });

    it('should remove previously injected services before adding new ones', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      // First injection - pass quickbar directly to avoid waitForElement
      const services1: Service[] = [
        { id: 's3', name: 'S3', iconUrl: '', consoleUrl: 'https://console.aws.amazon.com/s3/home' }
      ];
      await injectServices(services1, quickbar);

      expect(quickbar.querySelectorAll('[data-source]').length).toBe(1);

      // Second injection with different services - pass quickbar directly
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
    }, 10000);

    it('should return false when quickbar is not found', async () => {
      const services = createSampleServices(2);

      // Don't create a quickbar element - function will timeout waiting
      const result = await injectServices(services);

      expect(result).toBe(false);
    }, 15000);

    it('should handle errors gracefully', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      // Create a service that will cause an error (null id causes error in toLowerCase())
      const invalidServices: any[] = [{ id: null, name: 'Invalid' }];

      const result = await injectServices(invalidServices, quickbar);

      // Should return false when an error occurs
      expect(result).toBe(false);
      expect(quickbar.querySelectorAll('[data-source]').length).toBe(0);
    }, 10000);

    it('should handle case-insensitive duplicate filtering', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Add native favorite with uppercase ID in testid
      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', {
        className: 'globalNav-1215',
        'data-testid': 'awsc-nav-favorites-bar-S3'
      });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
      const iconWrapper = createMockElement('div', { className: 'globalNav-1290' });
      const icon = createMockElement('img', { className: 'globalNav-1291' });
      const label = createMockElement('span', { className: 'globalNav-12107' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      mainContainer.appendChild(label);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
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
