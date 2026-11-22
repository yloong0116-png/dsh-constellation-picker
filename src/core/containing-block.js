/**
 * Does anything up the chain create a containing block for `position: fixed`?
 * Only <html> and <body> matter in practice; deeper ancestors are irrelevant
 * because our portal is a direct child of <body>.
 */
export function detectContainingBlock(win, doc) {
  const check = (el) => {
    if (!el || typeof win.getComputedStyle !== "function") return false;
    const cs = win.getComputedStyle(el);
    if (!cs) return false;
    if (cs.transform && cs.transform !== "none") return true;
    if (cs.filter && cs.filter !== "none") return true;
    if (cs.perspective && cs.perspective !== "none") return true;
    const willChange = cs.willChange || "";
    if (/transform|filter|perspective/i.test(willChange)) return true;
    const contain = cs.contain || "";
    if (/paint|layout|strict|content/i.test(contain)) return true;
    return false;
  };
  return check(doc.documentElement) || check(doc.body);
}
