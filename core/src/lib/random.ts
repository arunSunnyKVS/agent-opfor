// Random utilities using Web Crypto API.
// globalThis.crypto is a stable global in Node 19+ and all modern browsers;
// in Node 18 it requires --experimental-global-webcrypto, so we fall back to
// node:crypto.webcrypto when the global is absent.

import * as nodeCrypto from "node:crypto";

const _crypto: Crypto =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis.crypto as Crypto | undefined) ?? ((nodeCrypto as any).webcrypto as Crypto);

export function randomUUID(): string {
  return _crypto.randomUUID();
}

export function randomTraceHex(byteLen = 16): string {
  const bytes = new Uint8Array(byteLen);
  _crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
