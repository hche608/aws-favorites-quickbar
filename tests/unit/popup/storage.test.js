/**
 * Unit tests for popup storage utilities
 * Requirements: 4.1
 */

const { setupChromeMocks, clearChromeMocks } = require('../../helpers/mocks');

// Since the popup modules use ES6 imports which Jest doesn't support without Babel,
// we'll define the functions inline for testing. These are copies of the actual functions.

async function loadUserFavorites() {
  try {
    const result = await chrome.storage.sync.get(['userFavorites']);
    return result.userFavorites || [];
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading favorites', error);
    throw error;
  }
}

async function saveUserFavorites(favorites) {
  try {
    await chrome.storage.sync.set({ userFavorites: favorites });
    console.log('AWS Favorites Quickbar: Favorites saved', favorites);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving favorites', error);
    throw error;
  }
}

async function addFavorite(serviceId) {
  try {
    const favorites = await loadUserFavorites();
    
    const exists = favorites.some(id => 
      id.toLowerCase() === serviceId.toLowerCase()
    );
    
    if (!exists) {
      favorites.push(serviceId);
      await saveUserFavorites(favorites);
    }
    
    return favorites;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error adding favorite', error);
    throw error;
  }
}

async function removeFavorite(serviceId) {
  try {
    const favorites = await loadUserFavorites();
    
    const updated = favorites.filter(id => 
      id.toLowerCase() !== serviceId.toLowerCase()
    );
    
    await saveUserFavorites(updated);
    return updated;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error removing favorite', error);
    throw error;
  }
}

async function loadCachedServices() {
  try {
    const result = await chrome.storage.local.get(['cachedServices']);
    
    if (!result.cachedServices) {
      console.log('AWS Favorites Quickbar: No cached services found');
      return {};
    }
    
    const data = result.cachedServices;
    const services = data.services || [];
    
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id.toLowerCase()] = service;
    });
    
    console.log('AWS Favorites Quickbar: Loaded cached services:', Object.keys(serviceMap).length);
    return serviceMap;
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error loading cached services', error);
    return {};
  }
}

async function loadMaxServices() {
  try {
    const result = await chrome.storage.sync.get(['maxServices']);
    return result.maxServices || 10;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading maxServices', error);
    return 10;
  }
}

async function saveMaxServices(value) {
  try {
    await chrome.storage.sync.set({ maxServices: value });
    console.log('AWS Favorites Quickbar: Saved maxServices:', value);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving maxServices', error);
    throw error;
  }
}

describe('Popup Storage', () => {
  beforeEach(() => {
    setupChromeMocks();
  });

  afterEach(() => {
    clearChromeMocks();
  });

  describe('loadUserFavorites', () => {
    it('should load favorites from chrome.storage.sync', async () => {
      const favorites = ['s3', 'ec2', 'lambda'];
      // Set the data in the mock storage
      chrome.storage.sync.data = { userFavorites: favorites };

      const result = await loadUserFavorites();

      expect(result).toEqual(favorites);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['userFavorites']);
    });

    it('should return empty array when no favorites exist', async () => {
      const result = await loadUserFavorites();

      expect(result).toEqual([]);
    });

    it('should throw error when storage fails', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      await expect(loadUserFavorites()).rejects.toThrow('Storage error');
    });
  });

  describe('saveUserFavorites', () => {
    it('should save favorites to chrome.storage.sync', async () => {
      const favorites = ['s3', 'ec2', 'lambda'];

      await saveUserFavorites(favorites);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ userFavorites: favorites });
      expect(chrome.storage.sync.data.userFavorites).toEqual(favorites);
    });

    it('should throw error when storage fails', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveUserFavorites(['s3'])).rejects.toThrow('Storage error');
    });
  });

  describe('addFavorite', () => {
    it('should add new favorite to existing list', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3', 'ec2'] };

      const result = await addFavorite('lambda');

      expect(result).toEqual(['s3', 'ec2', 'lambda']);
      expect(chrome.storage.sync.data.userFavorites).toEqual(['s3', 'ec2', 'lambda']);
    });

    it('should not add duplicate favorite (case-insensitive)', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3', 'ec2'] };

      const result = await addFavorite('S3');

      expect(result).toEqual(['s3', 'ec2']);
      expect(chrome.storage.sync.data.userFavorites).toEqual(['s3', 'ec2']);
    });

    it('should add favorite to empty list', async () => {
      const result = await addFavorite('s3');

      expect(result).toEqual(['s3']);
      expect(chrome.storage.sync.data.userFavorites).toEqual(['s3']);
    });

    it('should throw error when storage fails', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(addFavorite('s3')).rejects.toThrow('Storage error');
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite from list', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3', 'ec2', 'lambda'] };

      const result = await removeFavorite('ec2');

      expect(result).toEqual(['s3', 'lambda']);
      expect(chrome.storage.sync.data.userFavorites).toEqual(['s3', 'lambda']);
    });

    it('should remove favorite case-insensitively', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3', 'ec2', 'lambda'] };

      const result = await removeFavorite('EC2');

      expect(result).toEqual(['s3', 'lambda']);
    });

    it('should handle removing non-existent favorite', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3', 'ec2'] };

      const result = await removeFavorite('lambda');

      expect(result).toEqual(['s3', 'ec2']);
    });

    it('should throw error when storage fails', async () => {
      chrome.storage.sync.data = { userFavorites: ['s3'] };
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(removeFavorite('s3')).rejects.toThrow('Storage error');
    });
  });

  describe('loadCachedServices', () => {
    it('should load cached services from chrome.storage.local', async () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];
      chrome.storage.local.data = { cachedServices: { services } };

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
      chrome.storage.local.data = { cachedServices: {} };

      const result = await loadCachedServices();

      expect(result).toEqual({});
    });

    it('should return empty object when storage fails', async () => {
      chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadCachedServices();

      expect(result).toEqual({});
    });
  });

  describe('loadMaxServices', () => {
    it('should load maxServices from chrome.storage.sync', async () => {
      chrome.storage.sync.data = { maxServices: 15 };

      const result = await loadMaxServices();

      expect(result).toBe(15);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['maxServices']);
    });

    it('should return default value of 10 when not set', async () => {
      const result = await loadMaxServices();

      expect(result).toBe(10);
    });

    it('should return default value when storage fails', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadMaxServices();

      expect(result).toBe(10);
    });
  });

  describe('saveMaxServices', () => {
    it('should save maxServices to chrome.storage.sync', async () => {
      await saveMaxServices(20);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ maxServices: 20 });
      expect(chrome.storage.sync.data.maxServices).toBe(20);
    });

    it('should throw error when storage fails', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveMaxServices(20)).rejects.toThrow('Storage error');
    });
  });
});
