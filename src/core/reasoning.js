/**
 * Reasoning-effort mapping — pure functions, no assumptions about array order.
 */

/** Preset copy, used only when the vendor's own effort name matches. */
export const EFFORT_TIERS = [
  { name: "Low", sub: "极速响应" },
  { name: "Medium", sub: "平衡速度与推理" },
  { name: "High", sub: "深度思考" },
  { name: "Extra", sub: "最大推理预算" },
];

const STANDARD = /^(minimal|low|medium|high|extra|max)$/i;

/**
 * Map a model's advertised efforts into display rows.
 *
 * Never assume index 0 means "Low": the label is the vendor's real name, and the
 * preset copy is applied only when that name is a standard one.
 *
 * @param {{ reasoning?: { efforts?: { id: string, name: string }[] } }} choice
 * @returns {{ id?: string, label: string, sub: string, bars: number }[]}
 */
export function effortsOf(choice) {
  const efforts = (choice?.reasoning?.efforts || []).slice(0, 4);
  if (!efforts.length) return [];
  return efforts.map((effort, index) => {
    const tier = EFFORT_TIERS[index];
    const same = tier && String(effort.name).toLowerCase() === tier.name.toLowerCase();
    return {
      id: effort.id,
      label: same ? tier.name : effort.name,
      sub: tier && STANDARD.test(effort.name) ? tier.sub : "自定义推理预算",
      bars: Math.max(1, Math.round(((index + 1) / efforts.length) * 4)),
    };
  });
}

/**
 * Human label for the currently selected effort (falls back to the raw id).
 * @param {{ reasoning?: { efforts?: { id: string, name: string }[], defaultEffort?: string } } | null} choice
 * @param {string|undefined} effortId
 */
export function effortLabel(choice, effortId) {
  const efforts = choice?.reasoning?.efforts || [];
  if (!efforts.length) return "固定深度";
  const id = effortId !== undefined ? effortId : choice.reasoning.defaultEffort;
  if (id === undefined) return "默认";
  const found = efforts.find((effort) => effort.id === id);
  return found ? found.name : String(id);
}
