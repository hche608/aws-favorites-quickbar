/**
 * Main-world script running directly in the AWS Console page execution context.
 * Hooks window.fetch and window.XMLHttpRequest, inspects page Webpack modules for
 * the native CodePipeline client, and services GetPipelineState queries.
 */

import { executeCodePipelineApi } from './sigv4-signer';

interface CachedState {
  data: any;
  timestamp: number;
}

console.log('[AWS Quickbar] Main-world bridge initialized');

const capturedPipelineStates = new Map<string, CachedState>();
let lastCapturedHeaders: Record<string, string> | null = null;
let lastCapturedEndpoint: string | null = null;
let cachedCodePipelineClient: any = null;

/**
 * Searches Webpack modules cache for an existing authenticated AWS CodePipeline client.
 */
function findCodePipelineClient(): any {
  if (cachedCodePipelineClient) return cachedCodePipelineClient;

  for (const key of Object.keys(window)) {
    if (key.startsWith('webpackChunk')) {
      const chunk = (window as any)[key];
      if (Array.isArray(chunk) && typeof chunk.push === 'function') {
        try {
          chunk.push([
            [Symbol()],
            {},
            (require: any) => {
              if (require && require.c) {
                for (const modId of Object.keys(require.c)) {
                  const exp = require.c[modId]?.exports;
                  if (!exp) continue;

                  if (typeof exp.getPipelineState === 'function') {
                    cachedCodePipelineClient = exp;
                    return;
                  }
                  if (
                    exp.CodePipeline &&
                    typeof exp.CodePipeline.prototype?.getPipelineState === 'function'
                  ) {
                    try {
                      cachedCodePipelineClient = new exp.CodePipeline();
                      return;
                    } catch {}
                  }
                  if (exp.default && typeof exp.default.getPipelineState === 'function') {
                    cachedCodePipelineClient = exp.default;
                    return;
                  }
                }
              }
            }
          ]);
        } catch {
          // Ignore chunk push error
        }
      }
    }
  }

  return cachedCodePipelineClient;
}

// 1. Hook window.XMLHttpRequest to capture CodePipeline SDK calls and responses
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]): void {
  (this as any)._url = typeof url === 'string' ? url : url.toString();
  (this as any)._headers = {};
  return (originalXhrOpen as any).apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string): void {
  if ((this as any)._headers) {
    (this as any)._headers[header.toLowerCase()] = value;
  }
  return originalXhrSetRequestHeader.apply(this, [header, value]);
};

XMLHttpRequest.prototype.send = function (body?: any): void {
  const url = (this as any)._url || '';
  const isCodePipeline = url.includes('codepipeline') && url.includes('amazonaws.com');

  if (isCodePipeline) {
    lastCapturedEndpoint = url;
    const h = (this as any)._headers;
    if (h && h['authorization'] && h['x-amz-security-token']) {
      lastCapturedHeaders = h;
    }

    let requestBodyName: string | null = null;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        requestBodyName = parsed.name || parsed.pipelineName || null;
      } catch {
        // Ignore parse error
      }
    }

    this.addEventListener('load', function () {
      try {
        if (this.responseText && this.status >= 200 && this.status < 300) {
          const data = JSON.parse(this.responseText);
          const pipelineKey =
            data.pipelineName || (data.pipeline && data.pipeline.name) || requestBodyName;

          if (pipelineKey && (data.stageStates || data.pipeline || data.pipelineExecution)) {
            capturedPipelineStates.set(pipelineKey, { data, timestamp: Date.now() });
          }
        }
      } catch {
        // Ignore response parse errors
      }
    });
  }

  return originalXhrSend.apply(this, [body]);
};

// 2. Hook window.fetch at page initialization
const originalFetch = window.fetch;
let capturedCredentials: any = null;

try {
  const saved = sessionStorage.getItem('__AWS_QUICKBAR_CREDS__');
  if (saved) capturedCredentials = JSON.parse(saved);
} catch {}

window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
  const request = args[0];
  const url = typeof request === 'string' ? request : (request && (request as Request).url) || '';

  try {
    if (url.includes('codepipeline') && url.includes('amazonaws.com')) {
      lastCapturedEndpoint = url;
    }
  } catch {
    // Ignore inspection errors
  }

  const response = await originalFetch.apply(this, args);

  try {
    if (url.includes('tb/creds') || url.includes('/creds')) {
      const clone = response.clone();
      clone
        .json()
        .then((data) => {
          console.log('[AWS Quickbar] Captured TB credentials:', data ? Object.keys(data) : null);
          if (
            data &&
            (data.AccessKeyId ||
              data.accessKeyId ||
              data.SecretAccessKey ||
              data.secretAccessKey ||
              data.SecurityToken ||
              data.securityToken)
          ) {
            capturedCredentials = data;
            try {
              sessionStorage.setItem('__AWS_QUICKBAR_CREDS__', JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});
    }

    if (url.includes('codepipeline') && response.ok) {
      const clone = response.clone();
      clone
        .json()
        .then((data) => {
          if (data && data.pipelineName) {
            capturedPipelineStates.set(data.pipelineName, { data, timestamp: Date.now() });
          } else if (data && data.pipeline && data.pipeline.name) {
            capturedPipelineStates.set(data.pipeline.name, { data, timestamp: Date.now() });
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore clone errors
  }

  return response;
};

// 3. Handle requests from the content script via window.postMessage (structured clone)
window.addEventListener('message', async (event: MessageEvent) => {
  if ((event.source && event.source !== window) || !event.data) return;
  if (event.data.type !== 'AWS_FAVORITES_GET_PIPELINE_STATE') return;

  const { pipelineName, requestId, region } = event.data;
  if (!pipelineName || !requestId) return;

  const sendResult = (success: boolean, data?: any, error?: string) => {
    window.postMessage(
      {
        type: 'AWS_FAVORITES_PIPELINE_STATE_RESULT',
        requestId,
        success,
        data,
        error
      },
      '*'
    );
  };

  // 1. Check if we already have captured state for this pipeline
  const cached = capturedPipelineStates.get(pipelineName);
  const now = Date.now();
  const isFresh = cached && now - cached.timestamp < 15000;
  const isInProgress = cached?.data?.stageStates?.some(
    (s: any) => s.latestExecution?.status === 'InProgress'
  );

  // If cached and fresh (and not InProgress or InProgress < 5s old), return cached immediately
  if (cached && isFresh && (!isInProgress || now - cached.timestamp < 5000)) {
    sendResult(true, cached.data);
    return;
  }

  // 2. Query via SigV4 signed request if credentials have been captured
  if (capturedCredentials) {
    try {
      const data = await executeCodePipelineApi(
        capturedCredentials,
        'GetPipelineState',
        { name: pipelineName },
        region || 'ap-southeast-2'
      );
      if (data) {
        capturedPipelineStates.set(pipelineName, { data, timestamp: Date.now() });
        sendResult(true, data);
        return;
      }
    } catch (sigv4Error) {
      console.warn('[AWS Quickbar] SigV4 API call failed:', sigv4Error);
    }
  }

  // 3. Try querying via native page AWS CodePipeline client
  const client = findCodePipelineClient();
  if (client) {
    try {
      const req = client.getPipelineState({ name: pipelineName });
      const data = typeof req.promise === 'function' ? await req.promise() : await req;
      if (data) {
        capturedPipelineStates.set(pipelineName, { data, timestamp: Date.now() });
        sendResult(true, data);
        return;
      }
    } catch (sdkError) {
      console.warn('[AWS Quickbar] Native SDK call failed:', sdkError);
    }
  }

  // 4. Graceful fallback: return cached data if available even if older than TTL
  if (cached) {
    sendResult(true, cached.data);
    return;
  }

  sendResult(
    false,
    undefined,
    'Pipeline execution state not captured yet. Please wait for console list to finish loading.'
  );
});
