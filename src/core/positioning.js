/** Pure geometry for the seat + panel, so the coordinate maths is testable. */

/**
 * Seat box in the coordinate space that actually applies.
 * @param {{ left: number, top: number, width: number, height: number }} rect viewport rect
 * @param {{ transformed?: boolean, scrollX?: number, scrollY?: number }} ctx
 */
export function seatBox(rect, ctx = {}) {
  const transformed = ctx.transformed === true;
  return {
    position: transformed ? "absolute" : "fixed",
    left: rect.left + (transformed ? ctx.scrollX || 0 : 0),
    top: rect.top + (transformed ? ctx.scrollY || 0 : 0),
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Panel box: centred on the seat, clamped into the viewport, 12px above it.
 * @param {object} input
 */
export function panelBox(input) {
  const {
    rect,
    panelWidth,
    panelHeight = 420,
    viewportWidth,
    viewportHeight,
    gap = 12,
    margin = 14,
  } = input;
  const transformed = input.transformed === true;
  const scrollX = transformed ? input.scrollX || 0 : 0;
  const scrollY = transformed ? input.scrollY || 0 : 0;
  const center = rect.left + rect.width / 2;
  const maxLeft = Math.max(margin, viewportWidth - panelWidth - margin);
  const left = Math.max(margin, Math.min(Math.round(center - panelWidth / 2), maxLeft));
  const bottomGap = Math.round(viewportHeight - rect.top + gap);
  const maxHeight = Math.max(320, viewportHeight - bottomGap - 16);
  if (transformed) {
    return {
      position: "absolute",
      left: left + scrollX,
      top: rect.top + scrollY - gap - panelHeight,
      bottom: null,
      maxHeight,
    };
  }
  return { position: "fixed", left, bottom: bottomGap, top: null, maxHeight };
}
