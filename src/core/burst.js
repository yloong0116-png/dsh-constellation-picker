/**
 * Bounded burst windows.
 *
 * A layout signal may open a frame window, but non-urgent signals (DOM churn,
 * streaming output) are rate-limited: they can extend a window at most `limit`
 * times, and must wait `cooldown` ms between windows. Urgent signals (user
 * interaction, transition end) always extend — they are rare and meaningful.
 */
export function createBurstGuard(limit = 3, cooldown = 800) {
  let extensions = 0;
  let until = -Infinity;
  return {
    /**
     * @param {number} now monotonic clock (performance.now)
     * @param {number} ms window length
     * @param {boolean} urgent bypasses the rate limit
     * @returns {number} the effective end timestamp
     */
    next(now, ms, urgent = true) {
      if (urgent) {
        until = Math.max(until, now + ms);
        extensions = 0;
        return until;
      }
      if (now < until) {
        if (extensions >= limit) return until;
        extensions += 1;
        until = Math.max(until, now + ms);
        return until;
      }
      if (now - until < cooldown) return until;
      extensions = 1;
      until = now + ms;
      return until;
    },
    reset() {
      extensions = 0;
      until = -Infinity;
    },
    get until() {
      return until;
    },
  };
}
