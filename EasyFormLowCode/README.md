Decision Summary
你要做的是一个 面向后台管理系统的简易低代码平台：通过 PageSchema 驱动编辑器、运行态页面、版本管理和 Vue 代码导出。第一版先不接 AI，但保留 AI 接入位置，后续可接 DeepSeek 生成 PageSchema。

Decisions
项目定位: 后台管理系统 CRUD + 表单 + 列表 + 简单图表看板。
核心模式: Schema 驱动运行 + 支持导出 Vue 代码。
Schema 粒度: 页面级模块 + 字段级配置，不做任意组件级自由画布。
后端技术栈: FastAPI + SQLite + SQLAlchemy + JSON 动态数据表。
数据模式: 真实后端接口，业务 records 使用 JSON 动态表承载。
编辑器形态: 三栏式编辑器：左侧模块/字段库，中间实时预览，右侧属性配置。
AI 策略: 第一期不接 AI，只预留 /api/ai/generate-schema 和服务层位置，后续接 DeepSeek。
个人核心工作: PageSchema、Schema Renderer、三栏编辑器核心交互、运行态 CRUD、代码导出。
登录权限: 极简登录，不做复杂 RBAC。
版本管理: 历史版本 + 一键回滚，diff 简化或后置。
代码导出: 导出单个 Vue SFC 文件 + schema JSON。
图表看板: ECharts 简单聚合图表，基于当前 records 本地统计。
开发顺序: 先前端 schema/renderer 闭环，再补后端接口。
展示定位: 两者均衡，但工程优先。
前端补充技术栈: Vite、Vue Router、Pinia、Axios、vuedraggable/sortablejs、ECharts，Monaco 可选。
字段类型: input、textarea、number、select、date、switch、radio、upload。
查询能力: 按 searchable 字段生成多条件查询 + 分页。
项目结构: 单仓库，frontend/ 和 backend/ 前后端分离。
完整项目方案
一、项目定位

项目名称可以叫：

LowCode Admin Builder

它不是通用网页搭建器，而是专注于后台管理页面生成：

CRUD 页面
搜索表单
数据表格
新增 / 编辑弹窗表单
简单统计卡片和图表
页面 schema 保存、发布、回滚
Vue3 源码导出
一句话介绍：

一个基于 PageSchema 的后台低代码平台，通过可视化配置生成可运行的 CRUD 管理页面，并支持真实后端数据、版本回滚和 Vue 源码导出。

二、核心亮点

PageSchema 驱动架构
一份 JSON 同时驱动：

编辑器实时预览
运行态页面
后端动态 CRUD
版本管理
Vue 代码导出
核心表达：

本项目不是简单拖拽 UI，而是构建了一套 schema engine，让页面配置成为平台的统一数据协议。

真实 CRUD 运行态
不是只做静态预览，页面发布后可以真实调用后端接口：

查询
新增
编辑
删除
分页
多条件搜索
版本管理与回滚
每次保存 schema 生成历史版本，可查看旧版本并一键恢复。

源码导出
把 PageSchema 转成 Vue3 + Element Plus 单文件组件，减少平台锁定感。

AI 可扩展架构
第一版不接 AI，但保留 AI 入口：

后端 AiService
前端 AI 生成按钮位置
/api/ai/generate-schema
后续 DeepSeek 只需要输出 PageSchema
三、技术栈

前端：

Vue3
JavaScript
Vite
Element Plus
Vue Router
Pinia
Axios
vuedraggable / sortablejs
ECharts / vue-echarts
Monaco Editor 可选
后端：

Python
FastAPI
SQLite
SQLAlchemy
Pydantic
Uvicorn
数据库：

SQLite
JSON 字段存储 PageSchema 和动态业务数据
四、总体架构

用户
 ↓
Vue3 前端
 ├─ 项目管理
 ├─ 三栏式低代码编辑器
 ├─ Schema Renderer
 ├─ 运行态 CRUD 页面
 ├─ 版本管理
 └─ 代码导出器
 ↓ Axios
FastAPI 后端
 ├─ Auth API
 ├─ Project API
 ├─ Page API
 ├─ Runtime CRUD API
 ├─ Version API
 └─ AI API 预留
 ↓
SQLite
 ├─ users
 ├─ projects
 ├─ pages
 ├─ page_versions
 └─ page_records
核心模块关系：

PageSchema
 ├─ Editor 修改它
 ├─ Renderer 渲染它
 ├─ Backend 保存它
 ├─ Runtime 使用它处理 CRUD
 ├─ Version Manager 记录它
 └─ Code Exporter 转换它
五、PageSchema 设计

建议第一版 schema：

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
字段类型：

input
textarea
number
select
date
switch
radio
upload
第一版不要做：

复杂联动
子表单
树选择
富文本
流程审批
任意组件自由布局
六、前端模块规划

推荐目录：

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
核心页面：

登录页
项目列表页
页面列表页
编辑器页
运行态页面
版本管理抽屉
导出代码弹窗
三栏编辑器：

顶部工具栏：
保存 / 发布 / 预览 / 版本 / 导出代码 / AI 预留按钮

左侧：
字段类型、模块入口、快速模板

中间：
SchemaRenderer 实时预览

右侧：
页面属性、字段属性、表格属性、图表属性
七、后端模块规划

推荐目录：

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
数据库表：

users
- id
- username
- password_hash
- created_at

projects
- id
- name
- description
- created_at
- updated_at

pages
- id
- project_id
- name
- schema_json
- status
- created_at
- updated_at

page_versions
- id
- page_id
- version_no
- message
- schema_json
- created_at

page_records
- id
- page_id
- data_json
- created_at
- updated_at
八、API 清单

认证：

POST /api/auth/login
GET  /api/auth/me
项目：

GET    /api/projects
POST   /api/projects
GET    /api/projects/{project_id}
PUT    /api/projects/{project_id}
DELETE /api/projects/{project_id}
页面：

GET    /api/projects/{project_id}/pages
POST   /api/projects/{project_id}/pages
GET    /api/pages/{page_id}
PUT    /api/pages/{page_id}/schema
POST   /api/pages/{page_id}/publish
DELETE /api/pages/{page_id}
运行态 CRUD：

GET    /api/runtime/pages/{page_id}/records
POST   /api/runtime/pages/{page_id}/records
PUT    /api/runtime/pages/{page_id}/records/{record_id}
DELETE /api/runtime/pages/{page_id}/records/{record_id}
查询参数：

page=1
pageSize=10
username=张三
status=enabled
版本：

GET  /api/pages/{page_id}/versions
GET  /api/pages/{page_id}/versions/{version_id}
POST /api/pages/{page_id}/versions/{version_id}/restore
AI 预留：

POST /api/ai/generate-schema
POST /api/ai/optimize-schema
第一版可以返回：

{
  message: 'AI 功能暂未启用',
  schema: null
}
九、20 天开发排期

Day 1-2：项目初始化

搭建 Vue3 + Vite + Element Plus
搭建 FastAPI + SQLite + SQLAlchemy
确定 PageSchema
建基础路由和布局
Day 3-5：Schema Renderer

搜索表单渲染
表格渲染
新增 / 编辑弹窗表单
字段类型映射 Element Plus
Day 6-8：三栏编辑器

左侧字段库
中间实时预览
右侧属性面板
字段新增、删除、排序、选中、编辑
Day 9-10：页面与项目接口

项目 CRUD
页面保存 / 查询
schema 持久化
前后端联调
Day 11-12：运行态 CRUD

page_records 动态数据表
新增 / 编辑 / 删除
多条件查询
分页
Day 13-14：版本管理

保存自动生成版本
版本列表
查看历史 schema
一键回滚
Day 15-16：代码导出

PageSchema 转 Vue SFC
导出 schema JSON
导出弹窗和下载功能
Day 17：图表看板

ECharts 接入
records 本地聚合
饼图 / 柱状图 / 统计卡片
Day 18：极简登录

登录接口
token 存储
路由守卫
登出
Day 19：体验打磨

空状态
错误提示
加载状态
默认模板
演示数据
Day 20：收尾

测试核心流程
README
架构图
演示脚本
答辩材料
十、风险控制

最大风险 1：编辑器做太复杂。
控制方式：只做业务字段级配置，不做自由画布。

最大风险 2：后端动态表查询复杂。
控制方式：JSON 数据表 + 简单多条件过滤，后续再优化索引。

最大风险 3：代码导出范围失控。
控制方式：只导出单 Vue SFC + schema JSON。

最大风险 4：AI 接入不稳定。
控制方式：第一版不接 AI，只保留架构位。

最大风险 5：图表拖慢进度。
控制方式：优先统计卡片，再做 ECharts 饼图/柱状图。

十一、答辩展示路线

登录系统。
创建一个项目。
创建“用户管理”页面。
在编辑器中添加字段：用户名、手机号、角色、状态、创建时间。
设置哪些字段显示在表格、搜索表单、编辑表单。
保存并发布页面。
进入运行态页面，真实新增、编辑、删除数据。
查看搜索和分页。
查看图表随数据变化。
保存新版本，修改字段，再回滚旧版本。
导出 Vue 文件和 schema JSON。
最后讲架构：
一份 PageSchema
同时驱动编辑器、运行态、版本管理、代码导出。
十二、后续 AI 接入设计

后续接 DeepSeek 时不改变主架构，只新增：

POST /api/ai/generate-schema
流程：

用户输入自然语言需求
 ↓
FastAPI AiService
 ↓
DeepSeek API
 ↓
生成 PageSchema
 ↓
Pydantic 校验
 ↓
返回前端确认应用
答辩表达：

当前系统已经完成低代码平台的确定性核心。AI 不直接控制页面，而是作为 PageSchema 生成器接入，因此可替换、可校验、可回滚。