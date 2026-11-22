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
