/**
 * Mock implementations for Chrome APIs and DOM objects
 */

/**
 * Creates a mock chrome.storage API
 * @returns {Object} Mock chrome.storage object
 */
function mockChromeStorage() {
  const storage = {
    sync: {
      data: {},
      get: jest.fn((keys, callback) => {
        if (typeof keys === 'function') {
          callback = keys;
          keys = null;
        }
        
        let result;
        if (!keys) {
          result = { ...storage.sync.data };
        } else if (Array.isArray(keys)) {
          result = keys.reduce((acc, key) => {
            if (key in storage.sync.data) {
              acc[key] = storage.sync.data[key];
            }
            return acc;
          }, {});
        } else {
          result = Object.keys(keys).reduce((acc, key) => {
            acc[key] = storage.sync.data[key] ?? keys[key];
            return acc;
          }, {});
        }
        
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        Object.assign(storage.sync.data, items);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        storage.sync.data = {};
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    },
    local: {
      data: {},
      get: jest.fn((keys, callback) => {
        if (typeof keys === 'function') {
          callback = keys;
          keys = null;
        }
        
        let result;
        if (!keys) {
          result = { ...storage.local.data };
        } else if (Array.isArray(keys)) {
          result = keys.reduce((acc, key) => {
            if (key in storage.local.data) {
              acc[key] = storage.local.data[key];
            }
            return acc;
          }, {});
        } else {
          result = Object.keys(keys).reduce((acc, key) => {
            acc[key] = storage.local.data[key] ?? keys[key];
            return acc;
          }, {});
        }
        
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        Object.assign(storage.local.data, items);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        storage.local.data = {};
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  };

  return storage;
}

/**
 * Creates a mock chrome.runtime API
 * @returns {Object} Mock chrome.runtime object
 */
function mockChromeRuntime() {
  return {
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id'
  };
}

/**
 * Creates a mock localStorage implementation
 * @returns {Object} Mock localStorage object
 */
function mockLocalStorage() {
  const store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
}

/**
 * Creates a mock MutationObserver
 * @returns {Function} Mock MutationObserver constructor
 */
function mockMutationObserver() {
  const observers = [];
  
  const MockObserver = jest.fn(function(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    this.takeRecords = jest.fn(() => []);
    observers.push(this);
  });

  MockObserver.trigger = (mutations) => {
    observers.forEach(observer => {
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
 * @returns {Function} Mock Image constructor
 */
function mockImage() {
  return jest.fn(function() {
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
 * @returns {Function} Mock fetch function
 */
function mockFetch() {
  return jest.fn((url) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob())
    });
  });
}

/**
 * Sets up all Chrome API mocks on the global object
 */
function setupChromeMocks() {
  global.chrome = {
    storage: mockChromeStorage(),
    runtime: mockChromeRuntime()
  };
}

/**
 * Clears all Chrome API mocks
 */
function clearChromeMocks() {
  if (global.chrome) {
    if (global.chrome.storage) {
      global.chrome.storage.sync.clear();
      global.chrome.storage.local.clear();
    }
    jest.clearAllMocks();
  }
}

module.exports = {
  mockChromeStorage,
  mockChromeRuntime,
  mockLocalStorage,
  mockMutationObserver,
  mockImage,
  mockFetch,
  setupChromeMocks,
  clearChromeMocks
};
