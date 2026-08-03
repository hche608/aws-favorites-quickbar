/**
 * Unit tests for popup storage utilities
 *
 * Tests verify explicit first-launch vs returning-user paths:
 * - undefined means "not initialized" (first launch)
 * - stored value means "use as-is" (returning user)
 * - errors propagate (no silent swallowing)
 */

import { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks } from '../../helpers/mocks';
import {
  loadUserFavorites,
  saveUserFavorites,
  addFavorite,
  removeFavorite,
  loadCachedServices,
  loadMaxServices,
  saveMaxServices,
  loadVisualMode,
  saveVisualMode
} from '../../../src/popup/storage';
import { Service } from '../../../src/types';

describe('Popup Storage', () => {
  beforeEach(() => {
    setupChromeMocks();
    setupFirefoxMocks();
  });

  afterEach(() => {
    clearAllBrowserMocks();
  });

  describe('loadUserFavorites', () => {
    it('should return stored favorites when they exist (returning user)', async () => {
      const favorites = ['s3', 'ec2', 'lambda'];
      (browser.storage.sync as any).data = { userFavorites: favorites };

      const result = await loadUserFavorites();

      expect(result).toEqual(favorites);
      expect(browser.storage.sync.get).toHaveBeenCalledWith(['userFavorites']);
    });

    it('should return undefined when no favorites exist (first launch)', async () => {
      const result = await loadUserFavorites();

      expect(result).toBeUndefined();
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(loadUserFavorites()).rejects.toThrow('Storage error');
    });
  });

  describe('saveUserFavorites', () => {
    it('should save favorites to browser.storage.sync', async () => {
      const favorites = ['s3', 'ec2', 'lambda'];

      await saveUserFavorites(favorites);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({ userFavorites: favorites });
      expect((browser.storage.sync as any).data.userFavorites).toEqual(favorites);
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveUserFavorites(['s3'])).rejects.toThrow('Storage error');
    });
  });

  describe('addFavorite', () => {
    it('should add new favorite to existing list', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3', 'ec2'] };

      const result = await addFavorite('lambda');

      expect(result).toEqual(['s3', 'ec2', 'lambda']);
      expect((browser.storage.sync as any).data.userFavorites).toEqual(['s3', 'ec2', 'lambda']);
    });

    it('should not add duplicate favorite (case-insensitive)', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3', 'ec2'] };

      const result = await addFavorite('S3');

      expect(result).toEqual(['s3', 'ec2']);
      expect((browser.storage.sync as any).data.userFavorites).toEqual(['s3', 'ec2']);
    });

    it('should add favorite when storage is empty (first launch)', async () => {
      // No userFavorites in storage — first launch
      const result = await addFavorite('s3');

      expect(result).toEqual(['s3']);
      expect((browser.storage.sync as any).data.userFavorites).toEqual(['s3']);
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(addFavorite('s3')).rejects.toThrow('Storage error');
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite from list', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3', 'ec2', 'lambda'] };

      const result = await removeFavorite('ec2');

      expect(result).toEqual(['s3', 'lambda']);
      expect((browser.storage.sync as any).data.userFavorites).toEqual(['s3', 'lambda']);
    });

    it('should remove favorite case-insensitively', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3', 'ec2', 'lambda'] };

      const result = await removeFavorite('EC2');

      expect(result).toEqual(['s3', 'lambda']);
    });

    it('should handle removing non-existent favorite', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3', 'ec2'] };

      const result = await removeFavorite('lambda');

      expect(result).toEqual(['s3', 'ec2']);
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync as any).data = { userFavorites: ['s3'] };
      (browser.storage.sync.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(removeFavorite('s3')).rejects.toThrow('Storage error');
    });
  });

  describe('loadCachedServices', () => {
    it('should load cached services from browser.storage.local', async () => {
      const services: Service[] = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://example.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        },
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: 'https://example.com/ec2.png',
          consoleUrl: 'https://console.aws.amazon.com/ec2'
        }
      ];
      (browser.storage.local as any).data = { cachedServices: { services } };

      const result = await loadCachedServices();

      expect(result).toEqual({
        s3: services[0],
        ec2: services[1]
      });
    });

    it('should return undefined when no cached services exist (first launch)', async () => {
      const result = await loadCachedServices();

      expect(result).toBeUndefined();
    });

    it('should return undefined when services array is missing', async () => {
      (browser.storage.local as any).data = { cachedServices: {} };

      const result = await loadCachedServices();

      expect(result).toBeUndefined();
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.local.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(loadCachedServices()).rejects.toThrow('Storage error');
    });
  });

  describe('loadMaxServices', () => {
    it('should return stored value when it exists (returning user)', async () => {
      (browser.storage.sync as any).data = { maxServices: 15 };

      const result = await loadMaxServices();

      expect(result).toBe(15);
      expect(browser.storage.sync.get).toHaveBeenCalledWith(['maxServices']);
    });

    it('should return undefined when not set (first launch)', async () => {
      const result = await loadMaxServices();

      expect(result).toBeUndefined();
    });

    it('should return undefined when stored value is not a number', async () => {
      (browser.storage.sync as any).data = { maxServices: 'invalid' };

      const result = await loadMaxServices();

      expect(result).toBeUndefined();
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(loadMaxServices()).rejects.toThrow('Storage error');
    });
  });

  describe('saveMaxServices', () => {
    it('should save maxServices to browser.storage.sync', async () => {
      await saveMaxServices(20);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({ maxServices: 20 });
      expect((browser.storage.sync as any).data.maxServices).toBe(20);
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveMaxServices(20)).rejects.toThrow('Storage error');
    });
  });

  describe('loadVisualMode', () => {
    it('should return stored value when it exists (returning user)', async () => {
      (browser.storage.sync as any).data = { visualMode: 'dark' };

      const result = await loadVisualMode();

      expect(result).toBe('dark');
    });

    it('should return undefined when not set (first launch)', async () => {
      const result = await loadVisualMode();

      expect(result).toBeUndefined();
    });

    it('should return undefined when stored value is invalid', async () => {
      (browser.storage.sync as any).data = { visualMode: 'invalid-mode' };

      const result = await loadVisualMode();

      expect(result).toBeUndefined();
    });

    it('should return light when stored as light', async () => {
      (browser.storage.sync as any).data = { visualMode: 'light' };

      const result = await loadVisualMode();

      expect(result).toBe('light');
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(loadVisualMode()).rejects.toThrow('Storage error');
    });
  });

  describe('saveVisualMode', () => {
    it('should save visualMode to browser.storage.sync', async () => {
      await saveVisualMode('dark');

      expect(browser.storage.sync.set).toHaveBeenCalledWith({ visualMode: 'dark' });
      expect((browser.storage.sync as any).data.visualMode).toBe('dark');
    });

    it('should throw error when storage fails', async () => {
      (browser.storage.sync.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveVisualMode('light')).rejects.toThrow('Storage error');
    });
  });
});
