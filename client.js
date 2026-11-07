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

    /** 建筑（WorldSea official.buildings ownFields 原样抄录）。 */
    const BUILDING_FIELDS = [
      { key: 'buildingType', label: '类型', fieldType: 'select', options: ['城堡', '宫殿', '寺庙', '酒馆', '商店', '工坊', '图书馆', '学院', '兵营', '监狱', '港口', '塔楼', '城墙', '民居', '地下城', '其他'] },
      { key: 'floors', label: '层数', fieldType: 'text' },
      { key: 'area', label: '面积', fieldType: 'text' },
      { key: 'style', label: '建筑风格', fieldType: 'select', options: ['哥特', '罗马', '东方', '精灵', '矮人', '蒸汽朋克', '未来', '原始', '混合', '其他'] },
      { key: 'era', label: '建造年代', fieldType: 'text' },
      { key: 'builder', label: '建造者', fieldType: 'text' },
      { key: 'materials', label: '主要建材', fieldType: 'textarea' },
      { key: 'significance', label: '历史意义', fieldType: 'textarea' },
    ];

    /** 生物（WorldSea official.creatures ownFields 原样抄录）。 */
    const CREATURE_FIELDS = [
      { key: 'creatureType', label: '类别', fieldType: 'select', options: ['走兽', '飞禽', '水族', '虫豸', '魔兽', '异种', '元素生物', '不死生物', '机械造物', '其他'] },
      { key: 'dangerLevel', label: '危险度', fieldType: 'select', options: ['无害', '低危', '中危', '高危', '灾厄'] },
      { key: 'diet', label: '食性', fieldType: 'select', options: ['草食', '肉食', '杂食', '腐食', '吸能', '未知'] },
      { key: 'size', label: '体型', fieldType: 'select', options: ['微型', '小型', '中型', '大型', '巨型', '超巨'] },
      { key: 'temperament', label: '性情', fieldType: 'select', options: ['温顺', '胆小', '领地意识', '凶猛', '群袭', '不可预测'] },
      { key: 'habitat', label: '栖息环境', fieldType: 'text' },
      { key: 'abilities', label: '能力', fieldType: 'textarea' },
      { key: 'weakness', label: '弱点', fieldType: 'textarea' },
      { key: 'yield', label: '产出物', fieldType: 'text' },
    ];

    /** 植物（WorldSea official.plants ownFields；multi-select 降级为 text，逗号分隔）。 */
    const PLANT_FIELDS = [
      { key: 'plantType', label: '类型', fieldType: 'select', options: ['药草', '树木', '菌类', '魔法植物', '花卉', '谷物', '水生植物', '藤本', '其他'] },
      { key: 'habitat', label: '生长环境', fieldType: 'text' },
      { key: 'usage', label: '用途（逗号分隔）', fieldType: 'text' },
      { key: 'toxicity', label: '毒性/副作用', fieldType: 'textarea' },
      { key: 'growthCycle', label: '生长周期', fieldType: 'text' },
      { key: 'relatedProducts', label: '制成品', fieldType: 'textarea' },
    ];

    /** 语言（WorldSea official.languages ownFields 原样抄录）。 */
    const LANGUAGE_FIELDS = [
      { key: 'langType', label: '语言类型', fieldType: 'select', options: ['自然语言', '人造语言', '古代语言', '暗语/密语', '手语', '心灵感应', '其他'] },
      { key: 'scriptType', label: '文字类型', fieldType: 'select', options: ['表音文字', '表意文字', '音节文字', '象形文字', '符文', '无文字', '混合'] },
      { key: 'languageFamily', label: '语系', fieldType: 'text' },
      { key: 'scope', label: '使用范围', fieldType: 'select', options: ['全球通用', '区域通用', '种族语言', '少数族群', '已灭绝', '特定群体'] },
      { key: 'maturity', label: '成熟度', fieldType: 'select', options: ['完整语言', '基础词汇表', '仅有短语', '发展中'] },
      { key: 'phonology', label: '音系特点', fieldType: 'textarea' },
      { key: 'grammar', label: '语法特点', fieldType: 'textarea' },
      { key: 'vocabulary', label: '词汇示例', fieldType: 'textarea' },
      { key: 'sampleText', label: '文字示例', fieldType: 'textarea' },
    ];

    /** 概念（WorldSea official.concepts ownFields；tags 降级为 text）。 */
    const CONCEPT_FIELDS = [
      { key: 'conceptType', label: '类型', fieldType: 'select', options: ['概念', '规则', '魔法', '科技', '文化', '历史', '宗教', '生物', '语言', '社会制度', '其他'] },
      { key: 'definition', label: '定义', fieldType: 'textarea' },
      { key: 'aliases', label: '别名/同义词', fieldType: 'text' },
    ];

    /** 信仰（WorldSea official.faith ownFields 原样抄录）。 */
    const FAITH_FIELDS = [
      { key: 'faithType', label: '信仰类型', fieldType: 'select', options: ['多神教', '一神教', '泛灵信仰', '祖先崇拜', '图腾崇拜', '哲学信条', '秘密教派', '其他'] },
      { key: 'deities', label: '神祇', fieldType: 'textarea' },
      { key: 'doctrine', label: '核心教义', fieldType: 'textarea' },
      { key: 'origin', label: '起源传说', fieldType: 'textarea' },
      { key: 'ritual', label: '主要仪式', fieldType: 'textarea' },
      { key: 'taboo', label: '禁忌', fieldType: 'textarea' },
      { key: 'scripture', label: '经文圣典', fieldType: 'text' },
      { key: 'holySymbol', label: '圣徽圣物', fieldType: 'text' },
      { key: 'clergy', label: '神职体系', fieldType: 'textarea' },
      { key: 'scope', label: '传播范围', fieldType: 'select', options: ['世界主流', '区域国教', '民间信仰', '秘密教派', '已消亡', '其他'] },
    ];

    /** 文化（WorldSea official.culture ownFields 原样抄录）。 */
    const CULTURE_FIELDS = [
      { key: 'cultureType', label: '类型', fieldType: 'select', options: ['节日', '仪式', '禁忌', '婚俗', '丧葬', '饮食', '服饰', '艺术', '建筑风格', '其他'] },
      { key: 'cycle', label: '周期', fieldType: 'text' },
      { key: 'origin', label: '起源', fieldType: 'textarea' },
      { key: 'participants', label: '参与者', fieldType: 'textarea' },
      { key: 'significance', label: '意义/象征', fieldType: 'textarea' },
      { key: 'practices', label: '具体做法', fieldType: 'textarea' },
    ];

    /** 冲突（WorldSea official.conflict ownFields 原样抄录）。 */
    const CONFLICT_FIELDS = [
      { key: 'conflictType', label: '类型', fieldType: 'select', options: ['全面战争', '局部冲突', '内战', '起义', '侵略', '防御战', '冷冲突', '贸易战', '其他'] },
      { key: 'scale', label: '规模', fieldType: 'select', options: ['全球', '区域', '国家', '地方', '小规模'] },
      { key: 'cause', label: '起因', fieldType: 'textarea' },
      { key: 'result', label: '结果', fieldType: 'textarea' },
      { key: 'casualties', label: '伤亡', fieldType: 'textarea' },
      { key: 'treaty', label: '和约/停战协议', fieldType: 'textarea' },
    ];

    /** 事件（WorldSea official.timeline event；datable trait 摊平为 date/dateEnd 字段）。 */
    const EVENT_FIELDS = [
      { key: 'date', label: '日期/纪年', fieldType: 'text' },
      { key: 'dateEnd', label: '结束日期', fieldType: 'text' },
      { key: 'importance', label: '重要程度', fieldType: 'select', options: ['关键', '重要', '普通', '细微'] },
      { key: 'status', label: '状态', fieldType: 'select', options: ['正史', '废案', '备选'] },
      { key: 'location', label: '发生地点', fieldType: 'text' },
    ];

    /** 战力体系（WorldSea official.combat_stats ownFields 原样抄录）。 */
    const COMBAT_STAT_FIELDS = [
      { key: 'system', label: '体系', fieldType: 'select', options: ['境界制', '等级制', '数值制'] },
      { key: 'tier', label: '层级排序', fieldType: 'number' },
      { key: 'realm', label: '境界/等级', fieldType: 'text' },
      { key: 'promotion', label: '晋升条件', fieldType: 'textarea' },
      { key: 'bottleneck', label: '瓶颈/突破难点', fieldType: 'textarea' },
      { key: 'power', label: '战力表现', fieldType: 'textarea' },
      { key: 'culture', label: '所属文化圈', fieldType: 'select', options: ['中式', '西式', '混合'] },
    ];

    /**
     * 武器/服饰特性（对齐 WorldSea WeaponFacet/ApparelFacet——它们挂在 Item 上而非独立实体；
     * 本插件以「可选字段组」对齐：item 类型的表单在基础字段后追加这两组，不填即不显示）。
     */
    const WEAPON_FACET_FIELDS = [
      { key: 'weaponType', label: '武器类型', fieldType: 'select', options: ['剑', '刀', '枪', '弓', '法器', '盾', '暗器', '其他'] },
      { key: 'rank', label: '品级', fieldType: 'select', options: ['凡品', '祥品', '灵品', '圣器', '神器'] },
      { key: 'smith', label: '锻造者', fieldType: 'text' },
      { key: 'forgedAt', label: '锻造时间', fieldType: 'text' },
      { key: 'specialAbility', label: '特殊能力', fieldType: 'textarea' },
      { key: 'battles', label: '战绩摘要', fieldType: 'textarea' },
    ];
    const APPAREL_FACET_FIELDS = [
      { key: 'apparelType', label: '服饰类型', fieldType: 'select', options: ['上衣', '下装', '连衣裙', '外套/披风', '头饰', '鞋履', '手套', '饰品/首饰', '轻甲', '中甲', '重甲', '盾牌', '法袍', '套装'] },
      { key: 'armorClass', label: '护甲等级', fieldType: 'select', options: ['无防护', '布甲', '皮甲', '锁甲', '板甲', '法袍', '饰品'] },
      { key: 'style', label: '风格', fieldType: 'select', options: ['朴素', '华丽', '异域', '军用', '仪式', '日常', '伪装', '工装'] },
      { key: 'defense', label: '防御值', fieldType: 'number' },
      { key: 'weight', label: '重量', fieldType: 'select', options: ['极轻', '轻', '中等', '重', '极重'] },
      { key: 'durability', label: '耐久度', fieldType: 'select', options: ['易损', '普通', '耐用', '坚固', '不毁'] },
      { key: 'significance', label: '意义', fieldType: 'textarea' },
    ];

    /** 笔记（WorldSea official.notebook ownFields + narrative trait 的 content 摊平）。 */
    const NOTEBOOK_FIELDS = [
      { key: 'content', label: '正文（Markdown）', fieldType: 'textarea' },
      { key: 'noteType', label: '笔记类型', fieldType: 'select', options: ['markdown', 'code', 'reference'] },
      { key: 'codeLanguage', label: '代码语言', fieldType: 'text' },
    ];

    /** 大纲节点（WorldSea official.outline outline_node：parentId 树形 + 线索 + 预估字数）。 */
    const OUTLINE_NODE_FIELDS = [
      { key: 'content', label: '内容（Markdown）', fieldType: 'textarea' },
      { key: 'parentId', label: '父节点 ID', fieldType: 'text' },
      { key: 'storylines', label: '所属线索', fieldType: 'text' },
      { key: 'wordCount', label: '字数（预估）', fieldType: 'number' },
      { key: 'nodeType', label: '节点类型', fieldType: 'select', options: ['chapter', 'scene', 'beat', 'note'] },
      { key: 'condition', label: '状态', fieldType: 'select', options: ['未写', '草稿', '完成'] },
    ];

    /** 手稿（WorldSea official.manuscript：book 容器 + manuscript 章节，bookId 归属）。 */
    const BOOK_FIELDS = [
      { key: 'volumeName', label: '所属卷名', fieldType: 'text' },
      { key: 'author', label: '作者（世界内）', fieldType: 'text' },
    ];
    const MANUSCRIPT_FIELDS = [
      { key: 'content', label: '正文（Markdown）', fieldType: 'textarea' },
      { key: 'bookId', label: '所属书籍 ID', fieldType: 'text' },
      { key: 'condition', label: '状态', fieldType: 'select', options: ['草稿', '修订中', '终稿'] },
      { key: 'volumeName', label: '所属卷名', fieldType: 'text' },
    ];

    /** 实体类型注册表（manifest 对齐 WorldSea 官方插件形态；15 类覆盖创作域主力，按域分组）。 */
    const ENTITY_TYPES = [
      { type: 'character', label: '角色', domain: 'life', fields: CHARACTER_FIELDS, glyph: 'user' },
      { type: 'species', label: '物种', domain: 'life', fields: SPECIES_FIELDS, glyph: 'paw' },
      { type: 'creature', label: '生物', domain: 'life', fields: CREATURE_FIELDS, glyph: 'paw' },
      { type: 'plant', label: '植物', domain: 'life', fields: PLANT_FIELDS, glyph: 'leaf' },
      { type: 'region', label: '区域', domain: 'geo', fields: REGION_FIELDS, glyph: 'map' },
      { type: 'building', label: '建筑', domain: 'geo', fields: BUILDING_FIELDS, glyph: 'house' },
      { type: 'item', label: '道具', domain: 'goods', fields: ITEM_FIELDS, glyph: 'item' },
      { type: 'magic', label: '魔法', domain: 'arcane', fields: MAGIC_FIELDS, glyph: 'spark' },
      { type: 'organization', label: '组织', domain: 'society', fields: ORGANIZATION_FIELDS, glyph: 'org' },
      { type: 'language', label: '语言', domain: 'society', fields: LANGUAGE_FIELDS, glyph: 'chat' },
      { type: 'faith', label: '信仰', domain: 'society', fields: FAITH_FIELDS, glyph: 'star' },
      { type: 'culture', label: '文化', domain: 'society', fields: CULTURE_FIELDS, glyph: 'mask' },
      { type: 'concept', label: '概念', domain: 'knowledge', fields: CONCEPT_FIELDS, glyph: 'bulb' },
      { type: 'conflict', label: '冲突', domain: 'history', fields: CONFLICT_FIELDS, glyph: 'swords' },
      { type: 'event', label: '事件', domain: 'history', fields: EVENT_FIELDS, glyph: 'clock' },
      { type: 'combat_stat', label: '战力体系', domain: 'arcane', fields: COMBAT_STAT_FIELDS, glyph: 'shield' },
      { type: 'notebook', label: '笔记', domain: 'knowledge', fields: NOTEBOOK_FIELDS, glyph: 'note' },
      { type: 'outline_node', label: '大纲节点', domain: 'history', fields: OUTLINE_NODE_FIELDS, glyph: 'tree' },
      { type: 'book', label: '书籍', domain: 'history', fields: BOOK_FIELDS, glyph: 'book' },
      { type: 'manuscript', label: '正文', domain: 'history', fields: MANUSCRIPT_FIELDS, glyph: 'manuscript' },
    ];

    /**
     * Facet 字段组（对齐 WorldSea WeaponFacet/ApparelFacet）：挂在宿主类型的
     * 基础字段之后，详情表单折叠渲染，全部可选（未填字段详情页不显示）。
     */
    const FACET_FIELD_GROUPS = [
      { hostType: 'item', id: 'weapon', label: '武器特性', fields: WEAPON_FACET_FIELDS, glyph: 'swords' },
      { hostType: 'item', id: 'apparel', label: '服饰特性', fields: APPAREL_FACET_FIELDS, glyph: 'mask' },
    ];

    /** 域分组（类型条的第一级页签）。 */
    const DOMAINS = [
      { id: 'life', label: '生命' },
      { id: 'geo', label: '地理' },
      { id: 'goods', label: '物品' },
      { id: 'arcane', label: '奥秘' },
      { id: 'society', label: '社会' },
      { id: 'knowledge', label: '知识' },
      { id: 'history', label: '历史' },
    ];
    const DOMAIN_LABEL = new Map(DOMAINS.map(d => [d.id, d.label]));

    /**
     * 用户自定义实体类型（对齐 WorldSea EntityTypeSchema：typeKey + label + fields）。
     * 与内置类型合并生效；实例实体直接存在 entities 里（type 键区分），无需迁移。
     */
    const allEntityTypes = (customs) => customs && customs.length ? [...ENTITY_TYPES, ...customs] : ENTITY_TYPES;

    /**
     * 实体示例模板（对齐 WorldSea templates 思路：每类型一份示例预填，快速上手）。
     * createFromTemplate 时合并进 properties，标题加「示例」前缀可改。
     */
    const ENTITY_TEMPLATES = {
      character: { title: '示例角色', properties: { age: '24', gender: '女', race: '精灵', occupation: '游侠', role: '主角', personality: '冷静寡言，重诺', } },
      region: { title: '示例区域', properties: { regionType: '城市', climate: '温带海洋', population: '约 12 万', government: '共和制', } },
      item: { title: '示例道具', properties: { itemType: '武器', grade: '传说', material: '秘银', condition: '完好', } },
      magic: { title: '示例法术', properties: { system: '元素魔法', element: '火', tier: '三环', castTime: '2 秒', range: '30 米', } },
      organization: { title: '示例组织', properties: { orgType: '公会', size: '大型', alignment: '守序中立', motto: '以信立会', } },
      species: { title: '示例物种', properties: { speciesType: '精灵', avgLifespan: '800 年', language: '精灵语', } },
      building: { title: '示例建筑', properties: { buildingType: '酒馆', style: '东方', era: '旧王朝末期', } },
      creature: { title: '示例生物', properties: { creatureType: '魔兽', dangerLevel: '高危', diet: '肉食', size: '大型', temperament: '凶猛', } },
      plant: { title: '示例植物', properties: { plantType: '药草', usage: '炼金, 食用', growthCycle: '一年生', } },
      language: { title: '示例语言', properties: { langType: '人造语言', scriptType: '符文', scope: '种族语言', maturity: '基础词汇表', } },
      concept: { title: '示例概念', properties: { conceptType: '规则', definition: '本世界魔法消耗的是使用者寿命。', } },
      faith: { title: '示例信仰', properties: { faithType: '多神教', scope: '区域国教', } },
      culture: { title: '示例文化', properties: { cultureType: '节日', cycle: '每年秋分', } },
      conflict: { title: '示例冲突', properties: { conflictType: '局部冲突', scale: '区域', } },
      event: { title: '示例事件', properties: { date: '元年 春', importance: '关键', status: '正史', } },
      combat_stat: { title: '示例战力体系', properties: { system: '境界制', tier: 1, realm: '炼气一层', culture: '中式', } },
      notebook: { title: '示例笔记', properties: { noteType: 'markdown', content: '# 笔记\n\n自由记录设定灵感、考据与备忘。', } },
      outline_node: { title: '第一卷 开端', properties: { content: '开篇场景梗概…', condition: '未写', nodeType: 'chapter', } },
      book: { title: '示例书籍', properties: { volumeName: '第一卷', } },
      manuscript: { title: '第一章 启程', properties: { content: '第一章正文…', condition: '草稿', volumeName: '第一卷', } },
    };

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

    /** 按类型查关系定义（内置表；自定义类型经合并查找 allRelationDefs）。 */
    const relationDef = (type) => RELATION_TYPES.find(r => r.type === type);
    /** 内置 + 自定义合并查找。customs 为 store 中的 customRelationTypes 数组。 */
    const allRelationDefs = (customs) => customs && customs.length ? [...RELATION_TYPES, ...customs] : RELATION_TYPES;

    /**
     * autoLink 规则（对齐 WorldSea AutoLinkEngine 核心规则表）：
     * 实体保存时扫描字段值，按规则自动建 belongs_to 关系。
     * 每条规则：字段名匹配（正则）→ 目标类型 + 关系类型。
     */
    const AUTO_LINK_RULES = [
      { fieldPattern: /^(race|species|种族|物种)$/i, targetType: 'species', relationType: 'belongs_to' },
      { fieldPattern: /^(affiliation|faction|所属势力|所属组织|所属)$/i, targetType: 'organization', relationType: 'belongs_to' },
      { fieldPattern: /^(owner|origin|originated|source|来源|持有者)$/i, targetType: 'character', relationType: 'owned_by' },
      { fieldPattern: /^(habitat|origin|栖息环境|起源地)$/i, targetType: 'region', relationType: 'resides_in' },
    ];

    /**
     * 保存实体时执行 autoLink：字段值能唯一匹配同类型已存实体标题时建边。
     * 已有同型同目标关系则跳过（幂等）。
     * @param draft - store 草稿。
     * @param entity - 已提交的实体。
     */
    function applyAutoLink(draft, entity) {
      const created = [];
      for (const rule of AUTO_LINK_RULES) {
        for (const [key, value] of Object.entries(entity.properties || {})) {
          if (!rule.fieldPattern.test(key) || typeof value !== 'string' || !value.trim()) continue;
          const targets = draft.entities.filter(e =>
            e.type === rule.targetType
            && (e.title === value.trim() || e.title.includes(value.trim()) || value.trim().includes(e.title)));
          const target = targets[0];
          if (!target || target.id === entity.id) continue;
          // 幂等：同型同向同目标已存在则跳过。
          const exists = draft.relations.some(r =>
            r.type === rule.relationType && r.sourceId === entity.id && r.targetId === target.id);
          if (exists) continue;
          const def = relationDef(rule.relationType);
          const now = new Date().toISOString();
          const id = 'rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
          const symmetric = def.inverseType === def.type;
          const pairId = symmetric ? undefined : 'rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
          draft.relations.push({ id, type: rule.relationType, sourceId: entity.id, targetId: target.id, properties: {}, pairId, createdAt: now, updatedAt: now });
          if (!symmetric) {
            draft.relations.push({
              id: pairId, type: def.inverseType, sourceId: target.id, targetId: entity.id,
              properties: {}, pairId: id, createdAt: now, updatedAt: now,
            });
          }
          created.push(value.trim() + '←' + (def.label));
        }
      }
      return created;
    }

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
        /** 用户自定义关系类型（对齐 WorldSea isCustom；与内置 RELATION_TYPES 合并生效）。 */
        customRelationTypes: [],
        /** 用户自定义实体类型（对齐 WorldSea EntityTypeSchema.customFields；与内置 ENTITY_TYPES 合并生效）。 */
        customEntityTypes: [],
        view: 'workbench',
        activeDomain: 'life',
        activeType: 'character',
        selectedId: null,
        editing: false,
        draft: null,
        search: '',
        batchMode: false,
        batchSelection: [],
      }),
      persist: PERSIST_KEY,
      actions: {
        /** 视图切换（工作台 / 图谱 / 门户）。 */
        setView(draft, view) { draft.view = view; if (view !== 'workbench') { draft.editing = false; draft.draft = null; } },
        /** 切换域：自动落到该域第一个类型。 */
        selectDomain(draft, domain) {
          draft.activeDomain = domain;
          const first = ENTITY_TYPES.find(def => def.domain === domain);
          if (first) draft.activeType = first.type;
          draft.selectedId = null; draft.editing = false; draft.draft = null;
        },
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
        /** 按示例模板新建：标题与预填字段一并写入。 */
        createFromTemplate(draft, type) {
          const tpl = ENTITY_TEMPLATES[type];
          if (!tpl) { return; }
          const now = new Date().toISOString();
          const entity = {
            id: newEntityId(),
            type,
            title: tpl.title,
            description: '',
            properties: { ...tpl.properties },
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
        /** 提交编辑：单 draft 内写实体 + 退出编辑态 + autoLink。 */
        commitEdit(draft) {
          if (!draft.editing || !draft.draft || !draft.selectedId) return;
          const entity = draft.entities.find(e => e.id === draft.selectedId);
          if (!entity) { draft.editing = false; draft.draft = null; return; }
          entity.title = draft.draft.title;
          entity.description = draft.draft.description;
          entity.properties = draft.draft.properties;
          entity.updatedAt = new Date().toISOString();
          applyAutoLink(draft, entity);
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
        /** Facet 字段即时写：单字段 patch，无需整体编辑态。 */
        patchProperties(draft, id, key, value) {
          const entity = draft.entities.find(e => e.id === id);
          if (!entity) return;
          if (value === '' || value === undefined) delete entity.properties[key];
          else entity.properties[key] = value;
          entity.updatedAt = new Date().toISOString();
        },
        /** 标题改名（写作视图正文页头部用）。 */
        renameEntity(draft, id, title) {
          const entity = draft.entities.find(e => e.id === id);
          if (!entity) return;
          entity.title = title;
          entity.updatedAt = new Date().toISOString();
        },
        /** 手稿章节：建章并归书（bookId 空串 = 未归书）。 */
        createChapter(draft, title, bookId) {
          const now = new Date().toISOString();
          const entity = {
            id: newEntityId(),
            type: 'manuscript',
            title: title || '未命名',
            description: '',
            properties: { condition: '草稿', ...(bookId ? { bookId } : {}) },
            tags: [],
            createdAt: now,
            updatedAt: now,
          };
          draft.entities.push(entity);
        },
        /** 关系属性：备注（写入 relation.properties.note；非对称边两条独立记录，各写各的）。 */
        setRelationNote(draft, relationId, note) {
          const rel = draft.relations.find(r => r.id === relationId);
          if (!rel) return;
          if (!rel.properties) rel.properties = {};
          if (note.trim()) rel.properties.note = note;
          else delete rel.properties.note;
          rel.updatedAt = new Date().toISOString();
        },
        /** 清理悬挂关系：端点实体已不存在的关系边（含逆边）。 */
        pruneDanglingRelations(draft) {
          const ids = new Set(draft.entities.map(e => e.id));
          draft.relations = draft.relations.filter(r => ids.has(r.sourceId) && ids.has(r.targetId));
        },
        /** 批量模式切换。 */
        toggleBatchMode(draft) { draft.batchMode = !draft.batchMode; draft.batchSelection = []; },
        /** 批量选择切换。 */
        toggleBatchItem(draft, id) {
          if (!draft.batchSelection) draft.batchSelection = [];
          const i = draft.batchSelection.indexOf(id);
          if (i >= 0) draft.batchSelection.splice(i, 1);
          else draft.batchSelection.push(id);
        },
        /** 批量加标签。 */
        batchAddTag(draft, tag) {
          const t = (tag || '').trim();
          if (!t || !draft.batchSelection?.length) return;
          for (const id of draft.batchSelection) {
            const entity = draft.entities.find(e => e.id === id);
            if (entity && !entity.tags.includes(t)) { entity.tags.push(t); entity.updatedAt = new Date().toISOString(); }
          }
        },
        /** 批量删除（含所选实体参与的全部关系）。 */
        batchRemove(draft) {
          if (!draft.batchSelection?.length) return;
          const doomed = new Set(draft.batchSelection);
          draft.entities = draft.entities.filter(e => !doomed.has(e.id));
          draft.relations = draft.relations.filter(r => !doomed.has(r.sourceId) && !doomed.has(r.targetId));
          if (draft.selectedId && doomed.has(draft.selectedId)) { draft.selectedId = null; draft.editing = false; draft.draft = null; }
          draft.batchSelection = [];
        },
        /**
         * 合并所选实体到第一个（主实体）：描述拼接、properties 并集（主实体优先）、
         * 标签并集；副实体的关系边改挂主实体（同型同向同目标已存在则丢弃，幂等）。
         */
        batchMerge(draft) {
          if (!draft.batchSelection || draft.batchSelection.length < 2) return;
          const [mainId, ...subIds] = draft.batchSelection;
          const main = draft.entities.find(e => e.id === mainId);
          const subs = draft.entities.filter(e => subIds.includes(e.id));
          if (!main || subs.length === 0) return;
          for (const sub of subs) {
            if (sub.description && sub.description !== main.description) {
              main.description = main.description ? main.description + '\n\n— 合并自 ' + sub.title + ' —\n' + sub.description : sub.description;
            }
            for (const [key, value] of Object.entries(sub.properties || {})) {
              if (main.properties[key] === undefined || main.properties[key] === '') main.properties[key] = value;
            }
            for (const tag of sub.tags) {
              if (!main.tags.includes(tag)) main.tags.push(tag);
            }
            if (sub.updatedAt > main.updatedAt) main.updatedAt = sub.updatedAt;
          }
          // 关系改挂：副实体端点换主实体；换完同型同向同目标去重（含自环丢弃）。
          for (const rel of draft.relations) {
            if (rel.sourceId && subIds.includes(rel.sourceId)) rel.sourceId = mainId;
            if (rel.targetId && subIds.includes(rel.targetId)) rel.targetId = mainId;
          }
          draft.relations = draft.relations.filter(r => {
            if (r.sourceId === r.targetId) return false;
            return !draft.relations.some(x => x.id !== r.id
              && x.type === r.type && x.sourceId === r.sourceId && x.targetId === r.targetId);
          });
          draft.entities = draft.entities.filter(e => !subIds.includes(e.id));
          draft.selectedId = mainId;
          draft.batchSelection = [];
          draft.batchMode = false;
        },
        /**
         * 建关系：有向边 source→target；非对称关系自动补逆边（pairId 互指）。
         * 对称关系（inverseType === type）只建一条边。支持内置与自定义类型。
         */
        addRelation(draft, type, sourceId, targetId) {
          if (sourceId === targetId) return;
          const def = allRelationDefs(draft.customRelationTypes).find(r => r.type === type);
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
        /** 导入合并：同 id 覆盖，新 id 追加；关系按同规则并入。 */
        importData(draft, entities, relations) {
          const byId = new Map(draft.entities.map(e => [e.id, e]));
          for (const incoming of entities) {
            if (!incoming || typeof incoming.id !== 'string') continue;
            const existing = byId.get(incoming.id);
            if (existing) {
              Object.assign(existing, incoming, { updatedAt: new Date().toISOString() });
            } else {
              const merged = {
                id: incoming.id, type: incoming.type || 'character',
                title: incoming.title || '未命名', description: incoming.description || '',
                properties: incoming.properties || {}, tags: Array.isArray(incoming.tags) ? incoming.tags : [],
                createdAt: incoming.createdAt || new Date().toISOString(),
                updatedAt: incoming.updatedAt || new Date().toISOString(),
              };
              draft.entities.push(merged);
              byId.set(merged.id, merged);
            }
          }
          const knownIds = new Set(draft.entities.map(e => e.id));
          const relById = new Map(draft.relations.map(r => [r.id, r]));
          for (const incoming of relations) {
            if (!incoming || typeof incoming.id !== 'string') continue;
            if (!knownIds.has(incoming.sourceId) || !knownIds.has(incoming.targetId)) continue;
            const existing = relById.get(incoming.id);
            if (existing) Object.assign(existing, incoming, { updatedAt: new Date().toISOString() });
            else {
              const merged = {
                id: incoming.id, type: incoming.type, sourceId: incoming.sourceId, targetId: incoming.targetId,
                properties: incoming.properties || {}, pairId: incoming.pairId,
                createdAt: incoming.createdAt || new Date().toISOString(),
                updatedAt: incoming.updatedAt || new Date().toISOString(),
              };
              draft.relations.push(merged);
              relById.set(merged.id, merged);
            }
          }
        },
        /** 新增自定义实体类型。 */
        addCustomEntityType(draft, def) {
          if (!def || !def.type || !def.label) return;
          const type = def.type.trim();
          if (!/^[a-z][a-z0-9_]*$/.test(type)) return;
          if (allEntityTypes(draft.customEntityTypes).some(t => t.type === type)) return;
          const fields = (def.fields || [])
            .filter(f => f.key && f.label)
            .map(f => ({ key: f.key.trim(), label: f.label.trim(), fieldType: ['text', 'textarea', 'number', 'select'].includes(f.fieldType) ? f.fieldType : 'text', options: Array.isArray(f.options) ? f.options : undefined }));
          draft.customEntityTypes.push({ type, label: def.label.trim(), domain: DOMAINS.some(d => d.id === def.domain) ? def.domain : 'knowledge', fields, glyph: 'cube', isCustom: true });
        },
        /** 删除自定义实体类型：其下实体一并删除（含关系）。 */
        removeCustomEntityType(draft, type) {
          if (!draft.customEntityTypes.some(t => t.type === type)) return;
          const doomed = new Set(draft.entities.filter(e => e.type === type).map(e => e.id));
          draft.entities = draft.entities.filter(e => !doomed.has(e.id));
          draft.relations = draft.relations.filter(r => !doomed.has(r.sourceId) && !doomed.has(r.targetId));
          draft.customEntityTypes = draft.customEntityTypes.filter(t => t.type !== type);
          if (draft.activeType === type) {
            const first = ENTITY_TYPES[0];
            draft.activeType = first.type;
            draft.activeDomain = first.domain;
            draft.selectedId = null; draft.editing = false; draft.draft = null;
          }
        },
        /** 清空全部创作数据（实体 + 关系 + 自定义类型）。 */
        clearAll(draft) {
          draft.entities = [];
          draft.relations = [];
          draft.customRelationTypes = [];
          draft.customEntityTypes = [];
          draft.selectedId = null;
          draft.editing = false;
          draft.draft = null;
        },
        /** 新增自定义关系类型（强制声明逆关系；对称则 inverseType=type）。 */
        addCustomRelationType(draft, def) {
          if (!def || !def.type || !def.label) return;
          const type = def.type.trim();
          if (!type) return;
          if (relationDef(type) || draft.customRelationTypes.some(r => r.type === type)) return;
          draft.customRelationTypes.push({
            type,
            label: def.label.trim() || type,
            inverseType: def.symmetric ? type : (def.inverseType || type).trim(),
            inverseLabel: def.symmetric ? (def.label.trim() || type) : (def.inverseLabel || def.label || type).trim(),
            symmetric: !!def.symmetric,
            sourceTypes: [],
            targetTypes: [],
            isCustom: true,
          });
        },
        /** 删除自定义关系类型：同时删掉该类型的关系边（含逆边）。 */
        removeCustomRelationType(draft, type) {
          const def = draft.customRelationTypes.find(r => r.type === type);
          if (!def) return;
          const doomedTypes = new Set([type, def.inverseType]);
          // 只删自定义的：内置关系类型不出现在 customRelationTypes，逆边若属内置类型仅删本侧。
          draft.relations = draft.relations.filter(r => {
            if (r.type === type) return false;
            if (r.type === def.inverseType && def.inverseType !== type) {
              // 逆边类型可能是内置的：仅当它也属于被删类型对时删。
              return !(r.pairId && !draft.relations.some(x => x.id === r.pairId && x.type === type));
            }
            return true;
          });
          draft.customRelationTypes = draft.customRelationTypes.filter(r => r.type !== type);
        },
      },
    });

    // ─────────────────────────────────────────────
    // 设计系统 DS（统一常量 + 组件；全部走主题 token，明暗主题自适应）
    // ─────────────────────────────────────────────

    /**
     * 设计常量（对齐 WorldSea theme.css 令牌体系：精致极简 · 暖灰中性底 + 克制靛蓝强调）。
     * 字号/圆角/动效曲线与 WorldSea 同值；颜色经 DS 色→dsh token 映射表落地（WS_COLORS）。
     * canvas 内无法用 CSS var，GraphView.TYPE_COLORS 仍用具体色值。
     */
    const DS = {
      space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
      font: { x2s: 10, xs: 11, sm: 12, md: 13, base: 14, lg: 16, xl: 20 },
      radius: { xs: 4, sm: 6, mid: 8, md: 10, lg: 14, pill: 999 },
      /** WorldSea 侧栏宽（--layout-sidebar-width 的插件内近似：三区双线布局）。 */
      navWidth: 168,
      /** WorldSea 动效：标准缓动曲线 + fast 0.15s（--transition-fast 同款）。 */
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      durFast: '0.15s',
      durBase: '0.22s',
      /** 按压反馈统一缩放（--press-scale 同款）。 */
      pressScale: 0.96,
      transition: 'background 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      /** 交互态背景（--hover-bg 语义 = bg-muted）。 */
      hoverBg: 'var(--dsw-alias-bg-layer-2)',
      /** WorldSea active 语义 = accent-soft 弱底（非左侧条）；dsh 无 accent-soft token，用 brand 主色 12% 近似。 */
      activeBg: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)',
      focusShadow: '0 0 0 2px var(--dsw-alias-brand-primary)',
    };

    /** 控件基础态（focus 可见性 + 过渡；不参与布局）。 */
    const dsControlBase = {
      transition: DS.transition,
      fontFamily: 'inherit',
    };
    const dsFocus = {
      outline: 'none',
      '::placeholder': { color: 'var(--dsw-alias-state-idle-primary)' },
    };

    /** 输入控件公共样式（select/textarea/input 共用）。 */
    const inputStyle = {
      ...dsControlBase,
      width: '100%', boxSizing: 'border-box', padding: '6px 10px',
      borderRadius: DS.radius.sm, border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
      fontSize: DS.font.md, outline: 'none',
    };

    /** 次级按钮（描边；hover 提亮）。 */
    function GhostButton(props) {
      return h('button', {
        onClick: props.onClick,
        style: {
          ...dsControlBase,
          padding: props.small ? '3px 10px' : '6px 14px',
          borderRadius: DS.radius.sm, border: '1px solid var(--dsw-alias-border-l2)',
          background: 'transparent', color: 'var(--dsw-alias-label-primary)',
          fontSize: props.small ? DS.font.sm : DS.font.md, cursor: 'pointer',
        },
        onMouseOver: e => { e.currentTarget.style.background = DS.hoverBg; },
        onMouseOut: e => { e.currentTarget.style.background = 'transparent'; },
      }, props.children);
    }

    /** 主按钮（品牌底；hover 提亮一层）。 */
    function PrimaryButton(props) {
      return h('button', {
        onClick: props.onClick,
        style: {
          ...dsControlBase,
          padding: props.small ? '3px 10px' : '6px 14px',
          borderRadius: DS.radius.sm, border: 'none',
          background: 'var(--dsw-alias-brand-primary)', color: '#fff',
          fontSize: props.small ? DS.font.sm : DS.font.md, fontWeight: 600, cursor: 'pointer',
        },
        onMouseOver: e => { e.currentTarget.style.opacity = '0.88'; },
        onMouseOut: e => { e.currentTarget.style.opacity = '1'; },
      }, props.children);
    }

    /** 危险按钮（用于删除类动作；描边红字）。 */
    function DangerButton(props) {
      return h('button', {
        onClick: props.onClick,
        style: {
          ...dsControlBase,
          padding: props.small ? '3px 10px' : '6px 14px',
          borderRadius: DS.radius.sm, border: '1px solid var(--dsw-alias-state-error-primary)',
          background: 'transparent', color: 'var(--dsw-alias-state-error-primary)',
          fontSize: props.small ? DS.font.sm : DS.font.md, cursor: 'pointer',
        },
        onMouseOver: e => { e.currentTarget.style.background = 'var(--dsw-alias-bg-layer-2)'; },
        onMouseOut: e => { e.currentTarget.style.background = 'transparent'; },
      }, props.children);
    }

    /** 卡片容器（对齐 WorldSea .entity-card：1px 独立块 + hover 强边 + active accent 双描边）。 */
    function Card(props) {
      const clickable = props.onClick !== undefined;
      const baseBorder = clickable && props.active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)';
      return h('div', {
        onClick: props.onClick,
        style: {
          ...dsControlBase,
          background: clickable && props.active ? DS.activeBg : 'var(--dsw-alias-bg-layer-1)',
          border: '1px solid ' + baseBorder,
          borderRadius: DS.radius.mid, padding: props.pad || DS.space.lg,
          ...(clickable ? { cursor: 'pointer' } : {}),
          ...(clickable && props.active ? { boxShadow: '0 0 0 1px var(--dsw-alias-brand-primary)' } : {}),
        },
        ...(clickable ? {
          onMouseOver: e => {
            e.currentTarget.style.borderColor = props.active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)';
            e.currentTarget.style.boxShadow = props.active ? '0 0 0 1px var(--dsw-alias-brand-primary)' : '0 1px 2px rgba(16, 24, 40, 0.05)';
          },
          onMouseOut: e => {
            e.currentTarget.style.borderColor = baseBorder;
            e.currentTarget.style.boxShadow = props.active ? '0 0 0 1px var(--dsw-alias-brand-primary)' : 'none';
          },
        } : {}),
      }, props.children);
    }

    /** 区块标题（小型节标题，带字距）。 */
    function SectionTitle(props) {
      return h('div', { style: { fontSize: DS.font.sm, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)', letterSpacing: '0.04em', margin: '0 0 ' + DS.space.sm + 'px' } }, props.children);
    }

    /** 空状态（居中弱文本；可选动作）。 */
    function EmptyState(props) {
      return h('div', {
        style: { textAlign: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: DS.font.md, padding: DS.space.xxl, lineHeight: 1.8 },
      }, props.children, props.action || null);
    }

    /** 字段包装（label 上、控件下的表单行）。 */
    function Field(props) {
      return h('div', { style: { marginBottom: DS.space.md } },
        h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginBottom: DS.space.xs } }, props.label),
        props.children,
      );
    }

    /** 徽标 chip（只读小标签）。 */
    function Chip(props) {
      return h('span', {
        style: {
          display: 'inline-flex', alignItems: 'center', gap: DS.space.xs,
          padding: '2px 8px', borderRadius: DS.radius.pill, fontSize: DS.font.sm,
          background: props.tone === 'brand' ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-2)',
          color: props.tone === 'brand' ? '#fff' : 'var(--dsw-alias-label-secondary)',
          border: props.tone === 'brand' ? 'none' : '1px solid var(--dsw-alias-border-l1)',
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
        case 'org':
          return h('svg', common,
            h('rect', { x: 3, y: 7, width: 7, height: 13 }),
            h('rect', { x: 14, y: 3, width: 7, height: 17 }),
            h('path', { d: 'M6.5 11h.01M6.5 15h.01M17.5 7h.01M17.5 11h.01M17.5 15h.01' }));
        case 'paw':
          return h('svg', common,
            h('ellipse', { cx: 7, cy: 8, rx: 1.6, ry: 2.2 }),
            h('ellipse', { cx: 12, cy: 6.5, rx: 1.6, ry: 2.2 }),
            h('ellipse', { cx: 17, cy: 8, rx: 1.6, ry: 2.2 }),
            h('path', { d: 'M12 11c-3.5 0-6 2.6-6 5.2 0 1.6 1.2 2.8 2.8 2.8 1.2 0 2-.6 3.2-.6s2 .6 3.2.6c1.6 0 2.8-1.2 2.8-2.8 0-2.6-2.5-5.2-6-5.2z' }));
        case 'house':
          return h('svg', common,
            h('path', { d: 'M3 11 12 4l9 7' }),
            h('path', { d: 'M5 10v10h14V10' }),
            h('path', { d: 'M10 20v-6h4v6' }));
        case 'leaf':
          return h('svg', common,
            h('path', { d: 'M6 21C6 12 10 4 20 3c0 10-4 15-11 15' }),
            h('path', { d: 'M6 21c0-5 2-9 7-12' }));
        case 'chat':
          return h('svg', common,
            h('path', { d: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z' }),
            h('path', { d: 'M9 11h6' }));
        case 'bulb':
          return h('svg', common,
            h('path', { d: 'M9 18h6M10 21h4' }),
            h('path', { d: 'M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z' }));
        case 'star':
          return h('svg', common,
            h('path', { d: 'M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8L12 3z' }));
        case 'mask':
          return h('svg', common,
            h('path', { d: 'M4 5h16v6a8 8 0 0 1-16 0V5z' }),
            h('path', { d: 'M8 10h.01M16 10h.01M9 15c1 .8 2 1.2 3 1.2s2-.4 3-1.2' }));
        case 'swords':
          return h('svg', common,
            h('path', { d: 'M4 4l9 9M4 4v4M4 4h4M20 4l-9 9M20 4v4M20 4h-4' }),
            h('path', { d: 'M13.5 13.5L18 18M18 15.5 15.5 18 20 20l-2-4.5zM10.5 13.5 6 18M6 15.5 8.5 18 4 20l2-4.5z' }));
        case 'clock':
          return h('svg', common,
            h('circle', { cx: 12, cy: 12, r: 8.5 }),
            h('path', { d: 'M12 7v5l3.5 2' }));
        case 'shield':
          return h('svg', common,
            h('path', { d: 'M12 3l7 3v5c0 5-3.2 8.2-7 10-3.8-1.8-7-5-7-10V6l7-3z' }),
            h('path', { d: 'M9 12l2 2 4-4' }));
        case 'cube':
          return h('svg', common,
            h('path', { d: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z' }),
            h('path', { d: 'M4 7.5 12 12l8-4.5M12 12v9' }));
        case 'note':
          return h('svg', common,
            h('rect', { x: 5, y: 3, width: 14, height: 18 }),
            h('path', { d: 'M9 8h6M9 12h6M9 16h3' }));
        case 'tree':
          return h('svg', common,
            h('path', { d: 'M6 4v8a4 4 0 0 0 4 4h8' }),
            h('circle', { cx: 6, cy: 4, r: 2 }),
            h('circle', { cx: 18, cy: 16, r: 2 }),
            h('path', { d: 'M6 12v0' }));
        case 'book':
          return h('svg', common,
            h('path', { d: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z' }),
            h('path', { d: 'M19 19H6a2 2 0 0 0-2 2M8 7h7' }));
        case 'manuscript':
          return h('svg', common,
            h('rect', { x: 6, y: 3, width: 12, height: 18 }),
            h('path', { d: 'M9 7h6M9 11h6M9 15h4' }));
        case 'grid':
          return h('svg', common,
            h('rect', { x: 4, y: 4, width: 7, height: 7 }),
            h('rect', { x: 13, y: 4, width: 7, height: 7 }),
            h('rect', { x: 4, y: 13, width: 7, height: 7 }),
            h('rect', { x: 13, y: 13, width: 7, height: 7 }));
        case 'graph':
          return h('svg', common,
            h('circle', { cx: 6, cy: 6, r: 2.5 }),
            h('circle', { cx: 18, cy: 8, r: 2.5 }),
            h('circle', { cx: 12, cy: 18, r: 2.5 }),
            h('path', { d: 'M8 7l7.5.7M7.5 8.3 11 15.6M16.8 10.2 13 15.7' }));
        case 'globe':
          return h('svg', common,
            h('circle', { cx: 12, cy: 12, r: 8.5 }),
            h('ellipse', { cx: 12, cy: 12, rx: 3.8, ry: 8.5 }),
            h('path', { d: 'M3.8 9.5h16.4M3.8 14.5h16.4' }));
        default:
          return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8 }));
      }
    }

    // ─────────────────────────────────────────────
    // 关系区块（详情页）
    // ─────────────────────────────────────────────

    /** 实体详情页的关系区块：已有关系列表 + 新建关系表单 + 自定义关系类型管理。 */
    function RelationsSection(props) {
      const { relations, entities, selfId, customRelationTypes, actions, t } = props;
      const [relType, setRelType] = React.useState(RELATION_TYPES[0].type);
      const [targetId, setTargetId] = React.useState('');
      const [direction, setDirection] = React.useState('out');
      const [showCustom, setShowCustom] = React.useState(false);
      const [newType, setNewType] = React.useState('');
      const [newLabel, setNewLabel] = React.useState('');
      const [newInverse, setNewInverse] = React.useState('');
      const [newInverseLabel, setNewInverseLabel] = React.useState('');
      const allDefs = allRelationDefs(customRelationTypes);
      const def = allDefs.find(r => r.type === relType) || RELATION_TYPES[0];

      // 目标候选：允许的 target/source 类型 + 排除自身。
      const wanted = direction === 'out' ? def.targetTypes : def.sourceTypes;
      const candidates = entities.filter(e => e.id !== selfId && (wanted.length === 0 || wanted.includes(e.type)));
      const titleOf = id => entities.find(e => e.id === id)?.title || id;

      /** 本实体的关系边（显示视图）：统一按「源 —标签→ 目标」渲染；带原 relation 供属性编辑。 */
      const rows = relations
        .filter(r => r.sourceId === selfId || r.targetId === selfId)
        .map(r => {
          const label = allDefs.find(x => x.type === r.type)?.label || r.type;
          return { id: r.id, relation: r, text: `${titleOf(r.sourceId)} —${label}→ ${titleOf(r.targetId)}` };
        });

      return h(Card, { pad: 14 },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
          h('div', { style: { fontSize: DS.font.md + 1, fontWeight: 600 } }, t('relations.title')),
          h('div', { style: { flex: 1 } }),
          h('select', { value: relType, onChange: e => setRelType(e.target.value), style: { ...inputStyle, width: 'auto' } },
            allDefs.map(r => h('option', { key: r.type, value: r.type }, r.label + (r.isCustom ? ' ★' : '')))),
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
          h(GhostButton, { small: true, onClick: () => setShowCustom(!showCustom) }, t('relations.customToggle')),
        ),
        // 自定义关系类型面板。
        showCustom ? h('div', {
          style: {
            marginBottom: 10, padding: 10, borderRadius: DS.radius.md,
            background: 'var(--dsw-alias-bg-layer-2)', fontSize: DS.font.sm,
          },
        },
          h('div', { style: { fontWeight: 600, marginBottom: 6 } }, t('relations.customTitle')),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
            h('input', { value: newType, placeholder: t('relations.customKey'), onChange: e => setNewType(e.target.value), style: { ...inputStyle, width: 110 } }),
            h('input', { value: newLabel, placeholder: t('relations.customLabel'), onChange: e => setNewLabel(e.target.value), style: { ...inputStyle, width: 90 } }),
            h('input', { value: newInverse, placeholder: t('relations.customInverseKey'), onChange: e => setNewInverse(e.target.value), style: { ...inputStyle, width: 110 } }),
            h('input', { value: newInverseLabel, placeholder: t('relations.customInverseLabel'), onChange: e => setNewInverseLabel(e.target.value), style: { ...inputStyle, width: 90 } }),
            h(PrimaryButton, {
              small: true,
              onClick: () => {
                if (!newType.trim() || !newLabel.trim()) return;
                actions.addCustomRelationType({
                  type: newType, label: newLabel,
                  inverseType: newInverse || newType, inverseLabel: newInverseLabel || newLabel,
                  symmetric: newInverse.trim() === newType.trim(),
                });
                setNewType(''); setNewLabel(''); setNewInverse(''); setNewInverseLabel('');
              },
            }, t('relations.customAdd')),
          ),
          customRelationTypes.length ? h('div', { style: { marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' } },
            customRelationTypes.map(r => h('span', {
              key: r.type,
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                borderRadius: DS.radius.pill, background: 'var(--dsw-alias-bg-layer-1)',
                border: '1px solid var(--dsw-alias-border-l1)',
              },
            },
              r.label + '（' + r.type + (r.symmetric ? ' ⇄ 自身' : ' ⇄ ' + r.inverseType) + '）',
              h('button', {
                onClick: () => actions.removeCustomRelationType(r.type),
                style: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--dsw-alias-state-error-primary)', padding: 0, fontSize: DS.font.xs },
              }, '×'),
            ))) : null,
        ) : null,
        rows.length === 0
          ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('relations.empty'))
          : h('div', null, rows.map(row => h(RelationRow, {
            key: row.id, row, actions, t,
          }))),
        h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)', marginTop: 8 } }, t('relations.hint')),
      );
    }

    /** 单条关系行：文本 + 展开属性编辑（备注）+ 删除。 */
    function RelationRow(props) {
      const { row, actions, t } = props;
      const [open, setOpen] = React.useState(false);
      const note = row.relation.properties?.note || '';
      return h('div', null,
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
            fontSize: DS.font.md, borderRadius: DS.radius.sm, marginBottom: 2,
            background: 'var(--dsw-alias-bg-layer-2)',
          },
        },
          h('span', { style: { flex: 1 } }, row.text),
          note ? h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, '📝 ' + note.slice(0, 16)) : null,
          h('button', {
            onClick: () => setOpen(!open),
            style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: DS.font.sm, color: 'var(--dsw-alias-brand-primary)' },
          }, open ? '▾' : t('relations.editProps')),
          h('button', {
            onClick: () => actions.removeRelation(row.id),
            style: {
              border: 'none', background: 'transparent', cursor: 'pointer', fontSize: DS.font.sm,
              color: 'var(--dsw-alias-state-error-primary)',
            },
          }, t('relations.remove')),
        ),
        open ? h('div', { style: { padding: '4px 8px 8px', display: 'flex', gap: 8, alignItems: 'center' } },
          h('input', {
            value: note,
            placeholder: t('relations.notePlaceholder'),
            onChange: e => actions.setRelationNote(row.id, e.target.value),
            style: { ...inputStyle, flex: 1, padding: '4px 8px', fontSize: DS.font.sm },
          }),
        ) : null,
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
            padding: '2px 8px', borderRadius: DS.radius.pill, fontSize: DS.font.sm,
            background: 'var(--dsw-alias-bg-layer-2)',
            border: '1px solid var(--dsw-alias-border-l1)',
          },
        },
          tag,
          h('button', {
            onClick: () => actions.removeTag(entity.id, tag),
            style: { border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: DS.font.xs },
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
          style: { ...inputStyle, width: 120, padding: '2px 8px', fontSize: DS.font.sm },
        }),
      );
    }

    /**
     * 完整性校验（对齐 worldsea-core CoreReferenceCheckResult 语义）：
     * 悬挂关系（端点实体已不存在）、重复标题（同类型内）、空标题。
     * @param entities - 全部实体。
     * @param relations - 全部关系。
     * @returns 问题列表，每项带可操作的修复入口所需信息。
     */
    function runHealthCheck(entities, relations) {
      const issues = [];
      const byId = new Map(entities.map(e => [e.id, e]));
      // 悬挂关系：端点丢失。
      for (const r of relations) {
        const missingSource = !byId.has(r.sourceId);
        const missingTarget = !byId.has(r.targetId);
        if (missingSource || missingTarget) {
          issues.push({
            kind: 'danglingRelation',
            id: r.id,
            label: (missingSource ? r.sourceId : '') + (missingSource && missingTarget ? ' / ' : '') + (missingTarget ? r.targetId : ''),
            text: `${r.type}: ${r.sourceId} → ${r.targetId}`,
          });
        }
      }
      // 重复标题（同类型内）：记录每组。
      const seen = new Map();
      for (const e of entities) {
        const key = e.type + '::' + e.title;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(e);
      }
      for (const [key, group] of seen) {
        if (group.length > 1) {
          issues.push({ kind: 'duplicateTitle', id: key, label: group.map(e => e.title).join(' ≡ '), text: `${group.length} × ${key.split('::')[1]}` });
        }
      }
      // 空标题。
      for (const e of entities) {
        if (!e.title.trim()) issues.push({ kind: 'emptyTitle', id: e.id, label: e.id, text: e.type });
      }
      return issues;
    }

    /**
     * 写作视图（对齐 notebook/outline 核心工作流）：
     * 左列 = 大纲树（outline_node 按 parentId 缩进）与笔记列表（notebook）；
     * 右列 = 选中项的正文编辑（Markdown textarea 即时写）。
     */
    function WritingView(props) {
      const { entities, actions, t } = props;
      const [tab, setTab] = React.useState('outline');
      const [selectedId, setSelectedId] = React.useState(null);

      const nodes = entities.filter(e => e.type === 'outline_node');
      const notes = entities.filter(e => e.type === 'notebook');
      const pool = tab === 'outline' ? nodes : notes;
      const selected = pool.find(e => e.id === selectedId) || null;

      /** 大纲树行：按 parentId 递归生成缩进行（order 排序；环/父丢失节点兜底在末尾）。 */
      const outlineRows = (() => {
        const byParent = new Map();
        for (const n of nodes) {
          const pid = n.properties.parentId || '';
          if (!byParent.has(pid)) byParent.set(pid, []);
          byParent.get(pid).push(n);
        }
        const rows = [];
        const walk = (pid, depth) => {
          for (const n of (byParent.get(pid) || []).sort((a, b) => (a.properties.order || 0) - (b.properties.order || 0))) {
            rows.push({ node: n, depth });
            walk(n.id, depth + 1);
          }
        };
        walk('', 0);
        const walked = new Set(rows.map(r => r.node.id));
        for (const n of nodes) if (!walked.has(n.id)) rows.push({ node: n, depth: 0 });
        return rows;
      })();

      /** 大纲节点树形缩进。 */
      const indentStyle = (depth) => ({ paddingLeft: 8 + depth * 18 });

      /** 大纲导出：层级缩进 Markdown 清单 + 各节点内容。 */
      const exportOutline = () => {
        const lines = ['# ' + t('writing.outline'), '', '>' + t('ms.exportedAt').replace('{date}', new Date().toISOString().slice(0, 10)), ''];
        for (const { node, depth } of outlineRows) {
          const mark = '#'.repeat(Math.min(6, depth + 2));
          lines.push(mark + ' ' + node.title, '');
          if (node.properties.storylines) lines.push('*' + t('writing.storylines') + ': ' + node.properties.storylines + '*', '');
          if (node.properties.content) lines.push(node.properties.content, '');
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'worldsea-outline-' + new Date().toISOString().slice(0, 10) + '.md';
        a.click();
        URL.revokeObjectURL(url);
      };

      return h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } },
        // 随流工具条（对齐 ViewToolbar：页签 + 弹性 + 新建）
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: DS.space.sm,
            padding: '0 ' + DS.space.md + 'px', height: 44, flexShrink: 0,
            background: 'var(--dsw-alias-bg-layer-1)',
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: DS.radius.md, marginBottom: DS.space.md,
          },
        },
          h('button', { onClick: () => { setTab('outline'); setSelectedId(null); }, style: { ...dsControlBase, padding: '4px 10px', borderRadius: DS.radius.sm, border: 'none', background: tab === 'outline' ? DS.activeBg : 'transparent', color: tab === 'outline' ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)', fontSize: DS.font.sm, cursor: 'pointer', fontWeight: tab === 'outline' ? 600 : 400 } }, t('writing.outline') + ' (' + nodes.length + ')'),
          h('button', { onClick: () => { setTab('notes'); setSelectedId(null); }, style: { ...dsControlBase, padding: '4px 10px', borderRadius: DS.radius.sm, border: 'none', background: tab === 'notes' ? DS.activeBg : 'transparent', color: tab === 'notes' ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)', fontSize: DS.font.sm, cursor: 'pointer', fontWeight: tab === 'notes' ? 600 : 400 } }, t('writing.notes') + ' (' + notes.length + ')'),
          h('div', { style: { flex: 1 } }),
          h(PrimaryButton, {
            small: true,
            onClick: () => {
              const type = tab === 'outline' ? 'outline_node' : 'notebook';
              actions.create(type, t('writing.untitled'));
              setSelectedId(null);
            },
          }, tab === 'outline' ? t('writing.newNode') : t('writing.newNote')),
        ),
        // 主体：左列表 + 右编辑（WorldSea split 语义）
        h('div', { style: { flex: 1, minHeight: 0, display: 'flex', gap: DS.space.md, alignItems: 'stretch' } },
        // 左列：页签 + 列表
        h('div', { style: { width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } },
          h(Card, { pad: 8 },
            tab === 'outline'
              ? (outlineRows.length === 0
                ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', padding: 8 } }, t('writing.emptyOutline'))
                : outlineRows.map(({ node, depth }) => h('div', {
                  key: node.id,
                  onClick: () => setSelectedId(node.id),
                  style: {
                    ...indentStyle(depth),
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 8px', borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.md,
                    marginBottom: 2,
                    background: selectedId === node.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                    fontWeight: depth === 0 ? 600 : 400,
                  },
                },
                  h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } },
                    node.properties.condition || ''),
                  h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, node.title),
                )))
              : (notes.length === 0
                ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', padding: 8 } }, t('writing.emptyNotes'))
                : notes.map(n => h('div', {
                  key: n.id,
                  onClick: () => setSelectedId(n.id),
                  style: {
                    padding: '5px 8px', borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.md, marginBottom: 2,
                    background: selectedId === n.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                  },
                },
                  h('div', { style: { fontWeight: 600 } }, n.title),
                  h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } },
                    n.properties.noteType + ' · ' + ((n.properties.content || '').length) + ' 字'),
                ))),
            h('div', { style: { padding: '6px 4px 2px', display: 'flex', gap: 6 } },
              tab === 'outline' && outlineRows.length ? h(GhostButton, { small: true, onClick: exportOutline }, t('writing.exportOutline')) : null,
            ),
          ),
        ),
        // 右列：正文编辑
        h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } },
          !selected
            ? h(EmptyState, null, t('writing.pick'))
            : h(Card, { pad: DS.space.lg, style: undefined },
              h('input', {
                value: selected.title,
                onChange: e => actions.renameEntity(selected.id, e.target.value),
                style: { ...inputStyle, fontSize: DS.font.xl, fontWeight: 600, marginBottom: DS.space.sm },
              }),
              tab === 'outline' ? h('div', { style: { display: 'flex', gap: DS.space.sm, marginBottom: DS.space.sm, flexWrap: 'wrap' } },
                h('select', {
                  value: selected.properties.parentId || '',
                  onChange: e => actions.patchProperties(selected.id, 'parentId', e.target.value),
                  style: { ...inputStyle, width: 'auto' },
                },
                  h('option', { value: '' }, t('writing.rootNode')),
                  nodes.filter(n => n.id !== selected.id).map(n => h('option', { key: n.id, value: n.id }, n.title))),
                h('select', {
                  value: selected.properties.condition || '未写',
                  onChange: e => actions.patchProperties(selected.id, 'condition', e.target.value),
                  style: { ...inputStyle, width: 'auto' },
                },
                  ['未写', '草稿', '完成'].map(s => h('option', { key: s, value: s }, s))),
                h('input', {
                  value: selected.properties.storylines || '',
                  placeholder: t('writing.storylines'),
                  onChange: e => actions.patchProperties(selected.id, 'storylines', e.target.value),
                  style: { ...inputStyle, width: 140 },
                }),
              ) : null,
              h('textarea', {
                value: selected.properties.content || '',
                onChange: e => actions.patchProperties(selected.id, 'content', e.target.value),
                rows: 18,
                placeholder: t('writing.contentPlaceholder'),
                style: { ...inputStyle, fontFamily: 'ui-monospace, monospace', lineHeight: 1.7, resize: 'vertical', minHeight: 0 },
              }),
              h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)', marginTop: DS.space.sm } },
                t('writing.charCount').replace('{n}', String((selected.properties.content || '').length))),
            )),
        ),
      );
    }

    /**
     * 手稿视图（对齐 official.manuscript：book 顶层容器 + manuscript 章节按 bookId 归组）。
     * 左列 = 书籍分组章节列表；右列 = 章节正文编辑（标题/状态/正文即时写）+ 字数统计。
     */
    function ManuscriptView(props) {
      const { entities, actions, t } = props;
      const books = entities.filter(e => e.type === 'book');
      const chapters = entities.filter(e => e.type === 'manuscript');
      const [selectedId, setSelectedId] = React.useState(null);
      const selected = chapters.find(c => c.id === selectedId) || null;
      const contentLen = (selected?.properties.content || '').length;

      /** 章节行（按当前书籍过滤）。
       * @param bookId - 书籍 id；'' 表示未归书。
       */
      const chapterRows = (bookId) => chapters
        .filter(c => (c.properties.bookId || '') === bookId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      /** 新建章节（单 draft 内建章 + 归书，避免两步竞态）。 */
      const newChapter = (bookId) => {
        actions.createChapter(t('ms.newChapterTitle'), bookId || '');
      };

      /** 整本书导出 Markdown（书名 + 各章节按创建序）。 */
      const exportBook = (book) => {
        const rows = chapterRows(book.id);
        const lines = ['# ' + book.title, '', '>' + t('ms.exportedAt').replace('{date}', new Date().toISOString().slice(0, 10)), ''];
        for (const c of rows) {
          lines.push('## ' + c.title, '');
          if (c.properties.volumeName) lines.push('*' + c.properties.volumeName + '*', '');
          lines.push(c.properties.content || '', '');
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'worldsea-book-' + book.title.slice(0, 12) + '-' + new Date().toISOString().slice(0, 10) + '.md';
        a.click();
        URL.revokeObjectURL(url);
      };

      return h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } },
        // 随流工具条（对齐 ViewToolbar：标题 + 弹性 + 新建书）
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: DS.space.sm,
            padding: '0 ' + DS.space.md + 'px', height: 44, flexShrink: 0,
            background: 'var(--dsw-alias-bg-layer-1)',
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: DS.radius.md, marginBottom: DS.space.md,
          },
        },
          h(TypeGlyph, { glyph: 'manuscript', size: 14 }),
          h('span', { style: { fontSize: DS.font.sm, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('ms.books') + ' (' + books.length + ')'),
          h('div', { style: { flex: 1 } }),
          h(PrimaryButton, { small: true, onClick: () => actions.create('book', t('ms.newBook')) }, t('ms.newBook')),
        ),
        // 主体双栏
        h('div', { style: { flex: 1, minHeight: 0, display: 'flex', gap: DS.space.md, alignItems: 'stretch' } },
        // 左列：书籍分组
        h('div', { style: { width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' } },
            books.map(b => h('div', { key: b.id, style: { marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' } },
                h(TypeGlyph, { glyph: 'book', size: 13 }),
                h('span', { style: { fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.title),
                h('button', {
                  onClick: () => exportBook(b),
                  style: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--dsw-alias-brand-primary)', fontSize: DS.font.sm },
                }, t('ms.exportBook')),
                h('button', {
                  onClick: () => newChapter(b.id),
                  style: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--dsw-alias-brand-primary)', fontSize: DS.font.sm },
                }, '＋' + t('ms.chapter')),
              ),
              chapterRows(b.id).map(c => h('div', {
                key: c.id,
                onClick: () => setSelectedId(c.id),
                style: {
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginLeft: 16, padding: '4px 8px', borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.md, marginBottom: 2,
                  background: selectedId === c.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                },
              },
                h('span', {
                  style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)', width: 30 },
                }, c.properties.condition || ''),
                h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.title),
                h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, (c.properties.content || '').length),
              )),
            )),
            // 未归书章节
            chapterRows('').length ? h('div', null,
              h('div', { style: { padding: '4px 6px', fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('ms.orphaned') + ' (' + chapterRows('').length + ')'),
              chapterRows('').map(c => h('div', {
                key: c.id,
                onClick: () => setSelectedId(c.id),
                style: {
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginLeft: 16, padding: '4px 8px', borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.md, marginBottom: 2,
                  background: selectedId === c.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                },
              }, h('span', { style: { flex: 1 } }, c.title))),
            ) : null,
            h('div', { style: { padding: '4px 4px' } },
              h(GhostButton, { small: true, onClick: () => newChapter('') }, '＋' + t('ms.freeChapter')),
            ),
          ),
        ),
        // 右列：章节编辑
        h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } },
          !selected
            ? h(EmptyState, null, t('ms.pick'))
            : h(Card, { pad: DS.space.lg },
              h('input', {
                value: selected.title,
                onChange: e => actions.renameEntity(selected.id, e.target.value),
                style: { ...inputStyle, fontSize: DS.font.xl, fontWeight: 600, marginBottom: DS.space.sm },
              }),
              h('div', { style: { display: 'flex', gap: DS.space.sm, marginBottom: DS.space.sm, flexWrap: 'wrap', alignItems: 'center' } },
                h('select', {
                  value: selected.properties.condition || '草稿',
                  onChange: e => actions.patchProperties(selected.id, 'condition', e.target.value),
                  style: { ...inputStyle, width: 'auto' },
                },
                  ['草稿', '修订中', '终稿'].map(s => h('option', { key: s, value: s }, s))),
                h('select', {
                  value: selected.properties.bookId || '',
                  onChange: e => actions.patchProperties(selected.id, 'bookId', e.target.value),
                  style: { ...inputStyle, width: 'auto' },
                },
                  h('option', { value: '' }, t('ms.orphaned')),
                  books.map(b => h('option', { key: b.id, value: b.id }, b.title))),
                h('input', {
                  value: selected.properties.volumeName || '',
                  placeholder: t('ms.volume'),
                  onChange: e => actions.patchProperties(selected.id, 'volumeName', e.target.value),
                  style: { ...inputStyle, width: 130 },
                }),
                h('div', { style: { flex: 1 } }),
                h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, t('writing.charCount').replace('{n}', String(contentLen))),
              ),
              h('textarea', {
                value: selected.properties.content || '',
                onChange: e => actions.patchProperties(selected.id, 'content', e.target.value),
                rows: 20,
                placeholder: t('writing.contentPlaceholder'),
                style: { ...inputStyle, fontFamily: 'ui-monospace, monospace', lineHeight: 1.8, resize: 'vertical' },
              }),
            )),
      );
    }

    /**
     * 设定集（对齐 official.codex：按语义域分章聚合阅读全部条目 + 整本导出）。
     * 分章 = 域（生命/地理/…/用户自定义类型的域）；导出 = Markdown 整本。
     */
    function CodexView(props) {
      const { entities, allTypes, t } = props;
      const [chapter, setChapter] = React.useState('');

      /** 域 → 该域全部实体（按类型再分组）。 */
      const chapters = DOMAINS.map(d => ({
        domain: d,
        groups: allTypes
          .filter(def => def.domain === d.id)
          .map(def => ({ def, items: entities.filter(e => e.type === def.type) }))
          .filter(g => g.items.length > 0),
      })).filter(c => c.groups.length > 0);
      const active = chapters.find(c => c.domain.id === chapter) || chapters[0];

      /** 整本导出 Markdown。 */
      const exportMarkdown = () => {
        const lines = ['# WorldSea 设定集', '', '>' + t('codex.exportedAt').replace('{date}', new Date().toISOString().slice(0, 10)), ''];
        for (const c of chapters) {
          lines.push('## ' + c.domain.label, '');
          for (const g of c.groups) {
            lines.push('### ' + g.def.label, '');
            for (const e of g.items) {
              lines.push('#### ' + e.title, '');
              if (e.description) lines.push(e.description, '');
              const props = g.def.fields.filter(f => e.properties[f.key] !== undefined && e.properties[f.key] !== '');
              for (const f of props) lines.push('- **' + f.label + '**: ' + e.properties[f.key]);
              if (e.tags.length) lines.push('- **' + t('codex.tags') + '**: ' + e.tags.join('、'));
              lines.push('');
            }
          }
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'worldsea-codex-' + new Date().toISOString().slice(0, 10) + '.md';
        a.click();
        URL.revokeObjectURL(url);
      };

      return h('div', null,
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          h('select', {
            value: active ? active.domain.id : '',
            onChange: e => setChapter(e.target.value),
            style: { ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: DS.font.md },
          },
            chapters.map(c => h('option', { key: c.domain.id, value: c.domain.id },
              c.domain.label + '（' + c.groups.reduce((n, g) => n + g.items.length, 0) + '）'))),
          h('div', { style: { flex: 1 } }),
          h(PrimaryButton, { small: true, onClick: exportMarkdown }, t('codex.export')),
        ),
        !active
          ? h(EmptyState, null, t('codex.empty'))
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            active.groups.map(g => h(Card, { key: g.def.type, pad: 14 },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h(TypeGlyph, { glyph: g.def.glyph, size: 15 }),
                h('div', { style: { fontSize: DS.font.lg, fontWeight: 700 } }, g.def.label),
                h('span', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, '× ' + g.items.length),
              ),
              g.items.map(e => h('div', { key: e.id, style: { padding: '8px 0', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
                h('div', { style: { fontSize: DS.font.md + 1, fontWeight: 600 } }, e.title),
                e.description ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginTop: 2, whiteSpace: 'pre-wrap' } }, e.description.slice(0, 120)) : null,
                e.tags.length ? h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-brand-primary)', marginTop: 2 } }, e.tags.join(' · ')) : null,
              )),
            ))),
      );
    }

    /** 健康检查视图：运行校验 + 一键修复（悬挂关系删除、空标题重命名）。 */
    function HealthView(props) {
      const { entities, relations, actions, t } = props;
      const [report, setReport] = React.useState(null);
      const run = () => setReport(runHealthCheck(entities, relations));
      const dangling = report ? report.filter(i => i.kind === 'danglingRelation') : [];
      return h('div', null,
        h(Card, { pad: 14 },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('div', { style: { fontSize: DS.font.md + 1, fontWeight: 600 } }, t('health.title')),
            h('div', { style: { flex: 1 } }),
            h(PrimaryButton, { small: true, onClick: run }, t('health.run')),
          ),
          !report
            ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('health.hint'))
            : report.length === 0
              ? h('div', { style: { fontSize: DS.font.md, color: 'var(--dsw-alias-state-success-primary)' } }, t('health.clean'))
              : h('div', null,
                h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginBottom: 8 } },
                  t('health.summary')
                    .replace('{d}', String(dangling.length))
                    .replace('{dup}', String(report.filter(i => i.kind === 'duplicateTitle').length))
                    .replace('{e}', String(report.filter(i => i.kind === 'emptyTitle').length))),
                dangling.length ? h(GhostButton, {
                  small: true,
                  onClick: () => { actions.pruneDanglingRelations(); setReport(runHealthCheck(entities, relations)); },
                }, t('health.pruneDangling').replace('{n}', String(dangling.length))) : null,
                h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 } },
                  report.slice(0, 30).map(issue => h('div', {
                    key: issue.kind + '::' + issue.id,
                    style: {
                      display: 'flex', gap: 8, padding: '4px 8px', borderRadius: DS.radius.sm, fontSize: DS.font.sm,
                      background: 'var(--dsw-alias-bg-layer-2)',
                      color: issue.kind === 'emptyTitle' ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-label-primary)',
                    },
                  },
                    h('span', {
                      style: {
                        padding: '0 6px', borderRadius: DS.radius.sm, fontSize: DS.font.xs, fontWeight: 600,
                        background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-secondary)',
                      },
                    }, issue.kind),
                    h('span', null, issue.text),
                  )))),
        ),
      );
    }

    // ─────────────────────────────────────────────
    // 关系图谱（canvas 力导向布局，零依赖）
    // ─────────────────────────────────────────────

    /**
     * 关系图谱视图：实体为节点、关系为有向边。
     * 布局 = 每帧弹簧-斥力迭代（Fruchterman-Reingold 简化版），
     * 节点按类型着色，边带箭头；节点可拖拽，点选后左侧详情联动。
     */
    function GraphView(props) {
      const { entities, relations, actions, t } = props;
      const canvasRef = React.useRef(null);
      const simRef = React.useRef(null);
      const dragRef = React.useRef(null);
      // 高亮走 ref（画布每帧自读），避免 hover 触发 useEffect 重挂载而重置布局。
      const hoverRef = React.useRef(null);
      // 边类型筛选（'' = 全部；变化经 deps 重挂载）。
      const [edgeFilter, setEdgeFilter] = React.useState('');
      const usedLabels = [...new Set(relations.map(r => relationDef(r.type)?.label || r.type))].sort();

      /** 类型 → 颜色（避开主题 token 无法用于 canvas 的限制，用固定语义色）。 */
      const TYPE_COLORS = {
        character: '#4f8ef7', region: '#4caf7d', item: '#e6a23c',
        magic: '#9a6dd7', organization: '#e67e8b', species: '#3fb8af',
        building: '#8d7355', creature: '#c0653a', plant: '#5f9e4c',
        language: '#4a90a4', concept: '#7f8fa6', faith: '#d4a017',
        culture: '#b565a7', conflict: '#d9534f', event: '#5bc0de',
        combat_stat: '#6c7ae0', notebook: '#55a888', outline_node: '#c98b3f',
        book: '#8a6db1', manuscript: '#d0a45f',
      };
      const colorOf = e => TYPE_COLORS[e.type] || '#8a8f9d';

      React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        const width = Math.max(320, parent.clientWidth - 32);
        const height = 420;
        canvas.width = width * 2; canvas.height = height * 2;
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // 初始化模拟：节点圆布局起步 + 类型→颜色查找表（避免每帧 find）。
        const nodes = entities.map((e, i) => {
          const angle = (2 * Math.PI * i) / Math.max(1, entities.length);
          return {
            id: e.id, title: e.title, type: e.type, color: colorOf(e),
            x: width / 2 + Math.cos(angle) * Math.min(width, height) * 0.3,
            y: height / 2 + Math.sin(angle) * Math.min(width, height) * 0.3,
            vx: 0, vy: 0,
          };
        });
        const byId = new Map(nodes.map(n => [n.id, n]));
        const edges = relations
          .filter(r => byId.has(r.sourceId) && byId.has(r.targetId))
          .map(r => ({ source: r.sourceId, target: r.targetId, label: relationDef(r.type)?.label || r.type }));

        simRef.current = { nodes, edges, width, height, stopped: false };

        let frame = 0;
        const step = () => {
          const sim = simRef.current;
          if (!sim || sim.stopped) return;
          // 斥力（库仑）+ 引力（弹簧，按边）+ 向心力。
          for (let i = 0; i < sim.nodes.length; i++) {
            const a = sim.nodes[i];
            for (let j = i + 1; j < sim.nodes.length; j++) {
              const b = sim.nodes[j];
              let dx = a.x - b.x, dy = a.y - b.y;
              let d2 = dx * dx + dy * dy;
              if (d2 < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); d2 = 1; }
              const f = 2600 / d2;
              const d = Math.sqrt(d2);
              const fx = (dx / d) * f, fy = (dy / d) * f;
              a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
            }
          }
          for (const e of sim.edges) {
            const a = byId.get(e.source), b = byId.get(e.target);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.max(1, Math.hypot(dx, dy));
            const rest = 150;
            const f = (d - rest) * 0.012;
            const fx = (dx / d) * f, fy = (dy / d) * f;
            a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
          }
          for (const n of sim.nodes) {
            // 向心力 + 阻尼。
            n.vx += (sim.width / 2 - n.x) * 0.0015;
            n.vy += (sim.height / 2 - n.y) * 0.0015;
            if (dragRef.current && dragRef.current.id === n.id) { n.vx = 0; n.vy = 0; continue; }
            n.vx *= 0.82; n.vy *= 0.82;
            n.x += n.vx; n.y += n.vy;
            n.x = Math.max(30, Math.min(sim.width - 30, n.x));
            n.y = Math.max(26, Math.min(sim.height - 26, n.y));
          }
          // 绘制。
          ctx.clearRect(0, 0, sim.width, sim.height);
          // 边（过滤视图：edgeFilter 变化经 deps 重挂载生效）。
          const visibleEdges = sim.edges.filter(e => !edgeFilter || e.label === edgeFilter);
          for (const e of visibleEdges) {
            const a = byId.get(e.source), b = byId.get(e.target);
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(128,134,148,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // 箭头（指向 target）。
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const r = 14;
            const tipX = b.x - Math.cos(ang) * r, tipY = b.y - Math.sin(ang) * r;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - Math.cos(ang - 0.4) * 7, tipY - Math.sin(ang - 0.4) * 7);
            ctx.lineTo(tipX - Math.cos(ang + 0.4) * 7, tipY - Math.sin(ang + 0.4) * 7);
            ctx.closePath();
            ctx.fillStyle = 'rgba(128,134,148,0.55)';
            ctx.fill();
            // 边标签（中点，带底色条保证可读）。
            if (visibleEdges.length <= 40) {
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              ctx.font = '10px system-ui, sans-serif';
              const tw = ctx.measureText(e.label).width;
              ctx.fillStyle = 'rgba(30,32,38,0.72)';
              ctx.fillRect(mx - tw / 2 - 3, my - 8, tw + 6, 14);
              ctx.fillStyle = '#c8ccd4';
              ctx.textAlign = 'center';
              ctx.fillText(e.label, mx, my + 3);
            }
          }
          // 节点。
          for (const n of sim.nodes) {
            const color = n.color;
            const highlighted = hoverRef.current === n.id;
            ctx.beginPath();
            ctx.arc(n.x, n.y, highlighted ? 13 : 10, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            if (highlighted) {
              ctx.beginPath();
              ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            // canvas 不解析 CSS var：标签用固定中性灰（亮暗主题下均可读）。
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillStyle = '#9aa0ac';
            ctx.textAlign = 'center';
            ctx.fillText(n.title.slice(0, 8), n.x, n.y + 24);
          }
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
          if (simRef.current) simRef.current.stopped = true;
          cancelAnimationFrame(frame);
        };
      }, [entities.length, relations.length, edgeFilter]);

      /** 命中检测 + 拖拽。 */
      const pick = (evt) => {
        const canvas = canvasRef.current;
        const sim = simRef.current;
        if (!canvas || !sim) return null;
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left, y = evt.clientY - rect.top;
        return sim.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= 14) || null;
      };
      return h('div', { style: { position: 'relative' } },
        // 边筛选条。
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('graph.filter')),
          h('select', {
            value: edgeFilter,
            onChange: e => setEdgeFilter(e.target.value),
            style: { ...inputStyle, width: 'auto', padding: '3px 8px', fontSize: DS.font.sm },
          },
            h('option', { value: '' }, t('graph.allRelations')),
            usedLabels.map(label => h('option', { key: label, value: label }, label))),
        ),
        h('canvas', {
          ref: canvasRef,
          style: {
            borderRadius: DS.radius.md, border: '1px solid var(--dsw-alias-border-l1)',
            background: 'var(--dsw-alias-bg-layer-1)', display: 'block', cursor: 'grab',
          },
          onMouseDown: e => { const n = pick(e); if (n) dragRef.current = n; },
          onMouseMove: e => {
            const sim = simRef.current;
            const n = pick(e);
            hoverRef.current = n ? n.id : null;
            if (dragRef.current && sim && n) {
              const rect = e.currentTarget.getBoundingClientRect();
              n.x = e.clientX - rect.left; n.y = e.clientY - rect.top;
            }
          },
          onMouseUp: e => {
            const n = pick(e);
            if (n && !dragRef.current) actions.selectEntity(n.id);
            dragRef.current = null;
          },
          onMouseLeave: () => { dragRef.current = null; hoverRef.current = null; },
        }),
        // 图例。
        h('div', { style: { display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } },
          Object.keys(TYPE_COLORS).map(type => h('span', { key: type, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
            h('span', { style: { width: 8, height: 8, borderRadius: 99, background: TYPE_COLORS[type], display: 'inline-block' } }),
            ENTITY_TYPES.find(x => x.type === type)?.label || type,
          ))),
        entities.length === 0
          ? h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: DS.font.md, color: 'var(--dsw-alias-label-secondary)' } }, t('graph.empty'))
          : null,
      );
    }

    // ─────────────────────────────────────────────
    // 工作台视图
    // ─────────────────────────────────────────────

    /**
     * 时间线视图：把带日期的实体（event 为主，其他类型填了 date 字段的也收）按时间排序，
     * 水平条带铺排；跨段实体（有 dateEnd）画区间条，点条带进详情。
     * 日期是自由文本（对齐 WorldSea 历法内核外置的语义），可解析为数值的用于标尺刻度，
     * 不可解析的按字典序排在末尾的「未定纪年」区。
     */
    function TimelineView(props) {
      const { entities, actions, t } = props;
      const dated = entities
        .filter(e => e.properties && typeof e.properties.date === 'string' && e.properties.date.trim())
        .map(e => ({ entity: e, date: e.properties.date.trim(), dateEnd: (e.properties.dateEnd || '').trim() }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.entity.title.localeCompare(b.entity.title));
      const undated = entities.filter(e => !dated.some(d => d.entity.id === e.id));

      if (dated.length === 0) {
        return h(Card, { pad: DS.space.xxl }, h(EmptyState, null, t('timeline.empty')));
      }

      return h('div', null,
        h(Card, { pad: 14 },
          h('div', { style: { fontSize: DS.font.md + 1, fontWeight: 600, marginBottom: 10 } }, t('timeline.title') + ' · ' + dated.length),
          h('div', { style: { position: 'relative', paddingLeft: 18 } },
            // 纵向主轴。
            h('div', {
              style: {
                position: 'absolute', left: 5, top: 4, bottom: 4, width: 2,
                background: 'var(--dsw-alias-border-l2)', borderRadius: 2,
              },
            }),
            dated.map(({ entity, date, dateEnd }) => h('div', { key: entity.id, style: { position: 'relative', marginBottom: 10 } },
              // 轴点。
              h('div', {
                style: {
                  position: 'absolute', left: -18, top: 5, width: 10, height: 10,
                  borderRadius: 99, background: 'var(--dsw-alias-brand-primary)',
                  boxShadow: '0 0 0 3px var(--dsw-alias-bg-base)',
                },
              }),
              h('div', {
                onClick: () => { actions.selectEntity(entity.id); actions.setView('workbench'); },
                style: {
                  display: 'inline-block', padding: '5px 12px', borderRadius: DS.radius.md, cursor: 'pointer',
                  background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l1)',
                },
              },
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline' } },
                  h('span', {
                    style: {
                      fontSize: DS.font.sm, fontFamily: 'ui-monospace, monospace',
                      color: 'var(--dsw-alias-brand-primary)', fontWeight: 600,
                    },
                  }, date + (dateEnd ? ' → ' + dateEnd : '')),
                  h('span', { style: { fontSize: DS.font.md + 1, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, entity.title),
                  h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } },
                    ENTITY_TYPES.find(x => x.type === entity.type)?.label || entity.type),
                ),
                entity.description
                  ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginTop: 2 } },
                    entity.description.slice(0, 80) + (entity.description.length > 80 ? '…' : ''))
                  : null,
              ),
            ))),
        ),
        undated.length ? h('div', { style: { marginTop: 12 } },
          h(Card, { pad: 14 },
            h('div', { style: { fontSize: DS.font.md, fontWeight: 600, marginBottom: 8, color: 'var(--dsw-alias-label-secondary)' } },
              t('timeline.undated') + ' · ' + undated.length),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              undated.slice(0, 30).map(e => h('span', {
                key: e.id,
                onClick: () => { actions.selectEntity(e.id); actions.setView('workbench'); },
                style: {
                  padding: '3px 10px', borderRadius: DS.radius.pill, fontSize: DS.font.sm, cursor: 'pointer',
                  background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l1)',
                  color: 'var(--dsw-alias-label-secondary)',
                },
              }, e.title))))) : null,
      );
    }

    /** schema 字段渲染：view 模式或 edit 模式。 */
    function FieldRow(props) {
      const { field, value, editing, onChange } = props;
      if (!editing) {
        if (value === undefined || value === '') return null;
        return h('div', { style: { display: 'flex', gap: 12, padding: '5px 0', fontSize: DS.font.md } },
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
        h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, field.label),
        control,
      );
    }

    /** Facet 字段组区块：折叠面板，展开即编辑（直接写实体，无需进入编辑态——facet 语义是附属数据）。 */
    function FacetSection(props) {
      const { group, entity, actions, t } = props;
      const [open, setOpen] = React.useState(false);
      const filled = group.fields.some(f => entity.properties[f.key] !== undefined && entity.properties[f.key] !== '');
      return h('div', { style: { marginTop: 10 } },
        h('div', {
          onClick: () => setOpen(!open),
          style: {
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer',
            borderRadius: DS.radius.md, background: 'var(--dsw-alias-bg-layer-2)', fontSize: DS.font.md,
          },
        },
          h(TypeGlyph, { glyph: group.glyph, size: 13 }),
          h('span', { style: { fontWeight: 600 } }, group.label),
          filled ? h('span', {
            style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-state-success-primary)' },
          }, t('facet.filled')) : null,
          h('span', { style: { flex: 1 } }),
          h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, open ? '▾' : '▸'),
        ),
        open ? h(Card, { pad: 12 },
          group.fields.map(f => h(FieldRow, {
            key: f.key, field: f,
            value: entity.properties[f.key], editing: true,
            onChange: (key, value) => actions.patchProperties(entity.id, key, value),
          })),
        ) : null,
      );
    }

    /** 实体详情/编辑面板。 */
    function EntityDetail(props) {
      const { useStore, actions, entity, fields, allRelations, allEntities, customRelationTypes, onBack, t } = props;
      const editing = useStore(s => s.editing);
      const draft = useStore(s => s.draft);

      if (!editing) {
        return h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.md } },
            h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } },
              entity.updatedAt.slice(0, 10) + ' · ' + entity.id),
            h('div', { style: { flex: 1 } }),
            h(PrimaryButton, { small: true, onClick: () => actions.beginEdit(entity.id) }, t('detail.edit')),
            h(GhostButton, {
              small: true,
              onClick: () => { if (window.confirm(t('detail.deleteConfirm').replace('{title}', entity.title))) actions.remove(entity.id); },
            }, t('detail.delete')),
          ),
          h(TagsSection, { entity, actions, t }),
          entity.description
            ? h('div', { style: { fontSize: DS.font.md, marginBottom: DS.space.md, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, entity.description)
            : null,
          fields.map(f => h(FieldRow, {
            key: f.key, field: f, value: entity.properties[f.key], editing: false,
          })),
          // Facet 字段组（对齐 WorldSea WeaponFacet/ApparelFacet 挂宿主类型的语义）。
          FACET_FIELD_GROUPS.filter(g => g.hostType === entity.type).map(g =>
            h(FacetSection, { key: g.id, group: g, entity, actions, t })),
          h('div', { style: { marginTop: DS.space.md } },
            h(RelationsSection, { relations: allRelations, entities: allEntities, selfId: entity.id, customRelationTypes, actions, t })),
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
          h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, t('detail.titleLabel')),
          h('input', {
            value: draft.title, onChange: e => actions.editDraft({ title: e.target.value }),
            style: { ...inputStyle, marginBottom: 10 },
          }),
          h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginBottom: 4 } }, t('detail.descLabel')),
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

    /** 数据管理区块：导出 / 导入 / 清空（JSON 全量，与 store state 同构）+ 存储用量与备份提醒。 */
    function DataSection(props) {
      const { useStore, actions, t } = props;
      const fileRef = React.useRef(null);
      const snapshot = useStore(s => s.entities && s.relations ? { entities: s.entities, relations: s.relations } : null);
      const [notice, setNotice] = React.useState('');
      // 存储用量（PERSIST_KEY 键的字节数）与最近导出时间（模块级变量，跨渲染保留）。
      const [usage, setUsage] = React.useState(null);
      const lastExportRef = React.useRef(null);
      React.useEffect(() => {
        try {
          const raw = localStorage.getItem(PERSIST_KEY);
          setUsage(raw ? new Blob([raw]).size : 0);
        } catch (_e) {
          // Blob 不可用（非浏览器环境）时省略用量显示，不影响功能。
          setUsage(null);
        }
      }, [snapshot]);
      // 距上次导出超过 7 天提示备份（上次导出时间记录在 localStorage，随导出刷新）。
      const lastExport = (() => {
        try { return localStorage.getItem(PERSIST_KEY + '.lastExport'); } catch (_e) { return null; }
      })();
      const stale = lastExport ? (Date.now() - Number(lastExport)) > 7 * 24 * 3600 * 1000 : true;

      /** 导出：全量 JSON 下载。 */
      const exportJson = () => {
        if (!snapshot) return;
        const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...snapshot }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'worldsea-workbench-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        try { localStorage.setItem(PERSIST_KEY + '.lastExport', String(Date.now())); } catch (_e) { /* 存储失败仅丢失提醒时间戳 */ }
        setNotice(t('data.exported'));
      };

      /** 导入：合并（同名 id 覆盖）。
       * @param file - 用户选择的 JSON 文件。
       */
      const importJson = async (file) => {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const entities = Array.isArray(data.entities) ? data.entities : [];
          const relations = Array.isArray(data.relations) ? data.relations : [];
          actions.importData(entities, relations);
          setNotice(t('data.imported').replace('{n}', String(entities.length)));
        } catch (_e) {
          setNotice(t('data.importFailed'));
        }
      };

      return h(Card, { pad: 14 },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: DS.font.md + 1, fontWeight: 600 } }, t('data.title')),
          h('div', { style: { flex: 1 } }),
          h(GhostButton, { small: true, onClick: exportJson }, t('data.export')),
          h(GhostButton, { small: true, onClick: () => fileRef.current && fileRef.current.click() }, t('data.import')),
          h(GhostButton, {
            small: true,
            onClick: () => { if (window.confirm(t('data.clearConfirm'))) actions.clearAll(); },
          }, t('data.clear')),
          h('input', {
            ref: fileRef, type: 'file', accept: '.json,application/json',
            style: { display: 'none' },
            onChange: e => { const f = e.target.files && e.target.files[0]; if (f) importJson(f); e.target.value = ''; },
          }),
        ),
        snapshot ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)', marginTop: 6 } },
          t('data.counts').replace('{e}', String(snapshot.entities.length)).replace('{r}', String(snapshot.relations.length))
          + (usage !== null ? ' · ' + t('data.usage').replace('{kb}', String(Math.round(usage / 1024))) : '')) : null,
        snapshot && stale && snapshot.entities.length > 0 ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-state-warn-primary)', marginTop: 4 } },
          t('data.staleReminder')) : null,
        notice ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-state-success-primary)', marginTop: 4 } }, notice) : null,
      );
    }

    /** 门户区块（工作台 portal tab 内容，v1 门户迁移）。 */
    function PortalSection(props) {
      const t = props.t;
      const { useStore, actions } = props;
      const LINKS = [
        { id: 'repo', href: 'https://github.com/LINGTIAN303/WorldSea' },
        { id: 'pluginRepo', href: 'https://github.com/LINGTIAN303/dsh-worldsea' },
        { id: 'dsh', href: 'https://github.com/deepseek-ai/deepseek-harness' },
      ];
      function launchDesktop() {
        window.open('worldsea://localhost/', '_blank');
      }
      return h('div', null,
        h(DataSection, { useStore, actions, t }),
        h('div', { style: { height: 12 } }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
          WorldIcon({ size: 36 }),
          h('div', null,
            h('div', { style: { fontSize: DS.font.xl, fontWeight: 600 } }, 'WorldSea'),
            h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('tagline')),
          ),
        ),
        h('p', { style: { fontSize: DS.font.md, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 16px' } }, t('intro')),
        h(Card, { pad: 14 },
          LINKS.map(link => h('a', {
            key: link.id, href: link.href, target: '_blank', rel: 'noreferrer',
            style: {
              display: 'block', padding: '6px 10px', borderRadius: DS.radius.sm, marginBottom: 4,
              fontSize: DS.font.md, color: 'var(--dsw-alias-brand-primary)', textDecoration: 'none',
              background: 'var(--dsw-alias-bg-layer-1)',
            },
          }, t('links.' + link.id) + ' — ' + link.href.replace('https://', ''))),
          h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } },
            h(PrimaryButton, { onClick: launchDesktop }, t('launch.button')),
            h('span', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('launch.hint')),
          ),
        ),
      );
    }

    /** 自定义实体类型管理弹层：新建（type/label/字段行）+ 清单删除。 */
    function CustomTypeSection(props) {
      const { customEntityTypes, entities, actions, t } = props;
      const [open, setOpen] = React.useState(false);
      const [type, setType] = React.useState('');
      const [label, setLabel] = React.useState('');
      const [domain, setDomain] = React.useState('knowledge');
      const [fieldLines, setFieldLines] = React.useState('');
      /** 字段行格式：key|label|text|选项1,选项2（每行一条）。 */
      const parseFields = () => fieldLines.split('\n').map(line => {
        const parts = line.split('|').map(s => s.trim());
        if (!parts[0] || !parts[1]) return null;
        return { key: parts[0], label: parts[1], fieldType: parts[2] || 'text', options: parts[3] ? parts[3].split(',').map(s => s.trim()).filter(Boolean) : undefined };
      }).filter(Boolean);
      return h('div', null,
        h('button', {
          onClick: () => setOpen(!open),
          style: {
            padding: '3px 12px', borderRadius: DS.radius.pill, cursor: 'pointer', fontSize: DS.font.sm,
            border: '1px dashed var(--dsw-alias-border-l2)', background: 'transparent',
            color: 'var(--dsw-alias-label-secondary)',
          },
        }, open ? t('customType.close') : t('customType.open')),
        open ? h(Card, { pad: 12 },
          h('div', { style: { fontSize: DS.font.md, fontWeight: 600, marginBottom: 8 } }, t('customType.title')),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 } },
            h('input', { value: type, placeholder: t('customType.key'), onChange: e => setType(e.target.value), style: { ...inputStyle, width: 120 } }),
            h('input', { value: label, placeholder: t('customType.label'), onChange: e => setLabel(e.target.value), style: { ...inputStyle, width: 100 } }),
            h('select', { value: domain, onChange: e => setDomain(e.target.value), style: { ...inputStyle, width: 110 } },
              DOMAINS.map(d => h('option', { key: d.id, value: d.id }, d.label))),
            h(PrimaryButton, {
              small: true,
              onClick: () => {
                actions.addCustomEntityType({ type, label, domain, fields: parseFields() });
                setType(''); setLabel(''); setFieldLines('');
              },
            }, t('customType.add')),
          ),
          h('textarea', {
            value: fieldLines,
            placeholder: t('customType.fieldsHint'),
            rows: 3,
            onChange: e => setFieldLines(e.target.value),
            style: { ...inputStyle, marginBottom: 8, fontSize: DS.font.sm, fontFamily: 'ui-monospace, monospace' },
          }),
          customEntityTypes.length ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            customEntityTypes.map(ct => h('span', {
              key: ct.type,
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                borderRadius: DS.radius.pill, fontSize: DS.font.sm, background: 'var(--dsw-alias-bg-layer-2)',
                border: '1px solid var(--dsw-alias-border-l1)',
              },
            },
              ct.label + '（' + ct.type + ' · ' + entities.filter(e => e.type === ct.type).length + '）',
              h('button', {
                onClick: () => { if (window.confirm(t('customType.removeConfirm').replace('{label}', ct.label))) actions.removeCustomEntityType(ct.type); },
                style: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--dsw-alias-state-error-primary)', padding: 0, fontSize: DS.font.xs },
              }, '×'),
            ))) : null,
        ) : null,
      );
    }

    /** 工作台主体（左栏 main 与右栏 tab 共用组件）。 */
    function Workbench(props) {
      const { useStore, actions, t } = props;
      const batchTagRef = React.useRef(null);
      const entities = useStore(s => s.entities);
      const relations = useStore(s => s.relations);
      const activeDomain = useStore(s => s.activeDomain);
      const activeType = useStore(s => s.activeType);
      const selectedId = useStore(s => s.selectedId);
      const view = useStore(s => s.view);
      const search = useStore(s => s.search);
      const customRelationTypes = useStore(s => s.customRelationTypes || []);
      const batchMode = useStore(s => s.batchMode);
      const batchSelection = useStore(s => s.batchSelection || []);
      const customEntityTypes = useStore(s => s.customEntityTypes || []);
      const allTypes = allEntityTypes(customEntityTypes);

      const typeDef = allTypes.find(x => x.type === activeType) || allTypes[0];
      // 旧持久化数据可能缺 activeDomain：按当前类型回推。
      const domain = activeDomain || typeDef.domain;
      const kw = search.trim();
      const list = entities
        .filter(e => e.type === typeDef.type)
        .filter(e => !kw || e.title.includes(kw) || e.tags.some(tag => tag.includes(kw))
          || Object.values(e.properties).some(v => typeof v === 'string' && v.includes(kw)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const selected = list.find(e => e.id === selectedId)
        || entities.find(e => e.id === selectedId && e.type === typeDef.type)
        || null;

      /** 全库搜索：跨类型匹配标题/标签/字段，命中处标注（标题/标签/字段名）。 */
      const globalHits = !kw ? [] : entities.flatMap(e => {
        const hits = [];
        if (e.title.includes(kw)) hits.push(t('search.inTitle'));
        if (e.tags.some(tag => tag.includes(kw))) hits.push(t('search.inTags'));
        for (const [key, value] of Object.entries(e.properties)) {
          if (typeof value === 'string' && value.includes(kw)) {
            const field = allTypes.find(x => x.type === e.type)?.fields.find(f => f.key === key);
            hits.push((field?.label || key) + ': ' + value.slice(0, 20));
            break;
          }
        }
        return hits.length ? [{ entity: e, where: hits[0] }] : [];
      });

      /** 统计带：实体总数 / 关系总数 / 标签数 / 最近更新。 */
      const tagCount = new Set(entities.flatMap(e => e.tags)).size;
      const latest = entities.reduce((acc, e) => (e.updatedAt > acc ? e.updatedAt : acc), '');
      const stats = [
        { label: t('stats.entities'), value: entities.length },
        { label: t('stats.relations'), value: relations.length },
        { label: t('stats.tags'), value: tagCount },
        { label: t('stats.updated'), value: latest ? latest.slice(0, 10) : '—' },
      ];

      /** 面板内导航项（分组：创作 / 可视 / 维护）。 */
      const NAV_GROUPS = [
        { id: 'create', label: t('nav.create'), items: ['workbench', 'writing', 'manuscript'] },
        { id: 'visual', label: t('nav.visual'), items: ['graph', 'timeline', 'codex'] },
        { id: 'maintain', label: t('nav.maintain'), items: ['health', 'portal'] },
      ];
      const NAV_GLYPHS = { workbench: 'grid', writing: 'note', manuscript: 'manuscript', graph: 'graph', timeline: 'clock', codex: 'book', health: 'shield', portal: 'globe' };
      /** 导航行（图标 + 文字；active = accent-soft 弱底 + accent 字，对齐 WorldSea .ws-sn-view.active）。 */
      const navRow = (id) => {
        const active = view === id;
        return h('div', {
          key: id,
          className: 'ws-nav-row',
          onClick: () => actions.setView(id),
          style: {
            ...dsControlBase,
            display: 'flex', alignItems: 'center', gap: DS.space.sm,
            padding: '6px 8px', borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.sm,
            background: active ? DS.activeBg : 'transparent',
            color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-primary)',
            fontWeight: active ? 500 : 400,
          },
          onMouseOver: e => { if (!active) e.currentTarget.style.background = DS.hoverBg; },
          onMouseOut: e => { if (!active) e.currentTarget.style.background = 'transparent'; },
        },
          h(TypeGlyph, { glyph: NAV_GLYPHS[id], size: 14 }),
          h('span', { className: 'ws-nav-label', style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('tab.' + id)),
        );
      };

      /** 面板骨架：左侧导航 + 右侧内容（各视图自己滚动）。窄容器（右栏 tab）自动折叠为图标条。 */
      const shell = (content) => h('div', {
        ref: el => {
          // 容器宽度探测：≤420px 走窄模式（导航收成图标列）；ResizeObserver 兼容缺省时跳过。
          if (!el) return;
          if (typeof ResizeObserver !== 'undefined') {
            if (shell.ro) shell.ro.disconnect();
            shell.ro = new ResizeObserver(entries => {
              for (const entry of entries) {
                const narrow = entry.contentRect.width <= 420;
                entry.target.setAttribute('data-narrow', narrow ? '1' : '0');
              }
            });
            shell.ro.observe(el);
          }
          el.setAttribute('data-worldsea-ui', '');
        },
        style: { height: '100%', display: 'flex', boxSizing: 'border-box', overflow: 'hidden' },
      },
        // 导航侧栏（窄模式：仅图标列）
        h('div', {
          style: {
            width: DS.navWidth, flexShrink: 0, boxSizing: 'border-box',
            padding: DS.space.lg + 'px ' + DS.space.md + 'px',
            overflowY: 'auto',
            borderRight: '1px solid var(--dsw-alias-border-l1)',
          },
        },
          // 顶部品牌行（窄模式隐藏文字由 CSS 处理——见全局样式 [data-narrow="1"] 规则）
          h('div', { className: 'ws-nav-brand', style: { display: 'flex', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.lg } },
            WorldIcon({ size: 22 }),
            h('div', { className: 'ws-nav-label', style: { fontSize: DS.font.lg, fontWeight: 700 } }, 'WorldSea'),
          ),
          NAV_GROUPS.map(g => h('div', { key: g.id, className: 'ws-nav-group', style: { marginBottom: DS.space.md } },
            h('div', { className: 'ws-nav-label', style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-state-idle-primary)', letterSpacing: '0.06em', margin: '0 0 ' + DS.space.xs + 'px ' + DS.space.sm + 'px' } }, g.label.toUpperCase()),
            g.items.map(navRow),
          )),
        ),
        // 内容区（仅当前视图滚动）
        h('div', { style: { flex: 1, minWidth: 0, overflowY: 'auto', padding: DS.space.xl } }, content),
      );

      return shell(h('div', null,
        // 统计带（仅工作台视图显示）。
        view === 'workbench'
          ? h('div', { style: { display: 'flex', gap: DS.space.md, marginBottom: DS.space.lg, flexWrap: 'wrap' } },
            stats.map(s => h('div', {
              key: s.label,
              style: {
                flex: '1 1 120px', padding: DS.space.sm + 'px ' + DS.space.lg + 'px',
                borderRadius: DS.radius.md, background: 'var(--dsw-alias-bg-layer-1)',
                border: '1px solid var(--dsw-alias-border-l1)',
              },
            },
              h('div', { style: { fontSize: DS.font.xl, fontWeight: 700, color: 'var(--dsw-alias-label-primary)' } }, s.value),
              h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, s.label),
            )))
          : null,
        // 全库搜索：跨类型；有关键词且不在详情态时，在列表上方出全库命中区。
        view === 'workbench' && kw && !selected
          ? h('div', { style: { marginBottom: 14 } },
            h(Card, { pad: 12 },
              h('div', { style: { fontSize: DS.font.md, fontWeight: 600, marginBottom: 8 } },
                t('search.globalTitle') + ' · ' + globalHits.length),
              globalHits.length === 0
                ? h('div', { style: { fontSize: DS.font.sm, color: 'var(--dsw-alias-label-secondary)' } }, t('search.noHits'))
                : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                  globalHits.slice(0, 12).map(({ entity: e, where }) => h('div', {
                    key: e.id,
                    onClick: () => { actions.selectType(e.type); actions.selectEntity(e.id); },
                    style: {
                      display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px',
                      borderRadius: DS.radius.sm, cursor: 'pointer', fontSize: DS.font.md,
                      background: 'var(--dsw-alias-bg-layer-2)',
                    },
                  },
                    h(TypeGlyph, { glyph: allTypes.find(x => x.type === e.type)?.glyph, size: 12 }),
                    h('span', { style: { fontWeight: 600 } }, e.title),
                    h('span', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } },
                      (allTypes.find(x => x.type === e.type)?.label || e.type) + ' · ' + where),
                  )))))
          : null,

        view === 'portal'
          ? h(PortalSection, { t, useStore, actions })
          : view === 'graph'
            ? h(GraphView, { entities, relations, actions, t })
            : view === 'timeline'
              ? h(TimelineView, { entities, actions, t })
              : view === 'writing'
                ? h(WritingView, { entities, actions, t })
                : view === 'codex'
                ? h(CodexView, { entities, allTypes, t })
                : view === 'health'
                ? h(HealthView, { entities, relations, actions, t })
                : (() => {
            // ── 工作台：WorldSea 式随流工具条（面包屑+搜索+动作）+ 列表/详情双栏 ──
            const workbenchBody = h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } },
              // 随流工具条（对齐 ViewToolbar：面包屑 › 搜索 › 弹性 › 动作 › 新建）
              h('div', {
                style: {
                  display: 'flex', alignItems: 'center', gap: DS.space.sm,
                  padding: '0 ' + DS.space.md + 'px', height: 44, flexShrink: 0,
                  background: 'var(--dsw-alias-bg-layer-1)',
                  border: '1px solid var(--dsw-alias-border-l1)',
                  borderRadius: DS.radius.md, marginBottom: DS.space.md,
                },
              },
                // 面包屑：域 › 类型
                h('button', {
                  onClick: () => { const cur = DOMAINS.findIndex(x => x.id === domain); const next = DOMAINS[(cur + 1) % DOMAINS.length]; actions.selectDomain(next.id); },
                  style: {
                    ...dsControlBase, display: 'inline-flex', alignItems: 'center', gap: DS.space.xs,
                    padding: '3px 8px', borderRadius: DS.radius.sm, border: 'none', background: 'transparent',
                    color: 'var(--dsw-alias-label-secondary)', fontSize: DS.font.sm, cursor: 'pointer',
                  },
                  title: t('workbench.cycleDomain'),
                },
                  h(TypeGlyph, { glyph: typeDef.glyph, size: 13 }),
                  DOMAIN_LABEL.get(domain) || domain,
                  '›',
                  h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontWeight: 600 } }, typeDef.label),
                ),
                // 域下拉（收束在面包屑后，点开切换）——简化：点击面包屑轮转域，类型用下拉
                h('select', {
                  value: activeType,
                  onChange: e => actions.selectType(e.target.value),
                  style: { ...inputStyle, width: 'auto', padding: '3px 8px', fontSize: DS.font.sm },
                },
                  allTypes.map(def => h('option', { key: def.type, value: def.type },
                    (DOMAIN_LABEL.get(def.domain) || def.domain) + ' · ' + def.label + ' (' + entities.filter(e => e.type === def.type).length + ')'))),
                h('input', {
                  value: search,
                  placeholder: t('workbench.searchPlaceholder'),
                  onChange: e => actions.setSearch(e.target.value),
                  style: { ...inputStyle, width: 180, padding: '4px 10px', fontSize: DS.font.sm },
                }),
                h('div', { style: { flex: 1 } }),
                h(GhostButton, { small: true, onClick: () => actions.toggleBatchMode() }, batchMode ? t('batch.exit') : t('batch.enter')),
                h(GhostButton, { small: true, onClick: () => actions.createFromTemplate(typeDef.type) }, t('workbench.newFromTemplate')),
                h(PrimaryButton, { small: true, onClick: () => actions.create(typeDef.type, t('workbench.untitled')) }, t('workbench.new') + ' ' + typeDef.label),
              ),
              h(CustomTypeSection, { customEntityTypes, entities, actions, t }),
              // 批量操作条。
              batchMode ? h('div', {
                style: {
                  display: 'flex', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.md,
                  padding: '7px 12px', borderRadius: DS.radius.mid, flexWrap: 'wrap',
                  background: DS.activeBg, fontSize: DS.font.md,
                },
              },
                h('span', { style: { fontWeight: 600 } }, t('batch.selected').replace('{n}', String(batchSelection.length))),
                h('input', {
                  ref: batchTagRef,
                  placeholder: t('batch.tagPlaceholder'),
                  onKeyDown: e => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      actions.batchAddTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  },
                  style: { ...inputStyle, width: 150, padding: '4px 8px', fontSize: DS.font.sm },
                }),
                h(GhostButton, { small: true, onClick: () => { const el = batchTagRef.current; if (el && el.value.trim()) { actions.batchAddTag(el.value); el.value = ''; } } }, t('batch.applyTag')),
                h(GhostButton, {
                  small: true,
                  onClick: () => {
                    if (batchSelection.length >= 2 && window.confirm(t('batch.mergeConfirm').replace('{n}', String(batchSelection.length)))) actions.batchMerge();
                  },
                }, t('batch.merge')),
                h(GhostButton, {
                  small: true,
                  onClick: () => {
                    if (batchSelection.length && window.confirm(t('batch.deleteConfirm').replace('{n}', String(batchSelection.length)))) actions.batchRemove();
                  },
                }, t('batch.delete')),
              ) : null,
              // 列表网格（对齐 WorldSea .entity-grid：minmax 220px / gap 12 / min-content 行 / 自滚动）。
              list.length === 0
                ? h(EmptyState, null, t('workbench.empty'))
                : h('div', {
                  style: {
                    flex: 1, minHeight: 0, overflowY: 'auto',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gridAutoRows: 'min-content', gap: DS.space.md, alignContent: 'start', alignItems: 'stretch',
                  },
                },
                  list.map(e => h(Card, {
                    key: e.id, pad: DS.space.md,
                    active: (batchMode && batchSelection.includes(e.id)) || (!batchMode && selectedId === e.id),
                    onClick: () => batchMode ? actions.toggleBatchItem(e.id) : actions.selectEntity(e.id),
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: DS.space.sm } },
                      batchMode ? h('input', {
                        type: 'checkbox', checked: batchSelection.includes(e.id), readOnly: true,
                        style: { accentColor: 'var(--dsw-alias-brand-primary)', cursor: 'pointer' },
                      }) : null,
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontSize: DS.font.base, fontWeight: 600, marginBottom: DS.space.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, e.title),
                        h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)', display: 'flex', gap: DS.space.sm } },
                          h('span', null, e.updatedAt.slice(0, 10)),
                          e.tags.length ? h('span', null, e.tags.join(' · ')) : null,
                        )),
                    ),
                  ))),
            );
            // 详情右栏（对齐 WorldSea detail-carrier="column"：选中实体 → 列表旁开 560px 面板，
            // 进场走 ws-fade 式宽度+透明度过渡）。
            return selected
              ? h('div', { style: { flex: 1, minWidth: 0, display: 'flex', gap: DS.space.md, minHeight: 0 } },
                h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } }, workbenchBody),
                h('aside', {
                  key: selected.id,
                  className: 'ws-detail-column',
                  style: { flex: '0 0 560px', width: 560, boxSizing: 'border-box' },
                },
                  // 头部：图标 + 标题 + 类型标签（对齐 detail-header 插槽形态）
                  h('div', {
                    style: {
                      display: 'flex', alignItems: 'center', gap: DS.space.md,
                      padding: '0 0 ' + DS.space.md + 'px',
                      borderBottom: '1px solid var(--dsw-alias-border-l1)',
                      marginBottom: DS.space.lg,
                    },
                  },
                    h('div', {
                      style: {
                        width: 36, height: 36, borderRadius: DS.radius.mid, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: DS.activeBg, color: 'var(--dsw-alias-brand-primary)',
                      },
                    }, h(TypeGlyph, { glyph: typeDef.glyph, size: 18 })),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: DS.font.lg, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, selected.title),
                      h('div', { style: { fontSize: DS.font.xs, color: 'var(--dsw-alias-label-secondary)' } }, typeDef.label + ' · ' + selected.id),
                    ),
                    h(GhostButton, { small: true, onClick: () => actions.selectEntity(null) }, t('detail.back')),
                  ),
                  h('div', { className: 'ws-detail-scroll', style: { overflowY: 'auto', minHeight: 0 } },
                    h(EntityDetail, { useStore, actions, entity: selected, fields: typeDef.fields, allRelations: relations, allEntities: entities, customRelationTypes, t }),
                  ),
                ),
              )
              : workbenchBody;
          })(),
      ));
    }

    // ─────────────────────────────────────────────
    // 模块注入面与 slot 注册
    // ─────────────────────────────────────────────

    const inject = ['slots', 'locale', 'sidebarRightTabs'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), NS + ': dictionaries');
      const t = ctx.locale.bind(NS);

      // 全局样式注入：滚动条 / focus 可见性（作用域限定在插件容器内，卸载随 ctx.effect 清理）。
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.worldsea = 'ui';
        style.textContent = [
          // 插件容器内的滚动条：细轨 + 圆角滑块，hover 提亮（明暗主题均走 token）。
          '[data-worldsea-ui] ::-webkit-scrollbar { width: 8px; height: 8px; }',
          '[data-worldsea-ui] ::-webkit-scrollbar-track { background: transparent; }',
          '[data-worldsea-ui] ::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 4px; }',
          '[data-worldsea-ui] ::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-state-idle-primary); }',
          // 键盘导航的 focus 可见性：仅 focus-visible 显示品牌描边，不影响鼠标点击。
          '[data-worldsea-ui] :focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }',
          // 控件平滑过渡（颜色类）。
          '[data-worldsea-ui] button, [data-worldsea-ui] input, [data-worldsea-ui] select, [data-worldsea-ui] textarea { transition: ' + DS.transition + '; }',
          // 窄容器（右栏 tab）自适应：导航折叠为图标列，文字与分组标题隐藏。
          '[data-worldsea-ui] [data-narrow="1"] .ws-nav-label { display: none; }',
          '[data-worldsea-ui] [data-narrow="1"] .ws-nav-group { margin-bottom: ' + DS.space.sm + 'px !important; }',
          '[data-worldsea-ui] [data-narrow="1"] .ws-nav-row { justify-content: center; padding: 7px 6px; }',
          // 详情右栏（对齐 ws-fade：进场 = 宽度+透明度+边框同时过渡；keyframes 播一次 0→560px）。
          '@keyframes ws-detail-in { from { opacity: 0; flex-basis: 0; border-left-width: 0; } to { opacity: 1; flex-basis: 560px; border-left-width: 1px; } }',
          '[data-worldsea-ui] .ws-detail-column { animation: ws-detail-in ' + DS.durFast + ' ' + DS.ease + '; overflow: hidden; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1); border-left: 1px solid var(--dsw-alias-border-l1); border-radius: ' + DS.radius.md + 'px; padding: ' + DS.space.lg + 'px; }',
          '[data-worldsea-ui] .ws-detail-column .ws-detail-scroll { flex: 1; min-height: 0; }',
        ].join('\n');
        // 标记所有渲染根（右栏 tab 与 main 各一份），样式选择器才能命中本插件容器。
        const mark = () => {
          document.querySelectorAll('#root > div, [data-slot]').forEach(el => {
            if (!el.hasAttribute('data-worldsea-ui')) el.setAttribute('data-worldsea-ui', '');
          });
        };
        mark();
        // 挂载后的兜底标记（右栏 tab 懒渲染，可能晚于 apply）。
        setTimeout(mark, 300);
        document.body.appendChild(style);
        return () => { style.remove(); };
      }, NS + ': global styles');

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
      'tab.graph': '图谱',
      'tab.timeline': '时间线',
      'tab.health': '体检',
      'tab.codex': '设定集',
      'tab.writing': '写作',
      'tab.manuscript': '手稿',
      'workbench.cycleDomain': '点击轮转域',
      'tab.portal': '门户',
      'nav.create': '创作',
      'nav.visual': '可视化',
      'nav.maintain': '维护',
      'graph.empty': '暂无实体可绘图；先到「工作台」新建。',
      'graph.filter': '只看关系',
      'graph.allRelations': '全部关系',
      'search.globalTitle': '全库搜索',
      'search.noHits': '全库无命中。',
      'search.inTitle': '标题',
      'search.inTags': '标签',
      'timeline.title': '时间线',
      'timeline.empty': '时间线为空：给实体（主要是「事件」）的「日期/纪年」字段填上日期后自动上图。',
      'timeline.undated': '未定日期',
      'stats.entities': '实体',
      'stats.relations': '关系',
      'stats.tags': '标签',
      'stats.updated': '最近更新',
      'facet.filled': '已填',
      'relations.editProps': '属性',
      'relations.notePlaceholder': '关系备注（如：相识于某事件）…',
      'batch.enter': '多选',
      'batch.exit': '退出多选',
      'batch.selected': '已选 {n} 项',
      'batch.tagPlaceholder': '标签名…',
      'batch.applyTag': '加标签',
      'batch.delete': '删除所选',
      'batch.deleteConfirm': '确定删除所选 {n} 个实体及其全部关系？',
      'batch.merge': '合并到首个',
      'batch.mergeConfirm': '把后 {n0} 个实体合并进第一个（保留第一个）？字段取并集、关系改挂，操作不可撤销。',
      'health.title': '完整性体检',
      'health.run': '运行检查',
      'health.hint': '校验悬挂关系、重复标题、空标题（对齐 worldsea-core ReferenceCheck 语义）。',
      'health.clean': '检查通过：无问题。',
      'health.summary': '悬挂关系 {d} · 重复标题 {dup} · 空标题 {e}',
      'health.pruneDangling': '清理悬挂关系（{n}）',
      'customType.open': '＋自定义类型',
      'customType.close': '收起',
      'customType.title': '自定义实体类型（typeKey 用小写英文；字段每行一条：键|显示名|text/textarea/number/select|选项1,选项2）',
      'customType.key': '类型键',
      'customType.label': '显示名',
      'customType.add': '添加类型',
      'customType.fieldsHint': '字段行示例：\norigin|出身地|text\ntier|阶级|select|下位,中位,上位',
      'customType.removeConfirm': '删除类型「{label}」会一并删除其下全部实体与关系，确定？',
      'codex.export': '导出整本 Markdown',
      'codex.exportedAt': '导出于 {date}',
      'codex.tags': '标签',
      'codex.empty': '暂无内容；先到「工作台」创建实体。',
      'writing.outline': '大纲',
      'writing.notes': '笔记',
      'writing.emptyOutline': '大纲为空；点下方「新建节点」。',
      'writing.emptyNotes': '无笔记；点下方「新建笔记」。',
      'writing.newNode': '新建节点',
      'writing.newNote': '新建笔记',
      'writing.untitled': '未命名',
      'writing.pick': '左侧选择条目后在此编辑正文。',
      'writing.rootNode': '（根节点）',
      'writing.storylines': '线索…',
      'writing.contentPlaceholder': 'Markdown 正文…',
      'writing.charCount': '{n} 字',
      'ms.books': '书籍',
      'ms.newBook': '新建书',
      'ms.chapter': '章',
      'ms.newChapterTitle': '未命名章节',
      'ms.orphaned': '未归书',
      'ms.freeChapter': '自由章节',
      'ms.pick': '左侧选择章节后在此编辑正文。',
      'ms.volume': '卷名…',
      'ms.exportBook': '导出',
      'ms.exportedAt': '导出于 {date}',
      'writing.exportOutline': '导出大纲',
      'data.title': '数据管理',
      'data.export': '导出 JSON',
      'data.import': '导入 JSON',
      'data.clear': '清空数据',
      'data.clearConfirm': '确定清空全部实体与关系？此操作不可撤销（建议先导出备份）。',
      'data.exported': '已导出。',
      'data.imported': '已导入 {n} 个实体（含关系）。',
      'data.importFailed': '导入失败：文件不是有效的 JSON 或结构不符。',
      'data.counts': '当前：{e} 个实体 · {r} 条关系',
      'data.usage': '存储 {kb} KB',
      'data.staleReminder': '已超过 7 天未导出备份——localStorage 不在插件卸载保护范围内，建议先导出 JSON。',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea 工作台',
      'guide.description': '世界观创作工作台：实体管理与门户',
      'workbench.list': '列表',
      'workbench.new': '新建',
      'workbench.empty': '暂无实体，点「新建」开始创作。',
      'workbench.untitled': '未命名',
      'workbench.newFromTemplate': '示例模板',
      'workbench.searchPlaceholder': '搜索标题 / 标签 / 字段…',
      'relations.title': '关系',
      'relations.add': '连边',
      'relations.remove': '删',
      'relations.outgoing': '本方 → 对方',
      'relations.incoming': '对方 → 本方',
      'relations.pickTarget': '选实体…',
      'relations.empty': '尚无关系；选类型与实体后「连边」。',
      'relations.hint': '非对称关系自动创建反向边；删除一边时逆边同删。',
      'relations.customToggle': '自定义',
      'relations.customTitle': '自定义关系类型（有向 + 逆关系；对称关系逆方向填同名）',
      'relations.customKey': '类型键（英文）',
      'relations.customLabel': '显示名',
      'relations.customInverseKey': '逆类型键',
      'relations.customInverseLabel': '逆显示名',
      'relations.customAdd': '添加类型',
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
      'tab.graph': 'Graph',
      'tab.timeline': 'Timeline',
      'tab.health': 'Health',
      'tab.codex': 'Codex',
      'tab.writing': 'Writing',
      'tab.manuscript': 'Manuscript',
      'workbench.cycleDomain': 'Click to cycle domain',
      'tab.portal': 'Portal',
      'nav.create': 'Create',
      'nav.visual': 'Visualize',
      'nav.maintain': 'Maintain',
      'graph.empty': 'No entities to draw yet; create some in the workbench first.',
      'graph.filter': 'Show relation',
      'graph.allRelations': 'All relations',
      'search.globalTitle': 'Global search',
      'search.noHits': 'No hits across the library.',
      'search.inTitle': 'title',
      'search.inTags': 'tags',
      'timeline.title': 'Timeline',
      'timeline.empty': 'Timeline is empty: fill in the "Date" field of entities (mainly "Event") and they appear here.',
      'timeline.undated': 'Undated',
      'stats.entities': 'Entities',
      'stats.relations': 'Relations',
      'stats.tags': 'Tags',
      'stats.updated': 'Last updated',
      'facet.filled': 'filled',
      'relations.editProps': 'note',
      'relations.notePlaceholder': 'Relation note (e.g. met during …)…',
      'batch.enter': 'Select',
      'batch.exit': 'Exit select',
      'batch.selected': '{n} selected',
      'batch.tagPlaceholder': 'Tag name…',
      'batch.applyTag': 'Add tag',
      'batch.delete': 'Delete',
      'batch.deleteConfirm': 'Delete {n} selected entities and all their relations?',
      'batch.merge': 'Merge into first',
      'batch.mergeConfirm': 'Merge the other {n0} entities into the first (keep the first)? Fields union, relations re-attached; irreversible.',
      'health.title': 'Integrity check',
      'health.run': 'Run check',
      'health.hint': 'Validates dangling relations, duplicate titles, empty titles (aligned with worldsea-core ReferenceCheck semantics).',
      'health.clean': 'All clean.',
      'health.summary': 'Dangling {d} · Duplicate titles {dup} · Empty titles {e}',
      'health.pruneDangling': 'Prune dangling relations ({n})',
      'customType.open': '+Custom type',
      'customType.close': 'Close',
      'customType.title': 'Custom entity types (ascii typeKey; one field per line: key|label|text/textarea/number/select|opt1,opt2)',
      'customType.key': 'Type key',
      'customType.label': 'Label',
      'customType.add': 'Add type',
      'customType.fieldsHint': 'Field line examples:\norigin|Birthplace|text\ntier|Tier|select|low,mid,high',
      'customType.removeConfirm': 'Deleting "{label}" also deletes all its entities and relations. Continue?',
      'codex.export': 'Export Markdown',
      'codex.exportedAt': 'Exported at {date}',
      'codex.tags': 'Tags',
      'codex.empty': 'Nothing to compile yet; create entities in the workbench first.',
      'writing.outline': 'Outline',
      'writing.notes': 'Notes',
      'writing.emptyOutline': 'Outline is empty; click "New node" below.',
      'writing.emptyNotes': 'No notes; click "New note" below.',
      'writing.newNode': 'New node',
      'writing.newNote': 'New note',
      'writing.untitled': 'Untitled',
      'writing.pick': 'Pick an entry on the left to edit its content here.',
      'writing.rootNode': '(root)',
      'writing.storylines': 'Storylines…',
      'writing.contentPlaceholder': 'Markdown content…',
      'writing.charCount': '{n} chars',
      'ms.books': 'Books',
      'ms.newBook': 'New book',
      'ms.chapter': 'chapter',
      'ms.newChapterTitle': 'Untitled chapter',
      'ms.orphaned': 'Unfiled',
      'ms.freeChapter': 'Free chapter',
      'ms.pick': 'Pick a chapter on the left to edit here.',
      'ms.volume': 'Volume…',
      'ms.exportBook': 'Export',
      'ms.exportedAt': 'Exported at {date}',
      'writing.exportOutline': 'Export outline',
      'data.title': 'Data',
      'data.export': 'Export JSON',
      'data.import': 'Import JSON',
      'data.clear': 'Clear all',
      'data.clearConfirm': 'Clear ALL entities and relations? This cannot be undone (export a backup first).',
      'data.exported': 'Exported.',
      'data.imported': 'Imported {n} entities (with relations).',
      'data.importFailed': 'Import failed: not valid JSON or unexpected structure.',
      'data.counts': 'Now: {e} entities · {r} relations',
      'data.usage': '{kb} KB stored',
      'data.staleReminder': 'No backup export for over 7 days — localStorage is not protected from uninstall; exporting JSON first is recommended.',
      'tab.title': 'WorldSea',
      'guide.title': 'WorldSea workbench',
      'guide.description': 'Worldbuilding workbench: entity management and portal',
      'workbench.list': 'list',
      'workbench.new': 'New',
      'workbench.empty': 'No entities yet. Click "New" to start.',
      'workbench.untitled': 'Untitled',
      'workbench.newFromTemplate': 'From template',
      'workbench.searchPlaceholder': 'Search title / tag / field…',
      'relations.title': 'Relations',
      'relations.add': 'Link',
      'relations.remove': 'x',
      'relations.outgoing': 'self → other',
      'relations.incoming': 'other → self',
      'relations.pickTarget': 'Pick entity…',
      'relations.empty': 'No relations yet; pick a type and an entity, then "Link".',
      'relations.hint': 'Asymmetric relations auto-create the inverse edge; deleting one edge removes its inverse.',
      'relations.customToggle': 'Custom',
      'relations.customTitle': 'Custom relation types (directed + inverse; symmetric types repeat the same key)',
      'relations.customKey': 'Type key (ascii)',
      'relations.customLabel': 'Label',
      'relations.customInverseKey': 'Inverse key',
      'relations.customInverseLabel': 'Inverse label',
      'relations.customAdd': 'Add type',
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
