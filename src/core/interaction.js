/**
 * Layered dismissal: a click outside the tier bubble should only pop the bubble
 * when one is open — the model matrix must stay on screen.
 */
export function overlayAction(hasSubmenu) {
  return hasSubmenu ? "close-menu" : "close-panel";
}
