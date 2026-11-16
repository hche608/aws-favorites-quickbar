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
