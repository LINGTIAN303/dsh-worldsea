# dsh-worldsea

WorldSea 门户插件（外部 DSH bundle，独立于 WorldSea 仓库）——在 DSH Web UI 的**左栏**与**右栏**各提供一个 WorldSea 入口：

| 入口 | 位置 | 内容 |
|---|---|---|
| 左栏面板 | `sidebar.panellist` 图标 + `main` keyed 面板（id `worldsea`） | WorldSea 门户页 |
| 右栏标签页 | `sidebarRightTabs` 类型 `worldseaPortal` + `sidebar.right.pane.tab` 身体（id `dsh-worldsea/portal`） | 同一门户组件复用；引导页（guide）有入口卡 |

门户内容：平台概览（技术栈 / 模块数 / 引擎 / 许可证）、相关仓库链接（WorldSea 主仓库、本插件仓库、dsh）、**尝试唤起 WorldSea 桌面应用**按钮（`worldsea://` 壳协议；协议未注册时静默失败）。

## 设计约束

- **不依赖 WorldSea**：门户内容为静态事实 + 链接，不读写 WorldSea 工作区，不与本机 WorldSea 目录耦合；WorldSea 侧自身的 dsh 插件（`dsh-plugin-worldsea*`）与本项目无关。
- **零构建链**：客户端半为手写闭包工厂（`window.__ModuleLoader__.load`），external 只 require 种子表模块（`react`），图标自绘 SVG（不 import Harness Client 包），样式只用主题 token（`--dsw-alias-*`）。
- 双语 locale（zh / en）：面板标签、门户文案、guide 卡、插件清单 `meta.title` / `meta.description` 全走 `ctx.locale`。

## 安装

DSH 内经 `plugin_manager`（install_bundle）指向本目录安装；或手动写入 profile 的 `cordis.patch.yml` 后重启。

```yaml
- insert:
    - id: worldsea-portal
      name: 'dsh-worldsea'
```

## 文件

- `index.js` — 宿主半（空 apply 占行）
- `client.js` — 客户端半（双入口注册 + 门户组件）
- `cordis.patch.yml` — bundle patch（插入 `worldsea-portal` 行）
- `locale/{zh,en}.json` — 字典与插件清单元数据
- `icon.svg` — 原创图标（海波托举世界图形）
