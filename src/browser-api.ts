/**
 * Browser API abstraction layer for cross-browser compatibility
 *
 * This module provides a unified interface for Chrome, Firefox, and Safari extension APIs.
 * It handles the differences between chrome.* (callback-based) and browser.* (promise-based) APIs.
 */

// Re-export storage from browser-storage module
export { storage } from './browser-storage';

// Type declaration for Firefox's browser API
declare const browser: typeof chrome | undefined;

/**
 * Detects if the extension is running in Chrome (dynamic check)
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
 * Detects if the extension is running in Firefox (dynamic check)
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
 * Unified runtime API that works across Chrome, Firefox, and Safari
 */
export const runtime = {
  /**
   * Sends a message to other parts of the extension
   * @param message - Message to send
   * @returns Promise resolving to the response
   */
  sendMessage: (message: any): Promise<any> => {
    if (isFirefox()) {
      return browser!.runtime.sendMessage(message);
    }
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * Message listener API
   */
  onMessage: {
    /**
     * Adds a listener for incoming messages
     * @param callback - Function to call when a message is received
     */
    addListener: (
      callback: (
        message: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
      ) => void | boolean | Promise<any>
    ): void => {
      if (isFirefox()) {
        browser!.runtime.onMessage.addListener(callback);
      } else {
        chrome.runtime.onMessage.addListener(callback);
      }
    },

    /**
     * Removes a message listener
     * @param callback - The listener function to remove
     */
    removeListener: (callback: (...args: any[]) => any): void => {
      if (isFirefox()) {
        browser!.runtime.onMessage.removeListener(callback);
      } else {
        chrome.runtime.onMessage.removeListener(callback);
      }
    }
  },

  /**
   * Gets the extension ID
   * @returns Extension ID string
   */
  get id(): string {
    if (isFirefox()) {
      return browser!.runtime.id;
    }
    return chrome.runtime.id;
  }
};

/**
 * Unified tabs API that works across Chrome, Firefox, and Safari
 */
export const tabs = {
  /**
   * Queries for tabs matching the given criteria
   * @param queryInfo - Query criteria
   * @returns Promise resolving to array of matching tabs
   */
  query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
    if (isFirefox()) {
      return browser!.tabs.query(queryInfo);
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });
  },

  /**
   * Sends a message to a specific tab
   * @param tabId - ID of the tab to send message to
   * @param message - Message to send
   * @returns Promise resolving to the response
   */
  sendMessage: (tabId: number, message: any): Promise<any> => {
    if (isFirefox()) {
      return browser!.tabs.sendMessage(tabId, message);
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
};

/**
 * Gets the current browser type
 * @returns 'chrome', 'firefox', or 'unknown'
 */
export function getBrowserType(): 'chrome' | 'firefox' | 'unknown' {
  if (isChrome()) {
    return 'chrome';
  }
  if (isFirefox()) {
    return 'firefox';
  }
  return 'unknown';
}
