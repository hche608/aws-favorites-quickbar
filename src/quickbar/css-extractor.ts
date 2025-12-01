/**
 * CSS class extraction from native AWS favorites
 *
 * This module extracts CSS class names from the native AWS Console favorites
 * to ensure our injected favorites match the native styling.
 */

import { AWSFavoriteClasses } from '../types';

/**
 * Extracts CSS class names from native AWS favorite items
 * Analyzes the DOM structure of existing favorites to get the correct classes
 * @returns Object containing CSS class names, or null if no native favorites found
 */
export function extractAWSFavoriteClasses(): AWSFavoriteClasses | null {
  const quickbar = document.querySelector(
    'ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]'
  );
  if (!quickbar) {
    return null;
  }

  const existingItems = quickbar.querySelectorAll('li:not([data-source])');
  if (existingItems.length === 0) {
    return null;
  }

  const existingItem = existingItems[0] as HTMLElement;
  const anchor = existingItem.querySelector('a') as HTMLAnchorElement | null;
  const mainContainer = anchor?.querySelector('div') as HTMLElement | null;
  const iconWrapper = mainContainer?.querySelector('div') as HTMLElement | null;
  const icon = iconWrapper?.querySelector('img') as HTMLImageElement | null;
  const label = mainContainer?.querySelector(':scope > span') as HTMLElement | null;

  if (!anchor || !mainContainer || !iconWrapper || !icon || !label) {
    return null;
  }

  return {
    li: existingItem.className,
    anchor: anchor.className,
    mainContainer: mainContainer.className,
    iconWrapper: iconWrapper.className,
    icon: icon.className,
    label: label.className
  };
}

/**
 * Waits for native AWS favorites to load and extracts their CSS classes
 * Uses MutationObserver to detect when favorites are added to the DOM
 * @param quickbar - The quickbar element to observe
 * @param timeout - Maximum wait time in milliseconds (default: 3000)
 * @returns Promise that resolves with CSS classes or null if timeout is reached
 */
export async function waitForNativeFavorites(
  quickbar: HTMLElement,
  timeout: number = 3000
): Promise<AWSFavoriteClasses | null> {
  return new Promise((resolve) => {
    const cssClasses = extractAWSFavoriteClasses();
    if (cssClasses) {
      resolve(cssClasses);
      return;
    }

    const observer = new MutationObserver(() => {
      const classes = extractAWSFavoriteClasses();
      if (classes) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(classes);
      }
    });

    observer.observe(quickbar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
