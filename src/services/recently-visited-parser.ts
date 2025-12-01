/**
 * Recently Visited widget parser
 *
 * This module provides functionality to parse AWS services from the Recently Visited
 * widget on the AWS Console homepage.
 */

import { Service } from '../types';

/**
 * Extended Service interface with source information
 */
interface ServiceWithSource extends Service {
  /** Source of the service data */
  source?: 'user' | 'recent';
}

/**
 * Waits for the Recently Visited widget to appear and be fully loaded
 *
 * This function monitors the DOM for the Recently Visited widget and waits until
 * it contains at least 3 items and has stabilized (no new items appearing).
 *
 * @param timeout - Maximum wait time in milliseconds (default: 10000)
 * @returns Promise resolving to true if widget loaded, false if timeout
 *
 * @example
 * const loaded = await waitForRecentlyVisitedWidget(5000);
 * if (loaded) {
 *   const services = await parseRecentlyVisited();
 * }
 */
export async function waitForRecentlyVisitedWidget(timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const MIN_ITEMS = 3;

    const isWidgetFullyLoaded = (): boolean => {
      const widget = document.querySelector('[data-widget-type="recently-visited"]');
      if (!widget) {
        return false;
      }

      const ariaLabel = widget.querySelector('[aria-label="Recently visited"]');
      if (!ariaLabel) {
        return false;
      }

      const listItems = ariaLabel.querySelectorAll('[class*="listItem-"]');
      return listItems.length >= MIN_ITEMS;
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
        const ariaLabel = widget!.querySelector('[aria-label="Recently visited"]');
        const currentItemCount = ariaLabel!.querySelectorAll('[class*="listItem-"]').length;

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
      if (widget) {
        const ariaLabel = widget.querySelector('[aria-label="Recently visited"]');
        if (ariaLabel) {
          const itemCount = ariaLabel.querySelectorAll('[class*="listItem-"]').length;
          if (itemCount > 0) {
            resolve(true);
            return;
          }
        }
      }

      resolve(false);
    }, timeout);
  });
}

/**
 * Parses recently visited services from the AWS Console widget
 *
 * This function extracts service information from the Recently Visited widget,
 * including service IDs, names, icons, and console URLs.
 *
 * @returns Promise resolving to array of Service objects
 *
 * @example
 * const services = await parseRecentlyVisited();
 * // Returns: [{ id: 'ec2', name: 'EC2', iconUrl: '...', consoleUrl: '...' }, ...]
 */
export async function parseRecentlyVisited(): Promise<Service[]> {
  try {
    const widgetContainer = document.querySelector('[data-widget-type="recently-visited"]');
    if (!widgetContainer) {
      return [];
    }

    const politeRegion = widgetContainer.querySelector('[data-testid="polite"]');

    if (!politeRegion) {
      const ariaLabelContainer = widgetContainer.querySelector('[aria-label="Recently visited"]');
      if (!ariaLabelContainer) {
        return [];
      }
      return extractServicesFromContainer(ariaLabelContainer);
    }

    let recentlyVisitedSection: Element | null = null;
    const maxRetries = 10;
    const retryDelay = 500;

    for (let i = 0; i < maxRetries; i++) {
      recentlyVisitedSection = politeRegion.querySelector('[aria-label="Recently visited"]');
      if (recentlyVisitedSection) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
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
 *
 * This function searches a container for service links and extracts service information
 * from each link, including icons if available.
 *
 * @param container - Container element to search
 * @returns Array of Service objects
 */
function extractServicesFromContainer(container: Element): Service[] {
  const services: Service[] = [];

  try {
    const allElements = container.querySelectorAll('[class*="listItem-"]');

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

        let iconUrl: string | null = null;
        const img = item.querySelector<HTMLImageElement>('img');
        if (img && img.src) {
          iconUrl = img.src;
        }

        const service = extractServiceFromLink(link, iconUrl);
        if (service) {
          services.push(service);
        }
      } catch (_error) {
        // Continue with other items
      }
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error extracting services', error);
  }

  return services;
}

/**
 * Extracts service information from a link element
 *
 * This function parses a link to extract the service ID, name, icon URL, and console URL.
 * It handles both subdomain-based and path-based service identification.
 *
 * @param link - Link element to parse
 * @param iconUrl - Optional icon URL if already extracted
 * @returns Service object or null if extraction fails
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

    // Handle relative URLs
    if (url.startsWith('/')) {
      url = `https://${window.location.hostname}${url}`;
    }

    let serviceId: string | null = null;
    const urlObj = new URL(url);

    // Try to extract service ID from hostname
    const hostname = urlObj.hostname;
    const hostnameMatch = hostname.match(/^([^.]+)\.console\.aws\.amazon\.com$/);
    if (hostnameMatch) {
      const subdomain = hostnameMatch[1];
      // Skip region subdomains (e.g., us-east-1)
      if (!subdomain.match(/^[a-z]{2}-[a-z]+-\d+$/)) {
        serviceId = subdomain;
      }
    }

    // Fallback: extract from path
    if (!serviceId) {
      const pathMatch = urlObj.pathname.match(/^\/([^\/]+)/);
      if (pathMatch) {
        serviceId = pathMatch[1];
      }
    }

    if (!serviceId) {
      return null;
    }

    const name = link.textContent?.trim() || serviceId;

    // Extract icon if not provided
    if (!iconUrl) {
      const img = link.querySelector<HTMLImageElement>('img');
      if (img && img.src) {
        iconUrl = img.src;
      }
    }

    return {
      id: serviceId,
      name: name,
      iconUrl: iconUrl || '',
      consoleUrl: url,
      source: 'recent'
    };
  } catch (_error) {
    return null;
  }
}
