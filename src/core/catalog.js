/**
 * Catalog derivation — turns the DSH model directory into the shapes the UI
 * renders. Pure functions: no React, no DOM, no DSH imports.
 */
import { vendorOf, EXPECTED } from "./vendor.js";
import { tierOf, badgesOf } from "./classifier.js";

/**
 * Flatten `{ groups: [{ id, name, models }] }` into UI-ready choices.
 * @param {{ id: string, name?: string, models?: any[] }[]} groups
 * @returns {Array<{ provider: string, providerName: string, vendor: object, model: string, name: string, reasoning?: object, tier: string, badges: string[] }>}
 */
export function toChoices(groups) {
  const out = [];
  for (const group of groups || []) {
    const vendor = vendorOf(group.id, group.name);
    const providerName = group.id === "deepseek-account" ? "DeepSeek 账号" : group.name || group.id;
    for (const model of group.models || []) {
      out.push({
        provider: group.id,
        providerName,
        vendor,
        model: model.id,
        name: model.name || model.id,
        reasoning: model.reasoning,
        tier: tierOf(model),
        badges: badgesOf(model),
      });
    }
  }
  return out;
}

/**
 * Group choices into vendor columns, appending dimmed placeholders for vendors
 * that are expected but not connected.
 * @param {ReturnType<typeof toChoices>} choices
 * @param {{ limit?: number }} [options]
 */
export function toProviders(choices, options = {}) {
  const limit = options.limit ?? 7;
  const order = [];
  const map = new Map();
  for (const choice of choices) {
    if (!map.has(choice.provider)) {
      map.set(choice.provider, { id: choice.provider, vendor: choice.vendor, models: [] });
      order.push(choice.provider);
    }
    map.get(choice.provider).models.push(choice);
  }
  const live = order.map((id) => map.get(id));
  const ghosts = EXPECTED.filter((item) => !live.some((column) => column.vendor.label === item.label)).map((item) => ({
    id: `ghost:${item.id}`,
    vendor: item,
    models: [],
    ghost: true,
  }));
  return [...live, ...ghosts].slice(0, limit);
}

/**
 * Case-insensitive filter over model name / vendor / provider name.
 * @param {ReturnType<typeof toChoices>} choices
 * @param {string} query
 */
export function filterChoices(choices, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return choices;
  return choices.filter((choice) =>
    `${choice.name} ${choice.vendor.label} ${choice.providerName}`.toLowerCase().includes(needle),
  );
}
