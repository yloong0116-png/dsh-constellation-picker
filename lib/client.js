/**
 * GENERATED FILE — do not edit.
 * Source lives in src/; run `npm run build` (or `node build.mjs`) to regenerate.
 */
/**
 * Model Constellation Matrix — multi-vendor model picker for the DSH composer.
 *
 * Replaces the stock model chip with a matrix of (vendor × capability tier)
 * cards. Element → per-vendor roster, Low/Medium/High/Extra → reasoning effort.
 *
 * Contract copied from @deepseek-ai/dsh-client-ui-model-selection:
 *   slot  conversation.input.model
 *   props { available, directory (store), load(), select(selection), locked }
 */











window.__ModuleLoader__.load({
  id: "dsh-constellation-picker",
  factory: (require) => {
    "use strict";

        // ── src/core/vendor.js
    /**
     * Vendor branding and lookup — pure data + pure functions, no DOM, no React.
     */

    /** Branding keyed by provider id; `default` covers anything unknown. */
    const VENDORS = {
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
    const EXPECTED = [
      { id: "openai", label: "OpenAI", icon: "✦", color: "#10a37f", soft: "#e8faf4", ink: "#0b7a5f" },
      { id: "gemini", label: "Gemini", icon: "✧", color: "#8b5cf6", soft: "#f2edff", ink: "#6d3fe0" },
      { id: "kimi", label: "Kimi", icon: "◉", color: "#0ea5c4", soft: "#e6fbff", ink: "#0a7f97" },
      { id: "anthropic", label: "Claude", icon: "❋", color: "#d97757", soft: "#fdf0e9", ink: "#b4532f" },
    ];

    /**
     * Resolve a provider to its branding. Exact id first, then a known vendor id
     * contained in the provider id, then the default with the provider's own name.
     */
    function vendorOf(providerId, providerName) {
      const key = String(providerId || "");
      const exact = VENDORS[key] || VENDORS[key.toLowerCase()];
      if (exact) return exact;
      const lower = key.toLowerCase();
      const loose = Object.keys(VENDORS).find((name) => name !== "default" && lower.includes(name));
      if (loose) return VENDORS[loose];
      return { ...VENDORS.default, label: providerName || key || "Provider" };
    }

    // ── src/core/classifier.js
    /**
     * Capability classification — model name in, tier/badges out. Pure functions.
     */

    /** Tiers top to bottom; first match wins, `flagship` is the fallback. */
    const TIERS = [
      {
        key: "reasoning",
        label: "旗舰推理",
        hint: "深度思考 · 科研编码",
        test: (name) => /(\breason|\bthinking\b|\bthink\b|\bpro\b|\bo[134]\b|\br1\b|\bmax\b|\bultra\b|\bopus\b)/i.test(name),
        reject: /\b(flash|mini|lite|nano|small|turbo|fast|haiku|air)\b/i,
      },
      {
        key: "lite",
        label: "轻量极速",
        hint: "低延迟 · 高并发",
        test: (name) => /\b(flash|mini|lite|nano|small|turbo|fast|haiku|air|instant)\b/i.test(name),
        reject: null,
      },
      { key: "flagship", label: "全能主力", hint: "日常对话 · 综合任务", test: () => true, reject: null },
    ];

    /**
     * Classify a model into one of the three capability tiers.
     * @param {{ name?: string, id?: string }} model
     * @returns {"reasoning"|"flagship"|"lite"}
     */
    function tierOf(model) {
      const name = `${model?.name || ""} ${model?.id || ""}`;
      for (const tier of TIERS) {
        if (tier.reject && tier.reject.test(name)) continue;
        if (tier.test(name)) return tier.key;
      }
      return "flagship";
    }

    /**
     * Derive short capability badges from the model name (1M / 推理 / 多模态 / 代码).
     * @param {{ name?: string, id?: string }} model
     * @returns {string[]}
     */
    function badgesOf(model) {
      const name = `${model?.name || ""} ${model?.id || ""}`;
      const out = [];
      const ctx = /(1m|128k|200k|256k|1\.5m)/i.exec(name);
      if (ctx) out.push(ctx[1].toUpperCase());
      if (/(reason|think|r1)/i.test(name)) out.push("推理");
      if (/(vision|vl|multimodal|4o|omni)/i.test(name)) out.push("多模态");
      if (/(code|coder)/i.test(name)) out.push("代码");
      return out.slice(0, 2);
    }

    // ── src/core/reasoning.js
    /**
     * Reasoning-effort mapping — pure functions, no assumptions about array order.
     */

    /** Preset copy, used only when the vendor's own effort name matches. */
    const EFFORT_TIERS = [
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
    function effortsOf(choice) {
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
    function effortLabel(choice, effortId) {
      const efforts = choice?.reasoning?.efforts || [];
      if (!efforts.length) return "固定深度";
      const id = effortId !== undefined ? effortId : choice.reasoning.defaultEffort;
      if (id === undefined) return "默认";
      const found = efforts.find((effort) => effort.id === id);
      return found ? found.name : String(id);
    }

    // ── src/core/catalog.js
    /**
     * Catalog derivation — turns the DSH model directory into the shapes the UI
     * renders. Pure functions: no React, no DOM, no DSH imports.
     */



    /**
     * Flatten `{ groups: [{ id, name, models }] }` into UI-ready choices.
     * @param {{ id: string, name?: string, models?: any[] }[]} groups
     * @returns {Array<{ provider: string, providerName: string, vendor: object, model: string, name: string, reasoning?: object, tier: string, badges: string[] }>}
     */
    function toChoices(groups) {
      const out = [];
      for (const group of groups || []) {
        const vendor = vendorOf(group.id, group.name);
        const providerName = group.id === "deepseek-account" ? "DeepSeek 账号" : group.name || group.id;
        for (const model of group.models || []) {
          out.push({
            provider: group.id,
            providerName,
            vendor,
            model: model.id,
            name: model.name || model.id,
            reasoning: model.reasoning,
            tier: tierOf(model),
            badges: badgesOf(model),
          });
        }
      }
      return out;
    }

    /**
     * Group choices into vendor columns, appending dimmed placeholders for vendors
     * that are expected but not connected.
     * @param {ReturnType<typeof toChoices>} choices
     * @param {{ limit?: number }} [options]
     */
    function toProviders(choices, options = {}) {
      const limit = options.limit ?? 7;
      const order = [];
      const map = new Map();
      for (const choice of choices) {
        if (!map.has(choice.provider)) {
          map.set(choice.provider, { id: choice.provider, vendor: choice.vendor, models: [] });
          order.push(choice.provider);
        }
        map.get(choice.provider).models.push(choice);
      }
      const live = order.map((id) => map.get(id));
      const ghosts = EXPECTED.filter((item) => !live.some((column) => column.vendor.label === item.label)).map((item) => ({
        id: `ghost:${item.id}`,
        vendor: item,
        models: [],
        ghost: true,
      }));
      return [...live, ...ghosts].slice(0, limit);
    }

    /**
     * Case-insensitive filter over model name / vendor / provider name.
     * @param {ReturnType<typeof toChoices>} choices
     * @param {string} query
     */
    function filterChoices(choices, query) {
      const needle = String(query || "").trim().toLowerCase();
      if (!needle) return choices;
      return choices.filter((choice) =>
        `${choice.name} ${choice.vendor.label} ${choice.providerName}`.toLowerCase().includes(needle),
      );
    }

    // ── src/core/positioning.js
    /** Pure geometry for the seat + panel, so the coordinate maths is testable. */

    /**
     * Seat box in the coordinate space that actually applies.
     * @param {{ left: number, top: number, width: number, height: number }} rect viewport rect
     * @param {{ transformed?: boolean, scrollX?: number, scrollY?: number }} ctx
     */
    function seatBox(rect, ctx = {}) {
      const transformed = ctx.transformed === true;
      const origin = ctx.origin || { x: 0, y: 0 };
      const scroll = ctx.scroll || (transformed ? { x: ctx.scrollX || 0, y: ctx.scrollY || 0 } : { x: 0, y: 0 });
      return {
        position: transformed ? "absolute" : "fixed",
        left: rect.left - origin.x + scroll.x,
        top: rect.top - origin.y + scroll.y,
        width: rect.width,
        height: rect.height,
      };
    }

    /**
     * Panel box: centred on the seat, clamped into the viewport, 12px above it.
     * @param {object} input
     */
    function panelBox(input) {
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
      const origin = input.origin || { x: 0, y: 0 };
      const scroll = input.scroll || (transformed ? { x: input.scrollX || 0, y: input.scrollY || 0 } : { x: 0, y: 0 });
      const center = rect.left + rect.width / 2;
      const maxLeft = Math.max(margin, viewportWidth - panelWidth - margin);
      const left = Math.max(margin, Math.min(Math.round(center - panelWidth / 2), maxLeft));
      const bottomGap = Math.round(viewportHeight - rect.top + gap);
      const maxHeight = Math.max(320, viewportHeight - bottomGap - 16);
      if (transformed) {
        return {
          position: "absolute",
          left: left - origin.x + scroll.x,
          top: rect.top - origin.y + scroll.y - gap - panelHeight,
          bottom: null,
          maxHeight,
        };
      }
      return { position: "fixed", left, bottom: bottomGap, top: null, maxHeight };
    }

    /**
     * Origin of the containing block for an `absolute` child when <body> itself is
     * positioned: that is the body's **padding box**, i.e. its border-box rect
     * shifted by the border widths (clientLeft / clientTop). Padding does not move
     * the origin; the scroll offset is already baked into the rect.
     */
    function positionedBodyOrigin(bodyRect, bodyClient = { left: 0, top: 0 }) {
      return {
        origin: { x: bodyRect.left + (bodyClient.left || 0), y: bodyRect.top + (bodyClient.top || 0) },
        scroll: { x: 0, y: 0 },
      };
    }

    // ── src/core/burst.js
    /**
     * Bounded burst windows.
     *
     * A layout signal may open a frame window, but non-urgent signals (DOM churn,
     * streaming output) are rate-limited: they can extend a window at most `limit`
     * times, and must wait `cooldown` ms between windows. Urgent signals (user
     * interaction, transition end) always extend — they are rare and meaningful.
     */
    function createBurstGuard(limit = 3, cooldown = 800) {
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

    // ── src/core/containing-block.js
    /**
     * Does anything up the chain create a containing block for `position: fixed`?
     * Only <html> and <body> matter in practice; deeper ancestors are irrelevant
     * because our portal is a direct child of <body>.
     */
    function detectContainingBlock(win, doc) {
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

    // ── src/core/theme.js
    /** Time-of-day theme rule: dark from 18:00 to 05:59, light from 06:00 to 17:59. */
    const DARK_FROM_HOUR = 18;
    const LIGHT_FROM_HOUR = 6;

    /**
     * @param {number} hour 0–23 local hour
     * @returns {boolean} true when the clock mode should use the dark palette
     */
    function clockDark(hour) {
      const h = Math.floor(Number(hour));
      if (!Number.isFinite(h)) return false;
      return h >= DARK_FROM_HOUR || h < LIGHT_FROM_HOUR;
    }

    /** Which palette the clock mode wants right now. */
    function clockDarkNow(date = new Date()) {
      return clockDark(date.getHours());
    }

    const DARK_CLASS = /(?:^|\s)(?:theme[-_]?dark|dark)(?:\s|$)/i;
    const LIGHT_CLASS = /(?:^|\s)(?:theme[-_]?light|light)(?:\s|$)/i;

    /**
     * Parse a CSS color into 0–1 luminance, or null when it is unknown/transparent.
     * @param {string} color
     */
    function colorLuminance(color) {
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
    function resolveTheme(doc, win) {
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

    // ── src/core/interaction.js
    /**
     * Layered dismissal: a click outside the tier bubble should only pop the bubble
     * when one is open — the model matrix must stay on screen.
     */
    function overlayAction(hasSubmenu) {
      return hasSubmenu ? "close-menu" : "close-panel";
    }

    // ── src/adapter/controller.js
    /**
     * Framework-agnostic picker controller.
     *
     * Anything that can render a list can drive this: React, Vue, Svelte, plain DOM.
     * It owns catalog derivation and selection; it knows nothing about styling.
     */


    /**
     * @param {object} options
     * @param {{ subscribe(fn: () => void): () => void, getSnapshot(): any }} options.directory
     *        DSH model-directory store (or any store with the same shape).
     * @param {(selection: { provider: string, model: string, reasoningEffort?: string }) => Promise<any>} options.select
     * @param {() => void} [options.load]
     */
    function createPickerController({ directory, select, load }) {
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

    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const trace = (...args) => {
      try {
        console.info("[pcm]", args.map(String).join(" "));
      } catch {
        /* logging must never break the bundle */
      }
    };

    const react = require("react");
    const createPortal = require("react-dom").createPortal;
    const h = react.createElement;
    const useState = react.useState;
    const useEffect = react.useEffect;
    const useMemo = react.useMemo;
    const useRef = react.useRef;
    const useSyncExternalStore = react.useSyncExternalStore;

    // ─────────────────────────────────────────────── vendor configuration

    // ───────────────────────────────────────────────────────────── styles

    const CSS = `
.pcm-panel{position:fixed;z-index:71;width:min(884px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;
  padding:18px 20px 12px;border-radius:24px;background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.07);
  box-shadow:0 30px 80px -28px rgba(15,23,42,.42),0 2px 8px rgba(15,23,42,.06);
  transform-origin:bottom center;animation:pcm-pop .34s cubic-bezier(.16,.94,.3,1.03) both;
  font-family:var(--dsh-font-sans,ui-sans-serif,system-ui,"Segoe UI",sans-serif);scrollbar-width:none}
.pcm-panel::-webkit-scrollbar{display:none}
.pcm-panel.is-closing{animation:pcm-close .17s ease-in both}
@keyframes pcm-pop{from{opacity:0;transform:translateY(16px) scale(.93)}to{opacity:1;transform:none}}
@keyframes pcm-close{to{opacity:0;transform:translateY(10px) scale(.95)}}

.pcm-head{display:flex;gap:14px;align-items:flex-start}
.pcm-badge{width:74px;height:74px;flex:0 0 auto;border-radius:18px;display:flex;flex-direction:column;
  justify-content:center;align-items:center;border:1px solid rgba(15,23,42,.08);transition:background .2s,box-shadow .2s}
.pcm-badge .ic{font-size:22px;line-height:1}
.pcm-badge .abbr{font-size:10.5px;letter-spacing:.08em;margin-top:3px;font-weight:600}
.pcm-meta{flex:1 1 auto;min-width:0;padding-top:1px}
.pcm-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:15px;font-weight:600}
.pcm-tags{display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap}
.pcm-tag{font-size:11px;line-height:1;padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569}
.pcm-desc{margin-top:8px;font-size:12.5px;line-height:1.55;color:#64748b;max-width:56ch}
.pcm-x{position:absolute;top:12px;right:14px;width:26px;height:26px;border:0;border-radius:9px;background:transparent;
  color:#94a3b8;cursor:pointer;font-size:16px;line-height:1}
.pcm-x:hover{background:#f1f5f9;color:#0f172a}

.pcm-quick{display:flex;gap:6px;margin:13px 0 12px;flex-wrap:wrap}
.pcm-pill{display:flex;align-items:center;gap:5px;padding:5px 9px 5px 6px;border-radius:999px;cursor:pointer;
  border:1px solid rgba(15,23,42,.09);background:#fff;font-size:11.5px;color:#334155;transition:all .16s}
.pcm-pill:hover{border-color:rgba(37,99,235,.42);background:#f7fbff;color:#1d4ed8}
.pcm-pill .dot{width:7px;height:7px;border-radius:999px;flex:0 0 auto}

.pcm-matrix{display:grid;gap:10px;margin-top:2px}
.pcm-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.pcm-colhead{display:flex;align-items:center;gap:6px;font-size:11px;color:#475569;font-weight:600;
  padding:0 2px 5px;border-bottom:1px solid #f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcm-colhead i{width:7px;height:7px;border-radius:999px;flex:0 0 auto}
.pcm-colhead span{overflow:hidden;text-overflow:ellipsis}
.pcm-cell{display:flex;flex-direction:column;gap:5px;min-height:56px}
.pcm-card{position:relative;border-radius:11px;padding:6px 8px 7px;border:1px solid rgba(15,23,42,.1);
  background:#fff;cursor:pointer;transition:transform .14s ease,box-shadow .16s,border-color .16s,opacity .16s;
  overflow:hidden;text-align:left}
.pcm-card:hover{transform:translateY(-2px);box-shadow:0 8px 18px -10px rgba(15,23,42,.4);z-index:2}
.pcm-card .nm{display:block;font-size:11.5px;font-weight:600;line-height:1.25;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.pcm-card .sub{display:block;font-size:9.5px;color:#94a3b8;margin-top:2px;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.pcm-card .bd{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap}
.pcm-card .bd i{font-style:normal;font-size:9px;line-height:1;padding:2px 4px;border-radius:4px;background:rgba(15,23,42,.05);color:#64748b}
.pcm-card.sel{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.16),0 8px 18px -10px rgba(37,99,235,.5)}
.pcm-card.ghost{opacity:.34;cursor:default;border-style:dashed}
.pcm-card.ghost:hover{transform:none;box-shadow:none}
.pcm-card.ghost .nm{font-weight:500}

.pcm-legend{display:flex;align-items:center;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;
  font-size:10.5px;color:#94a3b8;flex-wrap:wrap}
.pcm-legend .item{display:inline-flex;align-items:center;gap:5px}
.pcm-legend i{width:6px;height:6px;border-radius:999px;display:inline-block}
.pcm-count{margin-left:auto;font-variant-numeric:tabular-nums}

.pcm-trigger{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border-radius:999px;
  border:1px solid var(--pcm-bd,rgba(15,23,42,.1));background:var(--pcm-bg,#fff);font-size:12px;color:var(--pcm-fg,#334155);
  cursor:pointer;transition:all .16s;white-space:nowrap;max-width:100%}
.pcm-trigger:hover{border-color:var(--pcm-hoverbd,rgba(37,99,235,.45));color:var(--pcm-hoverfg,#1d4ed8);background:var(--pcm-hoverbg,#f7fbff)}
.pcm-trigger .ic{font-size:11px;line-height:1}
.pcm-trigger .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pcm-trigger .caret{color:#94a3b8;font-size:9px;transform:translateY(1px)}
.pcm-seat{}

.pcm-menu{position:fixed;width:272px;padding:12px;border-radius:18px;background:#fff;z-index:80;
  border:1px solid rgba(15,23,42,.08);box-shadow:0 24px 60px -22px rgba(15,23,42,.48),0 2px 8px rgba(15,23,42,.06);
  transform-origin:var(--pcm-origin,center bottom);animation:pcm-menu-in .22s cubic-bezier(.16,.94,.3,1.03) both}
@keyframes pcm-menu-in{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
.pcm-menu-head{display:flex;gap:9px;align-items:center;padding-bottom:9px;margin-bottom:6px;border-bottom:1px solid #f1f5f9}
.pcm-menu-head .dot{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;font-size:13px;flex:0 0 auto}
.pcm-menu-head .nm{font-size:12.5px;font-weight:600;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcm-menu-head .ds{font-size:10.5px;color:#94a3b8;margin-top:2px}
.pcm-opt{display:flex;align-items:center;gap:10px;width:100%;padding:8px 9px;border:0;border-radius:11px;background:transparent;
  cursor:pointer;text-align:left;transition:background .14s}
.pcm-opt:hover{background:#f6f8fb}
.pcm-opt.on{background:#eff6ff}
.pcm-opt .lab{flex:1 1 auto;min-width:0}
.pcm-opt .lab b{display:block;font-size:12px;font-weight:600;color:#0f172a}
.pcm-opt.on .lab b{color:#1d4ed8}
.pcm-opt .lab span{display:block;font-size:10.5px;color:#94a3b8;margin-top:1px}
.pcm-bars{display:flex;align-items:flex-end;gap:2px;height:14px;flex:0 0 auto}
.pcm-bars i{width:3px;border-radius:1.5px;background:#e2e8f0;display:block}
.pcm-bars i.on{background:#2563eb}
.pcm-err{padding:7px 9px;border-radius:9px;background:#fef2f2;color:#b91c1c;font-size:11px;margin-bottom:6px}
.pcm-search{margin:12px 0 2px}
.pcm-search input{width:100%;box-sizing:border-box;height:30px;padding:0 10px;border-radius:9px;
  border:1px solid rgba(15,23,42,.12);background:#f8fafc;font-size:12px;color:#0f172a;outline:none;
  font-family:inherit;transition:border-color .15s,box-shadow .15s,background .15s}
.pcm-search input::placeholder{color:#b6c2d2}
.pcm-search input:focus{border-color:rgba(37,99,235,.5);background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.pcm-card.hot{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.pcm-empty{padding:18px 4px;font-size:12px;color:#94a3b8;text-align:center}

/* ── design tokens ───────────────────────────────────────────── */
.pcm-panel.light,.pcm-menu.light{--pcm-surface:#ffffff;--pcm-surface2:#f8fafc;--pcm-border:rgba(15,23,42,.09);
  --pcm-name:#111111;--pcm-strong:#0f172a;--pcm-text:#334155;--pcm-muted:#94a3b8;--pcm-card-muted:#94a3b8;
  --pcm-tag-bg:#f1f5f9;--pcm-tag-fg:#475569;--pcm-hover:#f6f8fb;--pcm-glow:rgba(37,99,235,.16)}
.pcm-panel.dark,.pcm-menu.dark{--pcm-surface:#14161a;--pcm-surface2:#e9ecf1;--pcm-border:rgba(255,255,255,.1);
  --pcm-name:#111111;--pcm-strong:#f1f5f9;--pcm-text:#cbd5e1;--pcm-muted:#8b95a3;--pcm-card-muted:#5b6472;
  --pcm-tag-bg:rgba(255,255,255,.07);--pcm-tag-fg:#cbd5e1;--pcm-hover:rgba(255,255,255,.06);--pcm-glow:rgba(96,165,250,.28)}

.pcm-panel{background:var(--pcm-surface,#fff);color:var(--pcm-text,#334155);
  border-color:var(--pcm-border,rgba(15,23,42,.07));
  box-shadow:0 30px 80px -28px rgba(15,23,42,.42),0 2px 8px rgba(15,23,42,.06)}
.pcm-panel .pcm-title{color:var(--pcm-strong,#0f172a)}
.pcm-panel .pcm-tag{background:var(--pcm-tag-bg,#f1f5f9);color:var(--pcm-tag-fg,#475569)}
.pcm-panel .pcm-desc{color:var(--pcm-muted,#64748b)}
.pcm-panel .pcm-colhead{color:var(--pcm-text,#475569);border-bottom-color:var(--pcm-border,#f1f5f9)}
.pcm-panel .pcm-card{background:var(--pcm-surface2,#fff);border-color:var(--pcm-border,rgba(15,23,42,.1))}
.pcm-panel .pcm-card .nm{color:#111111;font-size:12px;font-weight:650;letter-spacing:-.01em}
.pcm-panel .pcm-card .sub{color:var(--pcm-card-muted,#94a3b8)}
.pcm-panel .pcm-card .bd i{background:rgba(15,23,42,.06);color:var(--pcm-card-muted,#64748b)}
.pcm-panel .pcm-card.ghost{background:transparent}
.pcm-panel .pcm-card.ghost .nm{color:#9aa4b2;font-weight:500}
.pcm-panel .pcm-card.sel{box-shadow:0 0 0 3px var(--pcm-glow,rgba(37,99,235,.16)),0 8px 18px -10px rgba(15,23,42,.4)}
.pcm-panel .pcm-search input{background:var(--pcm-surface2,#f8fafc);color:var(--pcm-strong,#0f172a);
  border-color:var(--pcm-border,rgba(15,23,42,.12))}
.pcm-panel .pcm-search input::placeholder{color:var(--pcm-muted,#b6c2d2)}
.pcm-panel .pcm-legend{color:var(--pcm-muted,#94a3b8);border-top-color:var(--pcm-border,#f1f5f9)}
.pcm-panel .pcm-x,.pcm-panel .pcm-theme{color:var(--pcm-muted,#94a3b8)}
.pcm-panel .pcm-x:hover,.pcm-panel .pcm-theme:hover{background:var(--pcm-hover,#f1f5f9);color:var(--pcm-name,#0f172a)}
.pcm-panel.dark{box-shadow:0 30px 80px -30px rgba(0,0,0,.75),0 2px 10px rgba(0,0,0,.4)}
.pcm-panel.dark .pcm-badge{border-color:var(--pcm-border);background-image:none}
.pcm-panel.dark .pcm-colhead i{box-shadow:0 0 0 1px rgba(255,255,255,.12)}

.pcm-menu{background:var(--pcm-surface,#fff);color:var(--pcm-text,#334155);
  border-color:var(--pcm-border,rgba(15,23,42,.08))}
.pcm-menu .pcm-menu-head{border-bottom-color:var(--pcm-border,#f1f5f9)}
.pcm-menu .pcm-menu-head .nm{color:var(--pcm-name,#0f172a)}
.pcm-menu .pcm-menu-head .ds{color:var(--pcm-muted,#94a3b8)}
.pcm-menu .pcm-opt:hover{background:var(--pcm-hover,#f6f8fb)}
.pcm-menu .pcm-opt.on{background:var(--pcm-glow,rgba(37,99,235,.12))}
.pcm-menu .pcm-opt .lab b{color:var(--pcm-name,#0f172a)}
.pcm-menu .pcm-opt .lab span{color:var(--pcm-muted,#94a3b8)}
.pcm-menu.dark{box-shadow:0 24px 60px -22px rgba(0,0,0,.8),0 2px 8px rgba(0,0,0,.5)}

.pcm-theme{position:absolute;top:12px;right:44px;width:26px;height:26px;border:0;border-radius:9px;
  background:transparent;cursor:pointer;font-size:13px;line-height:1}
.pcm-back{flex:0 0 auto;width:20px;height:20px;border:0;border-radius:7px;background:transparent;
  color:var(--pcm-muted,#94a3b8);cursor:pointer;font-size:12px;line-height:1;padding:0}
.pcm-back:hover{background:var(--pcm-hover,#f1f5f9);color:var(--pcm-name,#0f172a)}
`;

    function ensureStyle() {
      if (document.getElementById("pcm-style")) return;
      const style = document.createElement("style");
      style.id = "pcm-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    // ───────────────────────────────────────────────────────── components

    function Bars({ bars }) {
      const out = [];
      for (let i = 1; i <= 4; i += 1) {
        out.push(h("i", { key: i, className: i <= bars ? "on" : "", style: { height: `${4 + i * 2.5}px` } }));
      }
      return h("span", { className: "pcm-bars" }, out);
    }

    // ─────────────────────────────────────────────────────────── picker

    function PeriodicPicker(props) {
      const available = props.available !== false;
      const directory = props.directory;
      const load = props.load || (() => {});
      const select = props.select || (() => Promise.resolve({ ok: true }));
      const locked = props.locked === true;
      // When the model seat was claimed, the stock button no longer exists —
      // the chip must render inline in the toolbar instead of chasing a box.
      const seatMode = props.seatMode === true;

      const controller = useMemo(() => createPickerController({ directory, select, load }), [directory]);
      const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

      const [open, setOpen] = useState(false);
      const [closing, setClosing] = useState(false);
      const [hovered, setHovered] = useState(null); // { provider, model }
      const [submenu, setSubmenu] = useState(null); // { provider, model, rect }
      const [error, setError] = useState(null);
      const [seat, setSeat] = useState(null);
      const [theme, setTheme] = useState({ dark: false });
      const [themeMode, setThemeMode] = useState("auto"); // auto | clock | light | dark
      const [clockDark, setClockDark] = useState(() => clockDarkNow());
      const dark =
        themeMode === "clock"
          ? clockDark
          : themeMode === "light"
            ? false
            : themeMode === "dark"
              ? true
              : theme.dark;

      useEffect(() => {
        if (themeMode !== "clock") return undefined;
        setClockDark(clockDarkNow());
        const timer = setInterval(() => setClockDark(clockDarkNow()), 60 * 1000);
        return () => clearInterval(timer);
      }, [themeMode]);
      const [query, setQuery] = useState("");
      const [cursor, setCursor] = useState(-1);
      const [subCursor, setSubCursor] = useState(0);
      const searchRef = useRef(null);
      const loopRef = useRef(null);
      const stateRef = useRef(null);
      const stopTimerRef = useRef(0);
      const closeTimerRef = useRef(0);

      const triggerRef = useRef(null);
      const rootRef = useRef(null);
      const seatNodeRef = useRef(null);
      const panelNodeRef = useRef(null);
      const cardRefs = useRef({});
      const focusRef = useRef(null);
      const openRef = useRef(open);
      openRef.current = open;

      const themeVars = theme.dark
        ? {
            "--pcm-fg": "#e2e8f0",
            "--pcm-bg": "rgba(255,255,255,.07)",
            "--pcm-bd": "rgba(255,255,255,.15)",
            "--pcm-hoverfg": "#bfdbfe",
            "--pcm-hoverbg": "rgba(96,165,250,.16)",
            "--pcm-hoverbd": "rgba(147,197,253,.55)",
          }
        : {
            "--pcm-fg": "#334155",
            "--pcm-bg": "#ffffff",
            "--pcm-bd": "rgba(15,23,42,.10)",
            "--pcm-hoverfg": "#1d4ed8",
            "--pcm-hoverbg": "#f7fbff",
            "--pcm-hoverbd": "rgba(37,99,235,.45)",
          };

      stateRef.current = state;

      useEffect(ensureStyle, []);

      // Auto mode follows the *host's* theme, not the OS preference. Re-read on
      // attribute/class mutations, on media changes, and on a slow timer as a
      // last resort for theme switches that only rewrite CSS variables.
      useEffect(() => {
        if (themeMode !== "auto") return undefined;
        let alive = true;
        const read = () => {
          if (!alive) return;
          const next = resolveTheme(document, window).dark;
          setTheme((prev) => (prev.dark === next ? prev : { dark: next }));
        };
        read();
        const observer = new MutationObserver(read);
        for (const el of [document.documentElement, document.body]) {
          if (el) observer.observe(el, { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-color-mode"] });
        }
        const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        if (media?.addEventListener) media.addEventListener("change", read);
        const timer = setInterval(read, 2000);
        return () => {
          alive = false;
          observer.disconnect();
          if (media?.removeEventListener) media.removeEventListener("change", read);
          clearInterval(timer);
        };
      }, [themeMode]);

      useEffect(
        () => () => {
          if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        },
        [],
      );

      useEffect(() => {
        trace("picker rendered");
      }, []);

      // ── seat: keep the stock chip hidden and mirror its box every frame
      useEffect(() => {
        let hiddenNode = null;
        // If the document itself is transformed, `position: fixed` no longer maps
        // to viewport coordinates — fall back to absolute + scroll compensation.
        const transformedDoc = (() => {
          try {
            return detectContainingBlock(window, document);
          } catch {
            return false;
          }
        })();
        const seatPosition = transformedDoc ? "absolute" : "fixed";
        /**
         * Where does an `absolute` child of <body> actually start?
         *  - body static  -> initial containing block: viewport origin + scroll
         *  - body positioned (relative/absolute/...) -> body's border box, and the
         *    scroll offset is already baked into its rect
         */
        const boxOrigin = () => {
          if (!transformedDoc) return { origin: { x: 0, y: 0 }, scroll: { x: 0, y: 0 } };
          try {
            const positioned = getComputedStyle(document.body).position !== "static";
            if (!positioned) return { origin: { x: 0, y: 0 }, scroll: { x: window.scrollX, y: window.scrollY } };
            const body = document.body;
            return positionedBodyOrigin(body.getBoundingClientRect(), {
              left: body.clientLeft,
              top: body.clientTop,
            });
          } catch {
            return { origin: { x: 0, y: 0 }, scroll: { x: window.scrollX, y: window.scrollY } };
          }
        };

        const composerHost = () => {
          let host = document.querySelector("textarea, [contenteditable='true']");
          for (let depth = 0; depth < 6 && host; depth += 1) {
            if (host.offsetHeight > 90) break;
            host = host.parentElement;
          }
          return host;
        };

        let resizeObserver = null;
        if (typeof ResizeObserver === "function") {
          resizeObserver = new ResizeObserver(() => burst(300));
        }

        const locate = () => {
          if (seatMode) return; // the stock button is gone; the chip anchors itself
          const root = rootRef.current;
          const currentName = (() => {
            const now = stateRef.current ? stateRef.current.current : null;
            if (!now) return null;
            for (const group of (stateRef.current ? stateRef.current.groups : []) || []) {
              for (const model of group.models || []) {
                if (group.id === now.provider && model.id === now.model) return model.name;
              }
            }
            return null;
          })();
          let target = null;
          if (hiddenNode && hiddenNode.isConnected) {
            const box = hiddenNode.getBoundingClientRect();
            const text = (hiddenNode.textContent || "").replace(/\s+/g, " ");
            // Structure first: an icon-only or aria-relabelled seat must still pass.
            const structural = Boolean(
              hiddenNode.getAttribute("aria-haspopup") || hiddenNode.getAttribute("aria-expanded"),
            );
            const byLabel =
              /(low|medium|high|extra|max|minimal|请选择模型|select model)/i.test(text) ||
              Boolean(currentName && text.includes(currentName));
            const sized = box.width >= 20 && box.height >= 14;
            // Generous vertical range: during scroll the seat may sit off-screen,
            // that alone is not a reason to drop a valid anchor.
            const near = box.bottom > -window.innerHeight && box.top < window.innerHeight * 2;
            if (sized && near && (structural || byLabel)) target = hiddenNode;
          }
          if (!target) {
            // Structure first: the model seat is a popup-ish control that sits on
            // the composer footer next to the textarea. Only fall back to labels.
            const scope = composerHost() || document.body;
            const candidates = [];
            for (const node of scope.querySelectorAll("button, [role='button']")) {
              if (root && root.contains(node)) continue;
              const rect = node.getBoundingClientRect();
              if (rect.width < 36 || rect.height < 16 || rect.width > 460) continue;
              const text = (node.textContent || "").replace(/\s+/g, " ").trim();
              if (!text || text.length > 64) continue;
              candidates.push(node);
            }
            const label = (node) => (node.textContent || "").replace(/\s+/g, " ").trim();
            const popup = candidates.filter(
              (node) => node.getAttribute("aria-haspopup") || node.getAttribute("aria-expanded") === "false",
            );
            target =
              popup.find((node) => /(low|medium|high|extra|max|minimal|默认|档)/i.test(label(node))) ||
              (popup.length ? popup.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] : null) ||
              (currentName ? candidates.find((node) => label(node).includes(currentName)) : null) ||
              candidates.find((node) => /^(请选择模型|select model)$/i.test(label(node))) ||
              null;
          }
          if (!target) {
            const dark = resolveTheme(document, window).dark;
            setTheme((prev) => (prev.dark === dark ? prev : { dark }));
            const seatNode = seatNodeRef.current;
            if (seatNode) seatNode.style.visibility = "hidden";
            return;
          }
          const dark = resolveTheme(document, window).dark;
          setTheme((prev) => (prev.dark === dark ? prev : { dark }));
          if (hiddenNode !== target) {
            if (hiddenNode) {
            hiddenNode.style.visibility = "";
            hiddenNode.removeAttribute("data-pcm-hidden");
          }
            hiddenNode = target;
            target.style.visibility = "hidden";
            target.setAttribute("data-pcm-hidden", "1");
          }
          const seatNode = seatNodeRef.current;
          if (seatNode && seatNode.style.visibility === "hidden") seatNode.style.visibility = "";
          const rect = target.getBoundingClientRect();
          setSeat((prev) => {
            if (prev && Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1) return prev;
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          });
          if (resizeObserver) {
            try {
              resizeObserver.disconnect();
              resizeObserver.observe(document.documentElement);
              const host = composerHost();
              if (host) resizeObserver.observe(host);
            } catch {
              /* ignore */
            }
          }
          sync();
        };

        /** One read + one write. Cheap enough to call on layout events. */
        const sync = () => {
          // Anchor: the stock button when we are shadowing it, otherwise our own
          // chip (inline mode) — either way the panel follows the real thing.
          const stock = seatMode ? triggerRef.current : hiddenNode;
          if (!stock || !stock.isConnected) return;
          const rect = stock.getBoundingClientRect();
          const ctx = { transformed: transformedDoc, ...boxOrigin() };
          const seatNode = seatMode ? null : seatNodeRef.current;
          if (seatNode) {
            const box = seatBox(rect, ctx);
            seatNode.style.position = box.position;
            seatNode.style.left = `${box.left}px`;
            seatNode.style.top = `${box.top}px`;
            seatNode.style.width = `${box.width}px`;
            seatNode.style.height = `${box.height}px`;
          }
          const panelNode = panelNodeRef.current;
          if (panelNode && openRef.current) {
            const box = panelBox({
              ...ctx,
              rect,
              panelWidth: panelNode.offsetWidth || 884,
              panelHeight: panelNode.offsetHeight || 420,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
            });
            panelNode.style.position = box.position;
            panelNode.style.left = `${box.left}px`;
            panelNode.style.maxHeight = `${box.maxHeight}px`;
            if (box.top === null) {
              panelNode.style.top = "auto";
              panelNode.style.bottom = `${box.bottom}px`;
            } else {
              panelNode.style.top = `${box.top}px`;
              panelNode.style.bottom = "auto";
            }
          }
        };

        let raf = 0;
        /**
         * Frames are only consumed inside a "burst" window: while the panel is
         * open, or for a short time after any layout signal (DOM swap, new
         * conversation, transition). Outside of that the loop is fully stopped.
         */
        let burstUntil = 0;
        const startLoop = () => {
          if (raf || document.hidden) return;
          const tick = () => {
            sync();
            if (!openRef.current && performance.now() > burstUntil) {
              raf = 0;
              sync();
              return;
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        };
        const stopLoop = () => {
          if (!raf) return;
          cancelAnimationFrame(raf);
          raf = 0;
        };
        const burstGuard = createBurstGuard(3);
        const burst = (ms, urgent = true) => {
          burstUntil = burstGuard.next(performance.now(), ms, urgent);
          startLoop();
        };
        // Kept for the open/close effect: panel closing still needs frames while
        // the composer animates back.
        const stopAfter = (delay) => burst(delay);
        loopRef.current = { start: startLoop, stop: stopLoop, sync, burst, stopAfter };

        locate();
        sync();

        // Every signal below means "the composer may have moved" — none of them
        // changes the window size, so resize/scroll alone cannot catch them.
        const onLayoutSignal = () => burst(600);
        const onInteraction = () => burst(900);
        window.addEventListener("resize", onLayoutSignal);
        window.addEventListener("scroll", onLayoutSignal, true);
        document.addEventListener("transitionend", onLayoutSignal, true);
        document.addEventListener("animationend", onLayoutSignal, true);
        document.addEventListener("pointerdown", onInteraction, true);
        document.addEventListener("focusin", onInteraction, true);

        const onVisibility = () => {
          if (document.hidden) stopLoop();
          else if (openRef.current) startLoop();
          else sync();
        };
        document.addEventListener("visibilitychange", onVisibility);

        let relocated = 0;
        const observer = new MutationObserver(() => {
          // A new conversation swaps the whole composer subtree; the anchor may
          // survive while its box moves. Both cases need action.
          if (!hiddenNode || !hiddenNode.isConnected) {
            if (!relocated) {
              relocated = setTimeout(() => {
                relocated = 0;
                locate();
              }, 60);
            }
          }
          burst(500, false);
        });
        if (!seatMode) observer.observe(document.body, { childList: true, subtree: true });
        return () => {
          stopLoop();
          burstGuard.reset();
          if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
          loopRef.current = null;
          observer.disconnect();
          if (resizeObserver) resizeObserver.disconnect();
          if (relocated) clearTimeout(relocated);
          window.removeEventListener("resize", onLayoutSignal);
          window.removeEventListener("scroll", onLayoutSignal, true);
          document.removeEventListener("transitionend", onLayoutSignal, true);
          document.removeEventListener("animationend", onLayoutSignal, true);
          document.removeEventListener("pointerdown", onInteraction, true);
          document.removeEventListener("focusin", onInteraction, true);
          document.removeEventListener("visibilitychange", onVisibility);
          if (hiddenNode) {
            hiddenNode.style.visibility = "";
            hiddenNode.removeAttribute("data-pcm-hidden");
          }
        };
      }, []);

      // ── catalog
      const choices = state.choices;

      const visibleChoices = useMemo(() => filterChoices(choices, query), [choices, query]);

      const providers = state.providers;

      const current = state.current;
      const currentChoice = useMemo(() => {
        if (!current) return null;
        return choices.find((c) => c.provider === current.provider && c.model === current.model) || null;
      }, [choices, current]);

      const effortLabel = (choice, effortId) => {
        const efforts = (choice && choice.reasoning && choice.reasoning.efforts) || [];
        if (!efforts.length) return "固定深度";
        const id = effortId !== undefined ? effortId : choice.reasoning.defaultEffort;
        if (id === undefined) return "默认";
        const found = efforts.find((e) => e.id === id);
        return found ? found.name : String(id);
      };

      const effortsOf = (choice) => {
        const efforts = (choice && choice.reasoning && choice.reasoning.efforts) || [];
        return efforts.slice(0, 4).map((effort, index) => {
          const tier = EFFORT_TIERS[index];
          const same = tier && String(effort.name).toLowerCase() === tier.name.toLowerCase();
          return {
            id: effort.id,
            label: same ? tier.name : effort.name,
            sub: tier && /^(minimal|low|medium|high|extra|max)$/i.test(effort.name) ? tier.sub : "自定义推理预算",
            bars: Math.max(1, Math.round(((index + 1) / efforts.length) * 4)),
          };
        });
      };

      const quickChoices = useMemo(() => {
        const picked = [];
        for (const column of providers) {
          const best = column.models.find((m) => m.tier === "reasoning") || column.models[0];
          if (best && picked.length < 5) picked.push(best);
        }
        return picked;
      }, [providers]);

      const previewChoice = hovered
        ? choices.find((c) => c.provider === hovered.provider && c.model === hovered.model) || currentChoice
        : currentChoice;
      const previewVendor = previewChoice ? previewChoice.vendor : providers[0] ? providers[0].vendor : VENDORS.default;
      const previewTier = previewChoice ? TIERS.find((t) => t.key === previewChoice.tier) : null;

      // ── focus mode: lift the centred composer while the matrix is open
      const enterFocus = () => {
        try {
          if (focusRef.current) return;
          const triggerNode = triggerRef.current;
          if (!triggerNode) return;
          const triggerRect = triggerNode.getBoundingClientRect();
          if (triggerRect.top > window.innerHeight * 0.62) return;
          let wrap = document.querySelector("textarea, [contenteditable='true']");
          for (let depth = 0; depth < 5 && wrap; depth += 1) {
            if (wrap.offsetHeight > 90) break;
            wrap = wrap.parentElement;
          }
          if (!wrap) return;
          const wrapRect = wrap.getBoundingClientRect();
          const toBottom = Math.round(window.innerHeight - 18 - wrapRect.bottom);
          // Only move enough to give the panel room; a full slide to the bottom
          // makes the composer look stranded.
          const cap = Math.round(window.innerHeight * 0.26);
          const delta = Math.min(toBottom, cap);
          if (delta < 6) return;
          const titles = [];
          for (const node of document.querySelectorAll("h1, h2, h3")) {
            if (titles.length >= 3) break;
            const rect = node.getBoundingClientRect();
            if (rect.height < 18 || rect.top > wrapRect.top + 8) continue;
            if (parseFloat(getComputedStyle(node).fontSize) < 22) continue;
            titles.push(node);
          }
          focusRef.current = { wrap, titles, transform: wrap.style.transform, transition: wrap.style.transition };
          wrap.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)";
          wrap.style.transform = `translateY(${delta}px)`;
          for (const node of titles) {
            node.style.transition = "opacity .26s ease, transform .26s ease";
            node.style.opacity = "0";
            node.style.transform = "translateY(-10px)";
            node.style.pointerEvents = "none";
          }
          trace("focus on", delta, titles.length);
        } catch (err) {
          trace("focus failed", String(err && err.message ? err.message : err));
        }
      };
      const exitFocus = () => {
        const saved = focusRef.current;
        if (!saved) return;
        focusRef.current = null;
        try {
          saved.wrap.style.transform = saved.transform || "";
          saved.wrap.style.transition = saved.transition || "";
          for (const node of saved.titles) {
            node.style.opacity = "";
            node.style.transform = "";
            node.style.pointerEvents = "";
          }
        } catch {
          /* ignore */
        }
      };

      const openPanel = () => {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = 0;
        }
        setSubmenu(null);
        setHovered(null);
        setError(null);
        setClosing(false);
        enterFocus();
        setOpen(true);
      };
      const closePanel = () => {
        setSubmenu(null);
        exitFocus();
        setClosing(true);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = 0;
          setOpen(false);
          setClosing(false);
        }, 175);
      };

      useEffect(() => {
        const loop = loopRef.current;
        if (!loop) return;
        if (open) {
          if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = 0;
          }
          loop.start();
        } else {
          loop.stopAfter(650);
        }
      }, [open]);

      useEffect(() => {
        if (!open) return undefined;
        setQuery("");
        setCursor(-1);
        const timer = setTimeout(() => {
          try {
            searchRef.current?.focus();
          } catch {
            /* ignore */
          }
        }, 40);
        return () => clearTimeout(timer);
      }, [open]);

      useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (submenu) setSubmenu(null);
            else closePanel();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const delta = event.key === "ArrowDown" ? 1 : -1;
            if (submenu) {
              setSubCursor((prev) => Math.max(0, prev + delta));
              return;
            }
            setCursor((prev) => {
              const next = prev + delta;
              if (next < 0) return 0;
              if (next > visibleChoices.length - 1) return visibleChoices.length - 1;
              return next;
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (submenu) {
              const choice = choices.find((c) => c.provider === submenu.provider && c.model === submenu.model);
              const tier = choice ? effortsOf(choice)[subCursor] : null;
              if (choice && tier) accept(choice, tier.id);
              return;
            }
            const choice = visibleChoices[cursor >= 0 ? cursor : 0];
            if (!choice) return;
            const key = `${choice.provider}/${choice.model}`;
            const node = cardRefs.current[key] || triggerRef.current;
            if (effortsOf(choice).length) setSubCursor(0);
            openChoice(choice, node);
          }
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
      }, [open, submenu, cursor, subCursor, visibleChoices]);

      const accept = async (choice, effortId) => {
        if (!choice) return;
        const selection = { provider: choice.provider, model: choice.model };
        if (effortId !== undefined) selection.reasoningEffort = effortId;
        try {
          const result = await select(selection);
          if (result && result.ok === false) {
            setError(`${result.error?.code || "error"}：${result.error?.message || "切换失败"}`);
            return;
          }
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
          return;
        }
        setError(null);
        closePanel();
      };

      const openChoice = (choice, node) => {
        if (locked || !choice) return;
        const efforts = (choice.reasoning && choice.reasoning.efforts) || [];
        if (!efforts.length) {
          accept(choice);
          return;
        }
        const rect = node.getBoundingClientRect();
        setSubmenu({ provider: choice.provider, model: choice.model, rect });
      };

      // ── trigger
      const trigger = h(
        "button",
        {
          ref: triggerRef,
          type: "button",
          className: "pcm-trigger",
          "data-pcm-trigger": "1",
          onClick: open ? closePanel : openPanel,
          title: "模型能力矩阵",
          "aria-haspopup": "dialog",
          "aria-expanded": open,
        },
        h("span", { className: "ic", style: { color: (currentChoice ? currentChoice.vendor : VENDORS.default).color } },
          (currentChoice ? currentChoice.vendor : VENDORS.default).icon),
        h("span", { className: "nm" }, currentChoice ? currentChoice.name : "请选择模型"),
        currentChoice
          ? h("span", { className: "nm", style: { color: "#94a3b8", flex: "0 0 auto" } }, `· ${effortLabel(currentChoice, current?.reasoningEffort)}`)
          : null,
        h("span", { className: "caret" }, "▾"),
      );

      const triggerSlot = seat
        ? createPortal(
            h(
              "span",
              {
                className: "pcm-seat",
                ref: seatNodeRef,
                style: {
                  ...themeVars,
                  position: "fixed",
                  left: `${seat.left}px`,
                  top: `${seat.top}px`,
                  width: `${seat.width}px`,
                  height: `${seat.height}px`,
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                  zIndex: 9,
                },
              },
              trigger,
            ),
            document.body,
          )
        : trigger;

      if (!open) {
        return h("span", { ref: rootRef, style: { display: "inline-flex", marginLeft: "auto", ...themeVars } }, triggerSlot);
      }

      // ── panel body
      const panelWidth = Math.min(884, window.innerWidth - 28);
      const triggerRect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
      const triggerCenter = triggerRect ? triggerRect.left + triggerRect.width / 2 : window.innerWidth / 2;
      const panelLeft = Math.round(Math.min(Math.max(triggerCenter - panelWidth / 2, 14), window.innerWidth - panelWidth - 14));
      const panelBottom = triggerRect ? Math.round(window.innerHeight - triggerRect.top + 12) : 96;

      const head = h(
        "div",
        { className: "pcm-head" },
        h(
          "div",
          { className: "pcm-badge", style: { background: previewVendor.soft, boxShadow: `inset 0 0 0 1px ${previewVendor.color}33` } },
          h("span", { className: "ic", style: { color: previewVendor.color } }, previewVendor.icon),
          h("span", { className: "abbr", style: { color: previewVendor.ink } }, previewVendor.label),
        ),
        h(
          "div",
          { className: "pcm-meta" },
          h(
            "div",
            { className: "pcm-title" },
            previewChoice ? previewChoice.name : "选择模型",
            h("span", { style: { color: "#94a3b8", fontWeight: 500, fontSize: 12.5 } }, previewVendor.label),
          ),
          h(
            "div",
            { className: "pcm-tags" },
            previewTier ? h("span", { className: "pcm-tag", style: { background: previewVendor.soft, color: previewVendor.ink } }, previewTier.label) : null,
            previewChoice && (previewChoice.reasoning?.efforts?.length || 0) > 0
              ? h("span", { className: "pcm-tag" }, `${previewChoice.reasoning.efforts.length} 档思考`)
              : h("span", { className: "pcm-tag" }, "固定深度"),
            ...(previewChoice ? previewChoice.badges.map((badge) => h("span", { key: badge, className: "pcm-tag" }, badge)) : []),
            currentChoice && previewChoice && currentChoice.model === previewChoice.model && currentChoice.provider === previewChoice.provider
              ? h("span", { className: "pcm-tag", style: { background: "#eff6ff", color: "#1d4ed8" } }, "当前使用")
              : null,
          ),
          h(
            "div",
            { className: "pcm-desc" },
            previewChoice
              ? `${previewChoice.providerName} · ${previewTier ? previewTier.hint : "综合能力"}${previewChoice.badges.length ? ` · ${previewChoice.badges.join(" / ")}` : ""}`
              : "该厂商尚未接入：把模型加进目录后会自动出现在这一列。",
          ),
        ),
      );

      const quick = h(
        "div",
        { className: "pcm-quick", onMouseLeave: () => setHovered(null) },
        quickChoices.map((choice) =>
          h(
            "button",
            {
              key: `${choice.provider}/${choice.model}`,
              type: "button",
              className: "pcm-pill",
              onMouseEnter: () => setHovered({ provider: choice.provider, model: choice.model }),
              onClick: () => openChoice(choice, cardRefs.current[`${choice.provider}/${choice.model}`] || triggerRef.current),
            },
            h("i", { className: "dot", style: { background: choice.vendor.color } }),
            h("span", null, choice.name),
            h("span", { style: { color: "#94a3b8" } }, TIERS.find((t) => t.key === choice.tier)?.label || ""),
          ),
        ),
      );

      const matrix = h(
        "div",
        { className: "pcm-matrix", onMouseLeave: () => setHovered(null), style: { gridTemplateColumns: `repeat(${Math.max(providers.length, 1)},minmax(0,1fr))` } },
        providers.map((column) =>
          h(
            "div",
            { key: column.id, className: "pcm-col" },
            h(
              "div",
              { className: "pcm-colhead" },
              h("i", { style: { background: column.vendor.color } }),
              h("span", null, column.vendor.label),
            ),
            TIERS.map((tier) => {
              const cells = column.models.filter((choice) => choice.tier === tier.key && visibleChoices.includes(choice));
              return h(
                "div",
                { key: tier.key, className: "pcm-cell" },
                cells.length
                  ? cells.map((choice) => {
                      const key = `${choice.provider}/${choice.model}`;
                      const selected =
                        currentChoice && currentChoice.provider === choice.provider && currentChoice.model === choice.model;
                      return h(
                        "button",
                        {
                          key,
                          type: "button",
                          ref: (node) => {
                            if (node) cardRefs.current[key] = node;
                          },
                          className: `pcm-card${selected ? " sel" : ""}${cursor >= 0 && visibleChoices[cursor] === choice ? " hot" : ""}`,
                          style: {
                            background: selected ? choice.vendor.soft : "#fff",
                            borderColor: selected ? "#2563eb" : `${choice.vendor.color}44`,
                            boxShadow: selected ? undefined : `inset 0 0 0 1px ${choice.vendor.color}12`,
                          },
                          onMouseEnter: () => setHovered({ provider: choice.provider, model: choice.model }),
                          onClick: () => openChoice(choice, cardRefs.current[key]),
                        },
                        h("span", { className: "nm" }, choice.name),
                        h(
                          "span",
                          { className: "sub" },
                          (choice.reasoning?.efforts?.length || 0) > 0
                            ? `${choice.reasoning.efforts.length} 档思考`
                            : "固定深度",
                        ),
                        choice.badges.length
                          ? h(
                              "span",
                              { className: "bd" },
                              choice.badges.map((badge) => h("i", { key: badge }, badge)),
                            )
                          : null,
                      );
                    })
                  : column.ghost
                    ? h(
                        "button",
                        {
                          type: "button",
                          className: "pcm-card ghost",
                          onMouseEnter: () => setHovered(null),
                        },
                        h("span", { className: "nm" }, "未接入"),
                        h("span", { className: "sub" }, tier.label),
                      )
                    : null,
              );
            }),
          ),
        ),
      );

      const legend = h(
        "div",
        { className: "pcm-legend" },
        ...TIERS.map((tier) =>
          h(
            "span",
            { key: tier.key, className: "item" },
            h("i", { style: { background: "#cbd5e1" } }),
            `${tier.label} · ${tier.hint}`,
          ),
        ),
        h(
          "span",
          { className: "pcm-count" },
          `${choices.length ? providers.filter((p) => !p.ghost).length : 0} Providers · ${choices.length} Models`,
        ),
      );

      const panel = h(
        "div",
        {
          ref: panelNodeRef,
          className: `pcm-panel ${dark ? "dark" : "light"}${closing ? " is-closing" : ""}`,
          style: {
            left: `${panelLeft}px`,
            bottom: `${panelBottom}px`,
            maxHeight: `${Math.max(320, window.innerHeight - panelBottom - 16)}px`,
            transformOrigin: `50% calc(100% + ${panelBottom}px)`,
          },
          onMouseDown: (e) => e.stopPropagation(),
          role: "dialog",
          "aria-label": "模型能力矩阵",
        },
        h(
          "button",
          {
            className: "pcm-theme",
            type: "button",
            title: `主题：${THEME_MODE_LABEL[themeMode]}（点击切换）`,
            "aria-label": `主题：${THEME_MODE_LABEL[themeMode]}`,
            onClick: () =>
              setThemeMode((mode) =>
                mode === "auto" ? "clock" : mode === "clock" ? "light" : mode === "light" ? "dark" : "auto",
              ),
          },
          THEME_MODE_ICON[themeMode],
        ),
        h("button", { className: "pcm-x", type: "button", onClick: closePanel, "aria-label": "关闭" }, "✕"),
        head,
        h(
          "div",
          { className: "pcm-search" },
          h("input", {
            ref: searchRef,
            type: "search",
            value: query,
            placeholder: "搜索模型 / 厂商…（↑↓ 选择，Enter 确认）",
            onChange: (event) => {
              setQuery(event.target.value);
              setCursor(-1);
            },
          }),
        ),
        quick,
        error ? h("div", { className: "pcm-err" }, error) : null,
        matrix,
        visibleChoices.length === 0
          ? h("div", { className: "pcm-empty" }, "没有匹配的模型，换个关键词试试")
          : null,
        legend,
      );

      let menu = null;
      if (submenu) {
        const choice = choices.find((c) => c.provider === submenu.provider && c.model === submenu.model);
        if (choice) {
          const efforts = effortsOf(choice);
          const rect = submenu.rect;
          const mw = 272;
          const mh = 96 + efforts.length * 44;
          const toRight = rect.left + rect.width / 2 < window.innerWidth / 2;
          let left = toRight ? rect.right + 16 : rect.left - mw - 16;
          left = Math.max(12, Math.min(left, window.innerWidth - mw - 12));
          let top = rect.top - 8;
          top = Math.max(12, Math.min(top, window.innerHeight - mh - 12));
          menu = h(
            "div",
            {
              className: `pcm-menu ${dark ? "dark" : "light"}`,
              style: { left: `${left}px`, top: `${top}px`, "--pcm-origin": toRight ? "left top" : "right top" },
              onMouseDown: (e) => e.stopPropagation(),
              role: "menu",
            },
            h(
              "div",
              { className: "pcm-menu-head" },
              h(
                "button",
                {
                  className: "pcm-back",
                  type: "button",
                  title: "返回模型列表",
                  "aria-label": "返回模型列表",
                  onClick: () => setSubmenu(null),
                },
                "←",
              ),
              h(
                "div",
                { className: "dot", style: { background: choice.vendor.soft, color: choice.vendor.ink } },
                choice.vendor.icon,
              ),
              h(
                "div",
                { style: { minWidth: 0 } },
                h("div", { className: "nm" }, choice.name),
                h("div", { className: "ds" }, `${choice.vendor.label} · 思考深度`),
              ),
            ),
            efforts.map((tier) => {
              const on =
                currentChoice &&
                currentChoice.provider === choice.provider &&
                currentChoice.model === choice.model &&
                (current?.reasoningEffort === tier.id ||
                  (tier.id === undefined && current?.reasoningEffort === undefined));
              return h(
                "button",
                {
                  key: String(tier.id) + tier.label,
                  type: "button",
                  className: `pcm-opt${on ? " on" : ""}`,
                  onClick: () => accept(choice, tier.id),
                },
                h("span", { className: "lab" }, h("b", null, tier.label), h("span", null, tier.sub)),
                h(Bars, { bars: tier.bars }),
              );
            }),
          );
        }
      }

      return h(
        "span",
        { ref: rootRef, style: { display: "inline-flex", marginLeft: "auto", ...themeVars } },
        triggerSlot,
        createPortal(
          h(
            react.Fragment,
            null,
            h("div", {
              className: "pcm-overlay",
              style: { position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,.12)" },
              onMouseDown: () => {
                if (overlayAction(Boolean(submenu)) === "close-menu") setSubmenu(null);
                else closePanel();
              },
            }),
            panel,
            menu,
          ),
          document.body,
        ),
      );
    }

    /** Theme modes for the panel theme control, in cycle order. */
    const THEME_MODE_LABEL = { auto: "跟随 DSH 主题", clock: "跟随系统时间", light: "白昼", dark: "黑夜" };
    const THEME_MODE_ICON = { auto: "◐", clock: "⏱", light: "☀", dark: "☾" };

    /** Keeps a render crash inside the picker: the composer keeps working. */
    class PickerBoundary extends react.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }

      static getDerivedStateFromError() {
        return { failed: true };
      }

      componentDidCatch(error) {
        try {
          console.error("[pcm] picker crashed:", error);
        } catch {
          /* ignore */
        }
        try {
          for (const node of document.querySelectorAll("[data-pcm-hidden]")) {
            node.style.visibility = "";
            node.removeAttribute("data-pcm-hidden");
          }
        } catch {
          /* ignore */
        }
      }

      render() {
        return this.state.failed ? null : this.props.children;
      }
    }

    /** Slot component wrapper so the boundary owns the picker subtree. */
    function GuardedPicker(props) {
      return h(PickerBoundary, null, h(PeriodicPicker, props));
    }

    // ─────────────────────────────────────────────────────────── plugin

    function apply(ctx) {
      trace("apply() entered");
      const msgOf = (error) => String(error && error.message ? error.message : error);

      const mountSeat = (scope, slotName, sessions) => {
        const models = scope.modelDirectories;
        scope.slots.inject(slotName, () =>
          scope.slots.register(
            {
              name: slotName,
              id: "constellation-picker",
              ...(slotName === "conversation.input.model" ? { priority: -100 } : {}),
              inject: (sessionId) => {
                const directory = models.directoryFor(sessionId);
                let available = true;
                try {
                  available =
                    !sessions ||
                    typeof sessions.subagentAddress !== "function" ||
                    sessions.subagentAddress(sessionId) === undefined;
                } catch {
                  available = true;
                }
                return {
                  sessionId,
                  available,
                  directory: directory.store,
                  load: () => {
                    if (available) directory.load().catch(() => {});
                  },
                  select: (selection) => (available ? directory.select(selection) : Promise.resolve({ ok: true })),
                };
              },
            },
            (slotProps) =>
              h(GuardedPicker, { ...slotProps, seatMode: slotName === "conversation.input.model" }),
          ),
        );
        trace("slot registered:", slotName);
      };

      try {
        ctx.inject(["slots", "modelDirectories", "sessions"], (scope) => {
          trace("services ready");
          let sessions = null;
          try {
            sessions = scope.sessions;
          } catch (error) {
            sessions = null;
          }
          const mountDock = () => {
            try {
              mountSeat(scope, "conversation.input.dock", sessions);
            } catch (error) {
              trace("dock seat failed:", msgOf(error));
            }
          };
          try {
            mountSeat(scope, "conversation.input.model", sessions);
            setTimeout(() => {
              try {
                if (!document.querySelector("[data-pcm-trigger]")) {
                  trace("model seat silent, falling back to dock");
                  mountDock();
                }
              } catch {
                /* ignore */
              }
            }, 1500);
          } catch (error) {
            trace("model seat failed:", msgOf(error));
            mountDock();
          }
        });
      } catch (error) {
        trace("inject failed:", msgOf(error));
      }
    }

    exports.apply = apply;
    exports.inject = ["slots", "modelDirectories"];
    exports.PeriodicPicker = PeriodicPicker;
    return module.exports;
  },
});