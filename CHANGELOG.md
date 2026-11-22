# Changelog

本项目从「元素周期表选择器」演进为「多厂商星系矩阵」，版本号与结构改动对应如下。

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
