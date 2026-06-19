import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(__dirname, "../dist/core.bundle.js");

// Create a browser-compatible crypto shim that uses Web Crypto API
const cryptoShimPath = resolve(__dirname, "../dist/_crypto-shim.js");
mkdirSync(dirname(cryptoShimPath), { recursive: true });
writeFileSync(
  cryptoShimPath,
  `
// Browser-compatible crypto shim using Web Crypto API
const _crypto = globalThis.crypto;
export const randomUUID = () => _crypto.randomUUID();
export const getRandomValues = (arr) => _crypto.getRandomValues(arr);
export const subtle = _crypto.subtle;
export const webcrypto = _crypto;
export default { randomUUID, getRandomValues, subtle, webcrypto: _crypto };
`
);

// Always minify with no inline sourcemap — Chrome MV3 service workers fail to
// register when the bundled import graph is multi-MB (dev inline maps blow up size).
await build({
  entryPoints: [resolve(__dirname, "../../../core/src/browser.ts")],
  outfile,
  bundle: true,
  format: "esm",
  target: ["chrome120"],
  treeShaking: true,
  minify: true,
  sourcemap: false,
  // Keep these external since they're truly Node.js only and shouldn't be reached in browser code
  external: ["node:fs", "node:path", "node:child_process", "node:os"],
  // Alias node:crypto to our browser shim
  alias: {
    "node:crypto": cryptoShimPath,
  },
  define: {
    // Ensure globalThis.crypto is used
    "global.crypto": "globalThis.crypto",
  },
});

console.log(`✓ core bundle written to ${outfile}`);
