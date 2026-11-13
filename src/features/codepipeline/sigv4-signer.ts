/**
 * Browser-native AWS SigV4 signer using Web Crypto API.
 * Signs and dispatches CodePipeline API requests (e.g. GetPipelineState).
 */

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AwsCredentials {
  AccessKeyId?: string;
  accessKeyId?: string;
  SecretAccessKey?: string;
  secretAccessKey?: string;
  SessionToken?: string;
  sessionToken?: string;
}

/**
 * Executes a SigV4-signed CodePipeline API request using browser Web Crypto.
 */
export async function executeCodePipelineApi(
  credentials: AwsCredentials,
  action: 'GetPipelineState' | 'GetPipeline',
  params: Record<string, any>,
  region = 'ap-southeast-2'
): Promise<any> {
  const accessKey = credentials.AccessKeyId || credentials.accessKeyId || '';
  const secretKey = credentials.SecretAccessKey || credentials.secretAccessKey || '';
  const sessionToken = credentials.SessionToken || credentials.sessionToken || '';

  if (!accessKey || !secretKey) {
    throw new Error('Missing AWS credentials for SigV4 signing');
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const service = 'codepipeline';
  const host = `${service}.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const target = `CodePipeline_20150709.${action}`;
  const payload = JSON.stringify(params);
  const payloadHash = await sha256Hex(payload);

  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-security-token:${sessionToken}\n` +
    `x-amz-target:${target}\n` +
    `x-amz-user-agent:aws-sdk-js/2.1693.0 promise\n`;

  const signedHeaders =
    'content-type;host;x-amz-date;x-amz-security-token;x-amz-target;x-amz-user-agent';

  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const canonicalRequestHash = await sha256Hex(canonicalRequest);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kSecret = new TextEncoder().encode(`AWS4${secretKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signature = toHex(await hmacSha256(kSigning, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': target,
      'X-Amz-Security-Token': sessionToken,
      'X-Amz-User-Agent': 'aws-sdk-js/2.1693.0 promise',
      Authorization: authorization
    },
    body: payload
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AWS CodePipeline HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}
