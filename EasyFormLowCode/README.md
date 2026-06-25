#README .md

本文件是 LowCode Admin Builder 的长期协作规范。开发者或 AI 修改代码前必须阅读并遵守。

## 项目说明
本项目通过可视化配置生成可运行、可维护、可导出的后台 CRUD 管理页面。

核心场景：
- 搜索表单、数据表格、新增 / 编辑弹窗
- 统计卡片与 ECharts 图表
- 页面保存、发布、版本回滚
- Vue 单文件组件与 PageSchema JSON 导出

产品不追求任意自由画布，优先保证后台管理场景简单、稳定、清晰。页面应有明确的加载、空数据和错误反馈；后端不可用时应合理兜底，避免白屏。

## 修改前必读
首次进入项目或生成代码前，至少阅读：
- `README.md`
- `package.json`
- `frontend/src/main.js`
- `frontend/src/router/`
- `frontend/src/api/`
- `frontend/src/views/`
- `frontend/src/composables/`
- `frontend/src/schema/`
- `frontend/src/renderer/`
- `backend/app/main.py`
- `backend/app/api/`
- `backend/app/services/`
- `backend/app/schemas/`

前端请求统一使用 `frontend/src/api/httpClient.js` 的 `apiRequest`。项目不存在 `frontend/src/utils/request.js`，不得假设其存在。

## 技术栈
- 前端：Vue 3、JavaScript、Vite、Element Plus、Pinia、Vue Router、vuedraggable、ECharts、Vitest
- 后端：Python、FastAPI、SQLite、SQLAlchemy、Pydantic、Uvicorn、Pytest
- 除非任务明确要求，不得引入新依赖或改用其他技术栈

## 目录与职责
```text
frontend/src/
├── api/          # 接口请求
├── components/   # 公共组件
├── composables/  # 可复用状态与业务行为
├── config/       # 全局配置
├── renderer/     # schema 运行时渲染
├── router/       # 路由
├── schema/       # PageSchema 默认值、类型与归一化
├── stores/       # Pinia 状态
├── utils/        # 纯工具函数
└── views/        # 页面编排
backend/app/
├── api/          # FastAPI 路由
├── models/       # SQLAlchemy 模型
├── schemas/      # Pydantic 模型
└── services/     # 业务流程与持久化编排
```

- `views` 保持轻量，不堆叠请求、复杂状态和数据转换。
- 接口调用放入 `api`，可复用业务逻辑放入 `composables`。
- PageSchema 规则放入 `schema`，运行时控件放入 `renderer`。
- `utils` 只放纯逻辑，例如图表聚合与代码导出。
- 后端路由处理 HTTP 边界，业务放入 service，模型不承载大量业务逻辑。
- 新能力优先放入已有边界，不将编辑器、CRUD、版本和导出堆进单个文件。

## PageSchema 原则
PageSchema 是统一协议，一份 schema 应同时驱动：
- 编辑器实时预览
- 运行态 CRUD 页面
- 后端配置持久化
- 页面版本管理与回滚
- Vue 组件和 JSON 导出
- 后续 AI 生成或优化入口

修改 PageSchema 结构或语义时，必须同步检查默认 schema、字段归一化、设计器、运行态渲染、后端模型、版本管理、代码导出和测试。

## 代码规范
- 文件使用 UTF-8，中文不得乱码。
- Vue 使用 Composition API、`<script setup>` 和 JavaScript，不使用 TypeScript。
- 优先复用 Element Plus、已有组件、composable、schema 与工具函数。
- 命名贴近业务，优先使用 `pageSchema`、`field`、`record`、`version`、`runtime`。
- 函数职责单一，避免同时处理请求、状态、提示和数据转换。
- 重复逻辑必须抽离，避免魔法字符串和无依据的过度抽象。
- 拖拽使用 vuedraggable；图表使用 ECharts，并从 schema 和 records 派生配置。
- 核心复杂逻辑应注释设计意图，不写重复代码表面的无效注释。
- FastAPI 路由按领域拆分；Pydantic 负责接口边界；service 负责业务流程。

## 接口规范
- 所有前端接口请求必须放在 `frontend/src/api/`。
- 请求必须使用 `apiRequest`，组件中禁止直接使用 `fetch` 或 Axios。
- API 基础地址从 `frontend/src/config/` 获取，不得硬编码生产地址。
- 组件调用 `api` 导出的业务函数；复用的加载、错误、分页和 CRUD 状态放入 composable。
- 错误提示应清晰、可操作，不直接展示缺少上下文的底层异常。

## 禁止事项
- 修改无关文件或删除已有业务代码
- 随意修改 `package.json`、锁文件、`vite.config.js` 或 `frontend/src/main.js`
- 未经明确要求引入依赖
- 硬编码 Token、密码、密钥或生产接口地址
- 绕过 lint、测试或构建错误
- 留下无用 import、调试 `console.log` 或临时代码
- 在组件中直接发请求
- 未评估兼容影响就改变 PageSchema 字段语义
- 用大规模重构夹带实现小需求

## 运行与验收
前端命令在项目根目录执行：
```bash
npm run lint
npm test
npm run build
```
后端测试：
```bash
cd backend
python -m pytest -q
```

提交前确认设计器和运行态预览可打开、页面无白屏、控制台无新增错误。涉及 CRUD 时检查查询、重置、分页、新增、编辑和删除；涉及 UI 时检查加载、空状态、错误提示和窄屏布局。

无法执行的检查必须说明原因，不得声称已经通过。

## 提交规范
使用明确的 Conventional Commit，例如：
```text
feat: 新增字段配置能力
fix: 修复运行态分页异常
refactor: 优化表单模型同步逻辑
docs: 更新项目协作说明
```
除非用户明确要求，不得擅自提交、推送或创建 Pull Request。

## AI 输出要求
修改前输出：需求理解、计划修改文件、实现方案、风险点。

修改后输出：本次修改、修改文件、自测方式、注意事项。

所有 AI 生成代码必须经过人工 Review 后才能合并。

## 演进方向
优先：Datasource 抽象、Action / Query 链路、请求观察面板、PageSchema 迁移、项目与页面列表、AI 生成 PageSchema。

暂不优先：任意自由画布、复杂审批、复杂 RBAC、大型组件市场、复杂多表关联查询。
