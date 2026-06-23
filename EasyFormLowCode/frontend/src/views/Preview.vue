<template>
  <section class="runtime-page">
    <div class="runtime-header">
      <div>
        <span>运行态 CRUD</span>
        <h1>{{ pageSchema.title }}</h1>
        <p>{{ statusText }}</p>
      </div>
      <div class="runtime-status">
        <el-tag :type="pageStatusTag.type" effect="plain">{{ pageStatusTag.text }}</el-tag>
        <small v-if="publishedVersionNo">发布版本 v{{ publishedVersionNo }}</small>
      </div>
    </div>

    <el-alert
      v-if="isOffline || runtimeError"
      class="runtime-alert"
      type="warning"
      show-icon
      :closable="false"
      title="后端不可用，当前显示演示数据"
      :description="runtimeError"
    />
    <el-alert
      v-if="runtimeNotice"
      class="runtime-alert"
      type="info"
      show-icon
      :closable="false"
      title="数据源能力提示"
      :description="runtimeNotice"
    />

    <section v-if="showSearchPanel" class="search-card">
      <div class="section-title">
        <strong>搜索表单</strong>
        <span>{{ searchableFields.length }} 个条件</span>
      </div>
      <el-empty v-if="searchableFields.length === 0" description="暂无搜索字段" :image-size="64" />
      <el-form v-else class="search-form" :model="searchModel" label-position="top">
        <el-form-item v-for="field in searchableFields" :key="field.id" :label="field.label">
          <FieldControl v-model="searchModel[field.prop]" :field="field" mode="search" @enter="applySearch" />
        </el-form-item>

        <div class="search-actions">
          <el-button v-if="pageActions.reset" @click="resetSearch">重置</el-button>
          <el-button v-if="pageActions.search" type="primary" :loading="recordsLoading" @click="applySearch">查询</el-button>
        </div>
      </el-form>
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>数据表格</strong>
          <span>共 {{ pagination.total }} 条</span>
        </div>
        <div class="toolbar-left">
          <el-button v-if="pageActions.create" type="primary" :disabled="readonlyRuntime" @click="openCreateDialog">新增</el-button>
          <el-button v-if="pageActions.edit" :disabled="readonlyRuntime || selectedRows.length !== 1" @click="openSelectedEditDialog">编辑</el-button>
          <el-button
            v-if="pageActions.batchDelete"
            type="danger"
            plain
            :disabled="readonlyRuntime || selectedRows.length === 0"
            @click="deleteSelectedRows"
          >
            删除
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="recordsLoading"
        :data="recordRows"
        border
        row-key="id"
        @selection-change="selectedRows = $event"
      >
        <el-table-column v-if="pageActions.batchDelete" type="selection" width="44" />
        <TableFieldColumn v-for="field in tableFields" :key="field.id" :field="field" />
        <el-table-column v-if="showRowActions" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="pageActions.edit" link type="primary" :disabled="readonlyRuntime" @click="openEditDialog(row)">编辑</el-button>
            <el-button v-if="pageActions.delete" link type="danger" :disabled="readonlyRuntime" @click="deleteRecord(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <span>{{ pageSchema.datasource?.mode === 'rest' ? '按数据源返回结果展示' : '按后端分页参数查询' }}</span>
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          background
          layout="prev, pager, next, sizes"
          :page-sizes="[5, 10, 20, 50]"
          :total="pagination.total"
        />
      </div>
    </section>

    <section class="metrics-grid">
      <div v-for="metric in metricCards" :key="metric.id" class="metric-card" :class="metric.tone">
        <span>{{ metric.title }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.trend }}</small>
      </div>
    </section>

    <section class="chart-grid">
      <ChartRenderer v-for="chart in normalizedCharts" :key="chart.id" :chart="chart" :records="statsRows" :fields="pageSchema.fields" />
    </section>

    <RequestInspector :request="lastRequest" :requests="requestHistory" />

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-empty v-if="formFields.length === 0" description="暂无表单字段" :image-size="70" />
      <el-form v-else label-position="top" :model="dialogForm">
        <el-form-item
          v-for="field in formFields"
          :key="field.id"
          :label="field.label"
          :required="field.required"
          :error="formErrors[field.prop]"
        >
          <FieldControl v-model="dialogForm[field.prop]" :field="field" mode="form" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitDialog">确定</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import RequestInspector from '../components/RequestInspector.vue'
import { usePageSchema } from '../composables/usePageSchema'
import { getLocalPreview } from '../composables/previewSession'
import { useRuntimeCrud } from '../composables/useRuntimeCrud'
import { useSchemaModels } from '../composables/useSchemaModels'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import ChartRenderer from '../renderer/ChartRenderer.vue'
import FieldControl from '../renderer/FieldControl.vue'
import TableFieldColumn from '../renderer/TableFieldColumn.vue'
import { buildDemoRows } from '../schema/defaultSchema'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'
import { applyDatasourceCapabilityToActions } from '../utils/schemaEditor'

defineOptions({
  name: 'PreviewPage',
})

const route = useRoute()
const pageId = computed(() => String(route.query.pageId || DEFAULT_PAGE_ID))
const isDraftPreview = computed(() => route.query.mode === 'draft')
const runtimeMode = computed(() => (isDraftPreview.value ? 'draft' : 'published'))
const statusText = ref('正在加载运行态页面...')
let syncSchemaModels = () => {}
const { pageSchema, pageStatus, publishedVersionNo, replaceSchema, loadSchema: loadPageSchema } = usePageSchema({
  pageId,
  syncModels: () => syncSchemaModels(),
})
const { searchModel, dialogForm, formErrors, searchableFields, tableFields, formFields, syncModels } = useSchemaModels(pageSchema)
syncSchemaModels = syncModels
const {
  recordsLoading,
  submitLoading,
  dialogVisible,
  dialogTitle,
  selectedRows,
  recordRows,
  statsRows,
  runtimeError,
  runtimeNotice,
  isOffline,
  lastRequest,
  requestHistory,
  readonlyRuntime,
  pagination,
  loadRecords,
  resetSearch,
  applySearch,
  openCreateDialog,
  openEditDialog,
  openSelectedEditDialog,
  deleteSelectedRows,
  deleteRecord,
  submitDialog,
} = useRuntimeCrud({
  pageId,
  pageSchema,
  runtimeMode,
  searchableFields,
  formFields,
  searchModel,
  dialogForm,
  formErrors,
  fallbackRows: buildDemoRows,
})

const pageActions = computed(() => applyDatasourceCapabilityToActions(pageSchema.actions || {}, pageSchema.datasource))
const pageStatusTag = computed(() => {
  if (isOffline.value) {
    return { text: '离线演示', type: 'warning' }
  }

  if (isDraftPreview.value) {
    return { text: '草稿预览', type: 'info' }
  }

  return {
    text: pageStatus.value === 'published' ? '已发布运行态' : '运行态预览',
    type: pageStatus.value === 'published' ? 'success' : 'info',
  }
})
const showSearchPanel = computed(() => searchableFields.value.length > 0 || pageActions.value.search || pageActions.value.reset)
const showRowActions = computed(() => pageActions.value.edit || pageActions.value.delete)
const metricCards = computed(() => buildMetricCards(statsRows.value, pageSchema.fields))
const normalizedCharts = computed(() => (pageSchema.charts?.length ? pageSchema.charts : buildDefaultCharts(pageSchema.fields)))

watch(
  () => [pagination.currentPage, pagination.pageSize],
  () => {
    loadRecords()
  },
)

watch(
  () => pageSchema.fields.map((field) => `${field.prop}:${field.type}:${field.searchable}:${field.formVisible}`),
  () => {
    syncModels()
  },
  { deep: true },
)

watch([pageId, isDraftPreview], async () => {
  await loadPreview()
})

onMounted(async () => {
  await loadPreview()
})

async function loadPreview() {
  if (isDraftPreview.value && route.query.local === '1') {
    const localSchema = getLocalPreview(pageId.value)
    if (localSchema) {
      replaceSchema(localSchema)
      statusText.value = '正在预览未保存的本地草稿'
      await loadRecords()
      return
    }
  }
  await loadSchema()
  await loadRecords()
}

async function loadSchema() {
  const result = await loadPageSchema({ published: !isDraftPreview.value })
  statusText.value = result
    ? isDraftPreview.value
      ? '已加载草稿 PageSchema'
      : '已加载发布 PageSchema'
    : '后端不可用，当前使用演示 PageSchema'
}
</script>

<style lang="scss" scoped>
.runtime-page {
  display: grid;
  gap: 14px;
  min-height: calc(100vh - 88px);
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.runtime-header,
.section-title,
.table-toolbar,
.pagination-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.runtime-alert {
  margin-bottom: 0;
}

.runtime-header span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.runtime-header h1 {
  margin: 4px 0;
  color: #111827;
  font-size: 24px;
}

.runtime-header p,
.section-title span,
.table-toolbar span,
.pagination-row {
  color: #6b7280;
  font-size: 12px;
}

.runtime-status {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.runtime-status small {
  color: #6b7280;
  font-size: 12px;
}

.search-card,
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.search-card {
  padding: 14px;
  background: #f9fafb;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) 132px;
  gap: 10px 12px;
  align-items: end;
  margin-top: 12px;
}

.search-actions,
.toolbar-left {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.table-card {
  overflow: hidden;
}

.table-toolbar {
  align-items: center;
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid #eef2f7;
}

.table-toolbar strong,
.table-toolbar span {
  display: block;
}

.table-toolbar span {
  margin-top: 3px;
}

.pagination-row {
  align-items: center;
  padding: 12px;
}

.metrics-grid,
.chart-grid {
  display: grid;
  gap: 12px;
}

.metrics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-card {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.metric-card span,
.metric-card strong,
.metric-card small {
  display: block;
}

.metric-card span {
  color: #6b7280;
  font-size: 12px;
}

.metric-card strong {
  margin-top: 8px;
  color: #111827;
  font-size: 28px;
  line-height: 1;
}

.metric-card small {
  margin-top: 8px;
  color: #6b7280;
}

.metric-card.green strong {
  color: #16a34a;
}

.metric-card.orange strong {
  color: #f59e0b;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.schema-field-control) {
  width: 100%;
}

@media (max-width: 1280px) {
  .search-form,
  .chart-grid {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
</style>
