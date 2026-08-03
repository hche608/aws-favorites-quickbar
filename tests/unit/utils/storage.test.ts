/**
 * Unit tests for storage utilities (src/utils/storage.ts)
 *
 * Tests verify:
 * - saveServicesToStorage saves to both localStorage and browser.storage
 * - loadServicesFromStorage returns undefined when no data (not empty array)
 * - loadServicesFromStorage returns service array when data exists
 * - loadServicesFromStorage throws on malformed JSON (not silent fallback)
 * - loadUserFavorites returns undefined when not initialized
 */

import {
  saveServicesToStorage,
  loadServicesFromStorage,
  loadUserFavorites
} from '../../../src/utils/storage';
import { Service } from '../../../src/types';
import { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks } from '../../helpers/mocks';

// Mock the browser-api module
jest.mock('../../../src/browser-api', () => {
  const mockStorage = {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    }
  };

  return {
    storage: mockStorage
  };
});

import { storage as mockBrowserStorage } from '../../../src/browser-api';

describe('Storage Utilities', () => {
  beforeEach(() => {
    setupChromeMocks();
    setupFirefoxMocks();
    localStorage.clear();
    jest.clearAllMocks();
    // Reset the mock to return a proper Promise
    (mockBrowserStorage.local.set as jest.Mock).mockResolvedValue(undefined);
    (mockBrowserStorage.sync.get as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    clearAllBrowserMocks();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveServicesToStorage', () => {
    it('should save services to localStorage with timestamp', () => {
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

      saveServicesToStorage(services);

      const stored = localStorage.getItem('awsFavoritesQuickbar_services');
      expect(stored).toBeTruthy();

      const savedData = JSON.parse(stored!);
      expect(savedData.services).toEqual(services);
      expect(savedData.timestamp).toBeDefined();
      expect(typeof savedData.timestamp).toBe('number');
    });

    it('should save services to browser.storage.local', () => {
      const services: Service[] = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://example.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        }
      ];

      saveServicesToStorage(services);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedServices: expect.objectContaining({
            services: services,
            timestamp: expect.any(Number)
          })
        })
      );
    });

    it('should handle empty services array', () => {
      saveServicesToStorage([]);

      const stored = localStorage.getItem('awsFavoritesQuickbar_services');
      const savedData = JSON.parse(stored!);
      expect(savedData.services).toEqual([]);
    });

    it('should throw when localStorage write fails', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const services: Service[] = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://example.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        }
      ];

      expect(() => saveServicesToStorage(services)).toThrow('Storage quota exceeded');

      jest.restoreAllMocks();
    });
  });

  describe('loadServicesFromStorage', () => {
    it('should load services from localStorage', () => {
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
      const data = { services, timestamp: Date.now() };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = loadServicesFromStorage();

      expect(result).toEqual(services);
    });

    it('should return undefined when no data exists', () => {
      const result = loadServicesFromStorage();

      expect(result).toBeUndefined();
    });

    it('should throw when data is invalid JSON', () => {
      localStorage.setItem('awsFavoritesQuickbar_services', 'invalid json {');

      expect(() => loadServicesFromStorage()).toThrow();
    });

    it('should return undefined when services property is missing', () => {
      const data = { timestamp: Date.now() };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = loadServicesFromStorage();

      expect(result).toBeUndefined();
    });

    it('should return undefined when services is not an array', () => {
      const data = { services: 'not-an-array', timestamp: Date.now() };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = loadServicesFromStorage();

      expect(result).toBeUndefined();
    });

    it('should return undefined when services is null', () => {
      const data = { services: null, timestamp: Date.now() };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = loadServicesFromStorage();

      expect(result).toBeUndefined();
    });
  });

  describe('loadUserFavorites', () => {
    it('should return stored favorites when they exist', async () => {
      const favorites = ['dynamodb', 'rds'];
      (mockBrowserStorage.sync.get as jest.Mock).mockResolvedValue({ userFavorites: favorites });

      const result = await loadUserFavorites();

      expect(mockBrowserStorage.sync.get).toHaveBeenCalledWith(['userFavorites']);
      expect(result).toEqual(favorites);
    });

    it('should return undefined when no favorites exist (first launch)', async () => {
      (mockBrowserStorage.sync.get as jest.Mock).mockResolvedValue({});

      const result = await loadUserFavorites();

      expect(result).toBeUndefined();
    });

    it('should throw when storage fails', async () => {
      (mockBrowserStorage.sync.get as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(loadUserFavorites()).rejects.toThrow('Storage error');
    });
  });
});
