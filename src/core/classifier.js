/**
 * Capability classification — model name in, tier/badges out. Pure functions.
 */

/** Tiers top to bottom; first match wins, `flagship` is the fallback. */
export const TIERS = [
  {
    key: "reasoning",
    label: "旗舰推理",
    hint: "深度思考 · 科研编码",
    test: (name) => /(\breason|\bthinking\b|\bthink\b|\bpro\b|\bo[134]\b|\br1\b|\bmax\b|\bultra\b|\bopus\b)/i.test(name),
    reject: /\b(flash|mini|lite|nano|small|turbo|fast|haiku|air)\b/i,
  },
  {
    key: "lite",
    label: "轻量极速",
    hint: "低延迟 · 高并发",
    test: (name) => /\b(flash|mini|lite|nano|small|turbo|fast|haiku|air|instant)\b/i.test(name),
    reject: null,
  },
  { key: "flagship", label: "全能主力", hint: "日常对话 · 综合任务", test: () => true, reject: null },
];

/**
 * Classify a model into one of the three capability tiers.
 * @param {{ name?: string, id?: string }} model
 * @returns {"reasoning"|"flagship"|"lite"}
 */
export function tierOf(model) {
  const name = `${model?.name || ""} ${model?.id || ""}`;
  for (const tier of TIERS) {
    if (tier.reject && tier.reject.test(name)) continue;
    if (tier.test(name)) return tier.key;
  }
  return "flagship";
}

/**
 * Derive short capability badges from the model name (1M / 推理 / 多模态 / 代码).
 * @param {{ name?: string, id?: string }} model
 * @returns {string[]}
 */
export function badgesOf(model) {
  const name = `${model?.name || ""} ${model?.id || ""}`;
  const out = [];
  const ctx = /(1m|128k|200k|256k|1\.5m)/i.exec(name);
  if (ctx) out.push(ctx[1].toUpperCase());
  if (/(reason|think|r1)/i.test(name)) out.push("推理");
  if (/(vision|vl|multimodal|4o|omni)/i.test(name)) out.push("多模态");
  if (/(code|coder)/i.test(name)) out.push("代码");
  return out.slice(0, 2);
}
