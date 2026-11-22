/**
 * Layered dismissal: a click outside the tier bubble should only pop the bubble
 * when one is open — the model matrix must stay on screen.
 */
export function overlayAction(hasSubmenu) {
  return hasSubmenu ? "close-menu" : "close-panel";
}

/**
 * Decide what a mousedown means, given which region it landed in.
 *
 * - `menu`   the tier bubble itself            → keep everything open
 * - `panel`  the model matrix, bubble closed   → normal interaction
 * - `panel`  the model matrix, bubble open     → close only the bubble
 * - `outside` everything else                   → close the panel
 *
 * @param {"menu"|"panel"|"outside"} region
 * @param {boolean} hasSubmenu
 */
export function dismissAction(region, hasSubmenu) {
  if (region === "menu") return "none";
  if (region === "panel") return hasSubmenu ? "close-menu" : "none";
  return "close-panel";
}
