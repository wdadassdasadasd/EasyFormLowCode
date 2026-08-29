# LowCode Admin Builder

## 项目概览

LowCode Admin Builder 是一个面向后台 CRUD 场景的可视化页面搭建工具。它将搜索表单、数据表格、新增/编辑弹窗、统计指标、图表和操作按钮抽象为统一的 `PageSchema`，让使用者通过配置完成后台页面搭建、预览、发布和导出，而不必为每个页面重复编写 Vue 代码。

项目采用 Vue 3 + FastAPI 的前后端分离架构。前端提供项目工作台、数据模型管理、三栏拖拽设计器和运行态预览；后端负责 PageSchema 校验、版本管理、实体数据与 SQLite 持久化。设计态与发布态相互隔离，页面配置可回滚并可导出为 JSON、模板配置或 Vue 单文件组件。

## 技术栈

- 前端：Vue 3、JavaScript、Vite、Vue Router、Element Plus、vuedraggable
- 可视化：ECharts、vue-echarts（设计器与预览路由按需加载）
- 后端：Python、FastAPI、SQLAlchemy、Pydantic、Uvicorn、SQLite
- 工程与测试：ESLint、OXLint、Prettier、Vitest、Playwright、Pytest

前端运行环境要求 Node.js `^20.19.0 || >=22.12.0`；后端依赖版本以 [`backend/requirements.txt`](backend/requirements.txt) 为准。

## 核心能力

1. **项目与页面管理**：按项目组织后台页面，可创建、重命名、删除页面，并在工作台查看页面及发布状态。
2. **数据模型管理**：维护实体、字段和实体关系；页面可以绑定实体，并将实体字段同步到页面配置。
3. **可视化页面设计**：三栏布局支持拖拽字段到搜索、表格和表单区域；属性面板可配置字段类型、校验、选项、可见性及页面元数据。
4. **Schema 驱动运行态**：同一份 PageSchema 驱动搜索、分页、数据表格、表单校验、增删改查、行操作和批量操作。
5. **统计与图表**：可配置总数、匹配、时间范围和聚合指标，并通过饼图、柱状图、折线图、面积图和排行图展示数据。
6. **版本与发布**：草稿保存采用修订版本保护；发布后可按已发布配置预览，并支持查看、恢复历史版本。
7. **导入与导出**：支持导入/导出 PageSchema、导出模板配置，以及根据统一字段注册表生成 Vue 单文件组件。

## 架构设计

`PageSchema` 是项目的核心协议。它描述页面字段、数据源、搜索条件、表格、表单、指标、图表和操作配置，并同时被设计器、运行态、后端校验与导出器消费。

```text
用户配置
  ↓
Vue 3 设计器：拖拽物料、属性编辑、撤销/重做、草稿预览
  ↓ PageSchema（规范化、校验、版本号）
FastAPI：协议校验、页面/版本/实体服务、运行态 CRUD API
  ↓
SQLite：项目、页面、草稿、发布版本、实体及业务记录
  ↓
运行预览：加载草稿或已发布 PageSchema，渲染 CRUD 页面与图表
  ↓
JSON / 模板配置 / Vue SFC 导出
```

### 草稿与发布态

- **设计态**：编辑器加载当前草稿，保存时携带 `expected_revision`，避免旧编辑覆盖新配置。
- **发布态**：发布操作将当前配置固化为可运行版本；预览页可分别加载草稿或已发布配置。
- **版本恢复**：历史版本保留配置快照，恢复时仍经过修订版本校验，保证并发修改不会被静默覆盖。

### PageSchema 职责

- `schema` 负责默认值、迁移、规范化和前端基础校验；当前协议版本为 v6。
- `renderer` 将字段配置映射为搜索控件、表格列与表单控件，避免在页面中散落字段类型判断。
- `composables` 维护页面配置、设计器编辑会话、运行态 CRUD 和项目路由状态等响应式逻辑。
- 后端在服务层执行协议校验、持久化、版本操作和运行态记录处理，前后端共用一致的协议边界。

## 目录结构

```text
EasyFormLowCode/
├── frontend/src/
│   ├── api/           # 基于 apiRequest 的业务接口封装
│   ├── components/    # 设计器、请求面板等通用组件
│   ├── composables/   # 页面配置、设计器和 CRUD 状态逻辑
│   ├── config/        # API 地址等运行配置
│   ├── renderer/      # PageSchema 运行时字段与图表渲染器
│   ├── router/        # 工作台、项目、实体、设计器和预览路由
│   ├── schema/        # PageSchema 默认值、字段注册、迁移和校验
│   ├── utils/         # 图表聚合、Schema 编辑和代码导出等纯工具
│   └── views/         # 页面编排层
├── backend/app/
│   ├── api/           # 页面、项目、实体、版本和运行态 HTTP 边界
│   ├── models/        # SQLAlchemy 数据模型
│   ├── schemas/       # Pydantic 请求与响应模型
│   └── services/      # Schema、版本、实体和运行态业务编排
├── backend/tests/     # FastAPI 与数据层测试
├── test/              # 前端单元测试及 Playwright 端到端测试
├── package.json       # 前端脚本、依赖与 Node.js 版本要求
└── playwright.config.js
```

## 本地运行

### 1. 安装依赖

在项目根目录安装前端依赖：

```bash
npm install
```

创建 Python 虚拟环境并安装后端依赖：

```bash
cd backend
python -m venv .venv
```

Windows PowerShell：

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS / Linux：

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 配置前端 API 地址

前端开发服务器没有内置 API 代理。请在根目录创建 `.env.development`，并设置本地后端地址：

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

未设置时，`VITE_API_BASE_URL` 默认为空字符串，浏览器会向当前站点发起相对路径请求，适用于前后端同源部署。

### 3. 启动服务

终端一：在 `backend/` 目录启动 API 服务：

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

终端二：在项目根目录启动前端：

```bash
npm run dev
```

打开 Vite 输出的本地地址（默认 `http://localhost:5173`）即可使用。API 文档位于 `http://127.0.0.1:8000/docs`。

### 数据库位置

后端默认在 `backend/lowcode.db` 创建 SQLite 数据库。可通过 `LOWCODE_DB_PATH` 指定其他数据库文件：

```powershell
$env:LOWCODE_DB_PATH = "D:\data\lowcode.db"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 验证与测试

在项目根目录执行前端检查：

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

在 `backend/` 目录执行后端测试：

```bash
python -m pytest -q
```

`npm run test:e2e` 会按 [`playwright.config.js`](playwright.config.js) 自动启动前端和后端服务，并通过 `LOWCODE_DB_PATH` 使用隔离的临时 SQLite 数据库，避免影响本地开发数据。

## 项目价值与演进

LowCode Admin Builder 聚焦后台 CRUD 的高频搭建需求，将页面结构与行为收敛到可版本化、可校验、可导出的 PageSchema，而不是追求任意自由画布。该边界使设计器、运行态、持久化和代码生成能够围绕同一份协议演进。

后续可优先演进数据源抽象、Action / Query 链路、请求观察面板、PageSchema 迁移能力、项目与页面目录能力，以及基于 Schema 的 AI 生成与优化入口。
