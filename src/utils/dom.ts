/**
 * DOM utilities for AWS Console interaction
 *
 * This module provides utilities for waiting for DOM elements and detecting AWS Console pages.
 */

/**
 * Waits for the DOM to be ready
 * @returns Promise that resolves when DOM is ready
 */
export async function waitForDOMReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Waits for an element matching any of the provided selectors to appear in the DOM
 * Uses MutationObserver for efficient detection
 * @param selectors - Array of CSS selectors to search for
 * @param timeout - Maximum wait time in milliseconds (default: 5000)
 * @param debugName - Optional name for debug logging
 * @returns Promise that resolves with the element or null if timeout is reached
 */
export async function waitForElement(
  selectors: string[],
  timeout: number = 5000,
  debugName?: string
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (debugName) {
          console.log(`AWS Favorites Quickbar: Found ${debugName} using selector: ${selector}`);
        }
        resolve(element as HTMLElement);
        return;
      }
    }

    const observer = new MutationObserver(() => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          if (debugName) {
            console.log(`AWS Favorites Quickbar: Found ${debugName} using selector: ${selector}`);
          }
          resolve(element as HTMLElement);
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Location accessors — exported individually for testability.
 * In Jest 30 jsdom, window.location is locked and cannot be redefined.
 * Tests mock these functions via jest.spyOn on the module.
 */
export const location = {
  getHostname(): string {
    return window.location.hostname;
  },
  getPathname(): string {
    return window.location.pathname;
  }
};

/**
 * Checks if the current page is an AWS Console page
 * @returns true if on AWS Console page
 */
export function isAWSConsolePage(): boolean {
  return location.getHostname().includes('console.aws.amazon.com');
}

/**
 * Checks if the current page is the AWS Console homepage
 * @returns true if on AWS Console homepage
 */
export function isAWSConsoleHomepage(): boolean {
  const pathname = location.getPathname();
  return pathname === '/' || pathname === '/console/home';
}
