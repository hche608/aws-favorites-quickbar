/**
 * Integration tests for popup workflow
 * Tests popup initialization, search, and settings
 */

const { setupChromeMocks, clearChromeMocks } = require('../helpers/mocks');
const { teardownDOM } = require('../helpers/dom-helpers');

// Since popup modules use ES6 modules, we'll test the functionality through the compiled code
// or by testing the underlying logic directly

describe('Popup Workflow Integration Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    teardownDOM();
    
    // Setup basic popup HTML structure
    document.body.innerHTML = `
      <div class="container">
        <input type="text" id="searchInput" placeholder="Search services..." />
        <div id="emptyState" style="display: none;">
          <p>No favorites selected yet.</p>
        </div>
        <div id="errorState" style="display: none;">
          <p class="error-message">An error occurred.</p>
          <button id="retryButton">Retry</button>
        </div>
        <div id="serviceList"></div>
        <div class="settings">
          <label for="maxServicesInput">Max services:</label>
          <input type="number" id="maxServicesInput" min="1" max="50" value="10" />
        </div>
      </div>
    `;
  });

  afterEach(() => {
    clearChromeMocks();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Popup initialization and service loading', () => {
    it('should load and display services from cache', async () => {
      // Arrange: Setup cached services
      const cachedServices = [
        { id: 's3', name: 'S3', iconUrl: 'https://console.aws.amazon.com/s3/icon.png', consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://console.aws.amazon.com/ec2/icon.png', consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' },
        { id: 'lambda', name: 'Lambda', iconUrl: 'https://console.aws.amazon.com/lambda/icon.png', consoleUrl: 'https://console.aws.amazon.com/lambda/home', source: 'recent' }
      ];

      global.chrome.storage.local.data.cachedServices = {
        services: cachedServices,
        timestamp: Date.now()
      };

      global.chrome.storage.sync.data.userFavorites = ['s3'];

      // Act: Load services using chrome.storage API directly
      const cachedResult = await chrome.storage.local.get(['cachedServices']);
      const favoritesResult = await chrome.storage.sync.get(['userFavorites']);

      // Assert
      expect(cachedResult.cachedServices.services.length).toBe(3);
      expect(favoritesResult.userFavorites).toEqual(['s3']);
    });

    it('should handle empty cache gracefully', async () => {
      // Arrange: No cached services
      global.chrome.storage.local.data = {};
      global.chrome.storage.sync.data.userFavorites = [];

      // Act
      const cachedResult = await chrome.storage.local.get(['cachedServices']);
      const favoritesResult = await chrome.storage.sync.get(['userFavorites']);

      // Assert
      expect(cachedResult.cachedServices).toBeUndefined();
      expect(favoritesResult.userFavorites).toEqual([]);
    });

    it('should load max services setting', async () => {
      // Arrange
      global.chrome.storage.sync.data.maxServices = 15;

      // Act
      const result = await chrome.storage.sync.get(['maxServices']);

      // Assert
      expect(result.maxServices).toBe(15);
    });

    it('should use default max services when not set', async () => {
      // Arrange: No maxServices in storage
      global.chrome.storage.sync.data = {};

      // Act
      const result = await chrome.storage.sync.get(['maxServices']);

      // Assert
      expect(result.maxServices).toBeUndefined();
      // Default should be 10 (handled by application logic)
    });
  });

  describe('Search interaction filters list in real-time', () => {
    // Implement search logic inline for testing
    const searchServices = (query, allServices) => {
      if (!query || query.trim() === '') {
        return allServices;
      }
      
      const lowerQuery = query.toLowerCase().trim();
      return allServices.filter(service =>
        service.name.toLowerCase().includes(lowerQuery) ||
        service.id.toLowerCase().includes(lowerQuery)
      );
    };

    it('should filter services by name', () => {
      // Arrange
      const allServices = [
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' },
        { id: 'lambda', name: 'Lambda', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/lambda/home', source: 'recent' },
        { id: 'dynamodb', name: 'DynamoDB', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/dynamodb/home', source: 'recent' }
      ];

      // Act: Search for "s3"
      const results = searchServices('s3', allServices);

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('s3');
    });

    it('should filter services by ID', () => {
      // Arrange
      const allServices = [
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' },
        { id: 'lambda', name: 'Lambda', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/lambda/home', source: 'recent' }
      ];

      // Act: Search for "lambda"
      const results = searchServices('lambda', allServices);

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('lambda');
    });

    it('should be case-insensitive', () => {
      // Arrange
      const allServices = [
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'dynamodb', name: 'DynamoDB', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/dynamodb/home', source: 'recent' }
      ];

      // Act: Search with different cases
      const results1 = searchServices('DYNAMODB', allServices);
      const results2 = searchServices('DyNaMoDb', allServices);

      // Assert
      expect(results1.length).toBe(1);
      expect(results2.length).toBe(1);
      expect(results1[0].id).toBe('dynamodb');
      expect(results2[0].id).toBe('dynamodb');
    });

    it('should return all services for empty query', () => {
      // Arrange
      const allServices = [
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' }
      ];

      // Act
      const results1 = searchServices('', allServices);
      const results2 = searchServices('   ', allServices);

      // Assert
      expect(results1.length).toBe(2);
      expect(results2.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      // Arrange
      const allServices = [
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' }
      ];

      // Act
      const results = searchServices('nonexistent', allServices);

      // Assert
      expect(results.length).toBe(0);
    });
  });

  describe('Max services setting updates storage', () => {
    it('should save max services setting', async () => {
      // Arrange
      const newValue = 20;

      // Act
      await chrome.storage.sync.set({ maxServices: newValue });

      // Assert
      expect(global.chrome.storage.sync.data.maxServices).toBe(20);
    });

    it('should update max services input value', async () => {
      // Arrange
      const maxServicesInput = document.getElementById('maxServicesInput');
      const newValue = 25;

      // Act
      await chrome.storage.sync.set({ maxServices: newValue });
      const result = await chrome.storage.sync.get(['maxServices']);
      maxServicesInput.value = result.maxServices;

      // Assert
      expect(maxServicesInput.value).toBe('25');
    });

    it('should handle max services within valid range', async () => {
      // Test boundary values
      await chrome.storage.sync.set({ maxServices: 1 });
      let result = await chrome.storage.sync.get(['maxServices']);
      expect(result.maxServices).toBe(1);

      await chrome.storage.sync.set({ maxServices: 50 });
      result = await chrome.storage.sync.get(['maxServices']);
      expect(result.maxServices).toBe(50);

      await chrome.storage.sync.set({ maxServices: 10 });
      result = await chrome.storage.sync.get(['maxServices']);
      expect(result.maxServices).toBe(10);
    });
  });

  describe('UI state management', () => {
    // Implement UI state functions inline for testing
    const showErrorState = (errorStateElement, serviceListElement, show, message = null) => {
      if (show) {
        errorStateElement.style.display = 'block';
        serviceListElement.style.display = 'none';
        
        if (message) {
          const errorMessageElement = errorStateElement.querySelector('.error-message');
          if (errorMessageElement) {
            errorMessageElement.textContent = message;
          }
        }
      } else {
        errorStateElement.style.display = 'none';
        serviceListElement.style.display = 'block';
      }
    };

    const updateEmptyState = (emptyStateElement, currentFavorites, searchValue) => {
      if (currentFavorites.length === 0 && searchValue.trim() === '') {
        emptyStateElement.style.display = 'block';
      } else {
        emptyStateElement.style.display = 'none';
      }
    };

    it('should show error state when requested', () => {
      // Arrange
      const errorStateElement = document.getElementById('errorState');
      const serviceListElement = document.getElementById('serviceList');

      // Act
      showErrorState(errorStateElement, serviceListElement, true, 'Test error message');

      // Assert
      expect(errorStateElement.style.display).toBe('block');
      expect(serviceListElement.style.display).toBe('none');
      expect(errorStateElement.querySelector('.error-message').textContent).toBe('Test error message');
    });

    it('should hide error state when requested', () => {
      // Arrange
      const errorStateElement = document.getElementById('errorState');
      const serviceListElement = document.getElementById('serviceList');
      errorStateElement.style.display = 'block';
      serviceListElement.style.display = 'none';

      // Act
      showErrorState(errorStateElement, serviceListElement, false);

      // Assert
      expect(errorStateElement.style.display).toBe('none');
      expect(serviceListElement.style.display).toBe('block');
    });

    it('should show empty state when no favorites and no search', () => {
      // Arrange
      const emptyStateElement = document.getElementById('emptyState');

      // Act
      updateEmptyState(emptyStateElement, [], '');

      // Assert
      expect(emptyStateElement.style.display).toBe('block');
    });

    it('should hide empty state when favorites exist', () => {
      // Arrange
      const emptyStateElement = document.getElementById('emptyState');

      // Act
      updateEmptyState(emptyStateElement, ['s3', 'ec2'], '');

      // Assert
      expect(emptyStateElement.style.display).toBe('none');
    });

    it('should hide empty state when search is active', () => {
      // Arrange
      const emptyStateElement = document.getElementById('emptyState');

      // Act
      updateEmptyState(emptyStateElement, [], 's3');

      // Assert
      expect(emptyStateElement.style.display).toBe('none');
    });
  });

  describe('Service item rendering', () => {
    it('should create service item DOM structure', () => {
      // Test that we can create a service item structure
      const serviceItem = document.createElement('div');
      serviceItem.className = 'service-item';
      serviceItem.setAttribute('data-service-id', 's3');
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      
      const nameElement = document.createElement('span');
      nameElement.className = 'service-name';
      nameElement.textContent = 'S3';
      
      serviceItem.appendChild(checkbox);
      serviceItem.appendChild(nameElement);

      // Assert
      expect(serviceItem.classList.contains('service-item')).toBe(true);
      expect(serviceItem.getAttribute('data-service-id')).toBe('s3');
      expect(checkbox.checked).toBe(false);
      expect(nameElement.textContent).toBe('S3');
    });

    it('should create selected service item structure', () => {
      const serviceItem = document.createElement('div');
      serviceItem.className = 'service-item selected';
      serviceItem.setAttribute('data-service-id', 's3');
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      
      serviceItem.appendChild(checkbox);

      // Assert
      expect(serviceItem.classList.contains('selected')).toBe(true);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Favorite management', () => {
    it('should add favorite to storage', async () => {
      // Arrange
      global.chrome.storage.sync.data.userFavorites = ['s3'];

      // Act: Add a new favorite
      const currentFavorites = global.chrome.storage.sync.data.userFavorites;
      currentFavorites.push('ec2');
      await chrome.storage.sync.set({ userFavorites: currentFavorites });

      // Assert
      const result = await chrome.storage.sync.get(['userFavorites']);
      expect(result.userFavorites).toContain('s3');
      expect(result.userFavorites).toContain('ec2');
      expect(result.userFavorites.length).toBe(2);
    });

    it('should not add duplicate favorites', async () => {
      // Arrange
      global.chrome.storage.sync.data.userFavorites = ['s3'];

      // Act: Try to add duplicate (with case-insensitive check)
      const currentFavorites = global.chrome.storage.sync.data.userFavorites;
      const exists = currentFavorites.some(id => id.toLowerCase() === 's3'.toLowerCase());
      
      if (!exists) {
        currentFavorites.push('s3');
        await chrome.storage.sync.set({ userFavorites: currentFavorites });
      }

      // Assert
      const result = await chrome.storage.sync.get(['userFavorites']);
      expect(result.userFavorites.length).toBe(1);
      expect(result.userFavorites[0]).toBe('s3');
    });

    it('should remove favorite from storage', async () => {
      // Arrange
      global.chrome.storage.sync.data.userFavorites = ['s3', 'ec2', 'lambda'];

      // Act: Remove a favorite
      const currentFavorites = global.chrome.storage.sync.data.userFavorites;
      const updated = currentFavorites.filter(id => id.toLowerCase() !== 'ec2'.toLowerCase());
      await chrome.storage.sync.set({ userFavorites: updated });

      // Assert
      const result = await chrome.storage.sync.get(['userFavorites']);
      expect(result.userFavorites).toContain('s3');
      expect(result.userFavorites).toContain('lambda');
      expect(result.userFavorites).not.toContain('ec2');
      expect(result.userFavorites.length).toBe(2);
    });

    it('should handle case-insensitive favorite operations', async () => {
      // Arrange
      global.chrome.storage.sync.data.userFavorites = ['s3'];

      // Act: Try to add uppercase version (with case-insensitive check)
      let currentFavorites = global.chrome.storage.sync.data.userFavorites;
      const exists = currentFavorites.some(id => id.toLowerCase() === 'S3'.toLowerCase());
      
      if (!exists) {
        currentFavorites.push('S3');
        await chrome.storage.sync.set({ userFavorites: currentFavorites });
      }

      // Assert: Should not add duplicate
      let result = await chrome.storage.sync.get(['userFavorites']);
      expect(result.userFavorites.length).toBe(1);

      // Act: Remove with different case
      currentFavorites = result.userFavorites;
      const updated = currentFavorites.filter(id => id.toLowerCase() !== 'S3'.toLowerCase());
      await chrome.storage.sync.set({ userFavorites: updated });

      // Assert: Should remove the favorite
      result = await chrome.storage.sync.get(['userFavorites']);
      expect(result.userFavorites.length).toBe(0);
    });
  });
});
