/**
 * Browser crypto shim for web-only dependency fallbacks.
 *
 * Some bundled web dependencies probe Node's `crypto` module even though they
 * already prefer `globalThis.crypto.getRandomValues` in the browser. Exposing
 * the small subset they expect keeps Vite from externalizing the builtin.
 */

function requireWebCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Web Crypto API is not available');
  }
  return cryptoApi;
}

export function randomFillSync(target: Uint8Array, offset = 0, size = target.byteLength - offset) {
  const cryptoApi = requireWebCrypto();
  const view = target.subarray(offset, offset + size);
  cryptoApi.getRandomValues(view as unknown as Uint8Array<ArrayBuffer>);
  return target;
}

export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  return randomFillSync(bytes);
}

const cryptoShim = { randomFillSync, randomBytes };

export default cryptoShim;
