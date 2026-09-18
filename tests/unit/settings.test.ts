/**
 * Unit tests for settings management (src/settings.ts)
 *
 * Tests verify:
 * - loadSettings: first-launch (undefined) → defaults written to storage
 * - loadSettings: returning user → stored values used as-is
 * - loadSettings: invalid stored values → defaults applied
 * - applyVisualMode: radio group found and clicked
 * - applyVisualMode: radio group not found → no-op
 * - applyVisualMode: already in correct mode → no click
 */

import { loadSettings, applyVisualMode } from '../../src/settings';
import { STORAGE_DEFAULTS } from '../../src/types';
import { teardownDOM } from '../helpers/dom-helpers';

// Mock browser-api
vi.mock('../../src/browser-api', () => {
  const mockStorage = {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  };
  return { storage: mockStorage };
});

// Mock utils/dom waitForElement
vi.mock('../../src/utils/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/dom')>();
  return {
    ...actual,
    waitForElement: vi.fn().mockResolvedValue(null)
  };
});

import { storage as mockStorage } from '../../src/browser-api';
import { waitForElement } from '../../src/utils/dom';

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('loadSettings', () => {
    it('should use defaults and write to storage when all values are undefined (first launch)', async () => {
      (mockStorage.sync.get as jest.Mock).mockResolvedValue({});

      const settings = await loadSettings();

      expect(settings.favoriteIds).toEqual([]);
      expect(settings.maxServices).toBe(10);
      expect(settings.visualMode).toBe('light');

      // Should write defaults to storage
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ userFavorites: [] });
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ maxServices: 10 });
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ visualMode: 'light' });
    });

    it('should use stored values when they exist (returning user)', async () => {
      (mockStorage.sync.get as jest.Mock).mockResolvedValue({
        userFavorites: ['ec2', 's3'],
        maxServices: 5,
        visualMode: 'dark'
      });

      const settings = await loadSettings();

      expect(settings.favoriteIds).toEqual(['ec2', 's3']);
      expect(settings.maxServices).toBe(5);
      expect(settings.visualMode).toBe('dark');

      // Should NOT write to storage
      expect(mockStorage.sync.set).not.toHaveBeenCalled();
    });

    it('should use default maxServices when stored value is not a number', async () => {
      (mockStorage.sync.get as jest.Mock).mockResolvedValue({
        userFavorites: ['ec2'],
        maxServices: 'invalid',
        visualMode: 'light'
      });

      const settings = await loadSettings();

      expect(settings.maxServices).toBe(STORAGE_DEFAULTS.maxServices);
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ maxServices: 10 });
    });

    it('should use default visualMode when stored value is invalid', async () => {
      (mockStorage.sync.get as jest.Mock).mockResolvedValue({
        userFavorites: ['ec2'],
        maxServices: 15,
        visualMode: 'invalid-mode'
      });

      const settings = await loadSettings();

      expect(settings.visualMode).toBe(STORAGE_DEFAULTS.visualMode);
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ visualMode: 'light' });
    });

    it('should handle partial storage (some values defined, some not)', async () => {
      (mockStorage.sync.get as jest.Mock).mockResolvedValue({
        userFavorites: ['lambda']
        // maxServices and visualMode are undefined
      });

      const settings = await loadSettings();

      expect(settings.favoriteIds).toEqual(['lambda']);
      expect(settings.maxServices).toBe(10);
      expect(settings.visualMode).toBe('light');

      // Should only write the missing values
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ maxServices: 10 });
      expect(mockStorage.sync.set).toHaveBeenCalledWith({ visualMode: 'light' });
      expect(mockStorage.sync.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ userFavorites: expect.anything() })
      );
    });
  });

  describe('applyVisualMode', () => {
    it('should do nothing when radio group is not found', async () => {
      (waitForElement as jest.Mock).mockResolvedValue(null);

      await applyVisualMode('dark');

      // No error, just returns
    });

    it('should do nothing when radio input is not found in group', async () => {
      const radioGroup = document.createElement('div');
      (waitForElement as jest.Mock).mockResolvedValue(radioGroup);

      await applyVisualMode('dark');

      // No error, just returns
    });

    it('should do nothing when radio is already checked', async () => {
      const radioGroup = document.createElement('div');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.value = 'dark';
      radio.checked = true;
      radioGroup.appendChild(radio);

      (waitForElement as jest.Mock).mockResolvedValue(radioGroup);

      const dispatchSpy = jest.spyOn(radio, 'dispatchEvent');

      await applyVisualMode('dark');

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should click the radio when mode differs from current', async () => {
      const radioGroup = document.createElement('div');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.value = 'dark';
      radio.checked = false;
      radioGroup.appendChild(radio);

      (waitForElement as jest.Mock).mockResolvedValue(radioGroup);

      const dispatchSpy = jest.spyOn(radio, 'dispatchEvent');

      await applyVisualMode('dark');

      expect(radio.checked).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }));
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'change' }));
    });

    it('should apply light mode', async () => {
      const radioGroup = document.createElement('div');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.value = 'light';
      radio.checked = false;
      radioGroup.appendChild(radio);

      (waitForElement as jest.Mock).mockResolvedValue(radioGroup);

      await applyVisualMode('light');

      expect(radio.checked).toBe(true);
    });

    it('should wait for radio group with correct selector and timeout', async () => {
      (waitForElement as jest.Mock).mockResolvedValue(null);

      await applyVisualMode('dark');

      expect(waitForElement).toHaveBeenCalledWith(
        ['[data-testid="visualModeRadioGroup"]'],
        10000,
        'visualModeRadioGroup'
      );
    });
  });
});
