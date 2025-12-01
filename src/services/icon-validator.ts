/**
 * Icon URL validation
 *
 * This module provides functionality to validate icon URLs by checking their format,
 * length, and ability to load as images.
 */

import { Service } from '../types';

/**
 * Validates if a URL is a valid icon URL
 *
 * This function checks if a URL is valid for use as a service icon by:
 * - Verifying it's a non-empty string
 * - Checking minimum length requirements
 * - For data URLs: validating format and length
 * - For HTTPS URLs: attempting to load the image and verifying dimensions
 *
 * @param url - URL to validate
 * @returns Promise resolving to true if URL is valid for use as icon
 *
 * @example
 * const isValid = await isValidIconUrl('https://example.com/icon.png');
 * if (isValid) {
 *   // Use the icon URL
 * }
 */
export async function isValidIconUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const MIN_URL_LENGTH = 20;
  if (url.length < MIN_URL_LENGTH) {
    return false;
  }

  try {
    // Handle data URLs
    if (url.startsWith('data:image/')) {
      return url.length > 50;
    }

    // Handle HTTPS URLs
    if (url.startsWith('https://')) {
      new URL(url); // Validate URL format

      return new Promise<boolean>((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          img.src = '';
          resolve(false);
        }, 3000);

        img.onload = () => {
          clearTimeout(timeout);
          resolve(img.width > 0 && img.height > 0);
        };

        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        img.src = url;
      });
    }

    return false;
  } catch (_error) {
    return false;
  }
}

/**
 * Updates service icons with new icon URLs from the icon map
 *
 * This function takes an array of services and an icon map, and updates each service's
 * icon URL if a new valid icon is found in the map. Only updates icons that pass validation.
 *
 * @param services - Array of services to update
 * @param iconMap - Map of service IDs to new icon URLs
 * @returns Promise resolving to array of services with updated icons
 *
 * @example
 * const iconMap = { 'ec2': 'https://new-icon-url.com/ec2.png' };
 * const updated = await updateServiceIcons(services, iconMap);
 */
export async function updateServiceIcons(
  services: Service[],
  iconMap: Record<string, string>
): Promise<Service[]> {
  const updated = await Promise.all(
    services.map(async (service) => {
      const newIconUrl = iconMap[service.id.toLowerCase()];

      if (newIconUrl && newIconUrl !== service.iconUrl) {
        const isValid = await isValidIconUrl(newIconUrl);
        if (isValid) {
          return { ...service, iconUrl: newIconUrl };
        }
      }
      return service;
    })
  );
  return updated;
}
