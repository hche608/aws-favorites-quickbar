/**
 * Recently Visited widget parser
 *
 * Parses AWS services from the Recently Visited widget on the AWS Console homepage.
 */

import { Service } from '../types';

interface ServiceWithSource extends Service {
  source?: 'user' | 'recent';
}

/**
 * Waits for the Recently Visited widget to appear and be fully loaded
 *
 * @param timeout - Maximum wait time in milliseconds (default: 10000)
 * @returns Promise resolving to true if widget loaded, false if timeout
 */
export async function waitForRecentlyVisitedWidget(timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const MIN_ITEMS = 3;

    const isWidgetFullyLoaded = (): boolean => {
      const widget = document.querySelector('[data-widget-type="recently-visited"]');
      const ariaLabel = widget?.querySelector('[aria-label="Recently visited"]');
      if (!ariaLabel) {
        return false;
      }
      return ariaLabel.querySelectorAll('[class*="listItem-"]').length >= MIN_ITEMS;
    };

    if (isWidgetFullyLoaded()) {
      resolve(true);
      return;
    }

    let lastItemCount = 0;
    let stabilityCheckTimeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      if (isWidgetFullyLoaded()) {
        const widget = document.querySelector('[data-widget-type="recently-visited"]');
        const ariaLabel = widget?.querySelector('[aria-label="Recently visited"]');
        const currentItemCount = ariaLabel?.querySelectorAll('[class*="listItem-"]').length ?? 0;

        if (currentItemCount !== lastItemCount) {
          lastItemCount = currentItemCount;
          if (stabilityCheckTimeout) {
            clearTimeout(stabilityCheckTimeout);
          }
          stabilityCheckTimeout = setTimeout(() => {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }, 500);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-widget-type', 'aria-label', 'class']
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      if (stabilityCheckTimeout) {
        clearTimeout(stabilityCheckTimeout);
      }

      const widget = document.querySelector('[data-widget-type="recently-visited"]');
      const ariaLabel = widget?.querySelector('[aria-label="Recently visited"]');
      if (ariaLabel && ariaLabel.querySelectorAll('[class*="listItem-"]').length > 0) {
        resolve(true);
        return;
      }
      resolve(false);
    }, timeout);
  });
}

/**
 * Parses recently visited services from the AWS Console widget
 */
export async function parseRecentlyVisited(): Promise<Service[]> {
  try {
    const widgetContainer = document.querySelector('[data-widget-type="recently-visited"]');
    if (!widgetContainer) {
      return [];
    }

    const politeRegion = widgetContainer.querySelector('[data-testid="polite"]');
    if (!politeRegion) {
      const ariaLabel = widgetContainer.querySelector('[aria-label="Recently visited"]');
      return ariaLabel ? extractServicesFromContainer(ariaLabel) : [];
    }

    let recentlyVisitedSection: Element | null = null;
    for (let i = 0; i < 10; i++) {
      recentlyVisitedSection = politeRegion.querySelector('[aria-label="Recently visited"]');
      if (recentlyVisitedSection) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!recentlyVisitedSection) {
      return [];
    }
    return extractServicesFromContainer(recentlyVisitedSection);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error parsing Recently Visited', error);
    return [];
  }
}

/**
 * Extracts services from a container element
 */
function extractServicesFromContainer(container: Element): Service[] {
  const services: Service[] = [];
  try {
    const allElements = container.querySelectorAll(
      '[class*="listItem-"], [class*="wrapper-"], [class*="itemWrapper"]'
    );

    if (allElements.length === 0) {
      const links = container.querySelectorAll<HTMLAnchorElement>('a[href]');
      for (const link of links) {
        const service = extractServiceFromLink(link);
        if (service) {
          services.push(service);
        }
      }
      return services;
    }

    for (const item of allElements) {
      try {
        const link = item.querySelector<HTMLAnchorElement>('a[href]');
        if (!link) {
          continue;
        }
        const img = item.querySelector<HTMLImageElement>('img');
        const service = extractServiceFromLink(link, img?.src || null);
        if (service) {
          services.push(service);
        }
      } catch (_error) {
        // Skip malformed item
      }
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error extracting services', error);
  }
  return services;
}

/**
 * Extracts service information from a link element
 */
function extractServiceFromLink(
  link: HTMLAnchorElement,
  iconUrl: string | null = null
): ServiceWithSource | null {
  try {
    let url = link.href;
    if (!url || typeof url !== 'string') {
      return null;
    }

    if (url.startsWith('/')) {
      url = `https://${window.location.hostname}${url}`;
    }

    const urlObj = new URL(url);
    const homeMatch = urlObj.pathname.match(/\/([^\/]+)\/home/);
    if (!homeMatch) {
      return null;
    }

    const serviceId = homeMatch[1];
    const name = link.textContent?.trim() || serviceId;

    if (!iconUrl) {
      const img =
        link.querySelector<HTMLImageElement>('img') ||
        link
          .closest('[class*="wrapper"], [class*="listItem"], li, div')
          ?.querySelector<HTMLImageElement>('img');
      if (img?.src) {
        iconUrl = img.src;
      }
    }

    return {
      id: serviceId,
      name: name,
      iconUrl: iconUrl || null,
      consoleUrl: url,
      source: 'recent'
    };
  } catch (_error) {
    return null;
  }
}
