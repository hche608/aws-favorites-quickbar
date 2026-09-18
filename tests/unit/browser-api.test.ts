/**
 * Unit tests for browser API compatibility layer (src/browser-api.ts)
 * Requirements: 2.6, 10.1, 10.2, 10.6, 11.1, 11.2, 11.3, 11.4
 */

import { storage, runtime, tabs, getBrowserType } from '../../src/browser-api';

import { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks } from '../helpers/mocks';

// Extend chrome types to include our mock data property
declare global {
  namespace chrome.storage {
    interface LocalStorageArea {
      data?: Record<string, any>;
    }
    interface SyncStorageArea {
      data?: Record<string, any>;
    }
  }

  var browser: typeof chrome | undefined;
}

describe('Browser API Compatibility Layer', () => {
  describe('Chrome Environment', () => {
    beforeEach(() => {
      clearAllBrowserMocks();
      setupChromeMocks();
      // Ensure browser is undefined for Chrome tests
      (globalThis as any).browser = undefined;
      jest.clearAllMocks();
    });

    afterEach(() => {
      clearAllBrowserMocks();
    });

    describe('storage.local', () => {
      it('should get items from local storage', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.local.get('key1');

        expect(result).toEqual({ key1: 'value1' });
        expect(chrome.storage.local.get).toHaveBeenCalledWith('key1', expect.any(Function));
      });

      it('should get multiple items from local storage', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2', key3: 'value3' };

        const result = await storage.local.get(['key1', 'key3']);

        expect(result).toEqual({ key1: 'value1', key3: 'value3' });
      });

      it('should get all items when keys is null', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.local.get(null);

        expect(result).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should set items in local storage', async () => {
        await storage.local.set({ key1: 'value1', key2: 'value2' });

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          { key1: 'value1', key2: 'value2' },
          expect.any(Function)
        );
        expect(chrome.storage.local.data).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should remove items from local storage', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2' };

        await storage.local.remove('key1');

        expect(chrome.storage.local.remove).toHaveBeenCalled();
      });

      it('should remove multiple items from local storage', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2', key3: 'value3' };

        await storage.local.remove(['key1', 'key3']);

        expect(chrome.storage.local.remove).toHaveBeenCalled();
      });

      it('should clear all items from local storage', async () => {
        chrome.storage.local.data = { key1: 'value1', key2: 'value2' };

        await storage.local.clear();

        expect(chrome.storage.local.clear).toHaveBeenCalled();
      });

      it('should handle chrome.runtime.lastError on get', async () => {
        (chrome.runtime as any).lastError = { message: 'Storage error' };
        (chrome.storage.local.get as any) = jest.fn((keys: any, callback: any) => {
          callback({});
        });

        await expect(storage.local.get('key1')).rejects.toThrow('Storage error');

        delete (chrome.runtime as any).lastError;
      });

      it('should handle chrome.runtime.lastError on set', async () => {
        (chrome.runtime as any).lastError = { message: 'Storage error' };
        (chrome.storage.local.set as any) = jest.fn((items: any, callback: any) => {
          callback();
        });

        await expect(storage.local.set({ key1: 'value1' })).rejects.toThrow('Storage error');

        delete (chrome.runtime as any).lastError;
      });
    });

    describe('storage.sync', () => {
      it('should get items from sync storage', async () => {
        chrome.storage.sync.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.sync.get('key1');

        expect(result).toEqual({ key1: 'value1' });
        expect(chrome.storage.sync.get).toHaveBeenCalledWith('key1', expect.any(Function));
      });

      it('should set items in sync storage', async () => {
        await storage.sync.set({ key1: 'value1', key2: 'value2' });

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(
          { key1: 'value1', key2: 'value2' },
          expect.any(Function)
        );
        expect(chrome.storage.sync.data).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should remove items from sync storage', async () => {
        chrome.storage.sync.data = { key1: 'value1', key2: 'value2' };

        await storage.sync.remove('key1');

        expect(chrome.storage.sync.remove).toHaveBeenCalled();
      });

      it('should clear all items from sync storage', async () => {
        chrome.storage.sync.data = { key1: 'value1', key2: 'value2' };

        await storage.sync.clear();

        expect(chrome.storage.sync.clear).toHaveBeenCalled();
      });
    });

    describe('runtime', () => {
      it('should send messages', async () => {
        const message = { type: 'test', data: 'hello' };

        const result = await runtime.sendMessage(message);

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message, expect.any(Function));
        expect(result).toEqual({ success: true });
      });

      it('should handle chrome.runtime.lastError on sendMessage', async () => {
        (chrome.runtime as any).lastError = { message: 'Message error' };
        (chrome.runtime.sendMessage as any) = jest.fn((message: any, callback: any) => {
          callback(null);
        });

        await expect(runtime.sendMessage({ type: 'test' })).rejects.toThrow('Message error');

        delete (chrome.runtime as any).lastError;
      });

      it('should add message listeners', () => {
        const callback = jest.fn();

        runtime.onMessage.addListener(callback);

        expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(callback);
      });

      it('should remove message listeners', () => {
        const callback = jest.fn();

        runtime.onMessage.removeListener(callback);

        expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(callback);
      });

      it('should return extension id', () => {
        const id = runtime.id;

        expect(id).toBe('mock-extension-id');
      });
    });

    describe('tabs', () => {
      it('should query tabs', async () => {
        const queryInfo = { active: true, currentWindow: true };

        const result = await tabs.query(queryInfo);

        expect(chrome.tabs.query).toHaveBeenCalledWith(queryInfo, expect.any(Function));
        expect(result).toEqual([
          {
            id: 1,
            url: 'https://console.aws.amazon.com/',
            active: true,
            windowId: 1
          }
        ]);
      });

      it('should send messages to tabs', async () => {
        const tabId = 1;
        const message = { type: 'test', data: 'hello' };

        const result = await tabs.sendMessage(tabId, message);

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message, expect.any(Function));
        expect(result).toEqual({ success: true });
      });

      it('should handle chrome.runtime.lastError on tabs.query', async () => {
        (chrome.runtime as any).lastError = { message: 'Tabs error' };
        (chrome.tabs.query as any) = jest.fn((queryInfo: any, callback: any) => {
          callback([]);
        });

        await expect(tabs.query({ active: true })).rejects.toThrow('Tabs error');

        delete (chrome.runtime as any).lastError;
      });

      it('should handle chrome.runtime.lastError on tabs.sendMessage', async () => {
        (chrome.runtime as any).lastError = { message: 'Message error' };
        (chrome.tabs.sendMessage as any) = jest.fn((tabId: any, message: any, callback: any) => {
          callback(null);
        });

        await expect(tabs.sendMessage(1, { type: 'test' })).rejects.toThrow('Message error');

        delete (chrome.runtime as any).lastError;
      });
    });

    describe('getBrowserType', () => {
      it('should return "chrome" for Chrome environment', () => {
        expect(getBrowserType()).toBe('chrome');
      });
    });
  });

  describe('Firefox Environment', () => {
    beforeEach(() => {
      clearAllBrowserMocks();
      setupFirefoxMocks();
      // Ensure chrome is undefined for Firefox tests
      (globalThis as any).chrome = undefined;
      jest.clearAllMocks();
    });

    afterEach(() => {
      clearAllBrowserMocks();
    });

    describe('storage.local', () => {
      it('should get items from local storage', async () => {
        browser!.storage.local.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.local.get('key1');

        expect(result).toEqual({ key1: 'value1' });
        expect(browser!.storage.local.get).toHaveBeenCalledWith('key1');
      });

      it('should get multiple items from local storage', async () => {
        browser!.storage.local.data = { key1: 'value1', key2: 'value2', key3: 'value3' };

        const result = await storage.local.get(['key1', 'key3']);

        expect(result).toEqual({ key1: 'value1', key3: 'value3' });
      });

      it('should get all items when keys is null', async () => {
        browser!.storage.local.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.local.get(null);

        expect(result).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should set items in local storage', async () => {
        await storage.local.set({ key1: 'value1', key2: 'value2' });

        expect(browser!.storage.local.set).toHaveBeenCalledWith({ key1: 'value1', key2: 'value2' });
        expect(browser!.storage.local.data).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should remove items from local storage', async () => {
        browser!.storage.local.data = { key1: 'value1', key2: 'value2' };

        await storage.local.remove('key1');

        expect(browser!.storage.local.remove).toHaveBeenCalled();
      });

      it('should clear all items from local storage', async () => {
        browser!.storage.local.data = { key1: 'value1', key2: 'value2' };

        await storage.local.clear();

        expect(browser!.storage.local.clear).toHaveBeenCalled();
      });
    });

    describe('storage.sync', () => {
      it('should get items from sync storage', async () => {
        browser!.storage.sync.data = { key1: 'value1', key2: 'value2' };

        const result = await storage.sync.get('key1');

        expect(result).toEqual({ key1: 'value1' });
        expect(browser!.storage.sync.get).toHaveBeenCalledWith('key1');
      });

      it('should set items in sync storage', async () => {
        await storage.sync.set({ key1: 'value1', key2: 'value2' });

        expect(browser!.storage.sync.set).toHaveBeenCalledWith({ key1: 'value1', key2: 'value2' });
        expect(browser!.storage.sync.data).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should remove items from sync storage', async () => {
        browser!.storage.sync.data = { key1: 'value1', key2: 'value2' };

        await storage.sync.remove('key1');

        expect(browser!.storage.sync.remove).toHaveBeenCalled();
      });

      it('should clear all items from sync storage', async () => {
        browser!.storage.sync.data = { key1: 'value1', key2: 'value2' };

        await storage.sync.clear();

        expect(browser!.storage.sync.clear).toHaveBeenCalled();
      });
    });

    describe('runtime', () => {
      it('should send messages', async () => {
        const message = { type: 'test', data: 'hello' };

        const result = await runtime.sendMessage(message);

        expect(browser!.runtime.sendMessage).toHaveBeenCalledWith(message);
        expect(result).toEqual({ success: true });
      });

      it('should add message listeners', () => {
        const callback = jest.fn();

        runtime.onMessage.addListener(callback);

        expect(browser!.runtime.onMessage.addListener).toHaveBeenCalledWith(callback);
      });

      it('should remove message listeners', () => {
        const callback = jest.fn();

        runtime.onMessage.removeListener(callback);

        expect(browser!.runtime.onMessage.removeListener).toHaveBeenCalledWith(callback);
      });

      it('should return extension id', () => {
        const id = runtime.id;

        expect(id).toBe('mock-extension-id@firefox');
      });
    });

    describe('tabs', () => {
      it('should query tabs', async () => {
        const queryInfo = { active: true, currentWindow: true };

        const result = await tabs.query(queryInfo);

        expect(browser!.tabs.query).toHaveBeenCalledWith(queryInfo);
        expect(result).toEqual([
          {
            id: 1,
            url: 'https://console.aws.amazon.com/',
            active: true,
            windowId: 1
          }
        ]);
      });

      it('should send messages to tabs', async () => {
        const tabId = 1;
        const message = { type: 'test', data: 'hello' };

        const result = await tabs.sendMessage(tabId, message);

        expect(browser!.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
        expect(result).toEqual({ success: true });
      });
    });

    describe('getBrowserType', () => {
      it('should return "firefox" for Firefox environment', () => {
        expect(getBrowserType()).toBe('firefox');
      });
    });
  });

  describe('Unknown Environment', () => {
    beforeEach(() => {
      clearAllBrowserMocks();
      (globalThis as any).chrome = undefined;
      (globalThis as any).browser = undefined;
    });

    afterEach(() => {
      clearAllBrowserMocks();
    });

    describe('getBrowserType', () => {
      it('should return "unknown" when neither chrome nor browser is defined', () => {
        expect(getBrowserType()).toBe('unknown');
      });
    });
  });
});
