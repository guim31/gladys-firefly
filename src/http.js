// -----------------------------------------------------------------------------
// The one function that talks to the network: an HTTP(S) GET, on node:http /
// node:https. GET only: the integration never writes to Firefly III. Not on fetch: fetch cannot accept the
// self-signed certificate of one server only (a Firefly III behind a reverse proxy
// often has a self-signed certificate), node:https can, per request.
//
// The client takes this function as a parameter: the tests replace it with an
// in-memory Firefly III (test/helpers/fakeFirefly.js).
// -----------------------------------------------------------------------------

import http from 'node:http';
import https from 'node:https';

// A page of 50 transactions-free objects is a few tens of KB.
const MAX_BODY_BYTES = 4 * 1024 * 1024;

/**
 * @param {string} url absolute URL
 * @param {object} [options]
 * @param {Record<string, string>} [options.headers]
 * @param {boolean} [options.insecure] accept a certificate that does not verify (HTTPS only)
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ status: number, headers: Record<string, string>, body: string }>}
 */
export function httpRequest(url, { headers = {}, insecure = false, timeoutMs = 15_000 } = {}) {
  const target = new URL(url);
  const isHttps = target.protocol === 'https:';
  const requestHeaders = { accept: 'application/json', ...headers };

  return new Promise((resolve, reject) => {
    const request = (isHttps ? https : http).request(
      target,
      {
        method: 'GET',
        headers: requestHeaders,
        timeout: timeoutMs,
        ...(isHttps ? { rejectUnauthorized: !insecure } : {}),
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            request.destroy(new Error('Response too large'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        response.on('error', reject);
      },
    );
    request.on('timeout', () => {
      const error = new Error(`Timed out after ${timeoutMs} ms`);
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.end();
  });
}
