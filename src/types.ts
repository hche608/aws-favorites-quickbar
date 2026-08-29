/**
 * Shared type definitions for AWS Favorites Quickbar
 *
 * This module contains all shared interfaces and types used across the extension.
 */

/**
 * Represents an AWS service with metadata for display and navigation
 */
export interface Service {
  /** Unique service identifier (e.g., 'ec2', 'rds') */
  id: string;
  /** Display name of the service (e.g., 'EC2', 'RDS') */
  name: string;
  /** URL to the service icon from AWS CDN */
  iconUrl: string | null;
  /** URL to the service console page */
  consoleUrl: string;
  /** Source of the service: 'user' for user favorites, 'recent' for recently visited */
  source?: 'user' | 'recent';
}

/**
 * Visual mode controls light/dark theme across all AWS accounts.
 * User preference overrides per-account AWS Console theme setting.
 */
export type VisualMode = 'light' | 'dark';

/**
 * Storage structure for user-configured favorite services
 */
export interface UserFavorites {
  /** Array of service IDs in user-specified order */
  services: string[];
}

/**
 * Storage structure for maximum services configuration
 */
export interface MaxServicesConfig {
  /** Maximum number of services to display in quickbar */
  maxServices: number;
}

/**
 * Complete storage data structure
 */
export interface StorageData {
  /** User-configured favorite services */
  userFavorites?: UserFavorites;
  /** Maximum services configuration */
  maxServicesConfig?: MaxServicesConfig;
  /** Visual mode preference (light/dark) */
  visualMode?: VisualMode;
}

/**
 * Default values for first-launch initialization.
 * These are used ONLY when storage is empty (first launch).
 * They are NEVER used to override existing stored values.
 */
export const STORAGE_DEFAULTS = {
  userFavorites: [] as string[],
  maxServices: 10,
  visualMode: 'light' as VisualMode
} as const;

/**
 * AWS region identifier (e.g., 'us-east-1', 'eu-west-1')
 */
export type AWSRegion = string;

/**
 * CSS class names extracted from AWS Console for styling favorite items.
 * These are dynamically extracted from the first native pinned service — never hardcoded.
 */
export interface AWSFavoriteClasses {
  /** Class for the list item container */
  li: string;
  /** Class for the anchor element */
  anchor: string;
  /** Class for the main container div */
  mainContainer: string;
  /** Class for the icon wrapper div */
  iconWrapper: string;
  /** Class for the icon image */
  icon: string;
  /** Class for the service label span */
  label: string;
}

/**
 * Default placeholder SVG icon data URI used when service icon is unavailable or fails to load.
 */
export const PLACEHOLDER_ICON_URL =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="%23232F3E"/></svg>';
