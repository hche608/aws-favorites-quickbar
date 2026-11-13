/**
 * Main-world script running directly in the AWS Console page execution context.
 * Hooks window.fetch and window.XMLHttpRequest, inspects page Webpack modules for
 * the native CodePipeline client, and services GetPipelineState queries.
 */

import { executeCodePipelineApi } from './sigv4-signer';

const capturedPipelineStates = new Map<string, any>();
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
            capturedPipelineStates.set(pipelineKey, data);
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
            (data.AccessKeyId || data.accessKeyId || data.SecretAccessKey || data.secretAccessKey)
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
            capturedPipelineStates.set(data.pipelineName, data);
          } else if (data && data.pipeline && data.pipeline.name) {
            capturedPipelineStates.set(data.pipeline.name, data);
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore clone errors
  }

  return response;
};

// 3. Handle requests from the content script
window.addEventListener('AWS_FAVORITES_GET_PIPELINE_STATE', (async (e: Event) => {
  const event = e as CustomEvent;
  const { pipelineName, requestId, region } = event.detail || {};
  if (!pipelineName || !requestId) return;

  // 1. Check if we already have captured state for this pipeline
  if (capturedPipelineStates.has(pipelineName)) {
    window.dispatchEvent(
      new CustomEvent('AWS_FAVORITES_PIPELINE_STATE_RESULT', {
        detail: { requestId, success: true, data: capturedPipelineStates.get(pipelineName) }
      })
    );
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
        capturedPipelineStates.set(pipelineName, data);
        window.dispatchEvent(
          new CustomEvent('AWS_FAVORITES_PIPELINE_STATE_RESULT', {
            detail: { requestId, success: true, data }
          })
        );
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
        capturedPipelineStates.set(pipelineName, data);
        window.dispatchEvent(
          new CustomEvent('AWS_FAVORITES_PIPELINE_STATE_RESULT', {
            detail: { requestId, success: true, data }
          })
        );
        return;
      }
    } catch (sdkError) {
      console.warn('[AWS Quickbar] Native SDK call failed:', sdkError);
    }
  }

  window.dispatchEvent(
    new CustomEvent('AWS_FAVORITES_PIPELINE_STATE_RESULT', {
      detail: {
        requestId,
        success: false,
        error: '未捕获到该流水线执行状态，请在控制台列表加载完成后再试'
      }
    })
  );
}) as EventListener);
