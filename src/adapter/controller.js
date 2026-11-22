/**
 * Framework-agnostic picker controller.
 *
 * Anything that can render a list can drive this: React, Vue, Svelte, plain DOM.
 * It owns catalog derivation and selection; it knows nothing about styling.
 */
import { toChoices, toProviders, filterChoices } from "../core/catalog.js";

/**
 * @param {object} options
 * @param {{ subscribe(fn: () => void): () => void, getSnapshot(): any }} options.directory
 *        DSH model-directory store (or any store with the same shape).
 * @param {(selection: { provider: string, model: string, reasoningEffort?: string }) => Promise<any>} options.select
 * @param {() => void} [options.load]
 */
export function createPickerController({ directory, select, load }) {
  let lastState = null;
  let lastSnapshot = null;

  /**
   * Stable snapshot: the same directory state always returns the same object,
   * which is what `useSyncExternalStore` requires.
   */
  function getSnapshot() {
    const state = directory.getSnapshot();
    if (state === lastState && lastSnapshot) return lastSnapshot;
    const choices = toChoices(state?.groups || []);
    lastState = state;
    lastSnapshot = {
      status: state?.status ?? "ready",
      error: state?.error ?? null,
      groups: state?.groups || [],
      current: state?.current ?? null,
      choices,
      providers: toProviders(choices),
    };
    return lastSnapshot;
  }

  return {
    getSnapshot,
    subscribe: (listener) => directory.subscribe(listener),
    load: () => {
      if (typeof load === "function") load();
    },
    filter: (query) => filterChoices(getSnapshot().choices, query),
    /**
     * Switch model. Pass `effortId` only when the caller picked a depth; models
     * without advertised efforts are switched with their default.
     */
    select: (choice, effortId) =>
      select({
        provider: choice.provider,
        model: choice.model,
        ...(effortId !== undefined ? { reasoningEffort: effortId } : {}),
      }),
  };
}
