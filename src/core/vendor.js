/**
 * Vendor branding and lookup — pure data + pure functions, no DOM, no React.
 */

/** Branding keyed by provider id; `default` covers anything unknown. */
export const VENDORS = {
  "deepseek-account": { label: "DeepSeek", icon: "◈", color: "#4d6bfe", soft: "#eef2ff", ink: "#2b41c4" },
  "deepseek-official": { label: "DeepSeek", icon: "◈", color: "#4d6bfe", soft: "#eef2ff", ink: "#2b41c4" },
  openai: { label: "OpenAI", icon: "✦", color: "#10a37f", soft: "#e8faf4", ink: "#0b7a5f" },
  gemini: { label: "Gemini", icon: "✧", color: "#8b5cf6", soft: "#f2edff", ink: "#6d3fe0" },
  kimi: { label: "Kimi", icon: "◉", color: "#0ea5c4", soft: "#e6fbff", ink: "#0a7f97" },
  anthropic: { label: "Claude", icon: "❋", color: "#d97757", soft: "#fdf0e9", ink: "#b4532f" },
  "claude-account": { label: "Claude", icon: "❋", color: "#d97757", soft: "#fdf0e9", ink: "#b4532f" },
  workbuddy: { label: "WorkBuddy", icon: "◇", color: "#f59e0b", soft: "#fff7e6", ink: "#b45309" },
  default: { label: "Provider", icon: "◇", color: "#64748b", soft: "#f1f5f9", ink: "#475569" },
};

/** Vendors rendered as dimmed placeholders when the catalog does not have them. */
export const EXPECTED = [
  { id: "openai", label: "OpenAI", icon: "✦", color: "#10a37f", soft: "#e8faf4", ink: "#0b7a5f" },
  { id: "gemini", label: "Gemini", icon: "✧", color: "#8b5cf6", soft: "#f2edff", ink: "#6d3fe0" },
  { id: "kimi", label: "Kimi", icon: "◉", color: "#0ea5c4", soft: "#e6fbff", ink: "#0a7f97" },
  { id: "anthropic", label: "Claude", icon: "❋", color: "#d97757", soft: "#fdf0e9", ink: "#b4532f" },
];

/**
 * Resolve a provider to its branding. Exact id first, then a known vendor id
 * contained in the provider id, then the default with the provider's own name.
 */
export function vendorOf(providerId, providerName) {
  const key = String(providerId || "");
  const exact = VENDORS[key] || VENDORS[key.toLowerCase()];
  if (exact) return exact;
  const lower = key.toLowerCase();
  const loose = Object.keys(VENDORS).find((name) => name !== "default" && lower.includes(name));
  if (loose) return VENDORS[loose];
  return { ...VENDORS.default, label: providerName || key || "Provider" };
}
