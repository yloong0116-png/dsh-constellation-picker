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
import { VENDORS } from "./core/vendor.js";
import { TIERS } from "./core/classifier.js";
import { effortsOf, effortLabel } from "./core/reasoning.js";
import { toChoices, toProviders, filterChoices } from "./core/catalog.js";
import { seatBox, panelBox, positionedBodyOrigin } from "./core/positioning.js";
import { createBurstGuard } from "./core/burst.js";
import { detectContainingBlock } from "./core/containing-block.js";
import { createPickerController } from "./adapter/controller.js";

window.__ModuleLoader__.load({
  id: "dsh-constellation-picker",
  factory: (require) => {
    "use strict";

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

      const controller = useMemo(() => createPickerController({ directory, select, load }), [directory]);
      const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

      const [open, setOpen] = useState(false);
      const [closing, setClosing] = useState(false);
      const [hovered, setHovered] = useState(null); // { provider, model }
      const [submenu, setSubmenu] = useState(null); // { provider, model, rect }
      const [error, setError] = useState(null);
      const [seat, setSeat] = useState(null);
      const [theme, setTheme] = useState({ dark: false });
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
        const luminance = (color) => {
          const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(color || "");
          if (!match) return null;
          if (match[4] !== undefined && Number(match[4]) < 0.2) return null;
          return (0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3])) / 255;
        };
        const detectDark = (node) => {
          let host = node || document.body;
          for (let depth = 0; depth < 8 && host; depth += 1) {
            const lum = luminance(getComputedStyle(host).backgroundColor);
            if (lum !== null) return lum < 0.5;
            host = host.parentElement;
          }
          const bodyLum = luminance(getComputedStyle(document.body).backgroundColor);
          return bodyLum !== null ? bodyLum < 0.5 : false;
        };

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
            const dark = detectDark(null);
            setTheme((prev) => (prev.dark === dark ? prev : { dark }));
            const seatNode = seatNodeRef.current;
            if (seatNode) seatNode.style.visibility = "hidden";
            return;
          }
          const dark = detectDark(target.parentElement);
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
          const stock = hiddenNode;
          if (!stock || !stock.isConnected) return;
          const rect = stock.getBoundingClientRect();
          const ctx = { transformed: transformedDoc, ...boxOrigin() };
          const seatNode = seatNodeRef.current;
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
        observer.observe(document.body, { childList: true, subtree: true });
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
          const delta = Math.round(window.innerHeight - 18 - wrapRect.bottom);
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
        { className: "pcm-quick" },
        quickChoices.map((choice) =>
          h(
            "button",
            {
              key: `${choice.provider}/${choice.model}`,
              type: "button",
              className: "pcm-pill",
              onMouseEnter: () => setHovered({ provider: choice.provider, model: choice.model }),
              onMouseLeave: () => setHovered(null),
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
        { className: "pcm-matrix", style: { gridTemplateColumns: `repeat(${Math.max(providers.length, 1)},minmax(0,1fr))` } },
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
                          onMouseLeave: () => setHovered(null),
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
          className: `pcm-panel${closing ? " is-closing" : ""}`,
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
              className: "pcm-menu",
              style: { left: `${left}px`, top: `${top}px`, "--pcm-origin": toRight ? "left top" : "right top" },
              onMouseDown: (e) => e.stopPropagation(),
              role: "menu",
            },
            h(
              "div",
              { className: "pcm-menu-head" },
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
            h("div", { className: "pcm-overlay", style: { position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,.12)" }, onMouseDown: closePanel }),
            panel,
            menu,
          ),
          document.body,
        ),
      );
    }

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
              ...(slotName === "conversation.input.model" ? { locale: "model", priority: -100 } : {}),
              ...(slotName === "conversation.input.model"
                ? { children: { "conversation.input.model.label": { kind: "single", scope: "session", inline: true } } }
                : {}),
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
            GuardedPicker,
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
