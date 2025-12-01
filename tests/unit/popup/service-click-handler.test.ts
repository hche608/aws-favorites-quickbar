/**
 * Unit tests for service-click-handler.ts
 * Tests service click handling and favorite toggling
 */

import { setupDOM, teardownDOM } from '../../helpers/dom-helpers';
import { createServiceClickHandler } from '../../../src/popup/service-click-handler';
import * as storage from '../../../src/popup/storage';
import * as uiState from '../../../src/popup/ui-state';

// Mock the dependencies
jest.mock('../../../src/popup/storage');
jest.mock('../../../src/popup/ui-state');

describe('service-click-handler', () => {
  let mockIsServiceSelected: jest.Mock;
  let mockGetCurrentFavorites: jest.Mock;
  let mockSetCurrentFavorites: jest.Mock;
  let emptyStateElement: HTMLElement;
  let mockSearchQuery: jest.Mock;
  let serviceItem: HTMLElement;
  let checkbox: HTMLInputElement;

  beforeEach(() => {
    teardownDOM();

    // Setup DOM
    setupDOM(`
      <div id="emptyState"></div>
      <div class="service-item" data-service-id="ec2">
        <input type="checkbox" />
        <span>EC2</span>
      </div>
    `);

    emptyStateElement = document.getElementById('emptyState')!;
    serviceItem = document.querySelector('.service-item')!;
    checkbox = serviceItem.querySelector('input[type="checkbox"]')!;

    // Setup mocks
    mockIsServiceSelected = jest.fn();
    mockGetCurrentFavorites = jest.fn();
    mockSetCurrentFavorites = jest.fn();
    mockSearchQuery = jest.fn().mockReturnValue('');

    // Mock storage functions
    (storage.addFavorite as jest.Mock).mockResolvedValue(['ec2']);
    (storage.removeFavorite as jest.Mock).mockResolvedValue([]);

    // Mock UI state functions
    (uiState.showStorageWarning as jest.Mock).mockImplementation(() => {});
    (uiState.updateEmptyState as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('createServiceClickHandler', () => {
    it('should create a handler function', () => {
      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      expect(typeof handler).toBe('function');
    });

    it('should add service to favorites when not selected', async () => {
      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(storage.addFavorite).toHaveBeenCalledWith('ec2');
      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['ec2']);
      expect(serviceItem.classList.contains('selected')).toBe(true);
      expect(checkbox.checked).toBe(true);
      expect(uiState.updateEmptyState).toHaveBeenCalled();
    });

    it('should remove service from favorites when selected', async () => {
      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['ec2', 's3']);
      serviceItem.classList.add('selected');
      checkbox.checked = true;

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(storage.removeFavorite).toHaveBeenCalledWith('ec2');
      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['s3']);
      expect(serviceItem.classList.contains('selected')).toBe(false);
      expect(checkbox.checked).toBe(false);
      expect(uiState.updateEmptyState).toHaveBeenCalled();
    });

    it('should handle checkbox click events', async () => {
      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: checkbox });

      await handler(event, 'ec2');

      expect(storage.addFavorite).toHaveBeenCalledWith('ec2');
      expect(serviceItem.classList.contains('selected')).toBe(true);
      expect(checkbox.checked).toBe(true);
    });

    it('should handle case-insensitive service ID matching when removing', async () => {
      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['EC2', 's3']);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['s3']);
    });

    it('should revert UI and show warning on storage error', async () => {
      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);
      (storage.addFavorite as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(console.error).toHaveBeenCalled();
      expect(uiState.showStorageWarning).toHaveBeenCalledWith(
        'Failed to save your selection. Please check your browser storage settings and try again.'
      );
      expect(serviceItem.classList.contains('selected')).toBe(false);
      expect(checkbox.checked).toBe(false);
    });

    it('should revert UI when removing favorite fails', async () => {
      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['ec2']);
      (storage.removeFavorite as jest.Mock).mockRejectedValue(new Error('Storage error'));
      serviceItem.classList.add('selected');
      checkbox.checked = true;

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(serviceItem.classList.contains('selected')).toBe(true);
      expect(checkbox.checked).toBe(true);
    });

    it('should retry operation after error with delay', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);
      (storage.addFavorite as jest.Mock)
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(['ec2']);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(storage.addFavorite).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should handle retry failure', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);
      (storage.addFavorite as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(uiState.showStorageWarning).toHaveBeenCalledWith(
        'Storage operation failed. Your changes may not be saved.'
      );

      jest.useRealTimers();
    });

    it('should retry remove operation after error', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['ec2']);
      (storage.removeFavorite as jest.Mock)
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce([]);
      serviceItem.classList.add('selected');
      checkbox.checked = true;

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(storage.removeFavorite).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should pass search query to updateEmptyState', async () => {
      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);
      mockSearchQuery.mockReturnValue('test query');

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        emptyStateElement,
        mockSearchQuery
      );

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: serviceItem });
      Object.defineProperty(event, 'target', { value: serviceItem });

      await handler(event, 'ec2');

      expect(uiState.updateEmptyState).toHaveBeenCalledWith(
        emptyStateElement,
        ['ec2'],
        'test query'
      );
    });
  });
});
