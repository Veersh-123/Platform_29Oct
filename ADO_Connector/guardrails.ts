import * as url from 'url';

/**
 * Mask a secret token.
 */
export function maskToken(token?: string | null): string {
  return '***MASKED***';
}

/**
 * Validate that required environment variables are present.
 * Throws an Error with a helpful message when missing.
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Ensure URL is HTTP/HTTPS and normalized (adds trailing slash if needed).
 */
export function ensureHttpsUrl(raw: string): string {
  try {
    const parsed = new url.URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('URL must use http or https');
    }
    let out = parsed.toString();
    if (!out.endsWith('/')) out = out + '/';
    return out;
  } catch (e) {
    throw new Error(`Invalid ADO_ORG_URL: ${raw}`);
  }
}

export default {
  maskToken,
  validateEnvVars,
  ensureHttpsUrl
};
