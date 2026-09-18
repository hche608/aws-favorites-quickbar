/**
 * Helper to access the real AWS services dataset for unit and integration testing.
 */

import { Service } from '../../src/types';
import rawServices from '../fixtures/all-services.json';

export interface RealServiceRecord {
  id: string;
  name: string;
  description?: string;
  consoleUrl: string;
  iconUrl: string | null;
  category?: string;
}

export const REAL_AWS_SERVICES: RealServiceRecord[] = rawServices as RealServiceRecord[];

/**
 * Returns a typed array of Service objects derived from the real AWS catalog.
 *
 * @param count - Optional maximum count of services to return
 * @param source - Optional source tag ('user' | 'recent')
 */
export function getRealServices(count?: number, source?: 'user' | 'recent'): Service[] {
  const services: Service[] = REAL_AWS_SERVICES.map((item) => ({
    id: item.id,
    name: item.name,
    consoleUrl: item.consoleUrl,
    iconUrl: item.iconUrl,
    ...(source ? { source } : {})
  }));

  return count !== undefined ? services.slice(0, count) : services;
}
