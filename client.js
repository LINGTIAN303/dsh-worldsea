/**
 * dsh-worldsea — WorldSea 创作工作台（客户端半）。
 *
 * 形态：手写闭包工厂（`window.__ModuleLoader__.load`），零构建链。
 * external 仅 require 种子表模块（react / @deepseek-ai/dsh-client-store）。
 *
 * 职责：
 * ① 左栏 `sidebar.panellist` + `main` keyed 面板：创作工作台
 *    - 类型切换条（schema 驱动：character / region / item / magic）
 *    - 实体卡片列表 + schema 驱动的详情/编辑表单（text / textarea / select）
 *    - 门户 tab（平台概览 + 链接 + 桌面应用唤起）
 * ② 右栏 `sidebarRightTabs` tab（kind `worldseaPortal`）：同一工作台组件复用。
 *
 * 数据模型对齐 WorldSea EntityV2：{id, type, title, description, properties, tags, createdAt, updatedAt}。
 * 字段 schema 对齐 WorldSea FieldSchema：{key, label, fieldType, options?}（ownFields 原样抄录）。
 * 单一 store（实体库 + 工作台会话态）经「假 handle 单例」在 main（root 作用域）与
 * 右栏 tab（session 作用域）间共享同一实例。
 */
window.__ModuleLoader__.load({
  id: 'dsh-worldsea',
  factory(require) {
    const React = require('react');
    const { defineStore } = require('@deepseek-ai/dsh-client-store');
    const h = React.createElement;

    /** 字典命名空间。 */
    const NS = 'worldsea.portal';
    /** 左栏面板 id（同时是 main keyed slot 的键）。 */
    const PANEL_ID = 'worldsea';
    /** 右栏 tab 类型 id。 */
    const TAB_ID = 'dsh-worldsea/portal';
    /** 右栏 tab kind。 */
    const TAB_KIND = 'worldseaPortal';
    /** 实体库持久化键（localStorage，框架 attachPersistence 落盘）。 */
    const PERSIST_KEY = 'worldsea.workbench.v1';

    // ─────────────────────────────────────────────
    // 实体类型 Schema（对齐 WorldSea 官方插件 ownFields 原样抄录）
    // ─────────────────────────────────────────────

    /** 角色（WorldSea official.characters ownFields）。 */
    const CHARACTER_FIELDS = [
      { key: 'age', label: '年龄', fieldType: 'text' },
      { key: 'gender', label: '性别', fieldType: 'text' },
      { key: 'race', label: '种族', fieldType: 'text' },
      { key: 'occupation', label: '职业', fieldType: 'text' },
      { key: 'affiliation', label: '所属势力', fieldType: 'text' },
      { key: 'role', label: '角色', fieldType: 'select', options: ['主角', '反派', '配角', '导师', '信使', '其他'] },
      { key: 'appearance', label: '外貌特征', fieldType: 'textarea' },
      { key: 'personality', label: '性格', fieldType: 'textarea' },
      { key: 'background', label: '背景故事', fieldType: 'textarea' },
    ];

    /** 区域（WorldSea official.regions ownFields）。 */
    const REGION_FIELDS = [
      { key: 'regionType', label: '类型', fieldType: 'select', options: ['大陆', '国家', '行省', '城市', '地标', '区域'] },
      { key: 'climate', label: '气候', fieldType: 'select', options: ['热带雨林', '热带草原', '沙漠', '地中海', '温带海洋', '温带季风', '温带大陆', '亚寒带', '苔原', '冰原', '高原山地', '火山'] },
      { key: 'population', label: '人口', fieldType: 'text' },
      { key: 'area', label: '面积', fieldType: 'text' },
      { key: 'government', label: '政体/统治', fieldType: 'select', options: ['君主专制', '君主立宪', '共和制', '联邦制', '部落制', '神权制', '军事统治', '无政府', '其他'] },
      { key: 'significance', label: '历史意义', fieldType: 'textarea' },
    ];

    /** 道具（WorldSea official.items ownFields 节选）。 */
    const ITEM_FIELDS = [
      { key: 'itemType', label: '类型', fieldType: 'select', options: ['武器', '防具', '衣物', '饰品', '法器', '药水/丹药', '卷轴/书籍', '工具', '其他'] },
      { key: 'grade', label: '品级', fieldType: 'text' },
      { key: 'material', label: '材质', fieldType: 'text' },
      { key: 'origin', label: '来源', fieldType: 'text' },
      { key: 'owner', label: '持有者', fieldType: 'text' },
      { key: 'condition', label: '状况', fieldType: 'select', options: ['完好', '轻微破损', '严重破损', '已修复', '已毁', '遗失', '未知'] },
      { key: 'effects', label: '效果', fieldType: 'textarea' },
      { key: 'lore', label: '背景', fieldType: 'textarea' },
    ];

    /** 魔法（对齐 WorldSea official.magic 字段面：体系/系别/等级/代价）。 */
    const MAGIC_FIELDS = [
      { key: 'system', label: '所属体系', fieldType: 'text' },
      { key: 'element', label: '系别', fieldType: 'text' },
      { key: 'tier', label: '等级', fieldType: 'text' },
      { key: 'castTime', label: '施法时间', fieldType: 'text' },
      { key: 'range', label: '射程', fieldType: 'text' },
      { key: 'cost', label: '消耗/代价', fieldType: 'textarea' },
      { key: 'description', label: '效果描述', fieldType: 'textarea' },
    ];

    /** 组织（WorldSea official.organizations ownFields 原样抄录）。 */
    const ORGANIZATION_FIELDS = [
      { key: 'orgType', label: '类型', fieldType: 'select', options: ['王国', '帝国', '共和国', '部落', '公会', '教团', '商会', '帮派', '军事组织', '秘密组织', '其他'] },
      { key: 'size', label: '规模', fieldType: 'select', options: ['小型', '中型', '大型', '超大型'] },
      { key: 'alignment', label: '阵营', fieldType: 'select', options: ['守序善良', '中立善良', '混沌善良', '守序中立', '绝对中立', '混沌中立', '守序邪恶', '中立邪恶', '混沌邪恶'] },
      { key: 'motto', label: '座右铭', fieldType: 'text' },
      { key: 'headquarters', label: '总部', fieldType: 'text' },
      { key: 'leader', label: '领袖', fieldType: 'text' },
      { key: 'foundingDate', label: '创立日期', fieldType: 'text' },
      { key: 'dissolutionDate', label: '解散日期', fieldType: 'text' },
      { key: 'ideology', label: '理念/宗旨', fieldType: 'textarea' },
    ];

    /** 物种（WorldSea official.species ownFields 原样抄录）。 */
    const SPECIES_FIELDS = [
      { key: 'speciesType', label: '类型', fieldType: 'select', options: ['类人', '兽族', '精灵', '矮人', '龙族', '机械', '元素', '亡灵', '神话生物', '异界生物', '植物智能', '其他'] },
      { key: 'avgLifespan', label: '平均寿命', fieldType: 'text' },
      { key: 'language', label: '语言', fieldType: 'text' },
      { key: 'population', label: '人口/数量', fieldType: 'number' },
      { key: 'society', label: '社会结构', fieldType: 'textarea' },
      { key: 'abilities', label: '天赋能力', fieldType: 'textarea' },
      { key: 'weakness', label: '弱点/缺陷', fieldType: 'textarea' },
      { key: 'origin', label: '起源地', fieldType: 'text' },
    ];

    /** 实体类型注册表（manifest 对齐 WorldSea 官方插件形态）。 */
    const ENTITY_TYPES = [
      { type: 'character', label: '角色', domain: 'life', fields: CHARACTER_FIELDS, glyph: 'user' },
      { type: 'region', label: '区域', domain: 'geo', fields: REGION_FIELDS, glyph: 'map' },
      { type: 'item', label: '道具', domain: 'goods', fields: ITEM_FIELDS, glyph: 'item' },
      { type: 'magic', label: '魔法', domain: 'arcane', fields: MAGIC_FIELDS, glyph: 'spark' },
      { type: 'organization', label: '组织', domain: 'society', fields: ORGANIZATION_FIELDS, glyph: 'org' },
      { type: 'species', label: '物种', domain: 'life', fields: SPECIES_FIELDS, glyph: 'paw' },
    ];

    // ─────────────────────────────────────────────
    // 关系类型（对齐 WorldSea RelationTypeSchemaV2：有向 + 强制逆关系）
    // 复刻日常创作最高频的 12 类；对称关系 inverseType 指向自身。
    // ─────────────────────────────────────────────

    /** 关系类型注册表。sourceTypes/targetTypes 为空数组 = 任意类型可连。 */
    const RELATION_TYPES = [
      { type: 'knows', label: '认识', inverseType: 'knows', inverseLabel: '认识', symmetric: true, sourceTypes: ['character'], targetTypes: ['character'] },
      { type: 'parent_of', label: '父母', inverseType: 'child_of', inverseLabel: '子女', symmetric: false, sourceTypes: ['character'], targetTypes: ['character'] },
      { type: 'spouse_of', label: '配偶', inverseType: 'spouse_of', inverseLabel: '配偶', symmetric: true, sourceTypes: ['character'], targetTypes: ['character'] },
      { type: 'ally_of', label: '盟友', inverseType: 'ally_of', inverseLabel: '盟友', symmetric: true, sourceTypes: ['character', 'organization'], targetTypes: ['character', 'organization'] },
      { type: 'rival_of', label: '对手', inverseType: 'rival_of', inverseLabel: '对手', symmetric: true, sourceTypes: ['character', 'organization'], targetTypes: ['character', 'organization'] },
      { type: 'mentor_of', label: '导师', inverseType: 'student_of', inverseLabel: '学生', symmetric: false, sourceTypes: ['character'], targetTypes: ['character'] },
      { type: 'belongs_to', label: '属于', inverseType: 'has_member', inverseLabel: '拥有成员', symmetric: false, sourceTypes: ['character'], targetTypes: ['organization', 'species'] },
      { type: 'resides_in', label: '居住于', inverseType: 'resident_of_place', inverseLabel: '居民', symmetric: false, sourceTypes: ['character'], targetTypes: ['region'] },
      { type: 'member_of', label: '成员', inverseType: 'has_member', inverseLabel: '拥有成员', symmetric: false, sourceTypes: ['character'], targetTypes: ['organization'] },
      { type: 'sub_organization', label: '下属势力', inverseType: 'parent_organization', inverseLabel: '上级势力', symmetric: false, sourceTypes: ['organization'], targetTypes: ['organization'] },
      { type: 'located_in', label: '位于', inverseType: 'contains_location', inverseLabel: '包含地点', symmetric: false, sourceTypes: ['region'], targetTypes: ['region'] },
      { type: 'owns', label: '拥有', inverseType: 'owned_by', inverseLabel: '被拥有', symmetric: false, sourceTypes: ['character', 'organization'], targetTypes: ['item'] },
    ];

    /** 按类型查关系定义。 */
    const relationDef = (type) => RELATION_TYPES.find(r => r.type === type);
    /** 对称关系的逆关系是自身。 */
    const inverseOf = (type) => {
      const def = relationDef(type);
      return def ? { type: def.inverseType, label: def.inverseLabel } : null;
    };

    // ─────────────────────────────────────────────
    // 单一 store：实体库 + 工作台会话态（持久化到 localStorage）
    // ─────────────────────────────────────────────

    /** 生成实体 id。 */
    const newEntityId = () =>
      'ent-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

    /**
     * 工作台 store。actions 即完整写集（immer draft 变换）；
     * 单 store 让「提交编辑」在一次 draft 里同时写实体库与退出编辑态。
     */
    const workbenchStore = defineStore({
      init: () => ({
        entities: [],
        relations: [],
        view: 'workbench',
        activeType: 'character',
        selectedId: null,
        editing: false,
        draft: null,
        search: '',
      }),
      persist: PERSIST_KEY,
      actions: {
        /** 视图切换（工作台 / 门户）。 */
        setView(draft, view) { draft.view = view; if (view !== 'workbench') { draft.editing = false; draft.draft = null; } },
        /** 切换实体类型：清选中与编辑态。 */
        selectType(draft, type) { draft.activeType = type; draft.selectedId = null; draft.editing = false; draft.draft = null; },
        /** 搜索词。 */
        setSearch(draft, text) { draft.search = text; },
        /** 选中/取消选中实体。 */
        selectEntity(draft, id) { draft.selectedId = id; draft.editing = false; draft.draft = null; },
        /** 新建实体并直接进入其详情。 */
        create(draft, type, title) {
          const now = new Date().toISOString();
          const entity = {
            id: newEntityId(),
            type,
            title: title || '未命名',
            description: '',
            properties: {},
            tags: [],
            createdAt: now,
            updatedAt: now,
          };
          draft.entities.push(entity);
          draft.selectedId = entity.id;
          draft.editing = false;
          draft.draft = null;
        },
        /** 删除实体；同时清掉它参与的所有关系。 */
        remove(draft, id) {
          draft.entities = draft.entities.filter(e => e.id !== id);
          draft.relations = draft.relations.filter(r => r.sourceId !== id && r.targetId !== id);
          if (draft.selectedId === id) { draft.selectedId = null; draft.editing = false; draft.draft = null; }
        },
        /** 进入编辑：把当前实体快照进 draft。 */
        beginEdit(draft, id) {
          const entity = draft.entities.find(e => e.id === id);
          if (!entity) return;
          draft.editing = true;
          draft.draft = { title: entity.title, description: entity.description, properties: { ...entity.properties } };
        },
        /** 编辑草稿增量写。 */
        editDraft(draft, patch) {
          if (!draft.draft) return;
          if (patch.title !== undefined) draft.draft.title = patch.title;
          if (patch.description !== undefined) draft.draft.description = patch.description;
          if (patch.properties !== undefined) draft.draft.properties = patch.properties;
        },
        /** 取消编辑。 */
        cancelEdit(draft) { draft.editing = false; draft.draft = null; },
        /** 提交编辑：单 draft 内写实体 + 退出编辑态。 */
        commitEdit(draft) {
          if (!draft.editing || !draft.draft || !draft.selectedId) return;
          const entity = draft.entities.find(e => e.id === draft.selectedId);
          if (!entity) { draft.editing = false; draft.draft = null; return; }
          entity.title = draft.draft.title;
          entity.description = draft.draft.description;
          entity.properties = draft.draft.properties;
          entity.updatedAt = new Date().toISOString();
          draft.editing = false;
          draft.draft = null;
        },
        /** 标签：增。 */
        addTag(draft, id, tag) {
          const entity = draft.entities.find(e => e.id === id);
          if (!entity || !tag.trim()) return;
          const t = tag.trim();
          if (!entity.tags.includes(t)) entity.tags.push(t);
          entity.updatedAt = new Date().toISOString();
        },
        /** 标签：删。 */
        removeTag(draft, id, tag) {
          const entity = draft.entities.find(e => e.id === id);
          if (!entity) return;
          entity.tags = entity.tags.filter(x => x !== tag);
          entity.updatedAt = new Date().toISOString();
        },
        /**
         * 建关系：有向边 source→target；非对称关系自动补逆边（pairId 互指）。
         * 对称关系（inverseType === type）只建一条边。
         */
        addRelation(draft, type, sourceId, targetId) {
          if (sourceId === targetId) return;
          const def = relationDef(type);
          if (!def) return;
          const now = new Date().toISOString();
          const id = 'rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
          const symmetric = def.inverseType === def.type;
          const pairId = symmetric ? undefined : 'rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
          draft.relations.push({ id, type, sourceId, targetId, properties: {}, pairId, createdAt: now, updatedAt: now });
          if (!symmetric) {
            draft.relations.push({
              id: pairId, type: def.inverseType, sourceId: targetId, targetId: sourceId,
              properties: {}, pairId: id, createdAt: now, updatedAt: now,
            });
          }
        },
        /** 删关系：按 id；带 pairId 时一并删除逆边。 */
        removeRelation(draft, relationId) {
          const rel = draft.relations.find(r => r.id === relationId);
          if (!rel) return;
          const doomed = new Set([rel.id]);
          if (rel.pairId) doomed.add(rel.pairId);
          draft.relations = draft.relations.filter(r => !doomed.has(r.id));
        },
      },
    });

    // ─────────────────────────────────────────────
    // 通用 UI 原语（自绘，样式走主题 token）
    // ─────────────────────────────────────────────

    /** 输入控件公共样式。 */
    const inputStyle = {
      width: '100%', boxSizing: 'border-box', padding: '6px 10px',
      borderRadius: 6, border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
      fontSize: 13, outline: 'none', fontFamily: 'inherit',
    };

    /** 次级按钮。 */
    function GhostButton(props) {
      return h('button', {
        onClick: props.onClick,
        style: {
          padding: props.small ? '3px 10px' : '6px 14px',
          borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)',
          background: 'transparent', color: 'var(--dsw-alias-label-primary)',
          fontSize: props.small ? 12 : 13, cursor: 'pointer',
        },
      }, props.children);
    }

    /** 主按钮。 */
    function PrimaryButton(props) {
      return h('button', {
        onClick: props.onClick,
        style: {
          padding: props.small ? '3px 10px' : '6px 14px',
          borderRadius: 6, border: 'none',
          background: 'var(--dsw-alias-brand-primary)', color: '#fff',
          fontSize: props.small ? 12 : 13, fontWeight: 600, cursor: 'pointer',
        },
      }, props.children);
    }

    /** 世界图形图标（one-pixel 风格自绘）。 */
    function WorldIcon(props) {
      const size = props.size || 18;
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }),
        h('path', { d: 'M3.6 9h16.8M3.6 15h16.8' }),
      );
    }

    /** 类型小图标（user/map/item/spark 自绘 one-pixel）。 */
    function TypeGlyph(props) {
      const s = props.size || 14;
      const common = {
        width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block', flexShrink: 0 },
      };
      switch (props.glyph) {
        case 'user':
          return h('svg', common,
            h('circle', { cx: 12, cy: 8, r: 4 }),
            h('path', { d: 'M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6' }));
        case 'map':
          return h('svg', common,
            h('path', { d: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14' }));
        case 'item':
          return h('svg', common,
            h('path', { d: 'M21 8 12 3 3 8v8l9 5 9-5V8z' }),
            h('path', { d: 'M3 8l9 5 9-5M12 13v8' }));
        case 'spark':
          return h('svg', common,
            h('path', { d: 'M12 2v6M12 16v6M2 12h6M16 12h6' }),
            h('circle', { cx: 12, cy: 12, r: 3 }));
        default:
          return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8 }));
      }
    }

    /** 卡片容器。 */
    function Card(props) {
      return h('div', {
        style: {
          background: 'var(--dsw-alias-bg-layer-1)',
          border: '1px solid var(--dsw-alias-border-l1)',
          borderRadius: 10, padding: props.pad || 16,
        },
      }, props.children);
    }

    // ─────────────────────────────────────────────
    // 关系区块（详情页）
    // ─────────────────────────────────────────────

    /** 实体详情页的关系区块：已有关系列表 + 新建关系表单。 */
    function RelationsSection(props) {
      const { relations, entities, selfId, actions, t } = props;
      const [relType, setRelType] = React.useState(RELATION_TYPES[0].type);
      const [targetId, setTargetId] = React.useState('');
      const [direction, setDirection] = React.useState('out');
      const def = relationDef(relType);

      // 目标候选：允许的 target/source 类型 + 排除自身。
      const wanted = direction === 'out' ? def.targetTypes : def.sourceTypes;
      const candidates = entities.filter(e => e.id !== selfId && (wanted.length === 0 || wanted.includes(e.type)));
      const titleOf = id => entities.find(e => e.id === id)?.title || id;

      /** 本实体的关系边（显示视图）。 */
      const rows = relations
        .filter(r => r.sourceId === selfId || r.targetId === selfId)
        .map(r => {
          const outgoing = r.sourceId === selfId;
          return {
            id: r.id,
            text: outgoing
              ? `${titleOf(r.sourceId)} —${relationDef(r.type)?.label || r.type}→ ${titleOf(r.targetId)}`
              : `${titleOf(r.sourceId)} —${relationDef(r.type)?.label || r.type}→ ${titleOf(r.targetId)}`,
          };
        });

      return h(Card, { pad: 14 },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
          h('div', { style: { fontSize: 14, fontWeight: 600 } }, t('relations.title')),
          h('div', { style: { flex: 1 } }),
          h('select', { value: relType, onChange: e => setRelType(e.target.value), style: { ...inputStyle, width: 'auto' } },
            RELATION_TYPES.map(r => h('option', { key: r.type, value: r.type }, r.label))),
          h('select', { value: direction, onChange: e => setDirection(e.target.value), style: { ...inputStyle, width: 'auto' } },
            h('option', { value: 'out' }, t('relations.outgoing')),
            h('option', { value: 'in' }, t('relations.incoming'))),
          h('select', { value: targetId, onChange: e => setTargetId(e.target.value), style: { ...inputStyle, width: 'auto', maxWidth: 180 } },
            h('option', { value: '' }, t('relations.pickTarget')),
            candidates.map(e => h('option', { key: e.id, value: e.id }, e.title + '（' + e.type + '）'))),
          h(PrimaryButton, {
            small: true,
            onClick: () => {
              const other = targetId;
              if (!other) return;
              const sourceId = direction === 'out' ? selfId : other;
              const target = direction === 'out' ? other : selfId;
              actions.addRelation(relType, sourceId, target);
              setTargetId('');
            },
          }, t('relations.add')),
        ),
        rows.length === 0
          ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('relations.empty'))
          : h('div', null, rows.map(row => h('div', {
            key: row.id,
            style: {
              display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
              fontSize: 13, borderRadius: 6, marginBottom: 2,
              background: 'var(--dsw-alias-bg-layer-2)',
            },
          },
            h('span', { style: { flex: 1 } }, row.text),
            h('button', {
              onClick: () => actions.removeRelation(row.id),
              style: {
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12,
                color: 'var(--dsw-alias-state-error-primary)',
              },
            }, t('relations.remove')),
          ))),
        h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginTop: 8 } }, t('relations.hint')),
      );
    }

    /** 标签区块（详情页）：已有标签 + 添加输入。 */
    function TagsSection(props) {
      const { entity, actions, t } = props;
      const [text, setText] = React.useState('');
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
        entity.tags.map(tag => h('span', {
          key: tag,
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 999, fontSize: 12,
            background: 'var(--dsw-alias-bg-layer-2)',
            border: '1px solid var(--dsw-alias-border-l1)',
          },
        },
          tag,
          h('button', {
            onClick: () => actions.removeTag(entity.id, tag),
            style: { border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 11 },
          }, '×'),
        )),
        h('input', {
          value: text,
          placeholder: t('tags.addPlaceholder'),
          onChange: e => setText(e.target.value),
          onKeyDown: e => {
            if (e.key === 'Enter' && text.trim()) {
              actions.addTag(entity.id, text);
              setText('');
            }
          },
          style: { ...inputStyle, width: 120, padding: '2px 8px', fontSize: 12 },
        }),
      );
    }

    // ─────────────────────────────────────────────
    // 工作台视图
    // ─────────────────────────────────────────────

    /** schema 字段渲染：view 模式或 edit 模式。 */
    function FieldRow(props) {
      const { field, value, editing, onChange } = props;
      if (!editing) {
        if (value === undefined || value === '') return null;
        return h('div', { style: { display: 'flex', gap: 12, padding: '5px 0', fontSize: 13 } },
          h('span', { style: { width: 90, flexShrink: 0, color: 'var(--dsw-alias-label-secondary)' } }, field.label),
          h('span', { style: { color: 'var(--dsw-alias-label-primary)', whiteSpace: 'pre-wrap' } }, String(value)),
        );
      }
      let control;
      if (field.fieldType === 'select') {
        control = h('select', {
          value: value || '',
          onChange: e => onChange(field.key, e.target.value),
          style: inputStyle,
        },
          h('option', { value: '' }, '—'),
          field.options.map(o => h('option', { key: o, value: o }, o)),
        );
      } else if (field.fieldType === 'textarea') {
        control = h('textarea', {
          value: value || '',
          onChange: e => onChange(field.key, e.target.value),
          rows: 3, style: inputStyle,
        });
      } else if (field.fieldType === 'number') {
        control = h('input', {
          type: 'number',
          value: value === undefined || value === null ? '' : String(value),
          onChange: e => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value)),
          style: inputStyle,
        });
      } else {
        control = h('input', {
          value: value || '',
          onChange: e => onChange(field.key, e.target.value),
          style: inputStyle,
        });
      }
      return h('div', { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, field.label),
        control,
      );
    }

    /** 实体详情/编辑面板。 */
    function EntityDetail(props) {
      const { useStore, actions, entity, fields, allRelations, allEntities, onBack, t } = props;
      const editing = useStore(s => s.editing);
      const draft = useStore(s => s.draft);

      if (!editing) {
        return h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
            h(GhostButton, { small: true, onClick: onBack }, t('detail.back')),
            h('div', { style: { flex: 1 } }),
            h(PrimaryButton, { small: true, onClick: () => actions.beginEdit(entity.id) }, t('detail.edit')),
            h(GhostButton, {
              small: true,
              onClick: () => { if (window.confirm(t('detail.deleteConfirm').replace('{title}', entity.title))) actions.remove(entity.id); },
            }, t('detail.delete')),
          ),
          h(Card, null,
            h('div', { style: { fontSize: 17, fontWeight: 600, marginBottom: 2 } }, entity.title),
            h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 10 } },
              entity.updatedAt.slice(0, 10) + ' · ' + entity.id),
            h(TagsSection, { entity, actions, t }),
            entity.description
              ? h('div', { style: { fontSize: 13, marginBottom: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, entity.description)
              : null,
            fields.map(f => h(FieldRow, {
              key: f.key, field: f, value: entity.properties[f.key], editing: false,
            })),
          ),
          h('div', { style: { marginTop: 12 } },
            h(RelationsSection, { relations: allRelations, entities: allEntities, selfId: entity.id, actions, t })),
        );
      }

      // 编辑模式：draft 驱动（draft 由 store 持有，输入直接写 store）。
      const setProp = (key, value) => actions.editDraft({ properties: { ...draft.properties, [key]: value } });
      return h('div', null,
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
          h(GhostButton, { small: true, onClick: () => actions.cancelEdit() }, t('detail.cancel')),
          h('div', { style: { flex: 1 } }),
          h(PrimaryButton, { small: true, onClick: () => actions.commitEdit() }, t('detail.save')),
        ),
        h(Card, null,
          h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, t('detail.titleLabel')),
          h('input', {
            value: draft.title, onChange: e => actions.editDraft({ title: e.target.value }),
            style: { ...inputStyle, marginBottom: 10 },
          }),
          h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, t('detail.descLabel')),
          h('textarea', {
            value: draft.description, rows: 2,
            onChange: e => actions.editDraft({ description: e.target.value }),
            style: { ...inputStyle, marginBottom: 10 },
          }),
          fields.map(f => h(FieldRow, {
            key: f.key, field: f,
            value: draft.properties[f.key], editing: true, onChange: setProp,
          })),
        ),
      );
    }

    /** 门户区块（工作台 portal tab 内容，v1 门户迁移）。 */
    function PortalSection(props) {
      const t = props.t;
      const LINKS = [
        { id: 'repo', href: 'https://github.com/LINGTIAN303/WorldSea' },
        { id: 'pluginRepo', href: 'https://github.com/LINGTIAN303/dsh-worldsea' },
        { id: 'dsh', href: 'https://github.com/deepseek-ai/deepseek-harness' },
      ];
      function launchDesktop() {
        window.open('worldsea://localhost/', '_blank');
      }
      return h('div', null,
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
          WorldIcon({ size: 36 }),
          h('div', null,
            h('div', { style: { fontSize: 17, fontWeight: 600 } }, 'WorldSea'),
            h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('tagline')),
          ),
        ),
        h('p', { style: { fontSize: 13, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 16px' } }, t('intro')),
        h(Card, { pad: 14 },
          LINKS.map(link => h('a', {
            key: link.id, href: link.href, target: '_blank', rel: 'noreferrer',
            style: {
              display: 'block', padding: '6px 10px', borderRadius: 6, marginBottom: 4,
              fontSize: 13, color: 'var(--dsw-alias-brand-primary)', textDecoration: 'none',
              background: 'var(--dsw-alias-bg-layer-1)',
            },
          }, t('links.' + link.id) + ' — ' + link.href.replace('https://', ''))),
          h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } },
            h(PrimaryButton, { onClick: launchDesktop }, t('launch.button')),
            h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('launch.hint')),
          ),
        ),
      );
    }

    /** 工作台主体（左栏 main 与右栏 tab 共用组件）。 */
    function Workbench(props) {
      const { useStore, actions, t } = props;
      const entities = useStore(s => s.entities);
      const relations = useStore(s => s.relations);
      const activeType = useStore(s => s.activeType);
      const selectedId = useStore(s => s.selectedId);
      const view = useStore(s => s.view);
      const search = useStore(s => s.search);

      const typeDef = ENTITY_TYPES.find(x => x.type === activeType) || ENTITY_TYPES[0];
      const kw = search.trim();
      const list = entities
        .filter(e => e.type === typeDef.type)
        .filter(e => !kw || e.title.includes(kw) || e.tags.some(tag => tag.includes(kw))
          || Object.values(e.properties).some(v => typeof v === 'string' && v.includes(kw)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const selected = list.find(e => e.id === selectedId)
        || entities.find(e => e.id === selectedId && e.type === typeDef.type)
        || null;

      /** 页签按钮公共样式。 */
      const pill = (active) => ({
        padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
        background: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-1)',
        color: active ? '#fff' : 'var(--dsw-alias-label-primary)',
      });

      return h('div', { style: { height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: 20 } },
        // 顶部页签：工作台 / 门户
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
          h('button', { onClick: () => actions.setView('workbench'), style: pill(view === 'workbench') }, t('tab.workbench')),
          h('button', { onClick: () => actions.setView('portal'), style: pill(view === 'portal') }, t('tab.portal')),
        ),

        view === 'portal'
          ? PortalSection({ t })
          : h('div', null,
            // 类型切换条
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
              ENTITY_TYPES.map(def => h('button', {
                key: def.type,
                onClick: () => actions.selectType(def.type),
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12,
                  border: '1px solid ' + (def.type === activeType ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)'),
                  background: def.type === activeType ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                },
              },
                h(TypeGlyph, { glyph: def.glyph, size: 13 }),
                def.label,
                ' (' + entities.filter(e => e.type === def.type).length + ')',
              )),
            ),

            selected
              ? h(EntityDetail, { useStore, actions, entity: selected, fields: typeDef.fields, allRelations: relations, allEntities: entities, t, onBack: () => actions.selectEntity(null) })
              : h('div', null,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                  h('h3', { style: { margin: 0, fontSize: 15 } }, typeDef.label + ' · ' + t('workbench.list')),
                  h('input', {
                    value: search,
                    placeholder: t('workbench.searchPlaceholder'),
                    onChange: e => actions.setSearch(e.target.value),
                    style: { ...inputStyle, width: 180, padding: '4px 10px', fontSize: 12 },
                  }),
                  h('div', { style: { flex: 1 } }),
                  h(PrimaryButton, { small: true, onClick: () => actions.create(typeDef.type, t('workbench.untitled')) }, t('workbench.new')),
                ),
                list.length === 0
                  ? h(Card, { pad: 28 }, h('div', { style: { textAlign: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, t('workbench.empty')))
                  : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
                    list.map(e => h(Card, { key: e.id, pad: 12 },
                      h('div', {
                        onClick: () => actions.selectEntity(e.id),
                        style: { cursor: 'pointer' },
                      },
                        h('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 4 } }, e.title),
                        h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', display: 'flex', gap: 8 } },
                          h('span', null, e.updatedAt.slice(0, 10)),
                          e.tags.length ? h('span', null, e.tags.join(' · ')) : null,
                        ),
                      ),
                    ))),
              ),
          ),
      );
    }

    // ─────────────────────────────────────────────
    // 模块注入面与 slot 注册
    // ─────────────────────────────────────────────

    const inject = ['slots', 'locale', 'sidebarRightTabs'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), NS + ': dictionaries');
      const t = ctx.locale.bind(NS);

      // 底层只造一个实例（数据真正共享）；两个 handle 各挂一个 scope ——
      // ui-slots 校验「one handle, one scope」：main 是 root，右栏 tab 是 session。
      const instance = workbenchStore.create();
      const rootHandle = { spec: workbenchStore.spec, create: () => instance };
      const sessionHandle = { spec: workbenchStore.spec, create: () => instance };

      // ① 左栏入口：图标 + 面板体（store 声明让框架传 {useStore, actions}；inject 传 t）。
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: PANEL_ID, order: 30, locale: NS,
        label: () => t('panel.label'),
      }, props => WorldIcon({ size: props.size }))), NS + ': panellist');

      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: PANEL_ID, locale: NS,
        store: rootHandle,
        inject: () => ({ t }),
      }, Workbench)), NS + ': main');

      // ② 右栏入口：tab 类型（带 guide 卡）+ body/title。
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: TAB_ID, kind: TAB_KIND, priority: 'extension',
        title: () => t('tab.title'),
        guide: [{ id: 'worldsea-portal', order: 10, title: () => t('guide.title'), description: () => t('guide.description'), icon: WorldIcon }],
      }), NS + ': tab type');

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS,
        store: sessionHandle,
        inject: () => ({ t }),
      }, Workbench)), NS + ': tab body');

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab.title', key: TAB_ID,
      }, () => t('tab.title'))), NS + ': tab title');
    }

    // ─────────────────────────────────────────────
    // 字典
    // ─────────────────────────────────────────────

    const zh = {
      'panel.label': 'WorldSea',
      'tagline': 'Agent 驱动的世界观构建平台',
      'intro': 'WorldSea 是一个本地优先的世界观创作平台。本工作台把 WorldSea 的创作能力带入 DSH：schema 驱动的实体管理（角色 / 区域 / 道具 / 魔法），数据本地持久化。',
      'tab.workbench': '工作台',
      'tab.portal': '门户',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea 工作台',
      'guide.description': '世界观创作工作台：实体管理与门户',
      'workbench.list': '列表',
      'workbench.new': '新建',
      'workbench.empty': '暂无实体，点「新建」开始创作。',
      'workbench.untitled': '未命名',
      'workbench.searchPlaceholder': '搜索标题 / 标签 / 字段…',
      'relations.title': '关系',
      'relations.add': '连边',
      'relations.remove': '删',
      'relations.outgoing': '本方 → 对方',
      'relations.incoming': '对方 → 本方',
      'relations.pickTarget': '选实体…',
      'relations.empty': '尚无关系；选类型与实体后「连边」。',
      'relations.hint': '非对称关系自动创建反向边；删除一边时逆边同删。',
      'tags.addPlaceholder': '+标签',
      'detail.back': '返回',
      'detail.edit': '编辑',
      'detail.delete': '删除',
      'detail.deleteConfirm': '确定删除「{title}」？',
      'detail.cancel': '取消',
      'detail.save': '保存',
      'detail.titleLabel': '标题',
      'detail.descLabel': '描述',
      'links.repo': 'WorldSea 主仓库',
      'links.pluginRepo': '本插件仓库',
      'links.dsh': 'DeepSeek Harness (dsh)',
      'launch.button': '尝试唤起 WorldSea 桌面应用',
      'launch.hint': '经 worldsea:// 壳协议唤起；未注册协议时无反应。',
    };

    const en = {
      'panel.label': 'WorldSea',
      'tagline': 'Agent-powered worldbuilding platform',
      'intro': 'WorldSea is a local-first worldbuilding platform. This workbench brings its creative capabilities into DSH: schema-driven entity management (characters / regions / items / magic), persisted locally.',
      'tab.workbench': 'Workbench',
      'tab.portal': 'Portal',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea workbench',
      'guide.description': 'Worldbuilding workbench: entity management and portal',
      'workbench.list': 'list',
      'workbench.new': 'New',
      'workbench.empty': 'No entities yet. Click "New" to start.',
      'workbench.untitled': 'Untitled',
      'workbench.searchPlaceholder': 'Search title / tag / field…',
      'relations.title': 'Relations',
      'relations.add': 'Link',
      'relations.remove': 'x',
      'relations.outgoing': 'self → other',
      'relations.incoming': 'other → self',
      'relations.pickTarget': 'Pick entity…',
      'relations.empty': 'No relations yet; pick a type and an entity, then "Link".',
      'relations.hint': 'Asymmetric relations auto-create the inverse edge; deleting one edge removes its inverse.',
      'tags.addPlaceholder': '+tag',
      'detail.back': 'Back',
      'detail.edit': 'Edit',
      'detail.delete': 'Delete',
      'detail.deleteConfirm': 'Delete "{title}"?',
      'detail.cancel': 'Cancel',
      'detail.save': 'Save',
      'detail.titleLabel': 'Title',
      'detail.descLabel': 'Description',
      'links.repo': 'WorldSea main repository',
      'links.pluginRepo': 'This plugin repository',
      'links.dsh': 'DeepSeek Harness (dsh)',
      'launch.button': 'Launch WorldSea desktop app',
      'launch.hint': 'Opens via the worldsea:// shell protocol; nothing happens when unregistered.',
    };

    const dictionaries = { zh, en };

    return { inject, apply };
  },
});
