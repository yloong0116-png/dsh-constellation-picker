# Architecture

这份文档面向**要改代码的人**：读完应该知道「改哪里安全、改哪里会炸、想换掉 UI 该保留什么」。

## 分层

```
┌──────────────────────────────────────────────────────────────┐
│ DSH Host                                                     │
│  · modelDirectories 服务：模型目录（按 provider 分组 + reasoning）│
│  · slots 服务：conversation.input.model（single slot，可 priority 覆盖）
│  · sessions.selectModel({ provider, model, reasoningEffort }) │
└───────────────┬──────────────────────────────────────────────┘
                │  inject(["slots","modelDirectories","sessions"])
┌───────────────▼──────────────────────────────────────────────┐
│ Adapter  lib/client.js · 插件注册段 + seat 段                  │
│  · 注册槽位（GuardedPicker/PeriodicPicker）                    │
│  · 定位并隐藏原生模型按钮，每帧/按事件把它的 rect 镜像到胶囊      │
│  · 调用 directory.select() 完成切换                            │
└───────────────┬──────────────────────────────────────────────┘
                │  props: { available, directory(store), load, select, locked }
┌───────────────▼──────────────────────────────────────────────┐
│ Domain  分类与分组（纯函数，无 DOM）                            │
│  · vendorOf(providerId, name) → 品牌信息                       │
│  · tierOf(model) → reasoning | flagship | lite                 │
│  · badgesOf(model) → 1M / 推理 / 多模态 / 代码                  │
│  · effortsOf(choice) → [{ id, label, sub, bars }]              │
└───────────────┬──────────────────────────────────────────────┘
                │  choices[] → providers[]（列） → 每列 × 三档（格）
┌───────────────▼──────────────────────────────────────────────┐
│ UI  面板：预览大卡 / 快捷胶囊 / 矩阵 / 图例 / 档位气泡           │
│  · 纯展示 + 回调（onHover / onClick），不直接碰 DSH             │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│ Interaction  键盘 / 定位 / 动画 / 主题                         │
│  · 搜索过滤 + ↑↓ + Enter + Esc                                 │
│  · rAF（仅面板打开）/ resize / scroll / ResizeObserver 同步     │
│  · enterFocus：输入框 translateY + 标题淡出                     │
└──────────────────────────────────────────────────────────────┘
```

## 数据流

1. `useSyncExternalStore(directory.subscribe, directory.getSnapshot)` 拿到 `{ groups, current, status }`。
2. `choices` = 扁平化所有 provider 下的模型，每个补上 `vendor / tier / badges`（Domain 纯函数）。
3. `visibleChoices` = 按搜索词过滤后的 `choices`。
4. `providers` = 按 provider 聚合的列；未接入的厂商用 `EXPECTED` 补暗态列。
5. 渲染：列头（厂商）→ 三档 × 每档的模型卡。
6. 点击卡片 → 有 `reasoning.efforts` 就开档位气泡，否则直接 `select({ provider, model })`。
7. `select` 成功后目录 store 变化 → 组件重渲染 → 胶囊文案自动更新。

## 关键契约（改代码前必读）

| 契约 | 说明 |
| --- | --- |
| Slot 名 | `conversation.input.model`，**single slot**：同名注册会抛 `already has a registration at priority 0`，必须带更低的 `priority`（本仓库用 `-100`，最低者渲染）。 |
| 失败降级 | 抢不到时退到 `conversation.input.dock`（位置会偏，但插件仍在）。 |
| 原生按钮 | 用 `visibility: hidden` 隐藏（**不能** `display: none`，否则读不到 rect），并打 `data-pcm-hidden` 标记，供 ErrorBoundary 还原。 |
| 定位 | 结构优先：composer 容器内带 `aria-haspopup` 且文本含档位词的控件 → 该容器最右 popup → 名字匹配（最后兜底）。缓存节点 + MutationObserver 重定位。 |
| 位置同步 | 面板关闭时零 rAF，只由 resize / scroll / ResizeObserver 触发一次性 `sync()`；打开时逐帧。 |
| 崩溃隔离 | `PickerBoundary` 包住整棵子树，崩溃即渲染 `null` 并还原原生按钮。 |

## 想换掉 UI？保留这些就行

你**只需要**实现一个 React 组件，接收下面这组 props，就能复用全部模型目录、切换、定位与动画逻辑：

```ts
type ModelChoice = {
  provider: string;      // provider id
  model: string;         // model id
  name: string;          // 展示名
  reasoning?: { efforts: { id: string; name: string }[]; defaultEffort?: string };
};

interface PickerProps {
  available: boolean;                 // 子代理会话里为 false
  directory: { subscribe(fn): () => void; getSnapshot(): State };
  load(): void;                       // 触发目录加载
  select(sel: { provider: string; model: string; reasoningEffort?: string }): Promise<{ ok: boolean; error?: any }>;
  locked?: boolean;
}
```

把 `GuardedPicker` 的返回值换成你的组件即可，Adapter 与 Interaction 两层不用动。

## 目录与文件

```
src/core/vendor.js       厂商品牌 + 未接入占位（纯数据 + vendorOf）
src/core/classifier.js   三档分类 + 规格徽标（tierOf / badgesOf）
src/core/reasoning.js    档位映射与文案（effortsOf / effortLabel）
src/core/catalog.js      目录派生（toChoices / toProviders / filterChoices）
src/adapter/controller.js 框架无关 Controller（getSnapshot / subscribe / load / select / filter）
src/index.js             React UI + DSH 槽位注册 + 定位/动画
lib/client.js            ⚠️ 构建产物，勿直接编辑（npm run build 生成）
types/index.d.ts         唯一的类型契约（ModelChoice / PickerState / PickerController / PickerProps）
build.mjs                零依赖打包：剥掉 import/export 后按顺序拼接
demo.html                预览页，?catalog=<url> 可换任意模拟目录
demo/mock-catalog.json   默认模拟模型目录
tests/core.test.mjs      core 纯函数单测（node --test）
index.js                 host 半（空实现，仅让包出现在 Loader 里）
```

构建顺序由 `build.mjs` 的 `ORDER` 决定：core → adapter → index。因为模块间符号不重名，打包就是「去 import/export 后拼接」，不引入 bundler 依赖。

## 用 Controller 替换框架

`createPickerController({ directory, select, load })` 返回的对象只依赖一个 store 契约（`subscribe` / `getSnapshot`），不含任何 React。任何渲染层都可以直接驱动它：

```js
const controller = createPickerController({ directory, select });
controller.subscribe(render);
render(controller.getSnapshot());        // { choices, providers, current, … }
controller.filter("gpt");                // 纯函数过滤
await controller.select(choice, "high"); // 切换模型 + 推理档
```

React 只是默认实现：`src/index.js` 里用 `useSyncExternalStore(controller.subscribe, controller.getSnapshot)` 接上。

## 已知的架构债务

- UI 仍是单个组件文件（`src/index.js` 约 900 行），未按 Picker / Matrix / Card / Menu 拆分。
- 配置是 JS 常量，未抽成 JSON + host 路由。
- 面板未接入暗色变量，仍是白卡。
