import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(__dirname, "../dist/core.bundle.js");
const isProd = process.env.NODE_ENV === "production";

await build({
  entryPoints: [resolve(__dirname, "../../../core/src/browser.ts")],
  outfile,
  bundle: true,
  format: "esm",
  target: ["chrome120"],
  treeShaking: true,
  minify: isProd,
  sourcemap: isProd ? false : "inline",
  // Fail fast if any Node-only built-ins are accidentally imported
  external: ["node:fs", "node:path", "node:child_process", "node:crypto", "node:os"],
});

console.log(`✓ core bundle written to ${outfile}`);
