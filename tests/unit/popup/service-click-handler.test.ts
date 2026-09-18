/**
 * Unit tests for service-click-handler.ts
 * Tests service click handling and favorite toggling
 */

import { setupDOM, teardownDOM } from '../../helpers/dom-helpers';
import { createServiceClickHandler } from '../../../src/popup/service-click-handler';
import * as storage from '../../../src/popup/storage';
import * as uiState from '../../../src/popup/ui-state';

// Mock the dependencies
vi.mock('../../../src/popup/storage');
vi.mock('../../../src/popup/ui-state');

describe('service-click-handler', () => {
  let mockIsServiceSelected: jest.Mock;
  let mockGetCurrentFavorites: jest.Mock;
  let mockSetCurrentFavorites: jest.Mock;
  let mockOnFavoritesChanged: jest.Mock;

  beforeEach(() => {
    teardownDOM();

    // Setup mocks
    mockIsServiceSelected = jest.fn();
    mockGetCurrentFavorites = jest.fn();
    mockSetCurrentFavorites = jest.fn();
    mockOnFavoritesChanged = jest.fn();

    // Mock storage functions
    (storage.addFavorite as jest.Mock).mockResolvedValue(['ec2']);
    (storage.removeFavorite as jest.Mock).mockResolvedValue([]);

    // Mock UI state functions
    (uiState.showStorageWarning as jest.Mock).mockImplementation(() => {});
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
        mockOnFavoritesChanged
      );

      expect(typeof handler).toBe('function');
    });

    it('should add service to favorites when not selected', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
      await handler(event, 'ec2');

      expect(storage.addFavorite).toHaveBeenCalledWith('ec2');
      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['ec2']);

      jest.runAllTimers();
      expect(mockOnFavoritesChanged).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should remove service from favorites when selected', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['ec2', 's3']);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
      await handler(event, 'ec2');

      expect(storage.removeFavorite).toHaveBeenCalledWith('ec2');
      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['s3']);

      jest.runAllTimers();
      expect(mockOnFavoritesChanged).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle case-insensitive service ID matching when removing', async () => {
      jest.useFakeTimers();

      mockIsServiceSelected.mockReturnValue(true);
      mockGetCurrentFavorites.mockReturnValue(['EC2', 's3']);

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
      await handler(event, 'ec2');

      expect(mockSetCurrentFavorites).toHaveBeenCalledWith(['s3']);

      jest.useRealTimers();
    });

    it('should show warning on storage error', async () => {
      mockIsServiceSelected.mockReturnValue(false);
      mockGetCurrentFavorites.mockReturnValue([]);
      (storage.addFavorite as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
      await handler(event, 'ec2');

      expect(console.error).toHaveBeenCalled();
      expect(uiState.showStorageWarning).toHaveBeenCalledWith(
        'Failed to save your selection. Please check your browser storage settings and try again.'
      );
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
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
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
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
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

      const handler = createServiceClickHandler(
        mockIsServiceSelected,
        mockGetCurrentFavorites,
        mockSetCurrentFavorites,
        mockOnFavoritesChanged
      );

      const event = new MouseEvent('click', { bubbles: true });
      await handler(event, 'ec2');

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(storage.removeFavorite).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});
