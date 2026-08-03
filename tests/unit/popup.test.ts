/**
 * Unit tests for popup.ts
 *
 * popup.ts adds a DOMContentLoaded listener on import, which calls initializePopup().
 * We test by setting up the DOM first, then triggering DOMContentLoaded.
 */

// Mock all dependencies
jest.mock('../../src/popup/storage', () => ({
  loadUserFavorites: jest.fn().mockResolvedValue(undefined),
  loadCachedServices: jest.fn().mockResolvedValue(undefined),
  loadMaxServices: jest.fn().mockResolvedValue(undefined),
  saveMaxServices: jest.fn().mockResolvedValue(undefined),
  loadVisualMode: jest.fn().mockResolvedValue(undefined),
  saveVisualMode: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../src/popup/search', () => ({
  searchServices: jest.fn().mockReturnValue([])
}));

jest.mock('../../src/popup/ui-state', () => ({
  showErrorState: jest.fn(),
  updateEmptyState: jest.fn(),
  showStorageWarning: jest.fn()
}));

jest.mock('../../src/popup/service-list-renderer', () => ({
  renderServiceList: jest.fn(),
  isServiceSelected: jest.fn().mockReturnValue(false)
}));

jest.mock('../../src/popup/service-click-handler', () => ({
  createServiceClickHandler: jest.fn().mockReturnValue(jest.fn())
}));

jest.mock('../../src/browser-api', () => ({
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    }
  }
}));

import {
  loadUserFavorites,
  loadCachedServices,
  loadMaxServices,
  saveMaxServices,
  loadVisualMode,
  saveVisualMode
} from '../../src/popup/storage';
import { showErrorState, showStorageWarning } from '../../src/popup/ui-state';
import { renderServiceList } from '../../src/popup/service-list-renderer';
import { searchServices } from '../../src/popup/search';
import { tabs, storage } from '../../src/browser-api';
import { Service } from '../../src/types';

function setupPopupDOM(): void {
  document.body.innerHTML = `
    <div class="container">
      <div class="search-container">
        <input type="text" id="searchInput" />
      </div>
      <div id="pinningNote" class="info-banner" style="display: none;"></div>
      <div class="settings-container">
        <input type="number" id="maxServicesInput" min="1" max="50" value="10" />
      </div>
      <div class="settings-container">
        <select id="visualModeSelect">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div id="serviceList" class="service-list"></div>
      <div id="emptyState" style="display: none;"></div>
      <div id="errorState" style="display: none;">
        <button id="retryButton">Retry</button>
      </div>
    </div>
  `;
}

describe('Popup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPopupDOM();
    // Default mocks that all tests need
    (storage.local.get as jest.Mock).mockResolvedValue({});
    (loadMaxServices as jest.Mock).mockResolvedValue(undefined);
    (loadVisualMode as jest.Mock).mockResolvedValue(undefined);
    (loadCachedServices as jest.Mock).mockResolvedValue(undefined);
    (loadUserFavorites as jest.Mock).mockResolvedValue(undefined);
    (tabs.query as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initializePopup', () => {
    it('should load settings into UI on initialization', async () => {
      (loadMaxServices as jest.Mock).mockResolvedValue(15);
      (loadVisualMode as jest.Mock).mockResolvedValue('dark');
      (loadCachedServices as jest.Mock).mockResolvedValue(undefined);
      (loadUserFavorites as jest.Mock).mockResolvedValue(undefined);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loadMaxServices).toHaveBeenCalled();
      expect(loadVisualMode).toHaveBeenCalled();

      const maxInput = document.getElementById('maxServicesInput') as HTMLInputElement;
      expect(maxInput.value).toBe('15');

      const visualSelect = document.getElementById('visualModeSelect') as HTMLSelectElement;
      expect(visualSelect.value).toBe('dark');
    });

    it('should use defaults when settings are undefined (first launch)', async () => {
      (loadMaxServices as jest.Mock).mockResolvedValue(undefined);
      (loadVisualMode as jest.Mock).mockResolvedValue(undefined);
      (loadCachedServices as jest.Mock).mockResolvedValue(undefined);
      (loadUserFavorites as jest.Mock).mockResolvedValue(undefined);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      const maxInput = document.getElementById('maxServicesInput') as HTMLInputElement;
      expect(maxInput.value).toBe('10');

      const visualSelect = document.getElementById('visualModeSelect') as HTMLSelectElement;
      expect(visualSelect.value).toBe('light');
    });

    it('should load and render services', async () => {
      const services: Record<string, Service> = {
        s3: { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3' }
      };
      (loadCachedServices as jest.Mock).mockResolvedValue(services);
      (loadUserFavorites as jest.Mock).mockResolvedValue(['s3']);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loadCachedServices).toHaveBeenCalled();
      expect(loadUserFavorites).toHaveBeenCalled();
      expect(renderServiceList).toHaveBeenCalled();
    });

    it('should show warning when no cached services exist', async () => {
      (loadCachedServices as jest.Mock).mockResolvedValue(undefined);
      (loadUserFavorites as jest.Mock).mockResolvedValue(undefined);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(showStorageWarning).toHaveBeenCalledWith(
        'No services found. Visit the AWS Console homepage to populate the list.'
      );
    });
  });

  describe('settings changes', () => {
    beforeEach(async () => {
      (loadMaxServices as jest.Mock).mockResolvedValue(10);
      (loadVisualMode as jest.Mock).mockResolvedValue('light');
      (loadCachedServices as jest.Mock).mockResolvedValue(undefined);
      (loadUserFavorites as jest.Mock).mockResolvedValue(undefined);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should save maxServices when input changes', async () => {
      const maxInput = document.getElementById('maxServicesInput') as HTMLInputElement;
      maxInput.value = '20';
      maxInput.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(saveMaxServices).toHaveBeenCalledWith(20);
    });

    it('should not save maxServices when value is out of range', async () => {
      const maxInput = document.getElementById('maxServicesInput') as HTMLInputElement;
      maxInput.value = '0';
      maxInput.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(saveMaxServices).not.toHaveBeenCalled();
    });

    it('should save visualMode when select changes', async () => {
      const visualSelect = document.getElementById('visualModeSelect') as HTMLSelectElement;
      visualSelect.value = 'dark';
      visualSelect.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(saveVisualMode).toHaveBeenCalledWith('dark');
    });

    it('should notify content scripts after settings change', async () => {
      (tabs.query as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (tabs.sendMessage as jest.Mock).mockResolvedValue({ success: true });

      const maxInput = document.getElementById('maxServicesInput') as HTMLInputElement;
      maxInput.value = '15';
      maxInput.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(tabs.query).toHaveBeenCalledWith({ url: 'https://*.console.aws.amazon.com/*' });
      expect(tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'updateQuickbar' });
      expect(tabs.sendMessage).toHaveBeenCalledWith(2, { action: 'updateQuickbar' });
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const services: Record<string, Service> = {
        s3: { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3' },
        ec2: { id: 'ec2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2' }
      };
      (loadCachedServices as jest.Mock).mockResolvedValue(services);
      (loadUserFavorites as jest.Mock).mockResolvedValue([]);
      (loadMaxServices as jest.Mock).mockResolvedValue(10);
      (loadVisualMode as jest.Mock).mockResolvedValue('light');
      (searchServices as jest.Mock).mockReturnValue([
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3' }
      ]);

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should filter services on search input', async () => {
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      searchInput.value = 's3';
      searchInput.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(searchServices).toHaveBeenCalledWith('s3', expect.any(Array));
      expect(renderServiceList).toHaveBeenCalled();
    });
  });

  describe('pinning note', () => {
    it('should show pinning note when injection status is not success', async () => {
      (storage.local.get as jest.Mock).mockResolvedValue({ injectionStatus: 'no-native-pin' });
      (loadCachedServices as jest.Mock).mockResolvedValue({ s3: { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://a.com' } });
      (loadUserFavorites as jest.Mock).mockResolvedValue([]);
      (loadMaxServices as jest.Mock).mockResolvedValue(10);
      (loadVisualMode as jest.Mock).mockResolvedValue('light');

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const note = document.getElementById('pinningNote')!;
      expect(note.style.display).toBe('block');
    });

    it('should hide pinning note when injection status is success', async () => {
      (storage.local.get as jest.Mock).mockResolvedValue({ injectionStatus: 'success' });
      (loadCachedServices as jest.Mock).mockResolvedValue({ s3: { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://a.com' } });
      (loadUserFavorites as jest.Mock).mockResolvedValue(['s3']);
      (loadMaxServices as jest.Mock).mockResolvedValue(10);
      (loadVisualMode as jest.Mock).mockResolvedValue('light');

      jest.isolateModules(() => {
        require('../../src/popup');
      });

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const note = document.getElementById('pinningNote')!;
      expect(note.style.display).toBe('none');
    });
  });
});
