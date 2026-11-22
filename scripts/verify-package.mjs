/**
 * Package-level verification for `npm run check`.
 *
 * Everything here is cross-platform (Node APIs only — no cmp / stat / grep), and
 * the import smoke test runs against the repository checkout, never against a
 * real DSH profile.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

let failures = 0;
const ok = (msg) => console.log(`  ok   ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL ${msg}`);
};

const ROOT_BUNDLE = "client.js";
const LIB_BUNDLE = "lib/client.js";
const MIN_BUNDLE_BYTES = 10_000;

// 1. both artifacts exist, are non-trivial, and are identical
for (const file of [ROOT_BUNDLE, LIB_BUNDLE]) {
  if (!existsSync(file)) {
    fail(`${file} is missing — run \`node build.mjs\``);
    continue;
  }
  const size = statSync(file).size;
  if (size < MIN_BUNDLE_BYTES) fail(`${file} is only ${size}B (expected ≥ ${MIN_BUNDLE_BYTES}B)`);
  else ok(`${file} present (${size}B)`);
}
if (existsSync(ROOT_BUNDLE) && existsSync(LIB_BUNDLE)) {
  const hash = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
  const [a, b] = [hash(ROOT_BUNDLE), hash(LIB_BUNDLE)];
  if (a === b) ok("client.js and lib/client.js are byte-identical");
  else fail("client.js differs from lib/client.js — stale build, run `npm run build`");
}

// 2. the bundle must not leak declarations into the shared realm
if (existsSync(LIB_BUNDLE)) {
  const leaks = readFileSync(LIB_BUNDLE, "utf8")
    .split("\n")
    .filter((line) => /^(const|let|class|function)\s/.test(line));
  if (leaks.length) fail(`top-level declarations leaked: ${leaks.slice(0, 3).join(" | ")}`);
  else ok("bundle has no top-level declarations");
}

// 3. the published tarball must contain what the loader asks for
try {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const files = new Set(JSON.parse(raw)[0].files.map((entry) => entry.path));
  for (const required of ["client.js", LIB_BUNDLE, "index.js", "package.json", "cordis.patch.yml"]) {
    if (files.has(required)) ok(`packed: ${required}`);
    else fail(`missing from package tarball: ${required}`);
  }
} catch (error) {
  fail(`npm pack --dry-run failed: ${String(error.message).split("\n")[0]}`);
}

// 4. host half must import cleanly (isolated: repository files only)
try {
  const mod = await import(pathToFileURL(resolve(process.cwd(), "index.js")).href);
  if (typeof mod.apply === "function") ok("index.js imports and exports apply()");
  else fail("index.js does not export apply()");
} catch (error) {
  fail(`index.js failed to import: ${String(error.message).split("\n")[0]}`);
}

// 5. every exports target must exist on disk
try {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  for (const [key, value] of Object.entries(pkg.exports || {})) {
    const target = typeof value === "string" ? value : value?.default;
    if (!target || !target.startsWith(".")) continue;
    if (target.includes("*")) {
      const base = target.split("*")[0].replace(/\/$/, "");
      if (existsSync(base)) ok(`exports["${key}"] → ${target} (wildcard base exists)`);
      else fail(`exports["${key}"] → wildcard base ${base} does not exist`);
      continue;
    }
    if (existsSync(target)) ok(`exports["${key}"] → ${target}`);
    else fail(`exports["${key}"] → ${target} does not exist`);
  }
} catch (error) {
  fail(`cannot read package.json exports: ${String(error.message).split("\n")[0]}`);
}

console.log(failures === 0 ? "\npackage checks passed" : `\n${failures} package check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
