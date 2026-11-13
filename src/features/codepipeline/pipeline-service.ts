import type { PipelineExecutionSummary, RawPipelineStateResponse } from './types';
import { parsePipelineStateResponse } from './pipeline-parser';

export { formatTimeAgo, selectPrimaryAction, parsePipelineStateResponse } from './pipeline-parser';

/**
 * In-memory cache holding recent pipeline state responses.
 * 15 seconds TTL avoids hammering AWS APIs on repeated hover.
 */
interface CacheEntry {
  timestamp: number;
  data: PipelineExecutionSummary;
}

const CACHE_TTL_MS = 15000;
const pipelineCache = new Map<string, CacheEntry>();

/**
 * Clears the pipeline status cache (primarily for tests).
 */
export function clearPipelineCache(): void {
  pipelineCache.clear();
}

/**
 * Extracts anti-CSRF token embedded by the AWS Management Console.
 */
export function getConsoleCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const meta = document.querySelector('meta[name="awsc-csrf-token"]');
  if (meta) {
    const content = meta.getAttribute('content');
    if (content) return content;
  }

  // Fallback: search cookies for awsc-csrf-token
  const cookies = document.cookie || '';
  const match = cookies.match(/(?:^|;\s*)awsc-csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolves current AWS region from page metadata or location.
 */
export function resolveCurrentRegion(defaultRegion = 'ap-southeast-2'): string {
  if (typeof window !== 'undefined' && window.location) {
    const searchParams = new URLSearchParams(window.location.search);
    const regionParam = searchParams.get('region');
    if (regionParam) return regionParam;

    const hostMatch = window.location.hostname.match(/^([a-z0-9-]+)\.console\.aws\.amazon\.com/);
    if (hostMatch && hostMatch[1] && !hostMatch[1].startsWith('console')) {
      return hostMatch[1];
    }
  }

  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="awsc-mezz-region"]');
    if (meta) {
      const content = meta.getAttribute('content');
      if (content) return content;
    }
  }

  return defaultRegion;
}

/**
 * Request pipeline state from main-world bridge.
 */
export function requestFromMainWorld(
  pipelineName: string,
  region?: string,
  timeoutMs = 4000
): Promise<RawPipelineStateResponse> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('window is undefined'));
    }
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const timer = setTimeout(() => {
      window.removeEventListener('AWS_FAVORITES_PIPELINE_STATE_RESULT', listener as EventListener);
      reject(new Error('Request timed out (active CodePipeline session not captured)'));
    }, timeoutMs);

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail || {};
      if (detail.requestId === requestId) {
        clearTimeout(timer);
        window.removeEventListener(
          'AWS_FAVORITES_PIPELINE_STATE_RESULT',
          listener as EventListener
        );
        if (detail.success && detail.data) {
          resolve(detail.data);
        } else {
          reject(new Error(detail.error || 'Failed to retrieve pipeline state'));
        }
      }
    };

    window.addEventListener('AWS_FAVORITES_PIPELINE_STATE_RESULT', listener as EventListener);
    window.dispatchEvent(
      new CustomEvent('AWS_FAVORITES_GET_PIPELINE_STATE', {
        detail: { pipelineName, requestId, region }
      })
    );
  });
}

/**
 * Fetches pipeline state via main-world session or returns cached data if fresh (< 15s).
 */
export async function fetchPipelineExecutionState(
  pipelineName: string,
  region?: string
): Promise<PipelineExecutionSummary> {
  const targetRegion = region || resolveCurrentRegion();
  const cacheKey = `${targetRegion}:${pipelineName}`;

  const cached = pipelineCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Query via main-world bridge using active console SigV4 session
  const rawData = await requestFromMainWorld(pipelineName, targetRegion);
  const summary = parsePipelineStateResponse(rawData);
  pipelineCache.set(cacheKey, { timestamp: now, data: summary });
  return summary;
}
