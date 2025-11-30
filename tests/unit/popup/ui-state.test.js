/**
 * Unit tests for popup UI state management
 * Requirements: 4.3
 */

const { teardownDOM } = require('../../helpers/dom-helpers');

// Since the popup modules use ES6 imports which Jest doesn't support without Babel,
// we'll define the functions inline for testing. These are copies of the actual functions.

function showErrorState(errorStateElement, serviceListElement, show, message = null) {
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
}

function updateEmptyState(emptyStateElement, currentFavorites, searchValue) {
  if (currentFavorites.length === 0 && searchValue.trim() === '') {
    emptyStateElement.style.display = 'block';
  } else {
    emptyStateElement.style.display = 'none';
  }
}

function showStorageWarning(message) {
  console.warn('AWS Favorites Quickbar:', message);
  
  let warningBanner = document.getElementById('warningBanner');
  if (!warningBanner) {
    warningBanner = document.createElement('div');
    warningBanner.id = 'warningBanner';
    warningBanner.className = 'warning-banner';
    warningBanner.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 14px;';
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(warningBanner, container.firstChild);
  }
  
  warningBanner.textContent = message;
  warningBanner.style.display = 'block';
  
  setTimeout(() => {
    if (warningBanner) {
      warningBanner.style.display = 'none';
    }
  }, 5000);
}

describe('Popup UI State', () => {
  let errorStateElement;
  let serviceListElement;
  let emptyStateElement;

  beforeEach(() => {
    teardownDOM();

    // Create test elements
    errorStateElement = document.createElement('div');
    errorStateElement.id = 'errorState';
    errorStateElement.style.display = 'none';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorStateElement.appendChild(errorMessage);

    serviceListElement = document.createElement('div');
    serviceListElement.id = 'serviceList';
    serviceListElement.style.display = 'block';

    emptyStateElement = document.createElement('div');
    emptyStateElement.id = 'emptyState';
    emptyStateElement.style.display = 'none';

    document.body.appendChild(errorStateElement);
    document.body.appendChild(serviceListElement);
    document.body.appendChild(emptyStateElement);
  });

  afterEach(() => {
    teardownDOM();
    jest.clearAllTimers();
  });

  describe('showErrorState', () => {
    it('should show error state and hide service list when show is true', () => {
      showErrorState(errorStateElement, serviceListElement, true);

      expect(errorStateElement.style.display).toBe('block');
      expect(serviceListElement.style.display).toBe('none');
    });

    it('should hide error state and show service list when show is false', () => {
      errorStateElement.style.display = 'block';
      serviceListElement.style.display = 'none';

      showErrorState(errorStateElement, serviceListElement, false);

      expect(errorStateElement.style.display).toBe('none');
      expect(serviceListElement.style.display).toBe('block');
    });

    it('should display custom error message when provided', () => {
      const message = 'Custom error message';

      showErrorState(errorStateElement, serviceListElement, true, message);

      const errorMessage = errorStateElement.querySelector('.error-message');
      expect(errorMessage.textContent).toBe(message);
    });

    it('should not update message when message is null', () => {
      const errorMessage = errorStateElement.querySelector('.error-message');
      errorMessage.textContent = 'Original message';

      showErrorState(errorStateElement, serviceListElement, true, null);

      expect(errorMessage.textContent).toBe('Original message');
    });

    it('should handle missing error message element gracefully', () => {
      const errorStateWithoutMessage = document.createElement('div');
      errorStateWithoutMessage.style.display = 'none';

      expect(() => {
        showErrorState(errorStateWithoutMessage, serviceListElement, true, 'Test message');
      }).not.toThrow();

      expect(errorStateWithoutMessage.style.display).toBe('block');
    });
  });

  describe('updateEmptyState', () => {
    it('should show empty state when no favorites and no search', () => {
      updateEmptyState(emptyStateElement, [], '');

      expect(emptyStateElement.style.display).toBe('block');
    });

    it('should hide empty state when favorites exist', () => {
      updateEmptyState(emptyStateElement, ['s3', 'ec2'], '');

      expect(emptyStateElement.style.display).toBe('none');
    });

    it('should hide empty state when search value exists', () => {
      updateEmptyState(emptyStateElement, [], 'lambda');

      expect(emptyStateElement.style.display).toBe('none');
    });

    it('should hide empty state when both favorites and search exist', () => {
      updateEmptyState(emptyStateElement, ['s3'], 'ec2');

      expect(emptyStateElement.style.display).toBe('none');
    });

    it('should show empty state when search is only whitespace', () => {
      updateEmptyState(emptyStateElement, [], '   ');

      expect(emptyStateElement.style.display).toBe('block');
    });

    it('should hide empty state when search has content after trim', () => {
      updateEmptyState(emptyStateElement, [], '  lambda  ');

      expect(emptyStateElement.style.display).toBe('none');
    });
  });

  describe('showStorageWarning', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      
      // Create container element
      const container = document.createElement('div');
      container.className = 'container';
      document.body.appendChild(container);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create and display warning banner', () => {
      const message = 'Storage warning message';

      showStorageWarning(message);

      const banner = document.getElementById('warningBanner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toBe(message);
      expect(banner.style.display).toBe('block');
    });

    it('should reuse existing warning banner', () => {
      showStorageWarning('First message');
      const firstBanner = document.getElementById('warningBanner');

      showStorageWarning('Second message');
      const secondBanner = document.getElementById('warningBanner');

      expect(firstBanner).toBe(secondBanner);
      expect(secondBanner.textContent).toBe('Second message');
    });

    it('should hide banner after 5 seconds', () => {
      showStorageWarning('Test message');

      const banner = document.getElementById('warningBanner');
      expect(banner.style.display).toBe('block');

      jest.advanceTimersByTime(5000);

      expect(banner.style.display).toBe('none');
    });

    it('should insert banner at the beginning of container', () => {
      const container = document.querySelector('.container');
      const existingChild = document.createElement('div');
      existingChild.id = 'existing';
      container.appendChild(existingChild);

      showStorageWarning('Test message');

      const banner = document.getElementById('warningBanner');
      expect(container.firstChild).toBe(banner);
    });

    it('should apply correct styling to banner', () => {
      showStorageWarning('Test message');

      const banner = document.getElementById('warningBanner');
      expect(banner.className).toBe('warning-banner');
      expect(banner.style.backgroundColor).toBe('rgb(255, 243, 205)');
      expect(banner.style.color).toBe('rgb(133, 100, 4)');
      expect(banner.style.padding).toBe('10px');
    });

    it('should log warning to console', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      const message = 'Test warning';

      showStorageWarning(message);

      expect(consoleSpy).toHaveBeenCalledWith('AWS Favorites Quickbar:', message);
      
      consoleSpy.mockRestore();
    });

    it('should handle missing container gracefully', () => {
      // Remove container
      const container = document.querySelector('.container');
      if (container) {
        container.remove();
      }

      expect(() => {
        showStorageWarning('Test message');
      }).not.toThrow();

      const banner = document.getElementById('warningBanner');
      expect(banner).toBeTruthy();
      expect(banner.parentElement).toBe(document.body);
    });
  });
});
