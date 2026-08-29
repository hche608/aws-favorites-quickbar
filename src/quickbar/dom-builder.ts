/**
 * DOM builder - creates service link elements
 *
 * This module creates DOM elements for AWS service links that match
 * the native AWS Console favorites styling.
 *
 * CSS classes are ALWAYS provided by the caller (extracted from the first native
 * pinned service). This module never hardcodes CSS class names.
 */

import { Service, AWSFavoriteClasses, PLACEHOLDER_ICON_URL } from '../types';

/**
 * Creates a service link element for the quickbar.
 *
 * Builds a complete DOM structure matching AWS Console's native favorites.
 * The CSS classes parameter is required — if no classes are available,
 * the caller should not call this function.
 *
 * @param service - Service data including id, name, iconUrl, and consoleUrl
 * @param classes - CSS classes extracted from native AWS favorites (required)
 * @returns HTMLElement representing the service link, or null if service is invalid
 */
export function createServiceLink(
  service: Service,
  classes: AWSFavoriteClasses
): HTMLElement | null {
  if (!service || !service.id) {
    return null;
  }

  const serviceId = service.id;
  const serviceName = service.name || serviceId.toUpperCase();
  const serviceUrl = service.consoleUrl || `https://console.aws.amazon.com/${serviceId}/home`;
  const serviceIcon = service.iconUrl || PLACEHOLDER_ICON_URL;

  const li = document.createElement('li');
  li.className = classes.li;
  li.setAttribute('data-service-id', serviceId);
  li.setAttribute('data-source', service.source || 'user');

  const outerDiv = document.createElement('div');
  const innerDiv = document.createElement('div');

  const anchor = document.createElement('a');
  anchor.href = serviceUrl;
  anchor.className = classes.anchor;
  anchor.target = '_top';
  anchor.setAttribute('aria-disabled', 'false');
  anchor.setAttribute('role', 'button');
  anchor.setAttribute('data-testid', `awsc-nav-favorites-bar-${serviceId}`);
  anchor.setAttribute('tabindex', '0');

  const mainContainer = document.createElement('div');
  mainContainer.className = classes.mainContainer;

  const iconWrapper = document.createElement('div');
  iconWrapper.className = classes.iconWrapper;

  const icon = document.createElement('img');
  icon.src = serviceIcon;
  icon.alt = '';
  icon.className = classes.icon;
  icon.loading = 'lazy';
  icon.title = serviceName;
  icon.width = 20;
  icon.height = 20;

  icon.onerror = function () {
    this.src = PLACEHOLDER_ICON_URL;
    this.onerror = null;
  };

  iconWrapper.appendChild(icon);

  const label = document.createElement('span');
  label.className = classes.label;
  label.textContent = serviceName;

  mainContainer.appendChild(iconWrapper);
  mainContainer.appendChild(label);
  anchor.appendChild(mainContainer);
  innerDiv.appendChild(anchor);
  outerDiv.appendChild(innerDiv);
  li.appendChild(outerDiv);

  return li;
}
