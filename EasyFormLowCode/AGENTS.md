# AGENTS.md

本文件是本仓库的长期协作说明。后续任何 AI 代理或开发者在修改代码前，都应先阅读并遵守这里的项目定位、架构边界、开发顺序和验收标准。

## 项目定位

项目名称：LowCode Admin Builder。

这是一个面向后台管理系统的简易低代码平台，不是通用网页搭建器。第一版聚焦 CRUD 页面、搜索表单、数据表格、新增和编辑弹窗表单、简单统计卡片、ECharts 图表、页面版本管理、运行态 CRUD 和 Vue3 源码导出。

一句话介绍：

一个基于 PageSchema 的后台低代码平台，通过可视化配置生成可运行的 CRUD 管理页面，并支持真实后端数据、版本回滚和 Vue 源码导出。

## 核心决策

- 项目定位：后台管理系统 CRUD + 表单 + 列表 + 简单图表看板。
- 核心模式：Schema 驱动运行 + 支持导出 Vue 代码。
- Schema 粒度：页面级模块 + 字段级配置，不做任意组件级自由画布。
- 后端技术栈：FastAPI + SQLite + SQLAlchemy + JSON 动态数据表。
- 数据模式：真实后端接口，业务 records 使用 JSON 动态表承载。
- 编辑器形态：三栏式编辑器，左侧模块和字段库，中间实时预览，右侧属性配置。
- AI 策略：第一期不接 AI，只预留 `/api/ai/generate-schema`、`/api/ai/optimize-schema` 和服务层位置，后续接 DeepSeek。
- 个人核心工作：PageSchema、Schema Renderer、三栏编辑器核心交互、运行态 CRUD、代码导出。
- 登录权限：极简登录，不做复杂 RBAC。
- 版本管理：历史版本 + 一键回滚，diff 简化或后置。
- 代码导出：导出单个 Vue SFC 文件 + schema JSON。
- 图表看板：ECharts 简单聚合图表，基于当前 records 本地统计。
- 开发顺序：先前端 schema/renderer 闭环，再补后端接口。
- 展示定位：工程优先，兼顾视觉完整度。
- 查询能力：按 searchable 字段生成多条件查询 + 分页。
- 项目结构目标：单仓库，`frontend/` 和 `backend/` 前后端分离。

## 当前仓库状态

- 当前 Vite 配置和 `package.json` 在仓库根目录，前端源码位于 `frontend/src/`。
- `backend/` 目录已存在，用于后续 FastAPI 服务。
- README 和本文件均应使用 UTF-8 编码保存，避免中文乱码。
- 如果后续迁移为严格 `frontend/package.json` 结构，迁移时要同步更新本文件的命令说明。

## 技术栈

前端：

- Vue 3
- JavaScript
- Vite
- Element Plus
- Vue Router
- Pinia
- Axios
- vuedraggable / sortablejs
- ECharts / vue-echarts
- Monaco Editor 可选，第一版不是必须

后端：

- Python
- FastAPI
- SQLite
- SQLAlchemy
- Pydantic
- Uvicorn

数据库：

- SQLite
- JSON 字段存储 PageSchema 和动态业务 records

## 架构原则

PageSchema 是整个平台的统一协议。一份 JSON 应同时驱动：

- 编辑器实时预览
- 运行态页面
- 后端动态 CRUD
- 版本管理
- Vue 代码导出

核心表达：

本项目不是简单拖拽 UI，而是构建一套 schema engine，让页面配置成为平台统一数据协议。新增能力时优先扩展 PageSchema 和 Renderer，而不是绕过 schema 写死页面。

## 总体模块

```text
用户
  -> Vue3 前端
       -> 项目管理
       -> 三栏式低代码编辑器
       -> Schema Renderer
       -> 运行态 CRUD 页面
       -> 版本管理
       -> 代码导出器
  -> Axios
  -> FastAPI 后端
       -> Auth API
       -> Project API
       -> Page API
       -> Runtime CRUD API
       -> Version API
       -> AI API 预留
  -> SQLite
       -> users
       -> projects
       -> pages
       -> page_versions
       -> page_records
```

模块关系：

```text
PageSchema
  -> Editor 修改它
  -> Renderer 渲染它
  -> Backend 保存它
  -> Runtime 使用它处理 CRUD
  -> Version Manager 记录它
  -> Code Exporter 转换它
```

## PageSchema 契约

第一版 PageSchema 建议结构：

```js
{
  id: 'user_manage',
  title: '用户管理',
  pageType: 'crud',
  api: {
    mode: 'runtime',
    listUrl: '/api/runtime/pages/user_manage/records',
    createUrl: '/api/runtime/pages/user_manage/records',
    updateUrl: '/api/runtime/pages/user_manage/records/:id',
    deleteUrl: '/api/runtime/pages/user_manage/records/:id'
  },
  fields: [
    {
      id: 'username',
      label: '用户名',
      prop: 'username',
      type: 'input',
      required: true,
      searchable: true,
      tableVisible: true,
      formVisible: true,
      options: []
    }
  ],
  table: {
    rowKey: 'id',
    columns: [],
    actions: ['edit', 'delete']
  },
  formDialog: {
    title: '编辑数据',
    width: '600px'
  },
  charts: [
    {
      id: 'statusPie',
      type: 'pie',
      title: '状态分布',
      dimension: 'status',
      metric: 'count'
    }
  ]
}
```

字段类型白名单：

- `input`
- `textarea`
- `number`
- `select`
- `date`
- `switch`
- `radio`
- `upload`

字段约定：

- `id` 是字段在 schema 内的唯一标识。
- `prop` 是 records 中对应的 JSON key。
- `label` 用于表单、表格和搜索项显示。
- `required` 只影响表单校验。
- `searchable` 为 true 时进入搜索表单和运行态查询参数。
- `tableVisible` 为 true 时进入数据表格。
- `formVisible` 为 true 时进入新增和编辑弹窗。
- `options` 用于 select、radio、switch 等枚举型字段。

## 第一版不做

这些能力不要在第一版主动扩展，除非用户明确要求：

- 任意组件级自由画布
- 复杂字段联动
- 子表单
- 树选择
- 富文本
- 流程审批
- 复杂 RBAC
- 多页面应用编排
- 跨表关联查询
- 复杂图表设计器
- AI 真实调用

## 前端目录目标

推荐目标结构：

```text
frontend/src/
  api/
    auth.js
    project.js
    page.js
    runtime.js
    version.js
  router/
    index.js
  stores/
    authStore.js
    projectStore.js
    editorStore.js
  schema/
    defaultSchema.js
    schemaUtils.js
    fieldTypes.js
  renderer/
    SchemaRenderer.vue
    SearchFormRenderer.vue
    TableRenderer.vue
    FormDialogRenderer.vue
    ChartRenderer.vue
  editor/
    LowCodeEditor.vue
    ComponentPanel.vue
    PreviewCanvas.vue
    PropertyPanel.vue
    VersionDrawer.vue
    ExportDialog.vue
  views/
    LoginView.vue
    ProjectListView.vue
    PageListView.vue
    EditorView.vue
    RuntimeView.vue
  utils/
    codeExporter.js
    chartAggregator.js
```

核心页面：

- 登录页
- 项目列表页
- 页面列表页
- 编辑器页
- 运行态页面
- 版本管理抽屉
- 导出代码弹窗

三栏编辑器：

- 顶部工具栏：保存、发布、预览、版本、导出代码、AI 预留按钮。
- 左侧：字段类型、模块入口、快速模板。
- 中间：`SchemaRenderer` 实时预览。
- 右侧：页面属性、字段属性、表格属性、图表属性。

## 前端实现守则

- 所有运行态页面尽量通过 `SchemaRenderer` 渲染，不要为每个业务页面写死一套 CRUD。
- 编辑器修改 schema，预览区消费 schema，二者通过 store 或显式 props 保持单向数据流清晰。
- 字段新增、删除、排序、选中、编辑都应最终落到 PageSchema。
- Element Plus 组件映射应集中维护，避免在多个文件里重复写字段类型判断。
- 图表数据基于当前 records 本地聚合，聚合逻辑放在 `utils/chartAggregator.js`。
- 代码导出逻辑放在 `utils/codeExporter.js`，不要散落在弹窗组件里。
- API 请求统一放在 `api/` 目录，视图组件不直接拼接大量 URL。
- Pinia store 用于跨页面状态，如登录、项目、编辑器状态，不要把所有临时 UI 状态都塞进全局 store。

## 后端目录目标

推荐目标结构：

```text
backend/
  app/
    main.py
    database.py
    models/
      user.py
      project.py
      page.py
      page_version.py
      page_record.py
    schemas/
      auth_schema.py
      project_schema.py
      page_schema.py
      runtime_schema.py
    api/
      auth.py
      projects.py
      pages.py
      runtime.py
      versions.py
      ai.py
    services/
      auth_service.py
      page_service.py
      runtime_service.py
      version_service.py
      ai_service.py
    core/
      security.py
      config.py
```

数据库表：

- `users`: `id`, `username`, `password_hash`, `created_at`
- `projects`: `id`, `name`, `description`, `created_at`, `updated_at`
- `pages`: `id`, `project_id`, `name`, `schema_json`, `status`, `created_at`, `updated_at`
- `page_versions`: `id`, `page_id`, `version_no`, `message`, `schema_json`, `created_at`
- `page_records`: `id`, `page_id`, `data_json`, `created_at`, `updated_at`

## 后端实现守则

- API 层只处理请求响应、依赖注入和参数校验。
- Service 层承载业务逻辑，如保存 schema、发布页面、生成版本、恢复版本、动态 records 查询。
- Model 层只放 SQLAlchemy 模型，不混入业务逻辑。
- Pydantic schema 用于输入输出校验，尤其是 PageSchema 和 records 的基础结构校验。
- 动态业务数据统一放入 `page_records.data_json`，第一版只做简单 JSON 过滤和分页。
- 保存 schema 时生成历史版本；恢复版本时应更新当前 page 的 `schema_json`，并可追加一条恢复记录。
- AI Service 第一版只返回占位响应，不调用真实外部模型。

## API 清单

认证：

```text
POST /api/auth/login
GET  /api/auth/me
```

项目：

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/{project_id}
PUT    /api/projects/{project_id}
DELETE /api/projects/{project_id}
```

页面：

```text
GET    /api/projects/{project_id}/pages
POST   /api/projects/{project_id}/pages
GET    /api/pages/{page_id}
PUT    /api/pages/{page_id}/schema
POST   /api/pages/{page_id}/publish
DELETE /api/pages/{page_id}
```

运行态 CRUD：

```text
GET    /api/runtime/pages/{page_id}/records
POST   /api/runtime/pages/{page_id}/records
PUT    /api/runtime/pages/{page_id}/records/{record_id}
DELETE /api/runtime/pages/{page_id}/records/{record_id}
```

查询参数示例：

```text
page=1
pageSize=10
username=张三
status=enabled
```

版本：

```text
GET  /api/pages/{page_id}/versions
GET  /api/pages/{page_id}/versions/{version_id}
POST /api/pages/{page_id}/versions/{version_id}/restore
```

AI 预留：

```text
POST /api/ai/generate-schema
POST /api/ai/optimize-schema
```

第一版响应：

```json
{
  "message": "AI 功能暂未启用",
  "schema": null
}
```

## 开发顺序

1. 前端 schema/renderer 闭环。
2. 三栏编辑器核心交互。
3. 页面与项目接口。
4. 运行态 CRUD。
5. 版本管理和回滚。
6. 代码导出。
7. 图表看板。
8. 极简登录。
9. 体验打磨、演示数据、README 和答辩材料。

20 天节奏：

- Day 1-2：项目初始化，Vue3 + Vite + Element Plus，FastAPI + SQLite + SQLAlchemy，确定 PageSchema。
- Day 3-5：Schema Renderer，搜索表单、表格、新增和编辑弹窗，字段类型映射。
- Day 6-8：三栏编辑器，字段新增、删除、排序、选中、编辑。
- Day 9-10：项目 CRUD、页面保存和查询、schema 持久化、前后端联调。
- Day 11-12：运行态 CRUD，动态 records、新增、编辑、删除、多条件查询、分页。
- Day 13-14：版本管理，保存自动生成版本、版本列表、历史 schema、一键回滚。
- Day 15-16：代码导出，PageSchema 转 Vue SFC，导出 schema JSON。
- Day 17：图表看板，ECharts、records 本地聚合、饼图、柱状图、统计卡片。
- Day 18：极简登录，登录接口、token 存储、路由守卫、登出。
- Day 19：体验打磨，空状态、错误提示、加载状态、默认模板、演示数据。
- Day 20：测试核心流程、README、架构图、演示脚本、答辩材料。

## 命令和验证

当前仓库前端命令在根目录执行：

```bash
npm run dev
npm run build
npm test
npm run lint
```

后端目录补齐后建议命令：

```bash
cd backend
python -m venv .venv
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
python -m pytest
```

每次修改建议至少执行：

- 改前端组件或路由：`npm run build`，有测试时执行 `npm test`。
- 改 schema 工具、代码导出、聚合逻辑：补充或更新单元测试后执行 `npm test`。
- 改后端 API 或 service：执行后端测试；如果暂无测试，至少用 FastAPI 文档或 HTTP 请求验证核心路径。
- 改运行态 CRUD：验证查询、新增、编辑、删除、分页、搜索字段过滤。
- 改版本管理：验证保存生成版本、查看版本、恢复版本。

## 风险控制

- 编辑器做太复杂：只做业务字段级配置，不做自由画布。
- 后端动态表查询复杂：JSON 数据表 + 简单多条件过滤，后续再优化索引。
- 代码导出范围失控：只导出单 Vue SFC + schema JSON。
- AI 接入不稳定：第一版不接 AI，只保留架构位。
- 图表拖慢进度：优先统计卡片，再做 ECharts 饼图和柱状图。

## 答辩展示路线

1. 登录系统。
2. 创建一个项目。
3. 创建“用户管理”页面。
4. 在编辑器中添加字段：用户名、手机号、角色、状态、创建时间。
5. 设置字段在表格、搜索表单、编辑表单中的显示规则。
6. 保存并发布页面。
7. 进入运行态页面，真实新增、编辑、删除数据。
8. 查看搜索和分页。
9. 查看图表随数据变化。
10. 保存新版本，修改字段，再回滚旧版本。
11. 导出 Vue 文件和 schema JSON。
12. 最后讲架构：一份 PageSchema 同时驱动编辑器、运行态、版本管理、代码导出。

## 后续 AI 接入设计

后续接 DeepSeek 时不改变主架构，只新增真实 AI 调用：

```text
用户输入自然语言需求
  -> FastAPI AiService
  -> DeepSeek API
  -> 生成 PageSchema
  -> Pydantic 校验
  -> 返回前端确认应用
```

答辩表达：

当前系统已经完成低代码平台的确定性核心。AI 不直接控制页面，而是作为 PageSchema 生成器接入，因此可替换、可校验、可回滚。

## 代理工作规则

- 修改代码前先检查现有目录和已有实现，优先延续现有风格。
- 不要随意扩大需求范围，尤其不要把第一版变成通用页面设计器。
- 新增前端能力时优先考虑 schema、renderer、editor 三者是否同步。
- 新增后端能力时优先考虑 API、service、model、schema 分层是否清晰。
- 不要在视图组件中硬编码大量业务字段；字段来自 PageSchema。
- 不要绕过版本管理直接覆盖重要 schema 行为。
- 不要在第一版接入真实 AI key 或外部模型调用。
- 保持中文文档 UTF-8 编码。
- 如果发现 README 和本文件冲突，以本文件的工程执行规则为准；产品描述冲突时优先提醒用户确认。
