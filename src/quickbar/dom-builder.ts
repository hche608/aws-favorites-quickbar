/**
 * DOM builder - creates service link elements
 *
 * This module creates DOM elements for AWS service links that match
 * the native AWS Console favorites styling.
 */

import { Service, AWSFavoriteClasses } from '../types';

/**
 * Default icon URL used when service icon is unavailable
 */
const DEFAULT_ICON_URL =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23232F3E"/></svg>';

/**
 * Default CSS classes used when native classes cannot be extracted
 */
const DEFAULT_CSS_CLASSES: AWSFavoriteClasses = {
  li: 'globalNav-1283',
  anchor: 'globalNav-1215 globalNav-1284 globalNav-1285',
  mainContainer: 'globalNav-1286',
  iconWrapper: 'globalNav-1290 globalNav-1288 globalNav-1289',
  icon: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289',
  label: 'globalNav-12107 globalNav-1287'
};

/**
 * Creates a service link element for the quickbar
 * Builds a complete DOM structure matching AWS Console's native favorites
 * @param service - Service data including id, name, iconUrl, and consoleUrl
 * @param classes - CSS classes to apply (uses defaults if not provided)
 * @returns HTMLElement representing the service link, or null if service is invalid
 */
export function createServiceLink(
  service: Service,
  classes: AWSFavoriteClasses | null = null
): HTMLElement | null {
  if (!service || !service.id) {
    return null;
  }

  const serviceId = service.id;
  const serviceName = service.name || serviceId.toUpperCase();
  const serviceUrl = service.consoleUrl || `https://console.aws.amazon.com/${serviceId}/home`;
  const serviceIcon = service.iconUrl || DEFAULT_ICON_URL;

  const cssClasses = classes || DEFAULT_CSS_CLASSES;

  const li = document.createElement('li');
  li.className = cssClasses.li;
  li.setAttribute('data-service-id', serviceId);
  li.setAttribute('data-source', service.source || 'user');

  const outerDiv = document.createElement('div');
  const innerDiv = document.createElement('div');

  const anchor = document.createElement('a');
  anchor.href = serviceUrl;
  anchor.className = cssClasses.anchor;
  anchor.target = '_top';
  anchor.setAttribute('aria-disabled', 'false');
  anchor.setAttribute('role', 'button');
  anchor.setAttribute('data-testid', `awsc-nav-favorites-bar-${serviceId}`);
  anchor.setAttribute('tabindex', '0');

  const mainContainer = document.createElement('div');
  mainContainer.className = cssClasses.mainContainer;

  const iconWrapper = document.createElement('div');
  iconWrapper.className = cssClasses.iconWrapper;

  const icon = document.createElement('img');
  icon.src = serviceIcon;
  icon.alt = '';
  icon.className = cssClasses.icon;
  icon.loading = 'lazy';
  icon.title = serviceName;
  icon.width = 20;
  icon.height = 20;

  icon.onerror = function () {
    this.src = DEFAULT_ICON_URL;
    this.onerror = null;
  };

  iconWrapper.appendChild(icon);

  const label = document.createElement('span');
  label.className = cssClasses.label;
  label.textContent = serviceName;

  mainContainer.appendChild(iconWrapper);
  mainContainer.appendChild(label);
  anchor.appendChild(mainContainer);
  innerDiv.appendChild(anchor);
  outerDiv.appendChild(innerDiv);
  li.appendChild(outerDiv);

  return li;
}
