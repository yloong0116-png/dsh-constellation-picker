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
