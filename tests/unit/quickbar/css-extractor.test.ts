/**
 * Unit tests for CSS extraction from native AWS favorites
 */

import {
  extractAWSFavoriteClasses,
  waitForNativeFavorites
} from '../../../src/quickbar/css-extractor';
import { teardownDOM, createMockElement } from '../../helpers/dom-helpers';

describe('CSS Extractor', () => {
  beforeEach(() => {
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('extractAWSFavoriteClasses', () => {
    it('should extract CSS classes from native favorites when present', () => {
      // Create quickbar with native favorite
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', {
        className: 'globalNav-1215 globalNav-1284 globalNav-1285'
      });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
      const iconWrapper = createMockElement('div', {
        className: 'globalNav-1290 globalNav-1288 globalNav-1289'
      });
      const icon = createMockElement('img', {
        className: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289'
      });
      const label = createMockElement('span', { className: 'globalNav-12107 globalNav-1287' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      mainContainer.appendChild(label);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();

      expect(result).not.toBeNull();
      expect(result?.li).toBe('globalNav-1283');
      expect(result?.anchor).toBe('globalNav-1215 globalNav-1284 globalNav-1285');
      expect(result?.mainContainer).toBe('globalNav-1286');
      expect(result?.iconWrapper).toBe('globalNav-1290 globalNav-1288 globalNav-1289');
      expect(result?.icon).toBe('globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289');
      expect(result?.label).toBe('globalNav-12107 globalNav-1287');
    });

    it('should return null when quickbar is not found', () => {
      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });

    it('should return null when no native favorites exist', () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });

    it('should ignore items with data-source attribute', () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Add injected item (should be ignored)
      const injectedLi = createMockElement('li', { 'data-source': 'user' });
      quickbar.appendChild(injectedLi);

      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });

    it('should return null when native favorite has incomplete structure', () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Create incomplete structure (missing icon)
      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', { className: 'globalNav-1215' });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });

      mainContainer.appendChild(document.createElement('span'));
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });

    it('should return null when anchor exists but has no div inside', () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', { className: 'globalNav-1215' });
      li.appendChild(anchor);
      quickbar.appendChild(li);
      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });

    it('should return null when label span is missing', () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', { className: 'globalNav-1215' });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
      const iconWrapper = createMockElement('div', { className: 'globalNav-1290' });
      const icon = createMockElement('img', { className: 'globalNav-1291' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
      document.body.appendChild(quickbar);

      const result = extractAWSFavoriteClasses();
      expect(result).toBeNull();
    });
  });

  describe('waitForNativeFavorites', () => {
    it('should resolve immediately if CSS classes are already present', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const li = createMockElement('li', { className: 'globalNav-1283' });
      const anchor = createMockElement('a', {
        className: 'globalNav-1215 globalNav-1284 globalNav-1285'
      });
      const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
      const iconWrapper = createMockElement('div', {
        className: 'globalNav-1290 globalNav-1288 globalNav-1289'
      });
      const icon = createMockElement('img', {
        className: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289'
      });
      const label = createMockElement('span', { className: 'globalNav-12107 globalNav-1287' });

      iconWrapper.appendChild(icon);
      mainContainer.appendChild(iconWrapper);
      mainContainer.appendChild(label);
      anchor.appendChild(mainContainer);
      li.appendChild(anchor);
      quickbar.appendChild(li);
      document.body.appendChild(quickbar);

      const result = await waitForNativeFavorites(quickbar, 1000);

      expect(result).not.toBeNull();
      expect(result?.li).toBe('globalNav-1283');
    });

    it('should wait for MutationObserver to detect native favorites', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      // Start waiting
      const promise = waitForNativeFavorites(quickbar, 1000);

      // Simulate native favorite being added after a delay
      setTimeout(() => {
        const li = createMockElement('li', { className: 'globalNav-1283' });
        const anchor = createMockElement('a', {
          className: 'globalNav-1215 globalNav-1284 globalNav-1285'
        });
        const mainContainer = createMockElement('div', { className: 'globalNav-1286' });
        const iconWrapper = createMockElement('div', {
          className: 'globalNav-1290 globalNav-1288 globalNav-1289'
        });
        const icon = createMockElement('img', {
          className: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289'
        });
        const label = createMockElement('span', { className: 'globalNav-12107 globalNav-1287' });

        iconWrapper.appendChild(icon);
        mainContainer.appendChild(iconWrapper);
        mainContainer.appendChild(label);
        anchor.appendChild(mainContainer);
        li.appendChild(anchor);
        quickbar.appendChild(li);
      }, 100);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.li).toBe('globalNav-1283');
    });

    it('should timeout and return null if native favorites never appear', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);

      const result = await waitForNativeFavorites(quickbar, 100);

      expect(result).toBeNull();
    });
  });
});
