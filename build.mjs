/**
 * Zero-dependency bundler.
 *
 * Everything — core modules, adapter, UI — is injected **inside** the factory
 * closure. The bundle's top level therefore contains exactly one statement
 * (`window.__ModuleLoader__.load({...})`) and zero `const` / `let` / `class`
 * declarations, so several plugin bundles can share one JavaScript realm
 * (DSH serves them through a `plugins/??a.js&b.js` combo script) without
 * colliding on names like `VENDORS`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MODULES = [
  "src/core/vendor.js",
  "src/core/classifier.js",
  "src/core/reasoning.js",
  "src/core/catalog.js",
  "src/core/positioning.js",
  "src/core/burst.js",
  "src/core/containing-block.js",
  "src/adapter/controller.js",
];

const ENTRY = "src/index.js";
const OUT = "lib/client.js";
const INJECT = "/*__INJECT_MODULES__*/";
const PAD = "    ";

const strip = (code) =>
  code
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$/gm, "")
    .replace(/^export\s+/gm, "")
    .trimEnd();

const indent = (code) =>
  code
    .split("\n")
    .map((line) => (line.trim() ? PAD + line : line))
    .join("\n");

const modules = MODULES.map((file) => indent(`// ── ${file}\n${strip(readFileSync(file, "utf8"))}`)).join("\n\n");

let entry = strip(readFileSync(ENTRY, "utf8"));
if (!entry.includes(INJECT)) throw new Error(`build: ${ENTRY} is missing the ${INJECT} marker`);
entry = entry.replace(INJECT, modules);

const header = `/**
 * GENERATED FILE — do not edit.
 * Source lives in src/; run \`npm run build\` (or \`node build.mjs\`) to regenerate.
 */
`;

const output = header + entry;
const offenders = output.split("\n").filter((line) => /^(const|let|class|function)\s/.test(line));
if (offenders.length) {
  throw new Error(`build: top-level declarations leaked into the shared realm:\n${offenders.join("\n")}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, output);
// DSH resolves the browser bundle as `<package>/client.js` (proven by the 404
// in the crash log). Keep a copy at the package root so both rules work.
writeFileSync("client.js", output);
console.log(`built ${OUT}: ${MODULES.length} modules inlined, 0 top-level declarations`);
