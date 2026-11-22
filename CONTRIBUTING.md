# Contributing

这是一个**实验性起点**，不是需要你小心翼翼维护的成品。你可以修 bug、补功能，也可以把整个 UI 掀翻重做——后者同样算贡献。

先读 [`ARCHITECTURE.md`](./ARCHITECTURE.md)，那里有分层图和「想换掉 UI 要保留什么」。

## 环境

- Node.js 18+（仅用于语法检查与本地静态服务器，插件本身无构建步骤）
- 一个能装的 DeepSeek Harness（桌面版或 web profile）
- 改前端不需要编译：`lib/client.js` 是浏览器直接加载的单文件 bundle

## 三条改动路径

| 你想做的事 | 改哪里 | 风险 |
| --- | --- | --- |
| 加厂商、改品牌色、调分类规则 | `lib/client.js` 顶部的 `VENDORS` / `EXPECTED` / `TIERS` | 低，改完刷新即可 |
| 调布局 / 配色 / 动效 | 文件顶部的 `CSS` 常量 + 面板渲染段 | 低 |
| 换一套完全不同的 UI | 替换 `PeriodicPicker`，保留 props 契约 | 中，见 ARCHITECTURE 的 props 定义 |
| 改定位 / 同步逻辑 | `locate()` + `sync()` + `startLoop()` | 高，依赖 DSH DOM 结构 |

**不建议**在没有把握时动：`priority: -100` 的槽位抢占、`visibility: hidden` 的隐藏方式、`window.__ModuleLoader__` 的封装格式——这三处错了表现为「插件消失」，调试成本高。

## 本地跑起来

### 1. 只看 UI（不需要 DSH）

```bash
npx serve .        # 或 python -m http.server
# 打开 http://localhost:3000/demo.html
```

`demo.html` 自带 mock 模型目录（DeepSeek / OpenAI / Gemini / Kimi 四列），可以直接测搜索、键盘、档位气泡。

> 注意：demo 通过 esm.sh 引入 React，**离线环境打不开**。想离线跑，把 React 的 UMD 构建下到本地改 `script` 引用即可（欢迎 PR 把这件事做掉）。

### 2. 装进 DSH

```bash
# 复制到你自己的 profile（路径按需替换）
cp -r . "~/.dsh/profiles/<profile>/node_modules/dsh-constellation-picker"
```

然后在 profile 的 `package.json` 里登记两处：

```jsonc
{
  "dependencies": { "dsh-constellation-picker": "file:<本仓库绝对路径>" },
  "dsh": { "profile": { "bundles": [ /* …, */ "dsh-constellation-picker" ] } }
}
```

重启 DSH（客户端 bundle 在 host 启动时扫描）。改了代码后想热更新，用插件管理器把该插件**停用再启用**一次即可，不用整个重启。

## 调试

- 浏览器 DevTools Console 里过滤 `[pcm]`：`picker rendered` / `focus on` / `slot registered` 会告诉你加载到哪一步。
- 插件没出现？先看有没有 `slot registered: conversation.input.model`；如果是 `model seat failed`，通常是 slot 抢占失败（见 ARCHITECTURE 的 priority 说明）。
- 面板位置不对但功能正常？看 `sync()` 是否拿到原生按钮的 rect（`visibility: hidden` 必须保留几何）。

## 提交规范

- 提交信息用 `type: 中文描述`，type 取 `feat` / `fix` / `docs` / `refactor` / `chore`。
- 一个 PR 只做一件事；纯格式化改动单独提。
- 改视觉请附截图或 GIF（前后对比最好）。
- 改逻辑请在 PR 描述里写清「怎么验证的」——目前没有自动化测试，人工验证步骤就是证据。

## 计划中的重构（欢迎认领）

1. 拆 `lib/client.js`：`core/`（domain 纯函数）、`components/`、`hooks/`、`styles/`。
2. 配置抽成独立 JSON，并给 host 半加一条只读配置路由（参考同类插件的 `/xxx/config` 做法）。
3. 把 domain 纯函数（`vendorOf` / `tierOf` / `badgesOf` / `effortsOf`）提出来做单测。
4. demo 去掉 CDN 依赖，加 mock adapter 文件，让「加模型 / 改厂商 / 测键盘」都不用碰源码。
5. GitHub Actions：语法检查 + 单测。

做完 1、3、5 之后，这个项目才真正具备「别人敢改」的基础设施。

## 行为准则

- 对事不对人，review 只讨论代码与设计取舍。
- 你的方案不必延续原作者的视觉语言；只要不破坏 Adapter 契约，任何 UI 方向都欢迎。
- 提交前请确认没有把个人 token、本地绝对路径、私有 API Key 带进仓库。
