/**
 * AWS region detection utilities
 *
 * This module provides utilities for detecting the current AWS region from URL parameters
 * or localStorage.
 */

import { AWSRegion } from '../types';

/**
 * Detects the current AWS region from URL parameters or localStorage
 * Falls back to 'us-east-1' if no region is found
 * @returns AWS region identifier (e.g., 'us-east-1', 'eu-west-1')
 */
export function detectRegion(): AWSRegion {
  const DEFAULT_REGION: AWSRegion = 'us-east-1';

  // Try to get region from URL parameter
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region');
    if (regionParam) {
      return regionParam;
    }
  } catch (_error) {
    // Continue to next method
  }

  // Try to get region from localStorage
  try {
    const storedRegion = localStorage.getItem('awsc-region');
    if (storedRegion) {
      return storedRegion;
    }
  } catch (_error) {
    // Continue to fallback
  }

  return DEFAULT_REGION;
}
