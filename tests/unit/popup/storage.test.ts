/**
 * Unit tests for popup storage utilities
 * Requirements: 4.1
 */

import { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks } from '../../helpers/mocks';
import {
  loadUserFavorites,
  saveUserFavorites,
  addFavorite,
  removeFavorite,
  loadCachedServices,
  loadMaxServices,
  saveMaxServices
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
    it('should load favorites from browser.storage.sync', async () => {
      const favorites = ['s3', 'ec2', 'lambda'];
      // Set the data in the mock storage
      (browser.storage.sync as any).data = { userFavorites: favorites };

      const result = await loadUserFavorites();

      expect(result).toEqual(favorites);
      expect(browser.storage.sync.get).toHaveBeenCalledWith(['userFavorites']);
    });

    it('should return empty array when no favorites exist', async () => {
      const result = await loadUserFavorites();

      expect(result).toEqual([]);
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

    it('should add favorite to empty list', async () => {
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

    it('should return empty object when no cached services exist', async () => {
      const result = await loadCachedServices();

      expect(result).toEqual({});
    });

    it('should handle missing services array', async () => {
      (browser.storage.local as any).data = { cachedServices: {} };

      const result = await loadCachedServices();

      expect(result).toEqual({});
    });

    it('should return empty object when storage fails', async () => {
      (browser.storage.local.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadCachedServices();

      expect(result).toEqual({});
    });
  });

  describe('loadMaxServices', () => {
    it('should load maxServices from browser.storage.sync', async () => {
      (browser.storage.sync as any).data = { maxServices: 15 };

      const result = await loadMaxServices();

      expect(result).toBe(15);
      expect(browser.storage.sync.get).toHaveBeenCalledWith(['maxServices']);
    });

    it('should return default value of 10 when not set', async () => {
      const result = await loadMaxServices();

      expect(result).toBe(10);
    });

    it('should return default value when storage fails', async () => {
      (browser.storage.sync.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadMaxServices();

      expect(result).toBe(10);
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
});
