import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const bundle = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");

function makeRealm() {
  const loaded = [];
  const sandbox = {
    console: { info() {}, error() {}, warn() {} },
    window: { __ModuleLoader__: { load(def) { loaded.push(def.id); } } },
  };
  sandbox.globalThis = sandbox;
  return { ctx: vm.createContext(sandbox), loaded };
}

test("bundle: no top-level const/let/class/function leaks into the shared realm", () => {
  const offenders = bundle.split("\n").filter((line) => /^(const|let|class|function)\s/.test(line));
  assert.deepEqual(offenders, [], `leaked declarations:\n${offenders.join("\n")}`);
});

test("bundle: evaluating it twice in the same realm does not throw", () => {
  const { ctx, loaded } = makeRealm();
  vm.runInContext(bundle, ctx);
  vm.runInContext(bundle, ctx);
  assert.equal(loaded.length, 2);
});

test("bundle: coexists with another plugin that declares VENDORS / EXPECTED at top level", () => {
  const { ctx } = makeRealm();
  // another plugin, concatenated into the same combo script
  vm.runInContext("const VENDORS = {}; let EXPECTED = [];", ctx);
  vm.runInContext(bundle, ctx);
});

test("bundle: still registers exactly one module id", () => {
  const { ctx, loaded } = makeRealm();
  vm.runInContext(bundle, ctx);
  assert.deepEqual(loaded, ["dsh-constellation-picker"]);
});
