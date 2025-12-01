/**
 * Mock implementations for Chrome APIs and DOM objects
 */

type ChromeStorageCallback = (result: any) => void;
type ChromeStorageKeys = string | string[] | Record<string, any> | null;

interface MockStorageArea {
  data: Record<string, any>;
  get: jest.Mock;
  set: jest.Mock;
  remove: jest.Mock;
  clear: jest.Mock;
}

/**
 * Creates a mock chrome.storage API
 * @returns Mock chrome.storage object
 */
export function mockChromeStorage() {
  const storage = {
    sync: createChromeStorageArea(),
    local: createChromeStorageArea()
  };

  return storage;
}

function createChromeStorageArea(): MockStorageArea {
  const storageArea: MockStorageArea = {
    data: {},
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn()
  };

  // Use the data property directly so tests can modify it
  storageArea.get = jest.fn(
    (keys: ChromeStorageKeys | ChromeStorageCallback, callback?: ChromeStorageCallback) => {
      if (typeof keys === 'function') {
        callback = keys;
        keys = null;
      }

      let result: Record<string, any>;
      if (!keys) {
        result = { ...storageArea.data };
      } else if (typeof keys === 'string') {
        result = keys in storageArea.data ? { [keys]: storageArea.data[keys] } : {};
      } else if (Array.isArray(keys)) {
        result = keys.reduce(
          (acc, key) => {
            if (key in storageArea.data) {
              acc[key] = storageArea.data[key];
            }
            return acc;
          },
          {} as Record<string, any>
        );
      } else if (typeof keys === 'object') {
        result = Object.keys(keys).reduce(
          (acc, key) => {
            acc[key] = storageArea.data[key] ?? keys[key];
            return acc;
          },
          {} as Record<string, any>
        );
      } else {
        result = {};
      }

      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    }
  );

  storageArea.set = jest.fn((items: Record<string, any>, callback?: () => void) => {
    Object.assign(storageArea.data, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  storageArea.remove = jest.fn((keys: string | string[], callback?: () => void) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach((key) => {
      delete storageArea.data[key];
    });
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  storageArea.clear = jest.fn((callback?: () => void) => {
    Object.keys(storageArea.data).forEach((key) => delete storageArea.data[key]);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  return storageArea;
}

/**
 * Creates a mock chrome.runtime API
 * @returns Mock chrome.runtime object
 */
export function mockChromeRuntime() {
  return {
    sendMessage: jest.fn((message: any, callback?: (response: any) => void) => {
      const response = { success: true };
      if (callback) {
        callback(response);
      }
      return Promise.resolve(response);
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id'
  };
}

/**
 * Creates a mock localStorage implementation
 * @returns Mock localStorage object
 */
export function mockLocalStorage(): Storage {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  } as Storage;
}

/**
 * Creates a mock MutationObserver
 * @returns Mock MutationObserver constructor
 */
export function mockMutationObserver() {
  const observers: any[] = [];

  const MockObserver = jest.fn(function (this: any, callback: MutationCallback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    this.takeRecords = jest.fn(() => []);
    observers.push(this);
  }) as any;

  MockObserver.trigger = (mutations: MutationRecord[]) => {
    observers.forEach((observer) => {
      if (observer.callback) {
        observer.callback(mutations, observer);
      }
    });
  };

  MockObserver.instances = observers;

  return MockObserver;
}

/**
 * Creates a mock Image constructor
 * @returns Mock Image constructor
 */
export function mockImage() {
  return jest.fn(function (this: any) {
    this.src = '';
    this.onload = null;
    this.onerror = null;

    // Simulate successful image load after a short delay
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  });
}

/**
 * Creates a mock fetch API
 * @returns Mock fetch function
 */
export function mockFetch() {
  return jest.fn((url: string) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob())
    } as Response);
  });
}

/**
 * Creates a mock browser.storage API (Firefox-style, Promise-based)
 * @returns Mock browser.storage object
 */
export function mockBrowserStorage() {
  const storage = {
    sync: createBrowserStorageArea(),
    local: createBrowserStorageArea()
  };

  return storage;
}

function createBrowserStorageArea() {
  const storageArea = {
    data: {} as Record<string, any>,
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn()
  };

  // Use the data property directly so tests can modify it
  storageArea.get = jest.fn((keys?: string | string[] | Record<string, any> | null) => {
    let result: Record<string, any>;
    if (!keys) {
      result = { ...storageArea.data };
    } else if (Array.isArray(keys)) {
      result = keys.reduce(
        (acc, key) => {
          if (key in storageArea.data) {
            acc[key] = storageArea.data[key];
          }
          return acc;
        },
        {} as Record<string, any>
      );
    } else if (typeof keys === 'object') {
      result = Object.keys(keys).reduce(
        (acc, key) => {
          acc[key] = storageArea.data[key] ?? keys[key];
          return acc;
        },
        {} as Record<string, any>
      );
    } else if (typeof keys === 'string') {
      result = keys in storageArea.data ? { [keys]: storageArea.data[keys] } : {};
    } else {
      result = {};
    }
    return Promise.resolve(result);
  });

  storageArea.set = jest.fn((items: Record<string, any>) => {
    Object.assign(storageArea.data, items);
    return Promise.resolve();
  });

  storageArea.remove = jest.fn((keys: string | string[]) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach((key) => {
      delete storageArea.data[key];
    });
    return Promise.resolve();
  });

  storageArea.clear = jest.fn(() => {
    Object.keys(storageArea.data).forEach((key) => delete storageArea.data[key]);
    return Promise.resolve();
  });

  return storageArea;
}

/**
 * Creates a mock browser.runtime API (Firefox-style, Promise-based)
 * @returns Mock browser.runtime object
 */
export function mockBrowserRuntime() {
  return {
    sendMessage: jest.fn((message: any) => {
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path: string) => `moz-extension://mock-id/${path}`),
    id: 'mock-extension-id@firefox'
  };
}

/**
 * Creates a mock browser.tabs API (Firefox-style, Promise-based)
 * @returns Mock browser.tabs object
 */
export function mockBrowserTabs() {
  return {
    query: jest.fn((queryInfo: any) => {
      return Promise.resolve([
        {
          id: 1,
          url: 'https://console.aws.amazon.com/',
          active: true,
          windowId: 1
        }
      ]);
    }),
    sendMessage: jest.fn((tabId: number, message: any) => {
      return Promise.resolve({ success: true });
    }),
    get: jest.fn((tabId: number) => {
      return Promise.resolve({
        id: tabId,
        url: 'https://console.aws.amazon.com/',
        active: true,
        windowId: 1
      });
    })
  };
}

/**
 * Creates a mock chrome.tabs API (Chrome-style, callback-based)
 * @returns Mock chrome.tabs object
 */
export function mockChromeTabs() {
  return {
    query: jest.fn((queryInfo: any, callback?: (result: any[]) => void) => {
      const result = [
        {
          id: 1,
          url: 'https://console.aws.amazon.com/',
          active: true,
          windowId: 1
        }
      ];
      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    }),
    sendMessage: jest.fn((tabId: number, message: any, callback?: (response: any) => void) => {
      const result = { success: true };
      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    }),
    get: jest.fn((tabId: number, callback?: (tab: any) => void) => {
      const result = {
        id: tabId,
        url: 'https://console.aws.amazon.com/',
        active: true,
        windowId: 1
      };
      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    })
  };
}

/**
 * Sets up all Chrome API mocks on the global object
 */
export function setupChromeMocks(): void {
  (global as any).chrome = {
    storage: mockChromeStorage(),
    runtime: mockChromeRuntime(),
    tabs: mockChromeTabs()
  };
}

/**
 * Sets up all Firefox (browser) API mocks on the global object
 */
export function setupFirefoxMocks(): void {
  (global as any).browser = {
    storage: mockBrowserStorage(),
    runtime: mockBrowserRuntime(),
    tabs: mockBrowserTabs()
  };
}

/**
 * Clears all Chrome API mocks
 */
export function clearChromeMocks(): void {
  if ((global as any).chrome) {
    if ((global as any).chrome.storage) {
      (global as any).chrome.storage.sync.clear();
      (global as any).chrome.storage.local.clear();
    }
    jest.clearAllMocks();
  }
}

/**
 * Clears all Firefox (browser) API mocks
 */
export function clearFirefoxMocks(): void {
  if ((global as any).browser) {
    if ((global as any).browser.storage) {
      (global as any).browser.storage.sync.clear();
      (global as any).browser.storage.local.clear();
    }
    jest.clearAllMocks();
  }
}

/**
 * Clears all browser API mocks (both Chrome and Firefox)
 */
export function clearAllBrowserMocks(): void {
  clearChromeMocks();
  clearFirefoxMocks();
  delete (global as any).chrome;
  delete (global as any).browser;
}
