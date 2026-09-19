/**
 * Service Icon Resolution and Default Mapping
 *
 * Provides official baseline AWS CDN SVG icon URLs for all known AWS services,
 * with progressive enhancement when live/real-time icons are available from the DOM.
 */

import defaultIcons from './default-icons.json';

const DEFAULT_ICON_MAP: Record<string, string> = defaultIcons as Record<string, string>;

/**
 * Retrieves the official default CDN SVG icon URL for an AWS service.
 *
 * @param serviceId - Canonical AWS service ID (e.g., 's3', 'ec2', 'dynamodbv2')
 * @returns Official AWS CloudFront CDN SVG icon URL, or null if unknown
 */
export function getDefaultIconUrl(serviceId: string): string | null {
  if (!serviceId) {
    return null;
  }
  return DEFAULT_ICON_MAP[serviceId.toLowerCase()] || null;
}

/**
 * Resolves a service icon URL using progressive enhancement:
 * 1. Uses liveIconUrl if it is valid (starts with https:// or data:)
 * 2. Falls back to the official default AWS SVG icon from the baseline catalog
 * 3. Returns null if neither is available
 *
 * @param serviceId - Canonical AWS service ID
 * @param liveIconUrl - Real-time icon URL discovered from DOM/API
 * @returns Resolved icon URL, or null if unavailable
 */
export function resolveServiceIcon(
  serviceId: string,
  liveIconUrl: string | null | undefined
): string | null {
  if (
    liveIconUrl &&
    typeof liveIconUrl === 'string' &&
    (liveIconUrl.startsWith('https://') || liveIconUrl.startsWith('data:'))
  ) {
    return liveIconUrl;
  }

  return getDefaultIconUrl(serviceId);
}
