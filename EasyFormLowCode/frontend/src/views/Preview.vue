<template>
  <section class="runtime-page">
    <div class="runtime-header">
      <div>
        <span>运行态 CRUD</span>
        <h1>{{ pageSchema.title }}</h1>
        <p>{{ statusText }}</p>
      </div>
      <el-tag :type="pageStatus === 'published' ? 'success' : 'info'" effect="plain">
        {{ pageStatus === 'published' ? '已发布' : '草稿预览' }}
      </el-tag>
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

    <section class="search-card">
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
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="primary" :loading="recordsLoading" @click="applySearch">查询</el-button>
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
          <el-button type="primary" @click="openCreateDialog">新增</el-button>
          <el-button :disabled="selectedRows.length !== 1" @click="openSelectedEditDialog">编辑</el-button>
          <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="deleteSelectedRows">删除</el-button>
        </div>
      </div>

      <el-table
        v-loading="recordsLoading"
        :data="recordRows"
        border
        row-key="id"
        @selection-change="selectedRows = $event"
      >
        <el-table-column type="selection" width="44" />
        <TableFieldColumn v-for="field in tableFields" :key="field.id" :field="field" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="deleteRecord(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <span>按后端分页参数查询</span>
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

import { usePageSchema } from '../composables/usePageSchema'
import { useRuntimeCrud } from '../composables/useRuntimeCrud'
import { useSchemaModels } from '../composables/useSchemaModels'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import ChartRenderer from '../renderer/ChartRenderer.vue'
import FieldControl from '../renderer/FieldControl.vue'
import TableFieldColumn from '../renderer/TableFieldColumn.vue'
import { buildDemoRows } from '../schema/defaultSchema'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'

const route = useRoute()
const pageId = computed(() => String(route.query.pageId || DEFAULT_PAGE_ID))
const isDraftPreview = computed(() => route.query.mode === 'draft')
const statusText = ref('正在加载运行态页面...')
let syncSchemaModels = () => {}
const {
  pageSchema,
  pageStatus,
  loadSchema: loadPageSchema,
} = usePageSchema({
  pageId,
  syncModels: () => syncSchemaModels(),
})
const {
  searchModel,
  dialogForm,
  formErrors,
  searchableFields,
  tableFields,
  formFields,
  syncModels,
} = useSchemaModels(pageSchema)
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
  isOffline,
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
  searchableFields,
  formFields,
  searchModel,
  dialogForm,
  formErrors,
  fallbackRows: buildDemoRows,
})
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
  await loadSchema()
  await loadRecords()
})

onMounted(async () => {
  await loadSchema()
  await loadRecords()
})

async function loadSchema() {
  const result = await loadPageSchema({ published: !isDraftPreview.value })
  statusText.value = result
    ? isDraftPreview.value
      ? '已加载草稿 PageSchema'
      : '已加载已发布 PageSchema'
    : '后端不可用，当前使用演示 PageSchema'
}
</script>

<style lang="scss" scoped>
.runtime-page {
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

.runtime-header {
  margin-bottom: 16px;
}

.runtime-alert {
  margin-bottom: 14px;
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

.search-card,
.table-card {
  margin-bottom: 14px;
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
  margin-bottom: 14px;
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
