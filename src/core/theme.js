/** Time-of-day theme rule: dark from 18:00 to 05:59, light from 06:00 to 17:59. */
export const DARK_FROM_HOUR = 18;
export const LIGHT_FROM_HOUR = 6;

/**
 * @param {number} hour 0–23 local hour
 * @returns {boolean} true when the clock mode should use the dark palette
 */
export function clockDark(hour) {
  const h = Math.floor(Number(hour));
  if (!Number.isFinite(h)) return false;
  return h >= DARK_FROM_HOUR || h < LIGHT_FROM_HOUR;
}

/** Which palette the clock mode wants right now. */
export function clockDarkNow(date = new Date()) {
  return clockDark(date.getHours());
}

const DARK_CLASS = /(?:^|\s)(?:theme[-_]?dark|dark)(?:\s|$)/i;
const LIGHT_CLASS = /(?:^|\s)(?:theme[-_]?light|light)(?:\s|$)/i;

/**
 * Parse a CSS color into 0–1 luminance, or null when it is unknown/transparent.
 * @param {string} color
 */
export function colorLuminance(color) {
  const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color || "");
  if (!match) return null;
  const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/i.exec(color || "");
  if (alpha && Number(alpha[1]) < 0.2) return null;
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Resolve the *host's* effective theme — not the OS preference.
 *
 * Order: explicit theme attributes → theme class names → background luminance
 * of the nearest opaque ancestor. Returns `{ dark, source }` so callers can log
 * or test which signal won.
 *
 * @param {Document} doc
 * @param {Window} win
 */
export function resolveTheme(doc, win) {
  const root = doc?.documentElement;
  const body = doc?.body;
  const attrOf = (el) => (el?.getAttribute?.("data-theme") || el?.getAttribute?.("data-color-mode") || "").toLowerCase();
  for (const el of [root, body]) {
    const attr = attrOf(el);
    if (attr.includes("dark")) return { dark: true, source: "attribute" };
    if (attr.includes("light")) return { dark: false, source: "attribute" };
  }
  const classes = `${root?.className || ""} ${body?.className || ""}`;
  if (DARK_CLASS.test(classes)) return { dark: true, source: "class" };
  if (LIGHT_CLASS.test(classes)) return { dark: false, source: "class" };

  const styleOf = (el) => {
    try {
      return win?.getComputedStyle ? win.getComputedStyle(el) : null;
    } catch {
      return null;
    }
  };
  let host = body;
  for (let depth = 0; depth < 8 && host; depth += 1) {
    const lum = colorLuminance(styleOf(host)?.backgroundColor);
    if (lum !== null) return { dark: lum < 0.5, source: "background" };
    host = host.parentElement;
  }
  const rootLum = colorLuminance(styleOf(root)?.backgroundColor);
  if (rootLum !== null) return { dark: rootLum < 0.5, source: "background" };
  return { dark: false, source: "default" };
}
