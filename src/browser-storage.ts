/**
 * Browser storage API abstraction layer
 *
 * Provides unified storage interface for Chrome, Firefox, and Safari
 */

// Type declaration for Firefox's browser API
declare const browser: typeof chrome | undefined;

/**
 * Detects if the extension is running in Chrome
 */
function isChrome(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome !== null &&
    chrome.runtime !== undefined &&
    typeof chrome.runtime.id !== 'undefined'
  );
}

/**
 * Detects if the extension is running in Firefox
 */
function isFirefox(): boolean {
  return (
    typeof browser !== 'undefined' &&
    browser !== undefined &&
    browser !== null &&
    browser.runtime !== undefined &&
    typeof browser.runtime.id !== 'undefined'
  );
}

/**
 * Unified storage API that works across Chrome, Firefox, and Safari
 */
export const storage = {
  /**
   * Local storage API
   */
  local: {
    /**
     * Retrieves items from local storage
     * @param keys - Key(s) to retrieve. Pass null to get all items.
     * @returns Promise resolving to an object with the requested items
     */
    get: (keys: string | string[] | null): Promise<Record<string, any>> => {
      if (isFirefox()) {
        return browser!.storage.local.get(keys);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    },

    /**
     * Stores items in local storage
     * @param items - Object with key-value pairs to store
     * @returns Promise that resolves when storage is complete
     */
    set: (items: Record<string, any>): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.local.set(items);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Removes items from local storage
     * @param keys - Key(s) to remove
     * @returns Promise that resolves when removal is complete
     */
    remove: (keys: string | string[]): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.local.remove(keys);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Clears all items from local storage
     * @returns Promise that resolves when storage is cleared
     */
    clear: (): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.local.clear();
      }
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  },

  /**
   * Sync storage API (synced across devices)
   */
  sync: {
    /**
     * Retrieves items from sync storage
     * @param keys - Key(s) to retrieve. Pass null to get all items.
     * @returns Promise resolving to an object with the requested items
     */
    get: (keys: string | string[] | null): Promise<Record<string, any>> => {
      if (isFirefox()) {
        return browser!.storage.sync.get(keys);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    },

    /**
     * Stores items in sync storage
     * @param items - Object with key-value pairs to store
     * @returns Promise that resolves when storage is complete
     */
    set: (items: Record<string, any>): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.sync.set(items);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Removes items from sync storage
     * @param keys - Key(s) to remove
     * @returns Promise that resolves when removal is complete
     */
    remove: (keys: string | string[]): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.sync.remove(keys);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    /**
     * Clears all items from sync storage
     * @returns Promise that resolves when storage is cleared
     */
    clear: (): Promise<void> => {
      if (isFirefox()) {
        return browser!.storage.sync.clear();
      }
      return new Promise((resolve, reject) => {
        chrome.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  }
};
