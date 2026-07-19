# LowCode Admin Builder｜前端项目面试题库

> 适用：前端实习、秋招与中大型互联网公司校招项目面。题库按仓库 `EasyFormLowCode` 当前实现核对；“未确认”仅表示简历写到但当前源码没有找到可直接证明的实现，不能在面试中说成已完成。

## 1. 项目面试考点地图

| 链路 | 已确认源码证据 | 面试要讲清的设计 |
|---|---|---|
| 协议 | `frontend/src/schema/pageSchema.js:35-212`；`backend/app/services/schema_contract.py:188-400` | 同一份 JSON 经迁移、归一化、校验后服务设计、运行、持久化、导出 |
| 编辑器 | `frontend/src/composables/useDesignerSchemaEditor.js:29-293`；`components/designer/*` | 物料—拖放—字段节点—选中—属性修改—历史快照 |
| 渲染 | `renderer/FieldControl.vue:1-126`；`renderer/ChartRenderer.vue` | 受控映射表、动态组件、v-model 适配、图表/表格专用渲染 |
| 运行态 | `views/Preview.vue`；`composables/useRuntimeCrud.js` | 草稿/发布态加载、CRUD、数据源能力收敛、离线兜底 |
| 响应式 | `usePageSchema.js`、`useSchemaModels.js` | 单页 schema 以 reactive 驱动，computed 派生可见字段、选中项与 UI |
| 可靠性 | 前后端同构校验；`useSchemaHistory.js` | schemaVersion 逐版本迁移、引用完整性、撤销重做、服务不可用回退 |

**证据边界。** Pinia 当前只有示例 `stores/counter.js`，没有确认用它承载 PageSchema/选中状态；简历中“基于 Pinia 管理设计器状态”应表述为参与的架构方向或待补源码证据，而非当前仓库事实。ECharts 是通过聚合结果与组件视图模型渲染，未见直接 `echarts.init/dispose`。三态可见性在字段级实际落为 `searchable/tableVisible/formVisible` 三个布尔位，并非单枚三值枚举。

## 2. P0 核心必问题（25 题）

### P0-01
**问题**：请用一分钟介绍 LowCode Admin Builder：它解决什么问题，你具体参与了哪一段？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：项目描述、PageSchema、设计器与渲染职责。**考察点**：业务背景、职责边界、闭环表达。

**基础回答**：它面向后台 CRUD 页面，把搜索、表格、表单弹窗、统计和图表抽成 PageSchema，让运营或开发通过配置搭建页面，而不是每页重复写 Vue。我的表述应聚焦参与的 Schema 协议、Schema 驱动渲染和设计器交互，避免把全平台都说成独立完成。

**进阶回答**：闭环是设计器修改 schema→归一化/校验→草稿保存与发布→预览运行→版本回滚/代码导出；协议是各环节的稳定边界。

**项目业务分析**：后台 CRUD 结构重复；项目用 `pageSchema.js` 统一字段、数据源、操作、图表；`PageDesigner.vue` 编辑、`Preview.vue` 运行；最终同构协议降低重复实现。

**高频追问**：①为什么选后台而非自由画布？结构稳定、约束明确。②用户是谁？配置后台页面的业务/开发人员。③核心难点？协议演进与编辑/运行一致性。

**回答误区**：只罗列技术栈；把“参与”说成“全栈独立交付”；编造用户量或收益。

### P0-02
**问题**：什么是 PageSchema？为什么页面要用 JSON 描述，而不是直接保存 Vue 模板或 HTML？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：PageSchema 数据结构设计。**考察点**：协议抽象、取舍。

**基础回答**：PageSchema 是描述页面结构和行为的纯数据协议。JSON 易持久化、传输、比较和迁移，能同时给设计器、运行态、后端和导出器消费；Vue 模板/实例绑定运行时与执行环境，不适合作为长期可演进配置。

**进阶回答**：协议只暴露受控业务属性，如字段类型、`prop`、可见位、数据源和图表维度；渲染器再映射到底层组件，避免持久化任意代码造成兼容和安全问题。

**项目业务分析**：`normalizePageSchema` 产出字段、table、formDialog、datasource、charts、metrics 等统一结构，`codeExporter.js` 以其生成 JSON/模板/SFC。

**高频追问**：①JSON 缺点？表达复杂行为弱，需要事件协议。②为什么不存 HTML？不能安全表达交互和组件状态。③如何扩展？schemaVersion+默认化+白名单字段。

**回答误区**：把 JSON 说成天然安全；忽略渲染器与契约版本。

### P0-03
**问题**：结合仓库说说 PageSchema 的页面级、字段级结构，以及 `id` 与 `prop` 的区别。

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：字段定义、字段类型与属性。**考察点**：模型设计、引用关系。

**基础回答**：页面级放标题、数据源、动作、表格、弹窗、查询、指标和图表；字段级放 `id/label/prop/type`、必填、三处可见性、选项和控件属性。`id` 是编辑器节点身份和 Vue key，`prop` 是记录/表单/查询的数据键，两者语义不同且都要唯一。

**进阶回答**：图表、指标、查询用 `prop` 建立跨配置引用；改 prop 需要同步引用或拦截。`getPageSchemaValidationErrors` 会检查重复 id/prop，以及查询/图表/指标引用是否合法。

**项目业务分析**：前端校验见 `pageSchema.js:103-188`，后端有对应校验，防止只在浏览器通过的脏协议被持久化。

**高频追问**：①为什么 id 不能用 prop？展示数据键可改，节点身份应稳定。②复制字段？生成新 id，处理 prop 冲突。③删除字段？处理其查询/图表引用。

**回答误区**：认为 id 只用于 DOM；漏掉引用完整性。

### P0-04
**问题**：简历中的“三态可见性”在当前项目怎样实现？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：字段三态可见性。**考察点**：简历真实性、配置到渲染。

**基础回答**：当前代码不是一个值为三态的枚举，而是 `searchable`、`tableVisible`、`formVisible` 三个布尔配置，分别控制查询表单、表格列和编辑表单。这使同一字段可在不同区域独立出现。

**进阶回答**：字段类型配置和 `getFieldsByUsage` 派生出各区域字段；修改结构性可见位会触发 `syncModels`，避免遗留无效模型键。

**项目业务分析**：`useDesignerSchemaEditor.js` 把三个可见位列为结构性属性；校验要求它们若存在必须是 boolean。简历中“三态”可如实解释为“三个使用域”。

**高频追问**：①能否改为数组？可以但迁移成本高。②隐藏是否等于不可编辑？运行端还须后端校验。③默认值？由字段标准化配置提供。

**回答误区**：说成 CSS 隐藏；把三个布尔说成互斥。

### P0-05
**问题**：你们为什么要有 `schemaVersion`，迁移为何采用逐版本 while 循环？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：Schema 版本迁移。**考察点**：兼容性、演进。

**基础回答**：持久化页面会比代码旧，`schemaVersion` 标识协议版本。逐版本迁移把每一次字段变化写成可测试的小步骤；while 从旧版本连续走到当前版本，避免直接跳版本漏掉中间语义。

**进阶回答**：迁移应保持幂等、尽量不丢数据，并在迁移后设置当前版本。仓库 v1→v6 逐步补 metrics、entity/templateKey、queries/actions/charts，同时兼容 `api` 与 `datasource` 双字段。

**项目业务分析**：前端 `migratePageSchema` 与后端 `migrate_page_schema` 都用 `while (version < SCHEMA_VERSION)`；这是前后端契约一致性的关键。

**高频追问**：①未来版本 schema 怎么办？拒绝或只做向前兼容。②为何不一次大迁移？难定位语义损失。③如何测试？每个历史 fixture 断言迁移结果。

**回答误区**：只说“加版本号”；没说明旧字段兼容与双端同步。

### P0-06
**问题**：`normalizePageSchema` 和 `validatePageSchema` 分别做什么？顺序如何安排？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：归一化、合法性校验。**考察点**：容错边界。

**基础回答**：归一化把缺省、旧字段和弱类型输入补成可渲染的标准结构；校验检查协议是否违反业务约束，例如重复 id/prop、无效 type、错误引用。加载时先迁移归一化保证不白屏；保存/发布前校验阻止无效配置。

**进阶回答**：不能用归一化“悄悄修掉”所有数据错误，否则编辑者不知道配置错了。对外部输入可先做结构迁移/默认化，再反馈校验错误；服务端必须最终裁决。

**项目业务分析**：`pageSchema.js:190-239` 将迁移、默认 schema、字段标准化合并；`PageDesigner.vue:573-577` 保存前调用前端/后端 contract 校验。

**高频追问**：①非法 type 怎么办？归一化为受支持默认/校验报错取决入口。②为何后端也校验？不能信任前端。③如何提示？按路径返回可定位错误。

**回答误区**：把 normalize 等同 validate；宣称所有非法数据都能自动修复。

### P0-07
**问题**：Schema 如何转成真实 Vue 控件？`<component :is>` 和组件映射表各自负责什么？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：组件映射表、动态组件。**考察点**：渲染机制、白名单。

**基础回答**：动态组件负责按“已解析出的组件对象”渲染；映射表负责把受控配置名转换为 Element Plus 组件。二者结合让 schema 类型映射到控件，同时不允许 schema 指定任意组件。

**进阶回答**：`FieldControl.vue` 先由字段 type 得到 form/search control 配置，再从 `componentMap` 取组件，未命中回退 `ElInput`；props 和 slot 也按类型受控分支处理。

**项目业务分析**：证据见 `renderer/FieldControl.vue:1-126`，不是全局随意 `resolveComponent(schema.component)`。

**高频追问**：①为何不 if/else？映射便于扩展与测试。②不存在类型？回退并在保存前校验。③怎么传事件？`defineEmits` 转发 update/enter。

**回答误区**：把映射表说成动态组件本身；允许后端传任意组件名。

### P0-08
**问题**：动态控件如何处理 props、options 和双向绑定？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：Schema 驱动页面渲染。**考察点**：Vue 数据流、组件封装。

**基础回答**：渲染器把 schema 转为受控的 `controlProps`，再用 `v-bind` 传入。它用 computed getter/setter 把 `modelValue` 与 `update:modelValue` 封装成 `v-model`；下拉等选项由标准化 options 渲染。

**进阶回答**：不是把 Schema 原样 spread 给 Element Plus，而是只开放 placeholder、范围、日期格式、多选等业务白名单；关联字段优先使用异步补齐的 `relationOptions`。

**项目业务分析**：`FieldControl.vue:94-126` 是 value 与 props 适配层；选项 key/value 取 `String(option.value)`。

**高频追问**：①为什么 option value 唯一？选择状态、key 和回写需稳定。②如何支持复杂事件？定义事件协议并受控映射。③嵌套？由容器 renderer 递归处理，当前字段控件未确认通用嵌套。

**回答误区**：原样暴露底层全部 props；把响应式说成复制 schema。

### P0-09
**问题**：设计器的物料区、画布区、属性面板怎样分工，完整拖拽链路是什么？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：物料区、画布区、属性面板、vuedraggable。**考察点**：交互架构、状态流。

**基础回答**：物料区只展示可添加类型并提供拖拽源；画布按 schema 渲染各区域并接收 drop；属性面板只编辑当前选中节点。drop 后由编辑 composable 生成字段节点、加入 `pageSchema.fields`、更新选中项并提交历史，因此画布立即响应。

**进阶回答**：vuedraggable 的 clone 只复制物料描述；真正字段由 `createDroppedField` 创建，避免把物料模板或拖拽临时对象直接复用进 schema。

**项目业务分析**：`DesignerMaterialPanel.vue` 使用 `Draggable`、`cloneMaterialItem`；`DesignerCanvas.vue` 的 drop event 回传；`useDesignerSchemaEditor.js:75-94` 统一落库前状态变更。

**高频追问**：①点击添加？复用 `addField`。②排序？`handleFieldSort` 提交快照。③跨区域？当前 search/table/form 作为 drop area。

**回答误区**：说 vuedraggable 自动生成业务 schema；忽略 clone 与唯一身份。

### P0-10
**问题**：为什么新组件不能直接复用物料模板对象？唯一 ID 如何产生？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：拖拽组件、配置编辑。**考察点**：引用副作用、数据身份。

**基础回答**：直接复用会使多个实例共享同一对象，编辑一个会污染所有物料或实例。物料只能作为模板，新增节点必须创建新对象、生成唯一 id 和唯一 prop。

**进阶回答**：当前 `createDroppedField(type, area, pageSchema.fields)` 接收已有字段以规避冲突；`normalizeEditableFieldProp` 在编辑时二次规范化 prop。生产级可用 UUID/雪花 ID，不能只依赖高并发下可能碰撞的时间戳。

**项目业务分析**：物料 clone 使用时间戳临时 id；真实字段由 drop schema 工厂创建，校验会拒绝重复 id/prop。

**高频追问**：①复制字段？新 id+去重 prop+处理引用。②为何深拷贝？隔离嵌套 options/属性。③删除后 id 可重用吗？不建议。

**回答误区**：把 `Date.now()` 当成绝对全局唯一；忽略 prop 冲突。

### P0-11
**问题**：当前选中字段为什么保存 `selectedFieldId`，而不是直接保存字段对象？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：当前选中组件、属性面板。**考察点**：状态一致性。

**基础回答**：保存 ID 是保存稳定引用，字段对象可从当前 schema 通过 computed 派生。替换 schema、撤销重做或排序后，对象引用可能失效，ID 更容易校正和序列化。

**进阶回答**：删除时按原索引选择前一个字段；`syncSelectionAfterSchema` 在 replace/undo 后检查字段、指标、图表 ID 是否仍存在，防止属性面板指向已删除对象。

**项目业务分析**：`useDesignerSchemaEditor.js:20-31,145-153,263-280` 已实现上述策略。

**高频追问**：①高亮怎么做？比较 selectedFieldId。②空选择？面板显示页面配置。③Pinia 中同理吗？是，保存 ID 更稳。

**回答误区**：只说“性能好”；没有讲 schema 替换导致的陈旧引用。

### P0-12
**问题**：属性面板改一个字段配置后，画布为什么会实时更新？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：reactive、computed、实时渲染。**考察点**：Vue 响应式数据流。

**基础回答**：PageSchema 是 reactive 对象，属性面板通过 action 对当前字段做受控 `Object.assign`；画布和 renderer 的 computed 读取同一对象依赖，Vue 追踪到变更后重新计算并更新相关组件。

**进阶回答**：结构性变更如 prop/type/可见性会同步模型；普通输入可先不频繁提交历史，减少快照开销。不要用深拷贝整个 schema 来“触发更新”。

**项目业务分析**：`applyFieldPatch` 区分结构性属性与 commit；`FieldControl`、画布均由 schema computed 派生。

**高频追问**：①reactive 和 ref？对象整体 reactive，独立标量如 selected ID 用 ref。②解构风险？直接解构 reactive 属性会失去响应式连接。③解决？`toRef/toRefs` 或保持对象访问。

**回答误区**：说 Vue 自动深拷贝；把 computed 当作事件监听。

### P0-13
**问题**：为什么要用 Composable？`usePageSchema` 与普通工具函数有什么区别？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：Vue 3 Composable。**考察点**：模块边界、复用。

**基础回答**：Composable 封装与 Vue 响应式生命周期相关的状态和行为；普通工具函数应保持纯计算。`usePageSchema` 管理加载、替换、离线回退和 schema reactive 状态，适合设计器和预览复用；schema normalize/clone 则是纯工具。

**进阶回答**：每次调用 `usePageSchema` 都新建一套局部状态，所以设计器与预览不意外共享草稿；若模块顶层声明 reactive 才会变单例。

**项目业务分析**：`usePageSchema.js` 每次函数调用创建 pageSchema/ref；`useDesignerSchemaEditor` 只关心编辑操作和选择态。

**高频追问**：①和 Pinia 边界？跨页面共享/全局实体用 Store，本页工作流用 composable。②预览可改原 schema 吗？不应直接改编辑源。③如何测试？传入 stub 函数，测 action 与状态。

**回答误区**：把所有复用逻辑都叫 composable；误称多次调用必共享状态。

### P0-14
**问题**：当前项目实际如何使用 Pinia？如果你按简历设计，会把哪些状态放 Store？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：Pinia 状态管理。**考察点**：真实性、状态分层。

**基础回答**：当前仓库只确认 `counter.js` 示例 Store，PageSchema 编辑实际由 composable 管理，不能声称已用 Pinia 管理。若扩展，项目列表、当前项目/页面路由级上下文可放 Pinia；一次编辑会话的 schema、选中 ID 和临时面板状态更适合页面 Composable，避免全局污染。

**进阶回答**：Store action 应封装 add/remove/update，getter 通过 selectedId 找字段；多页面同时编辑用 pageId 为键隔离，或每个路由实例持有局部会话。

**项目业务分析**：`stores/counter.js` 是唯一明确 Pinia 证据；这是必须主动说明的源码边界。

**高频追问**：①嵌套修改响应吗？Pinia state 本身是响应式，但要控制 action 边界。②全部放 Store？会有脏会话与内存问题。③持久化？只持久化明确需要恢复的草稿。

**回答误区**：把简历技术栈当源码事实；说 Pinia 天然解决撤销重做。

### P0-15
**问题**：设计器与预览页如何复用 PageSchema，编辑态和运行态又如何隔离？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：设计器和预览页复用协议/renderer。**考察点**：复用边界、所见即所得。

**基础回答**：两者复用同一协议、字段渲染器、模型/CRUD 逻辑，所以配置语义一致；编辑态额外包裹选中、高亮、drop catcher 和属性面板事件，运行态只保留真实交互，不能把设计器 overlay 混进业务 schema。

**进阶回答**：共享的是 renderer 内核与输入 contract，不是整页模板。编辑态可传 mode/slots/adapters 扩展，运行态从草稿或发布版本加载，避免预览直接污染原编辑对象。

**项目业务分析**：`PageDesigner.vue` 与 `Preview.vue` 都用 `usePageSchema`、字段 renderer；前者组合 `DesignerCanvas`，后者按 `draft/published` 加载。

**高频追问**：①为什么不重写预览？会产生语义漂移。②复用过度问题？组件出现大量 mode 分支。③如何验一致？同一 fixture 快照/端到端检查。

**回答误区**：说两个页面“完全一样”；忽略发布态。

### P0-16
**问题**：数据源、表格、弹窗和图表配置如何在同一协议中统一，又不相互耦合？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：数据源、表格、弹窗、图表配置。**考察点**：分层建模。

**基础回答**：它们都挂在页面级 schema，但按领域分块：datasource 描述数据能力，table/formDialog 描述布局与交互，charts/metrics 描述基于字段 `prop` 的统计视图。字段是共享数据字典，配置通过 prop 引用而非复制字段定义。

**进阶回答**：校验可根据字段类型限制图表 measure 必须数值、recent 指标必须日期；运行端按数据源能力收敛 create/update/delete。

**项目业务分析**：`validateChart/validateMetric` 做引用及类型检查；`useRuntimeCrud.js` 计算 datasource capabilities；`ChartRenderer.vue` 接收聚合结果。

**高频追问**：①REST 与 runtime？当前支持两种 mode。②图表为何不存原始数据？数据应来自运行 records。③弹窗字段？按 formVisible 派生。

**回答误区**：把所有配置塞进字段；让图表持久化易过期统计数据。

### P0-17
**问题**：Schema 如何持久化、发布、回滚和代码导出？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：后端持久化、代码导出。**考察点**：端到端闭环。

**基础回答**：前端保存前校验 schema，后端以 JSON 持久化并管理页面版本；预览可加载草稿或已发布版本；导出器先标准化，再生成 schema JSON、模板 JSON 和 Vue SFC。导出物和运行态必须共享同一协议。

**进阶回答**：发布应把可回滚的不可变版本与草稿区分；导出要限制为受支持组件/属性并用 fixture 测试，而不是把任意用户表达式写入 SFC。

**项目业务分析**：后端有 `page_version_service.py`；前端 `codeExporter.js:1-23` 在各导出入口先 normalize；README 明确页面保存、发布、版本回滚。

**高频追问**：①导出正确性如何测？fixture、生成代码语法/构建检查。②保存失败？保留 dirty 状态和错误信息。③回滚后选择态？重置历史并校正 selection。

**回答误区**：把“可导出”说成无损生成所有 Vue 能力；不区分草稿/发布。

### P0-18
**问题**：拖拽排序如何同步到 Schema，撤销重做又如何实现？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：基础排序和配置编辑。**考察点**：操作历史、一致性。

**基础回答**：排序改变字段数组的顺序，数组就是 schema 的显示顺序来源；操作后提交 schema 快照。撤销从 past 弹出当前快照放到 future，重做反向恢复，并用 replaceSchema 整体替换后校正选中项。

**进阶回答**：当前是最多 50 条的全量 JSON 快照，简单可靠但大 schema 有内存/序列化成本；规模更大时可合并输入、用命令/patch 或结构化 diff。

**项目业务分析**：`useSchemaHistory.js` 中 `HISTORY_LIMIT=50`，`useDesignerSchemaEditor` 调用 commit、undo、redo。

**高频追问**：①为何 clone？快照不能与 reactive 对象共享引用。②连续输入如何处理？防抖/失焦合并。③服务器版本等于 undo 吗？不是，本地历史和发布版本不同。

**回答误区**：说 vuedraggable 自带业务撤销；不提内存代价。

### P0-19
**问题**：如何处理非法 Schema 或后端不可用，避免设计器/预览白屏？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：校验、运行态页面渲染。**考察点**：可靠性、降级。

**基础回答**：加载后先走迁移和归一化，保存/发布前展示校验问题；组件映射未命中走受控回退。获取 schema 失败时，项目加载默认 schema，并记录 offline/error 状态，让页面仍可操作和提示。

**进阶回答**：回退不能掩盖数据丢失：要保留错误原因、禁止误发布；服务端仍要校验数据写入和记录编辑字段，避免客户端绕过。

**项目业务分析**：`usePageSchema.js:28-45` catch 中 `loadFallbackSchema`；README 要求后端不可用合理兜底；后端 `validate_record_data` 也限制可编辑字段。

**高频追问**：①未知组件？告警/占位+拒绝发布。②引用已删字段？校验路径错误。③网络重试？可在 API 层限定重试与幂等。

**回答误区**：只靠 try/catch；把默认 schema 当成用户数据。

### P0-20
**问题**：为什么 options 的 value 必须唯一？关联选项又如何加载？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：字段属性、数据源。**考察点**：数据一致性。

**基础回答**：value 是表单提交、回显、key 和筛选的真实值，重复会导致选择无法区分和渲染 key 不稳定，因此每个选项必须唯一；label 可展示重复但通常也应清晰。关联字段加载 schema 后异步请求 reference options。

**进阶回答**：options 先标准化，再由 FieldControl 优先使用 relationOptions；请求失败设为空数组，避免控件崩溃，同时给用户可理解提示。

**项目业务分析**：`pageSchema.js` 和后端校验都检查 options value；`usePageSchema.js:76-87` 并发补齐 relationOptions。

**高频追问**：①值类型？协议统一比较时需显式转换策略。②动态选项缓存？按实体/字段缓存和失效。③多选？数组每项也校验合法。

**回答误区**：只为了 Vue key 唯一；忘了后端值校验。

### P0-21
**问题**：大 PageSchema 下，你会先关注哪些响应式性能问题？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：reactive、实时渲染。**考察点**：性能意识。

**基础回答**：关注大对象深度监听、每次输入全量 clone/JSON stringify、全页依赖同一 computed 导致的无效更新，以及图表重复聚合。优先按区域/字段做精确 computed，输入和保存做节流或防抖，历史提交合并。

**进阶回答**：当前历史对比用 JSON.stringify 且全量快照，schema 变大时是明确优化点；不能宣称已优化。可以引入脏路径、命令栈、局部 patch 和图表缓存，并以 profiler 证据决定。

**项目业务分析**：`useSchemaHistory.js` 证实每次 commit clone/序列化比较；当前未确认全 schema deep watch。

**高频追问**：①为何不 deep watch 保存？每个嵌套变更都触发。②如何避免全控件更新？拆组件、稳定 props/key。③ECharts？当前未见实例生命周期实现。

**回答误区**：编造性能指标；看到 reactive 就断言全部重渲染。

### P0-22
**问题**：`watch` 与 `computed` 在这个项目应怎样选择？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：computed、实时渲染。**考察点**：响应式原理。

**基础回答**：纯派生展示用 computed，例如 selectedField、可搜索字段、图表视图模型；有副作用的加载、保存、路由切换、请求才用 watch。不要用 watch 去维护本可由 schema 直接计算出来的重复状态。

**进阶回答**：computed 有缓存且应无副作用；watch 要限定源而非深监控整个 schema，避免连锁请求。属性面板输入可在失焦/防抖后触发保存，而画布更新仍直接靠响应式。

**项目业务分析**：`useDesignerSchemaEditor` 用 computed 找 selectedField；`Preview.vue/PageDesigner.vue` 使用 watch 响应路由/加载场景。

**高频追问**：①watchEffect？适合自动收集依赖的副作用但边界更隐式。②toRef？将对象字段保留为 ref。③computed 能异步吗？不应放异步请求。

**回答误区**：把 computed 说成监听器；对整个 schema 无脑 deep watch。

### P0-23
**问题**：页面中的 schema、模型、运行时 CRUD 状态如何分层？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：统一 Schema 驱动、Composable。**考察点**：状态边界。

**基础回答**：Schema 是可持久化配置；searchModel/dialogForm/pagination/records 是运行时状态，不应写回 schema；renderer 只消费配置和模型。这样保存配置不会把用户临时搜索条件或表格数据固化进去。

**进阶回答**：结构性 schema 变化时要同步/清理模型键，避免删字段后残留参数；运行端数据源能力决定 CRUD 操作是否可用。

**项目业务分析**：`useSchemaModels.js` reactive 管理模型；`useRuntimeCrud.js` 管理 records/pagination；`useDesignerSchemaEditor` 在 structural patch 后 `syncModels`。

**高频追问**：①默认值属于谁？字段 schema，初始化时写入模型。②草稿预览？加载草稿 schema，新建运行模型。③缓存搜索？另设会话存储，不能污染 schema。

**回答误区**：把 records 放进 PageSchema；混淆配置状态和 UI 状态。

### P0-24
**问题**：图表 Schema 如何与 ECharts/统计数据结合，如何保证字段配置合法？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：图表配置、ECharts。**考察点**：数据转换、类型约束。

**基础回答**：图表 schema 只描述类型、维度 `dimension`、聚合方式 `metric`、数值字段 `measureField`、limit 和排序；运行时从 records 聚合为视图数据，再由 ChartRenderer 转为配置。校验要求维度存在，sum/average 等只能引用数值字段。

**进阶回答**：这种做法隔离业务统计与渲染库，换图表库成本更小。图表实例创建、resize、dispose 是必要的生命周期问题，但当前源码未确认直接 ECharts 实例管理。

**项目业务分析**：`pageSchema.js` 的 `validateChart`、`chartAggregator.js`、`ChartRenderer.vue` 和 `buildChartViewModels` 形成链路。

**高频追问**：①为什么不存 option？会暴露底层且难迁移。②空数据？返回空态。③大数据？服务端聚合/分页，避免前端全量。

**回答误区**：把 ECharts option 当 PageSchema；说已有 dispose 而无源码证据。

### P0-25
**问题**：如果删除字段、改字段 type 或 prop，如何避免旧页面和引用配置失效？

**优先级 / 高频程度**：P0 / ★★★★★。**对应简历内容**：Schema 校验、归一化、版本迁移。**考察点**：变更影响分析。

**基础回答**：字段变更不是局部 UI 操作，它会影响查询、表格、表单、图表指标和模型。当前会对 type 重建规范化字段，对 prop 去重，并在保存前校验引用；删除后应提示并同步删除/禁用依赖项，至少不能发布失效 schema。

**进阶回答**：更稳妥的方案是 field id 用作内部引用、prop 作为可迁移的数据键，并维护 rename mapping；删除采用软删除/迁移策略，保留历史版本可回滚。

**项目业务分析**：当前校验能检测 queries/charts/metrics 指向不存在 prop；`handleFieldTypeChange` 使用 normalizeField 重建字段。自动级联处理旧引用未在源码中确认。

**高频追问**：①旧组件不支持？保留 legacy renderer 或迁移。②重命名 prop？迁移引用和后端字段契约。③如何提示？按引用路径列出受影响项。

**回答误区**：只删数组元素；忽略已发布版本和运行数据。

## 3. P1 高频深入题（20 题）

### P1-01
**问题**：为什么组件映射表比大量 if/else 更适合低代码 renderer？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：组件映射表。**考察点**：可维护性。

**基础回答**：映射将“类型→实现”集中为声明式白名单，新增控件只扩展配置，避免散落条件分支；动态组件负责最终渲染，二者职责不同。

**进阶回答**：组件注册可包含 schema 默认值、属性 schema、renderer、校验器和导出器，形成物料定义；当前仅字段类型配置+FieldControl 映射，插件注册未确认。

**项目业务分析**：`componentMap` 在 `FieldControl.vue:71-83`，字段类型规则在 `schema/fieldTypes.js`。

**高频追问**：①工厂模式？可理解为受控工厂/注册表。②按需加载？可把映射值换成异步组件。③未知类型？回退+校验。

**回答误区**：说映射表自动处理所有 props/slots。

### P1-02
**问题**：为什么 renderer 不应承载大量业务状态？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：Schema 驱动渲染。**考察点**：职责边界。

**基础回答**：renderer 是 schema 到 UI 的解释层，应尽量纯；records、请求、分页、弹窗等状态由运行 Composable 管理，否则相同 renderer 在设计器和预览会产生难复用的隐式状态。

**进阶回答**：renderer 可接收 model、事件和 mode adapter；领域副作用从外层注入，便于测试 schema fixture→DOM 结果。

**项目业务分析**：FieldControl 只处理控件 value/props；`useRuntimeCrud.js` 承担 CRUD。

**高频追问**：①表单校验在哪？表单运行层。②设计态怎么不请求？使用演示/注入数据。③何时例外？局部 UI 状态。

**回答误区**：认为“无状态”是完全没有 ref。

### P1-03
**问题**：后端为何也要维护 Schema 归一化与校验，如何避免前后端规则漂移？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：持久化、迁移、校验。**考察点**：契约一致性。

**基础回答**：前端校验提升体验，后端校验保护数据边界；任何客户端都可能绕过浏览器。规则漂移通过同一版本、共同 fixture/contract API 和双端迁移测试控制。

**进阶回答**：长期可把 JSON Schema/IDL 作为单一来源，或服务端下发元数据；要权衡前端即时反馈与网络依赖。

**项目业务分析**：前端 `schemaContract.js` 调服务端 normalize/validate；后端 `schema_contract.py` 有同构规则，测试含 schema contract fixture。

**高频追问**：①谁最终裁决？服务端。②规则不同怎么办？阻止发布并修复 contract。③API 兼容？保留 legacy api 映射。

**回答误区**：认为复制两份代码就天然一致。

### P1-04
**问题**：属性面板频繁输入怎样避免产生大量历史和保存请求？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：属性实时更新。**考察点**：交互性能。

**基础回答**：画布可立即响应，但历史/持久化不必每个字符执行。输入期间更新局部字段，失焦、停顿防抖或明确提交时合并为一次 history/save。

**进阶回答**：使用操作会话记录初值/终值，结构性变更立即 commit，文本变更 debounce；保存需处理版本冲突和失败回退。当前编辑器支持 `commit` 控制，但自动防抖保存未确认。

**项目业务分析**：`applyFieldPatch` 根据 structural 与 options.commit 决定是否写 history；`useSchemaHistory` 是全量快照。

**高频追问**：①防抖多久？按体验/指标选择。②保存失败？保留 dirty 和重试。③撤销输入？以合并后的命令为单位。

**回答误区**：防抖画布渲染导致输入滞后；宣称已实现自动保存。

### P1-05
**问题**：深度监听整个 PageSchema 有什么风险？替代方案是什么？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：Vue 响应式。**考察点**：性能、依赖追踪。

**基础回答**：deep watch 会在任一嵌套字段变化时遍历/触发副作用，大 schema 中容易造成频繁序列化、保存和图表重算。优先在编辑 action 中显式标脏、精确 watch 页面 ID/数据源，显示内容用分区 computed。

**进阶回答**：若确需检测变更，可有节流的结构化 diff 或版本号；不要把 JSON.stringify 放在 render 链路。

**项目业务分析**：当前源码未确认对整个 schema 的 deep watch；历史 commit 的 stringify 是已有成本，应据此回答“风险与改进”。

**高频追问**：①watch flush？影响时机非根治。②shallowReactive？仅适合明确不可深追踪对象。③怎么测？Vue devtools/Performance 面板。

**回答误区**：说 deep watch 一定不能用。

### P1-06
**问题**：Schema 迁移如何保证幂等、可回滚和可观测？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：版本迁移。**考察点**：可靠性。

**基础回答**：同一版本输入重复迁移应得到同一结果；迁移前保存原 JSON/页面版本，失败保留原数据和错误；记录 pageId、源/目标版本和失败路径，便于排查。

**进阶回答**：每步只做一版到下一版，数据删除需先弃用再移除；迁移和 normalize 分开，测试每个历史版本 fixture。

**项目业务分析**：当前有逐步迁移和版本服务；迁移日志/失败恢复机制在源码中暂未确认。

**高频追问**：①遇到高版本？拒绝或降级只读。②迁移时机？读时迁移或发布时落盘。③如何回滚？版本快照而非逆向猜测。

**回答误区**：把 while 等同自动可回滚。

### P1-07
**问题**：当前设计器为什么既有 vuedraggable，又有原生 `dragstart`？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：vuedraggable、物料区。**考察点**：实现细节。

**基础回答**：字段物料使用 vuedraggable 的 clone/group/drop 管理列表交互；分析物料在 `DesignerMaterialPanel` 用原生 DataTransfer 传类型。两者服务对象不同，最终都应汇总为明确的 editor action。

**进阶回答**：混用要统一拖拽状态、可访问性和边界校验；跨浏览器 DataTransfer 数据不可作为可信 schema，仍需白名单创建。

**项目业务分析**：`DesignerMaterialPanel.vue` 的 `<Draggable>` 与 `startAnalyticsDrag` 可直接证明。

**高频追问**：①为什么 `sort:false`？物料库不应被拖动重排。②拖拽取消？不创建节点。③移动端？需替代输入方式。

**回答误区**：说全部拖拽都由 vuedraggable 完成。

### P1-08
**问题**：字段排序改变的是哪个数组？搜索、表格、表单为何能有不同顺序？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：组件基础排序。**考察点**：数据模型局限。

**基础回答**：当前字段统一存 `pageSchema.fields`，排序影响其基础顺序，再按可见性派生各区域显示。若业务需要三个区域独立排序，应在 schema 增加区域 order/fieldIds，而不能仅重排同一数组。

**进阶回答**：独立序列要校验引用不重复、删除清理，并考虑迁移旧 schema；不要从 DOM 顺序反推业务顺序。

**项目业务分析**：`moveField`、`handleFieldSort` 操作单一 fields 数组；当前独立区域排序暂未确认。

**高频追问**：①跨区移动？改可见位或区域序列。②表格固定列？另加 table 配置。③排序撤销？history 快照。

**回答误区**：说当前已支持三个独立布局顺序。

### P1-09
**问题**：数据源 capability 如何影响运行态按钮，为什么不只由 `actions` 决定？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：数据源、运行态渲染。**考察点**：权限/能力分离。

**基础回答**：actions 表示页面期望展示哪些操作，数据源 capability 表示后端实际允许什么能力；最终取交集，才能避免 schema 显示“新增”而只读数据源执行失败。

**进阶回答**：这不是 RBAC；真正权限还要服务端鉴权，前端禁用只改善体验。能力变化应影响菜单、批量操作和错误提示。

**项目业务分析**：`useRuntimeCrud.js:58-63` 计算 capabilities/readonly，`PageDesigner/Preview` 使用 `applyDatasourceCapabilityToActions`。

**高频追问**：①权限在哪？服务端最终控制。②REST 失败？提示并不乐观更新。③为何配置 action？支持页面级收敛。

**回答误区**：把按钮禁用当安全控制。

### P1-10
**问题**：如何测试 renderer、Schema 校验和迁移，而不是只测页面截图？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：Schema 协议、renderer。**考察点**：测试策略。

**基础回答**：用 schema fixture 测纯函数 normalize/validate/migrate，覆盖历史版本、重复 id/prop、错误引用和边界类型；挂载 FieldControl 测组件映射、v-model、options；再做设计器动作与预览流程集成测试。

**进阶回答**：前后端复用同一组 contract fixture；导出结果做快照+语法/构建验证，避免只测字符串包含。

**项目业务分析**：已有 `test/frontend/schema/*`、`renderer/FieldControl.test.js`、`composables/*` 及后端 `test_page_runtime_api.py`。

**高频追问**：①迁移断言什么？版本、默认字段、语义不丢失。②E2E？拖入—编辑—预览—发布。③mock 哪层？API 边界。

**回答误区**：只说“写单测”；没有 fixture。

### P1-11
**问题**：代码导出为什么必须先 normalize？导出器有哪些边界？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：代码导出。**考察点**：工程一致性。

**基础回答**：导出器不能假设输入完整，先 normalize 才能按稳定字段生成代码；它只应导出协议已支持的受控能力，复杂自定义逻辑需明确降级或扩展点。

**进阶回答**：生成 SFC 时需要转义、合法变量名、导入按需化、避免把不可信文本拼成可执行代码；生成后用 formatter/构建检查。

**项目业务分析**：`codeExporter.js:1-23` 每个入口都调用 normalize；更严格的安全转义策略未从源码确认。

**高频追问**：①导出与 renderer 漂移？共享 schema fixture。②自定义组件？需注册导出器。③导出 API？保存 datasource 配置而非密钥。

**回答误区**：认为 `JSON.stringify` 即可安全生成代码。

### P1-12
**问题**：如何在不污染运行态的前提下实现选中框、拖拽手柄和属性面板？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：设计器实时预览。**考察点**：编辑态隔离。

**基础回答**：把设计器能力放在 canvas wrapper/overlay 与局部 UI state，schema 只记录业务配置；运行 renderer 接收同一字段 schema，不接收 selectedId/dragging 等编辑状态。

**进阶回答**：可用 slots、render context 或 adapter 注入编辑装饰；谨防每个业务控件内写 `if (isEdit)` 导致模式分支爆炸。

**项目业务分析**：目录存在 `DesignerCanvas.vue`、`DesignerOverlays.vue`，选中 ID 位于 editor composable。

**高频追问**：①WYSIWYG 如何保证？共用核心 renderer。②导出会带选中框吗？不会。③预览交互？不应被拖拽截获。

**回答误区**：把 selectedId 保存进 PageSchema。

### P1-13
**问题**：为什么 `reactive` 对象不能随意解构？属性面板怎样安全传字段？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：Vue 3 响应式。**考察点**：响应式细节。

**基础回答**：直接解构 reactive 属性会拿到当时的普通值，失去对原 proxy 属性的追踪。属性面板可传整个 reactive 字段对象，或用 `toRef/toRefs` 创建保持连接的 ref；修改最好经 editor action。

**进阶回答**：props 解构同样要注意编译版本/`toRefs`；深层对象直接改虽响应式，但绕过 action 会漏历史、校验和模型同步。

**项目业务分析**：当前通过 `selectedField` computed 与 patch action 协作，未见把字段随意解构为普通变量。

**高频追问**：①ref 解构？`.value` 仍需保持。②readonly？可防子组件越权改。③为何 action？集中副作用。

**回答误区**：说 reactive 不能解构任何东西；忽略 toRef。

### P1-14
**问题**：如何防止频繁修改造成大量持久化请求？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：配置编辑、持久化。**考察点**：网络与一致性。

**基础回答**：UI 本地立即更新，持久化采用防抖自动保存或显式保存；携带 schema 版本/ETag，服务端做冲突检测，失败保持 dirty 并提示重试。不要每次 input 都请求。

**进阶回答**：请求取消、顺序号或最后写入保护可避免旧响应覆盖新编辑；发布前强制完整校验。自动保存、ETag 冲突处理当前源码中暂未确认。

**项目业务分析**：已确认 dirty/status 和本地 history；持久化防抖是合理扩展题。

**高频追问**：①断网？本地草稿+恢复提示。②多人编辑？服务端版本冲突。③保存与发布？保存草稿，发布创建版本。

**回答误区**：称已有自动保存；认为防抖解决并发冲突。

### P1-15
**问题**：如何处理表单字段的默认值、类型变化和残留模型值？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：字段属性、实时渲染。**考察点**：状态同步。

**基础回答**：默认值属于 field schema，运行模型初始化时按 prop 写入；字段删除、prop/type/可见性变更后重建或清理相关 model，避免把旧类型值提交给新控件。

**进阶回答**：type 转换应定义可迁移规则，如文本→number 解析失败清空并提示；不能盲目保留所有旧值。

**项目业务分析**：结构性字段 patch 后调用 `syncModels`；具体跨类型转换策略未确认。

**高频追问**：①查询模型呢？同样按 searchable 字段过滤。②多选默认？数组。③表单校验？依据 normalized field。

**回答误区**：只在 DOM 层清空，不更新模型。

### P1-16
**问题**：PageSchema 的 table、formDialog、actions 为什么不直接映射 Element Plus 全量属性？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：表格、弹窗配置。**考察点**：抽象边界。

**基础回答**：直接透传会把底层库 API 固化进协议，升级困难、校验面巨大且可能暴露不安全/无意义属性。协议应抽象后台业务真正需要的受控子集，再由 adapter 映射。

**进阶回答**：确有高级需求可提供 namespace 扩展/版本化 `uiProps` 白名单，不能接受任意对象直传。

**项目业务分析**：FieldControl 明确按字段类型构建 controlProps；page schema 采用 table/formDialog 分块。

**高频追问**：①如何升级 Element Plus？改 adapter。②自定义样式？主题 token/class 白名单。③何时直传？内部可信且短期原型。

**回答误区**：把“抽象”理解成完全不能扩展。

### P1-17
**问题**：图表切换或卸载时怎样防止内存泄漏？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：ECharts。**考察点**：生命周期、证据边界。

**基础回答**：若直接管理 ECharts 实例，应在 mounted 初始化、数据/尺寸变化更新、beforeUnmount dispose，并解绑 resize observer/listener；同一 DOM 复用实例而非反复 init。

**进阶回答**：大量图表可懒渲染、IntersectionObserver 暂停不可见图表、服务端聚合。当前仓库未确认直接 `echarts.init/dispose`，所以这是设计方案，不应称已实现。

**项目业务分析**：已确认 `ChartRenderer.vue` 和 chart aggregator；直接实例生命周期未在源码找到。

**高频追问**：①window resize？防抖后 resize。②keep-alive？activated/deactivated 处理。③数据很大？限流和后端聚合。

**回答误区**：没有证据就说“已 dispose”。

### P1-18
**问题**：如何设计嵌套组件和跨容器拖拽？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：拖拽能力。**考察点**：扩展设计。

**基础回答**：需要把 schema 从平铺 fields 演进为节点树，容器节点声明 `children` 和可接受物料类型；拖拽事件转换成“插入父节点/索引”的命令，校验循环嵌套、最大深度和不允许的类型。

**进阶回答**：节点 ID 仍稳定，prop 属于数据字段节点；布局树和字段定义可分层，避免每个容器都复制字段数据。当前项目主要是区域化字段拖放，通用嵌套未确认。

**项目业务分析**：`DesignerCanvas` 现有 search/table/form drop targets；无通用 children renderer 证据。

**高频追问**：①跨容器复制/移动？明确 clone/move 语义。②撤销？命令保存源/目标。③循环？parentId/树校验。

**回答误区**：把当前简单区域 drop 夸大为通用嵌套。

### P1-19
**问题**：预览页的草稿和发布态如何选择，为什么不能总读当前草稿？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：运行态页面、版本管理。**考察点**：发布一致性。

**基础回答**：草稿用于编辑者即时预览，发布态用于真实运行，应读取冻结的已发布 schema。总读草稿会让未验证改动影响最终用户，也无法回滚。

**进阶回答**：URL/路由明确 mode，服务端返回发布版本号；发布后可清缓存或以版本号作为缓存键。

**项目业务分析**：`Preview.vue:190-195` 以 query 的 `mode=draft` 决定 draft/published，`usePageSchema.loadSchema` 支持 `published`。

**高频追问**：①发布中编辑？草稿与版本分离。②回滚？指向旧版本。③缓存？版本化缓存键。

**回答误区**：将预览与生产运行混为一谈。

### P1-20
**问题**：如何让新增字段类型同时被设计器、校验、renderer、导出和后端正确支持？

**优先级 / 高频程度**：P1 / ★★★★☆。**对应简历内容**：字段类型、统一协议。**考察点**：变更闭环。

**基础回答**：先更新 schema 类型定义和默认值/normalize，再更新校验、物料面板、renderer 映射、运行/导出和前后端 contract，最后补 fixture 与迁移。不能只加一个前端组件。

**进阶回答**：建立物料注册表可把这些能力聚合；版本升级时为旧 schema 提供默认兼容或 migration。注册表插件化当前未确认。

**项目业务分析**：README 明确 Schema 语义变更必须同步检查默认 schema、设计器、运行态、后端、版本、导出和测试。

**高频追问**：①怎么灰度？按 schemaVersion/feature flag。②未知旧 type？legacy renderer/迁移。③测试最小集？unit+renderer+contract+export。

**回答误区**：只改 `componentMap`。

## 4. P2 进阶开放题（10 题）

### P2-01
**问题**：如果要把物料做成插件化，你会如何设计注册机制？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：组件映射表、物料区。**考察点**：开放架构。

**基础回答**：每个物料注册 type、版本、默认 schema、属性面板 schema、validator、renderer、导出器和能力声明；平台只消费统一注册接口。

**进阶回答**：插件加载需要签名/白名单、隔离样式与依赖版本，服务端保存 unknown type 的兼容策略。**项目业务分析**：当前为内置字段配置和映射表；插件机制暂未确认。

**高频追问**：①冲突？namespace。②懒加载？异步组件。③卸载插件？保留只读 legacy renderer。

**回答误区**：说当前已有第三方物料市场。

### P2-02
**问题**：如何为低代码平台加入权限控制，而不是只隐藏按钮？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：后台管理场景。**考察点**：安全边界。

**基础回答**：分页面/组件/字段/数据四层策略；前端依据权限渲染，后端在 Schema 读取、发布和 CRUD 接口做最终鉴权与字段过滤。

**进阶回答**：Schema 可声明 permission key，但不能包含可伪造的结论；数据权限要下推查询。**项目业务分析**：当前 datasource capability 不等同 RBAC；完整权限系统暂未确认。

**高频追问**：①字段隐藏安全吗？不安全。②发布权限？独立权限。③缓存？按用户/租户隔离。

**回答误区**：把 `v-if` 当鉴权。

### P2-03
**问题**：如果支持接口联动和数据源配置，你会怎样设计而不把请求代码写进 Schema？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：数据源抽象。**考察点**：声明式交互。

**基础回答**：schema 声明受控 endpoint、参数映射、触发时机和响应路径；运行时由数据源执行器解析，白名单限制域名/方法/变量来源。

**进阶回答**：联动形成依赖图，检测循环、取消过期请求、缓存 options。**项目业务分析**：当前支持 runtime/rest datasource 和 relationOptions；通用联动引擎暂未确认。

**高频追问**：①级联选择？上游值变更触发下游刷新。②错误？独立状态。③安全？服务端代理/allowlist。

**回答误区**：允许 Schema 写任意 fetch 代码。

### P2-04
**问题**：怎样支持条件渲染、变量和表达式，又避免执行不可信脚本？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：Schema 扩展。**考察点**：安全设计。

**基础回答**：使用受限表达式 DSL/AST，只开放字段值、比较、逻辑运算和白名单函数，由解释器求值；禁止 `eval`、`new Function` 和任意全局访问。

**进阶回答**：表达式要有类型检查、超时/复杂度限制、依赖收集和服务端同构执行。**项目业务分析**：当前未确认表达式引擎，不能说已支持。

**高频追问**：①为何不模板字符串？会变成代码注入。②如何调试？表达式路径/trace。③循环依赖？构图检测。

**回答误区**：把 JSON 天然安全延伸到表达式安全。

### P2-05
**问题**：多人同时编辑一个页面，如何设计冲突处理？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：持久化、版本。**考察点**：协作系统。

**基础回答**：先用乐观并发控制：保存携带 revision，服务端不一致返回冲突；客户端提示刷新、比较或合并。高实时需求再考虑操作级 OT/CRDT。

**进阶回答**：schema 是树/数组结构，操作需以 stable id 定位，不能只按数组下标；presence、锁定和审计也要设计。**项目业务分析**：当前未确认协同编辑。

**高频追问**：①两个改同一属性？最后写入或人工合并。②数组排序？操作 transform。③发布冲突？基于 revision 拒绝。

**回答误区**：说 WebSocket 就自动协同。

### P2-06
**问题**：现有快照撤销重做如何演进为可扩展历史系统？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：设计器操作。**考察点**：数据结构。

**基础回答**：当前全量快照适合中小 schema；大规模时用命令模式或 JSON Patch，命令记录 do/undo 和受影响 node id，输入操作合并。

**进阶回答**：历史与发布版本分层，本地 history 可丢弃，服务端版本需不可变可审计。**项目业务分析**：当前 `useSchemaHistory` 是 50 条快照，命令/patch 未确认。

**高频追问**：①复杂操作反向怎么做？记录反操作或前值。②内存？压缩/检查点。③协同？操作日志。

**回答误区**：认为 snapshot 天然可扩展。

### P2-07
**问题**：如何支持 Schema diff、灰度发布和回滚？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：版本管理、发布。**考察点**：工程化。

**基础回答**：版本以不可变 schema 快照存储，diff 按 stable id/prop 比较新增、删除、属性和顺序；发布将流量指向版本，灰度按人群/租户规则，回滚是切回旧版本而非改写历史。

**进阶回答**：数据源/接口变更需要兼容窗口和预发布校验。**项目业务分析**：仓库有发布、版本服务与回滚目标；diff/灰度实现暂未确认。

**高频追问**：①diff 数组？按 id 而非 index。②回滚数据？页面配置与业务数据分开。③审计？记录操作者和原因。

**回答误区**：把 git diff 直接当业务 diff。

### P2-08
**问题**：怎样将当前平台扩展为企业级多租户系统？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：项目整体。**考察点**：系统设计。

**基础回答**：租户是数据和权限边界，项目、页面、版本、数据源凭据都带 tenantId 并服务端过滤；物料、主题和发布策略可分租户配置。

**进阶回答**：要考虑配额、审计、密钥托管、跨租户缓存隔离和可观测性。**项目业务分析**：当前企业多租户未确认。

**高频追问**：①全局物料？平台级只读+租户扩展。②数据源密钥？服务端密管。③迁移？按租户批次。

**回答误区**：只在前端路由带 tenantId。

### P2-09
**问题**：如果支持第三方组件，如何保证协议和导出结果正确？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：组件映射、代码导出。**考察点**：生态扩展。

**基础回答**：第三方物料必须同时提供 renderer、schema validator、属性面板定义、migration 和 exporter；缺一个就只允许预览或拒绝发布/导出。

**进阶回答**：用 capability matrix 在发布前检查运行端/导出端是否支持。**项目业务分析**：当前第三方物料未确认。

**高频追问**：①版本升级？plugin version+migration。②样式冲突？隔离/约束。③SSR？声明兼容性。

**回答误区**：只注册 Vue 组件就称插件完成。

### P2-10
**问题**：企业级低代码平台最重要的可观测性指标有哪些？

**优先级 / 高频程度**：P2 / ★★★☆☆。**对应简历内容**：发布、数据源、运行态。**考察点**：工程运营。

**基础回答**：关注 schema 校验/迁移失败率、保存发布耗时、渲染错误、数据源请求成功率与耗时、导出失败、版本回滚和编辑器性能；日志要携带 page/version/tenant，不记录敏感数据。

**进阶回答**：按版本聚合异常，灰度阈值自动暂停发布。**项目业务分析**：完整可观测体系暂未确认。

**高频追问**：①前端错误？error boundary/上报。②采样？按错误与版本。③隐私？脱敏、最小化采集。

**回答误区**：只说“打 console.log”。

## 5. 简历必问题清单（15 题）

按优先训练顺序：P0-01 项目介绍；P0-02 JSON/PageSchema；P0-03 id 与 prop；P0-04 三处可见性；P0-05 schemaVersion/迁移；P0-06 normalize/validate；P0-07 动态组件与映射表；P0-08 props/v-model；P0-09 三栏设计器拖拽；P0-10 clone/唯一 ID；P0-11 selectedId；P0-12 reactive 实时更新；P0-13 Composable；P0-14 Pinia 事实边界；P0-15 编辑态/运行态复用。

## 6. PageSchema 专项题单（15 题）

P0-02、P0-03、P0-04、P0-05、P0-06、P0-16、P0-17、P0-20、P0-25、P1-03、P1-06、P1-11、P1-16、P1-20、P2-07。复习时优先逐题指向 `pageSchema.js` 与后端 `schema_contract.py` 的同构实现。

## 7. Vue 3 响应式专项题单（10 题）

P0-11（selectedId+computed）、P0-12（属性到画布）、P0-13（Composable 实例）、P0-21（大 schema 性能）、P0-22（watch/computed）、P0-23（配置与运行状态）、P1-04（输入合并）、P1-05（避免 deep watch）、P1-13（解构/toRef）、P1-15（模型同步）。

## 8. 可视化设计器专项题单（10 题）

P0-09、P0-10、P0-11、P0-12、P0-18、P1-04、P1-07、P1-08、P1-12、P1-18。建议手画“物料模板 → drop → createDroppedField → fields → selectedFieldId → PropertyPanel → renderer”的链路。

## 9. 设计思想专项题单（10 题）

P0-02（JSON 而非模板）、P0-05（逐版迁移）、P0-06（归一化与校验）、P0-07（受控映射）、P0-15（复用边界）、P1-02（renderer 无业务状态）、P1-09（能力与 action）、P1-16（不透传库属性）、P2-01（插件化）、P2-04（安全表达式）。

## 10. 压力面试链路：PageSchema 驱动渲染（15 轮）

| 轮次 | 连续追问 | 考察意图 / 回答切入 |
|---|---|---|
| 1 | 请完整介绍 PageSchema 驱动渲染。 | 从后台 CRUD 重复开发切入；schema 是设计、运行、持久化、导出的共同协议。 |
| 2 | 一份 schema 至少包含什么？ | 页面级 datasource/table/formDialog/actions/charts；字段级 id/prop/type/可见位/options。 |
| 3 | 为什么 id 和 prop 分开？ | 节点身份/引用稳定性与业务数据键分离；都校验唯一。 |
| 4 | 你说三态可见性，具体是什么？ | 如实说当前是 searchable/tableVisible/formVisible 三个独立布尔位。 |
| 5 | JSON 怎么变成组件？ | 字段类型→类型配置→受控 componentMap→`<component :is>`。 |
| 6 | 动态组件的 props 和 v-model 怎么办？ | `controlProps` 白名单；computed get/set 转发 update:modelValue。 |
| 7 | 未知 component/type 会怎样？ | 保存前 validate；renderer 受控回退，不能动态加载任意名称。 |
| 8 | 设计器拖入控件后改了什么？ | drop 捕获类型→createDroppedField→push fields→selectedId→历史提交。 |
| 9 | 属性面板改 label 为什么立刻生效？ | reactive schema 被 action 修改，canvas/renderer computed 依赖更新。 |
| 10 | 编辑态和运行态为何能一致？ | 共用协议与 renderer；编辑装饰放 wrapper/overlay，不污染运行态。 |
| 11 | schema 旧版本怎么办？ | schemaVersion，while 逐版迁移，前后端同构，兼容 api/datasource。 |
| 12 | normalize 与 validate 先后？ | 读入迁移/默认化以可渲染；保存/发布严格校验，后端最终裁决。 |
| 13 | 复杂 schema 性能会卡在哪里？ | deep watch、全量 clone/stringify 历史、图表聚合；分区 computed/合并提交/按需聚合。 |
| 14 | 删除字段会造成什么问题？ | 查询、图表、指标和模型引用失效；当前校验拦截，进一步应做影响分析/迁移。 |
| 15 | 如何扩展为企业级平台？ | 物料注册、权限、声明式数据源、受限表达式、版本/灰度、协同；明确这些是设计方案而非现状。 |

## 训练提示

先背清 P0-01 至 P0-15，再打开对应源码逐段复述。所有“现有实现”使用“当前仓库已确认”；所有 P2 和未确认项使用“如果让我设计，我会……”，这是避免简历失真的关键。
