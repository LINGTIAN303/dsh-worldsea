window.__ModuleLoader__.load({
  id: 'dsh-worldsea',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** 本插件独占的字典命名空间。 */
    const NS = 'worldsea.portal';
    /** 左栏面板 id（同时是 main keyed slot 的键）。 */
    const PANEL_ID = 'worldsea';
    /** 右栏 tab 类型 id（body/title 注册键，= 插件身份）。 */
    const TAB_ID = 'dsh-worldsea/portal';
    /** 右栏 tab kind（openTab 用）。 */
    const TAB_KIND = 'worldseaPortal';

    /** WorldSea 门户的固定链接与事实行（内容为静态门户，数据与桌面应用解耦）。 */
    const LINKS = [
      { id: 'repo', href: 'https://github.com/LINGTIAN303/WorldSea' },
      { id: 'pluginRepo', href: 'https://github.com/LINGTIAN303/dsh-worldsea' },
      { id: 'dsh', href: 'https://github.com/deepseek-ai/deepseek-harness' },
    ];

    /** 唤起按钮：走 `worldsea://` 壳协议（Windows 上 wry 会落成 http://worldsea.localhost/，需规避）。 */
    function launchDesktop() {
      // 直接以 location 跳转会离开本页，改用隐藏 iframe/窗口打开：协议未注册时浏览器/壳静默失败或弹提示，均不影响本页面。
      const win = window.open('worldsea://localhost/', '_blank');
      // world.open 被拦截返回 null 视为失败；成功时新窗口短暂后自动关闭由壳协议端处理。
      if (win === null) return false;
      try { win.close(); } catch (_e) { /* 独占窗口则由用户关闭 */ }
      return true;
    }

    /** 简单行样式容器。 */
    function Section(props) {
      return h('section', { style: { marginBottom: 24 } },
        h('h3', {
          style: {
            fontSize: 13, fontWeight: 600, margin: '0 0 8px',
            color: 'var(--dsw-alias-label-primary)',
            letterSpacing: '0.02em',
          },
        }, props.title),
        props.children,
      );
    }

    /** 事实行。 */
    function FactRow(props) {
      return h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', gap: 16,
          padding: '7px 12px', borderRadius: 6,
          background: 'var(--dsw-alias-bg-layer-1)',
          marginBottom: 4,
          fontSize: 13,
        },
      },
        h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, props.label),
        h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontFamily: 'ui-monospace, monospace' } }, props.value),
      );
    }

    /** 链接行。 */
    function LinkRow(props) {
      return h('a', {
        href: props.href,
        target: '_blank',
        rel: 'noreferrer',
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          padding: '7px 12px', borderRadius: 6,
          background: 'var(--dsw-alias-bg-layer-1)',
          marginBottom: 4,
          fontSize: 13,
          color: 'var(--dsw-alias-brand-primary)',
          textDecoration: 'none',
        },
        onMouseOver(e) { e.currentTarget.style.background = 'var(--dsw-alias-bg-layer-2)'; },
        onMouseOut(e) { e.currentTarget.style.background = 'var(--dsw-alias-bg-layer-1)'; },
      },
        h('span', null, props.label),
        h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontFamily: 'ui-monospace, monospace', fontSize: 12 } }, props.href.replace('https://', '')),
      );
    }

    /** 门户面板主体（左栏 main 与右栏 tab 共用）。 */
    function PortalBody(props) {
      const t = props.t;
      return h('div', {
        style: {
          height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          padding: 20,
          background: 'var(--dsw-alias-bg-base)',
          color: 'var(--dsw-alias-label-primary)',
        },
      },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
        h('img', { src: props.iconUrl, width: 40, height: 40, alt: '' }),
        h('div', null,
          h('div', { style: { fontSize: 18, fontWeight: 600 } }, 'WorldSea'),
          h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('tagline')),
        ),
      ),
      h('p', { style: { fontSize: 13, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 20px' } }, t('intro')),
      h(Section, { title: t('facts.title') },
        h(FactRow, { label: t('facts.stack'), value: 'Tauri 2 · Vue 3 · Rust/WASM' }),
        h(FactRow, { label: t('facts.modules'), value: t('facts.modulesValue') }),
        h(FactRow, { label: t('facts.engine'), value: 'worldsea-core · tactical-engine' }),
        h(FactRow, { label: t('facts.license'), value: 'MIT' }),
      ),
      h(Section, { title: t('links.title') },
        LINKS.map(link => h(LinkRow, { key: link.id, href: link.href, label: t('links.' + link.id) })),
      ),
      h(Section, { title: t('launch.title') },
        h('button', {
          onClick: () => { launchDesktop(); },
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--dsw-alias-brand-primary)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          },
        }, t('launch.button')),
        h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginTop: 8 } }, t('launch.hint')),
      ),
      );
    }

    /** 自绘世界图形图标（呼应 WorldSea 语义；风格对齐 one-pixel outline）。 */
    function WorldIcon(props) {
      const size = props.size || 18;
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }),
        h('path', { d: 'M3.6 9h16.8M3.6 15h16.8' }),
      );
    }

    // —— 模块注入面：slots + locale ——
    const inject = ['slots', 'locale'];

    function apply(ctx) {
      // locale 字典注册（zh / en），卸载随 ctx.effect 清理。
      ctx.effect(() => ctx.locale.register(NS, dictionaries), NS + ': dictionaries');
      const t = ctx.locale.bind(NS);
      const iconUrl = require.asset('plugins/dsh-worldsea/assets/icon.svg');

      // ① 左栏入口：sidebar.panellist 图标 + main 面板体（同 id 寻址）。
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: PANEL_ID, order: 30, locale: NS,
        label: () => t('panel.label'),
      }, props => WorldIcon({ size: props.size }))), NS + ': panellist');

      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: PANEL_ID, locale: NS,
        inject: () => ({ t, iconUrl }),
      }, PortalBody)), NS + ': main');

      // ② 右栏入口：tab 类型注册（带 guide 引导入口卡）+ body/title 注册到 keyed 座位。
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: TAB_ID,
        kind: TAB_KIND,
        priority: 'extension',
        title: () => t('tab.title'),
        guide: [{
          id: 'worldsea-portal',
          order: 10,
          title: () => t('guide.title'),
          description: () => t('guide.description'),
          icon: WorldIcon,
        }],
      }), NS + ': tab type');

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS,
        inject: () => ({ t, iconUrl }),
      }, PortalBody)), NS + ': tab body');

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab.title', key: TAB_ID,
      }, () => t('tab.title'))), NS + ': tab title');
    }

    /** 中文字典。 */
    const zh = {
      'panel.label': 'WorldSea',
      'tagline': 'Agent 驱动的世界观构建平台',
      'intro': 'WorldSea 是一个本地优先的世界观创作平台：人物、地理、物品、魔法等 26 类官方实体模块，配合图谱、时间线、战术板等可视化工具与手稿写作套件；Rust 引擎（worldsea-core / tactical-engine）以 WASM 供给前端，Agent 基座与 dsh 同源。',
      'facts.title': '平台概览',
      'facts.stack': '技术栈',
      'facts.modules': '官方模块',
      'facts.modulesValue': '26 个创作域插件',
      'facts.engine': '核心引擎',
      'facts.license': '许可证',
      'links.title': '相关仓库',
      'links.repo': 'WorldSea 主仓库',
      'links.pluginRepo': '本插件仓库',
      'links.dsh': 'DeepSeek Harness (dsh)',
      'launch.title': '桌面应用',
      'launch.button': '尝试唤起 WorldSea 桌面应用',
      'launch.hint': '经 worldsea:// 壳协议唤起；未安装或未注册协议时无反应。',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea 门户',
      'guide.description': 'WorldSea 创作平台概览与快捷链接',
    };

    /** 英文字典。 */
    const en = {
      'panel.label': 'WorldSea',
      'tagline': 'Agent-powered worldbuilding platform',
      'intro': 'WorldSea is a local-first worldbuilding platform: 26 official entity modules covering characters, geography, items, magic and more, with graph, timeline and tactical-board visual tools plus a manuscript suite. Its Rust engines (worldsea-core / tactical-engine) serve the frontend via WASM, and its agent runtime shares lineage with dsh.',
      'facts.title': 'Platform overview',
      'facts.stack': 'Stack',
      'facts.modules': 'Official modules',
      'facts.modulesValue': '26 creative-domain plugins',
      'facts.engine': 'Core engines',
      'facts.license': 'License',
      'links.title': 'Repositories',
      'links.repo': 'WorldSea main repository',
      'links.pluginRepo': 'This plugin repository',
      'links.dsh': 'DeepSeek Harness (dsh)',
      'launch.title': 'Desktop app',
      'launch.button': 'Launch WorldSea desktop app',
      'launch.hint': 'Opens via the worldsea:// shell protocol; nothing happens when uninstalled or unregistered.',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea portal',
      'guide.description': 'WorldSea platform overview and quick links',
    };

    const dictionaries = { zh, en };

    return { inject, apply };
  },
});
