/**
 * Zero-dependency bundler: our modules are a simple linear chain with unique
 * symbol names, so the build is "strip imports/exports, concatenate in order".
 *
 * Keep `ORDER` topologically sorted — core has no deps, controller depends on
 * core, index depends on everything.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const ORDER = [
  "src/core/vendor.js",
  "src/core/classifier.js",
  "src/core/reasoning.js",
  "src/core/catalog.js",
  "src/core/positioning.js",
  "src/adapter/controller.js",
  "src/index.js",
];

const OUT = "lib/client.js";

const parts = ORDER.map((file) => {
  let code = readFileSync(file, "utf8");
  code = code.replace(/^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$/gm, "");
  code = code.replace(/^export\s+/gm, "");
  return `// ───────────────────────────── src: ${file}\n${code.trimEnd()}\n`;
});

const header = `/**
 * GENERATED FILE — do not edit.
 * Source lives in src/; run \`npm run build\` (or \`node build.mjs\`) to regenerate.
 */
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, header + parts.join("\n"));
console.log(`built ${OUT} from ${ORDER.length} modules`);
