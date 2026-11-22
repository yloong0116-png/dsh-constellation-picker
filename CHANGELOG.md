# Changelog

本项目从「元素周期表选择器」演进为「多厂商星系矩阵」，版本号与结构改动对应如下。

> **状态：0.4.4-rc.1 冻结（2026-11-23）**
>
> 定位相关代码停止改动。发布 stable 前需要在真实 DSH 客户端完成四项验证：
>
> 1. 流式输出录制 10 秒，确认没有持续的 rAF 帧；
> 2. 新建对话 / 快速切换会话时胶囊始终贴合原生模型位；
> 3. 模型位被图标化或仅保留 aria-label 时，锚点仍能被识别；
> 4. `getComputedStyle(document.body)` 的 `position` 与 `transform` 实际取值（决定走 fixed 还是 absolute 分支）。
>
> 验证通过则发布 0.4.4 stable；期间只修回归，不加功能。

## 0.5.1 — 2026-11-23

**面板与胶囊脱离（新建对话）**

- 根因：抢到 model seat 后胶囊改为 inline 渲染，定位 effect 被整体跳过，于是 `sync()` 不再运行，面板只剩首次渲染时算出的 `left/bottom` 快照——输入框下移时面板自然停在原处。
- 修复：effect 不再在 seat 模式下早退；`sync()` 的锚点按模式选择（shadow 模式 = 原生按钮，inline 模式 = 胶囊自身），并且只在 shadow 模式下写胶囊的 fixed 坐标。面板位置每帧都由真实 rect 计算。

**自动主题不跟随 DSH**

- 根因：主题探测写在 `locate()` 里，而 inline 模式不跑 locate；即使跑，也只在定位时读一次，没有监听宿主主题变化。
- 修复：抽出 `resolveTheme(doc, win)`（属性 → class → 背景亮度，返回 `{ dark, source }`），`auto` 模式独立监听 `<html>`/`<body>` 的 `class` / `style` / `data-theme` / `data-color-mode` 变化、`prefers-color-scheme`、并每 2s 兜底重读；卸载时清理全部监听。手动 Light/Dark 仍然优先，切回 auto 立即重读。

**新对话下移幅度**

- 下移距离加了上限 `min(到底部, 26vh)`，只为面板留出空间，不再一路滑到底。面板定位仍按调整后的真实胶囊位置计算。

## 0.5.0 — 2026-11-23

- 修复接管 model slot 后胶囊位置偏移、内容被截断：`priority: -100` 生效后原生模型按钮**不再渲染**，而定位逻辑仍在找一个并不存在的按钮，最终匹配到旁边的其它 popup 控件（位置偏左、宽度按它计算）。
- 现在按槽位区分两种渲染模式：
  - 模型位（`conversation.input.model`）：胶囊直接 inline 渲染在工具栏里，宽度由内容决定，不再做 fixed 贴靠；
  - 兜底槽（`conversation.input.dock`）：仍用固定的 rAF/burst 定位去贴原生按钮。
- 实现方式：注册时用一个包装组件把 `seatMode` 传进 UI，定位 effect 在该模式下直接不挂载（同时省掉 observer 与帧循环）。

## 0.4.9 — 2026-11-23

- 修复模型位注册失败：`slot "conversation.input.model.label" is already declared`。早期为了对齐官方声明，给模型位 slot 加了 `children` 子槽，与官方 model-selection 的子槽重名冲突，导致注册抛错并退化到 `conversation.input.dock`（表现为胶囊位置不对）。现只保留 `priority: -100`。
- 说明：F5 后出现的 `client.js 404` 是 host 没有重新扫描 bundle 表（移除/添加插件之后必须完全重启应用，F5 不够）；本次是重启后残留的注册冲突。

## 0.4.8 — 2026-11-23

- 面板右上角的主题按钮从「明/暗」两态改为**四态循环**：`跟随 DSH 主题 → 跟随系统时间 → 白昼 → 黑夜`，图标依次为 ◐ / ⏱ / ☀ / ☾，`title` 与 `aria-label` 显示当前模式。
- 「跟随系统时间」：18:00–05:59 使用黑夜配色，06:00–17:59 使用白昼配色；每分钟检查一次以跨过时间点，切换模式时立即重算。
- 判定逻辑抽到 `src/core/theme.js`（`clockDark(hour)` / `clockDarkNow(date)`），新增 5 条单测覆盖边界（5/6/17/18 点、夜间时段、非法输入）。

## 0.4.7 — 2026-11-23

**P0：修复 `GET .../plugins/??dsh-constellation-picker/client.js` 404 导致的 boot 失败**

- 崩溃现场给出确切证据：DSH 请求的是 `<包目录>/client.js`，而产物只存在于 `lib/client.js`，`exports["./client"]` 并没有被用于这个 URL。于是 bundle 404 → import failed → `web boot: 1 entry did not activate` → 应用无法启动。
- 修复：`build.mjs` 同时输出 `client.js`（包根）与 `lib/client.js`（保持 exports 兼容），两种解析规则都能命中；`files` 列表加入 `client.js`。
- 复盘：上一轮我把包根那个 `client.js` 判断成误 cp 的冗余文件并删除，实际它是 DSH 真正加载的入口。这次删除是我造成的回归，已恢复。

**视觉**

- 模型名一律使用 `#111111`，不再随主题变白；为保证黑字可读，暗色模式下的卡片底色改为浅灰 `#E9ECF1`，副标题与徽标使用独立的 `--pcm-card-muted`（暗色下 `#5B6472`）。

## 0.4.6 — 2026-11-23

UI 细节打磨与双主题适配（仅视觉与交互，未动定位机制）：

- **模型名高对比度**：卡片内的模型名改为 12px / 650 字重，颜色走 `--pcm-name` token——白昼 `#111111`、黑夜 `#FFFFFF`，与卡片底色强制反差；副标题、徽标、厂商列头同步改用次级 token，不再和模型名抢视线。
- **悬停粘滞（Sticky Hover）**：移除单个卡片/快捷胶囊的 `onMouseLeave`。现在只有鼠标离开整个矩阵容器或快捷栏时才回到「当前已选模型」，从 A 划到 B 途中经过间隙不会闪回。
- **双主题（Design Tokens）**：面板与二级气泡全面改为 CSS 变量体系，`light` / `dark` 两套 token（表面色 `#FFFFFF`/`#14161A`、次表面 `#F8FAFC`/`#1E2028`、描边 `rgba(15,23,42,.09)`/`rgba(255,255,255,.1)`、强调微光、阴影分别调暗）。默认跟随 DSH 客户端主题（沿用既有的背景亮度检测），面板右上角新增 ☀/☾ 按钮可手动预览切换。
- 未改动：定位与坐标、模型选择 API、厂商分类、档位逻辑。

## 0.4.5 — 2026-11-23

**P0：修复 F5 刷新时的 `Identifier 'VENDORS' has already been declared`**

- **根因（跨插件作用域冲突，不是自身重复声明）**：`build.mjs` 之前把 `src/core/*` 的代码剥掉 import/export 后**拼接在脚本顶层**，于是产物文件顶部出现 `const VENDORS = {...}`、`const TIERS = ...` 等一批顶层词法声明。DSH 的 client 模块通过 `plugins/??a.js&b.js` 这种 combo URL 把多个插件的 bundle 串成一个响应，它们在**同一个 Realm 的同一个脚本作用域**里执行，因此只要任一相邻插件也声明了同名标识符，就会在解析阶段抛 SyntaxError —— 而且这个错误会让整串 combo 的后续模块（例如 `dsh-mnemon`）一起加载失败。
- **修复**：构建产物改为「零顶层声明」——`build.mjs` 把 8 个模块连同缩进一起注入到 `factory` 闭包内部（`/*__INJECT_MODULES__*/` 标记位），产物顶层只剩一条 `window.__ModuleLoader__.load({...})` 语句。构建脚本自带断言：若产物出现任何顶格 `const` / `let` / `class` / `function` 就构建失败。
- 没有改名规避、没有 try/catch、没有延迟执行；core / adapter / ui 分层与运行行为完全不变。
- 新增 4 条 bundle 级回归测试（`tests/bundle.test.mjs`，用 `node:vm` 在同一 Realm 里执行）：产物无顶层声明、同一 Realm 连跑两次不抛错、与另一个声明 `const VENDORS` 的 bundle 共存不抛错、只注册一个模块 id。
- 定位机制与 0.4.4-rc.2 完全相同，仍待真机四项验证。

## 0.4.4-rc.2 — 2026-11-23

坐标边界核查（仅此一处修正，其余不动）：

- `positionedBodyOrigin()`：`<body>` 自身被定位时，`absolute` 子元素的 containing block 是 body 的 **padding box**，其原点是 border box 的 `getBoundingClientRect()` 左上角**加上 `clientLeft` / `clientTop`**（即 border 宽度）。此前直接用 `rect.left/top`，在 body 有非零 border 时会整体偏一个 border 宽度。默认 UA 样式 body 只有 `margin: 8px`、border 为 0，所以实际偏差为 0，但公式缺项已补齐。
- 同时确认：padding 不影响原点；页面滚动已包含在 body 的 rect 内（不叠加 scroll）；body 自身滚动容器也不影响 padding box 原点。
- 新增 3 条纯函数测试：无 border、有 border、与 `seatBox` 组合时只补偿一次。

## 0.4.4 — 2026-11-23

第二轮定位审查的两处修正（均为代码层面可证的缺陷，非推测）：

- **锚点校验不再只认文本**：缓存的锚点此前必须「文本含档位词或当前模型名」才被复用，一旦 DSH 把模型位改成纯图标 / 仅 aria-label 就会被误丢弃。现在结构信号（`aria-haspopup` / `aria-expanded`）与文本命中取**或**关系；尺寸下限从 36×16 放宽到 20×14（覆盖图标态），视口范围从 ±80px 放宽到「上下各一屏」，滚动中不再因锚点暂时离屏而丢弃。
- **absolute 分支的 containing block 原点修正**：此前直接用 `scrollX/scrollY` 当作 `absolute` 坐标系，隐含假设 `<body>` 是 `static`。当 body 被设为 `position: relative`（或 absolute/fixed）时，absolute 子元素相对的是 body 的 border box，而 body 的 margin 偏移会让胶囊整体偏移（默认 margin 8px 就会偏 8px）。现在按实际 `offsetParent` 分两种情况：body 静态 → 视口原点 + 滚动；body 定位 → 减去 body 的 `getBoundingClientRect()` 左上角（滚动已包含在 rect 内，不再叠加）。
- 新增 2 条几何测试：positioned body 下 `seatBox` / `panelBox` 的坐标。

## 0.4.3 — 2026-11-23

针对 0.4.2 定位机制的边界审查与修复：

- **burst 窗口不再无上限延长**（P0）：此前每个 MutationObserver 回调都用 `Math.max` 把结束时间往后推，对话流式输出（DOM 每帧变化）会让 rAF 事实上永久运行。现区分信号等级——非紧急信号（DOM 变更）最多延长 3 次，且两次窗口之间强制冷却 800ms；紧急信号（`pointerdown` / `focusin` / `transitionend` / `animationend` / `resize`）不受限，因为它们稀有且语义明确。
- **containing block 检测补全**（P1）：原来只查 `document.body` 的 `transform`。现在同时检查 `<html>` 与 `<body>`，并覆盖 `filter` / `perspective` / `will-change`(transform|filter|perspective) / `contain`(paint|layout|strict|content) —— 这些都会让 `position: fixed` 相对该元素而非视口。
- **缓存锚点增加有效性校验**（P1）：`isConnected` 为真不代表它还是模型位。现在复用前校验尺寸、是否在视口附近、文本是否仍含档位词或当前模型名，不合格则丢弃缓存重新走结构特征搜索。
- **找不到锚点时隐藏胶囊**（P2）：此前会停在最后一次的坐标上漂移；现在直接 `visibility: hidden`，重新找到锚点即恢复。
- 修复构建期语法错误：`extends` 是严格模式保留字，`createBurstGuard` 内部改用 `extensions`。
- 新增 `tests/lifecycle.test.mjs`（7 条）：burst 封顶、冷却、紧急信号优先、窗口过期后计数重置、containing block 四类属性。

## 0.4.2 — 2026-11-23

- 修复：新建对话后胶囊不再跟随输入框。根因是「新建对话」属于布局重排，不产生 resize / scroll 事件，ResizeObserver 只报告尺寸变化而这里尺寸没变、只是位置变了；同时 MutationObserver 回调在锚点仍连接时直接 return，导致整条同步链路拿不到信号。
- 位置同步改为 burst 窗口：面板打开时逐帧；其余时间由 DOM 变更、`transitionend` / `animationend`、`pointerdown` / `focusin`、`ResizeObserver`（composer 容器 + documentElement）触发 300–900ms 的短时逐帧，窗口结束立即停止，无常驻 rAF。
- `locate()` 末尾立即 `sync()`：锚点被 DSH 替换后位置当场归位，不再等循环启动。
- 坐标系防御：检测 body 是否带 transform，命中时胶囊与面板改用 absolute + scroll 补偿；坐标计算抽到 `src/core/positioning.js`，新增 6 条几何单测（视口 / 文档两种模式、左右边界 clamp、面板上沿计算）。
- 新增监听全部在卸载时解绑；`ResizeObserver` 在每次重定位后重新绑定当前 composer 容器。

## 0.4.1 — 2026-11-23

- 修复：选完模型后面板收起、输入框回弹时，胶囊停在旧坐标。根因是定位 effect 依赖 `state.current.model`，换模型会重建整个定位生命周期，而重建后 rAF 只在 `[open]` 变化时启动，面板已关闭所以新的 loop 从未跑起来。
- 定位生命周期改为 `[]` 单次挂载，模型状态经 `stateRef` 读取；关闭面板后 loop 继续运行 650ms，覆盖输入框回弹过渡，停止前再同步一次。
- 重开面板会取消待执行的停止定时器；卸载时清理 rAF、定时器与全部 observer。

## 0.4.0 — 2026-11-23

**Developer-first architecture**

- 源码拆分：`src/core/`（vendor / classifier / reasoning / catalog 纯函数）、`src/adapter/controller.js`（框架无关 Controller）、`src/index.js`（React UI + 注册）。`lib/client.js` 变为构建产物。
- 新增零依赖打包脚本 `build.mjs`（去 import/export 后按序拼接），不引入 bundler 依赖。
- 新增 `types/index.d.ts`：`ModelChoice` / `PickerState` / `PickerController` / `PickerProps` 成为唯一契约，文档引用它。
- 新增 `createPickerController`：任何渲染层（Vue / Svelte / 纯 DOM）都能驱动同一套目录与选择逻辑。
- demo 支持 `?catalog=<url>` 加载任意模拟目录，默认数据移到 `demo/mock-catalog.json`。
- 新增 10 条单测（`npm test`），覆盖分类、厂商识别、档位映射、目录派生与过滤；测试暴露并修复了 `Gemini` 被 `mini` 规则误判为轻量模型的 bug（正则改为单词边界）。
- 能力分类不再把 `DeepSeek` 的 "deep" 当作推理标识。

## 0.3.0 — 2026-11-22

**结构性加固**

- 原生模型位定位改为结构特征优先（`aria-haspopup` + composer 容器内相对位置），文本匹配降为最后兜底；节点缓存 + `MutationObserver` 兜底重定位。
- 新增 `PickerBoundary`：渲染异常时还原原生按钮并降级为不渲染，不再拖垮输入框。
- `rAF` 只在面板打开时运行；关闭态改由 `resize` / `scroll` / `ResizeObserver` 驱动一次性同步，`visibilitychange` 暂停。
- 关闭定时器改为可取消，打开时会正确取消上一轮关闭。
- 档位气泡不再假设 `efforts` 数组下标等于 Low/Extra；非标准命名显示真实名称 + 「自定义推理预算」。

**交互**

- 面板内搜索框（实时过滤模型 / 厂商）。
- `↑` / `↓` 移动高亮、`Enter` 确认、`Esc` 逐层退出（气泡 → 面板）。
- 空结果提示。

**文档**

- 新增 `ARCHITECTURE.md`（分层、数据流、props 契约、风险边界）。
- 新增 `CONTRIBUTING.md`（环境、本地调试、三类改动自由度、重构计划）。
- README 改为 Project Status & Design Philosophy，不再以「致歉」开篇。

## 0.2.0 — 2026-11-22

- 视觉主题从「118 元素周期表」替换为「多厂商能力矩阵」：厂商成列、能力三档分层、未接入厂商暗态占位。
- 厂商品牌色 / 未接入厂商 / 能力分类规则集中为 `VENDORS` / `EXPECTED` / `TIERS`。
- 顶部大卡片预览支持规格徽标（1M / 推理 / 多模态 / 代码）与能力档标签。
- 新对话居中态联动动效：输入框下移 + 欢迎语淡出 + 面板自锚点放大。

## 0.1.0 — 2026-11-22

- 首个可用版本：`conversation.input.model` 槽位接管、`priority: -100` 覆盖原生控件。
- 118 元素周期表布局、元素 ↔ 模型映射、Low/Medium/High/Extra 档位气泡。
- 胶囊与原生按钮同帧跟随（rAF）、深浅主题自适应。
