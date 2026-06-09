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
      <ChartRenderer v-for="chart in normalizedCharts" :key="chart.id" :chart="chart" :records="recordRows" :fields="pageSchema.fields" />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import ChartRenderer from '../renderer/ChartRenderer.vue'
import FieldControl from '../renderer/FieldControl.vue'
import TableFieldColumn from '../renderer/TableFieldColumn.vue'
import {
  buildFieldRules,
  createFieldByType,
  getFieldInitialValue,
  getFieldsByUsage,
  normalizeField,
} from '../schema/fieldTypes'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'

const PAGE_ID = 'user_manage'
const API_BASE = 'http://127.0.0.1:8000/api'

const statusText = ref('正在加载运行态页面...')
const pageStatus = ref('draft')
const recordsLoading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增数据')
const dialogMode = ref('create')
const editingRecordId = ref(null)
const selectedRows = ref([])
const searchModel = reactive({})
const dialogForm = reactive({})
const formErrors = reactive({})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})
const pageSchema = reactive(createDefaultSchema())
const recordRows = ref([])

const searchableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'search'))
const tableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'table'))
const formFields = computed(() => getFieldsByUsage(pageSchema.fields, 'form'))
const metricCards = computed(() => buildMetricCards(recordRows.value, pageSchema.fields))
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

onMounted(async () => {
  await loadSchema()
  await loadRecords()
})

function createDefaultSchema() {
  return {
    id: PAGE_ID,
    title: '用户管理',
    pageType: 'crud',
    fields: [
      createFieldByType('input', {
        id: 'field_username',
        label: '用户名',
        prop: 'username',
        placeholder: '请输入用户名',
        required: true,
      }),
      createFieldByType('input', {
        id: 'field_nickname',
        label: '昵称',
        prop: 'nickname',
        placeholder: '请输入昵称',
      }),
      createFieldByType('select', {
        id: 'field_role',
        label: '用户角色',
        prop: 'role',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '普通用户', value: 'user' },
          { label: '访客', value: 'guest' },
        ],
      }),
      createFieldByType('select', {
        id: 'field_status',
        label: '状态',
        prop: 'status',
        options: [
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' },
        ],
      }),
      createFieldByType('date', {
        id: 'field_created_at',
        label: '创建时间',
        prop: 'createdAt',
        searchable: false,
      }),
    ],
    charts: [
      { id: 'recordMetric', type: 'metric', title: '记录总数', metric: 'count' },
      { id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'status', metric: 'count' },
      { id: 'roleBar', type: 'bar', title: '角色分布', dimension: 'role', metric: 'count' },
    ],
  }
}

function replaceSchema(nextSchema) {
  const defaultSchema = createDefaultSchema()
  const fields = Array.isArray(nextSchema?.fields) && nextSchema.fields.length > 0 ? nextSchema.fields : defaultSchema.fields

  Object.assign(pageSchema, {
    ...defaultSchema,
    ...nextSchema,
    fields: fields.map((field, index) => normalizeField(field, index + 1, fields)),
    charts: Array.isArray(nextSchema?.charts) && nextSchema.charts.length > 0 ? nextSchema.charts : defaultSchema.charts,
  })
  syncModels()
}

async function loadSchema() {
  try {
    const response = await fetch(`${API_BASE}/pages/${PAGE_ID}`)

    if (!response.ok) {
      throw new Error('读取失败')
    }

    const result = await response.json()
    replaceSchema(result.schema_json)
    pageStatus.value = result.status
    statusText.value = '已从后端加载 PageSchema'
  } catch (error) {
    replaceSchema(createDefaultSchema())
    pageStatus.value = 'draft'
    statusText.value = '后端未启动，当前使用演示 PageSchema'
  }
}

async function loadRecords() {
  recordsLoading.value = true

  try {
    const params = new URLSearchParams({
      page: String(pagination.currentPage),
      pageSize: String(pagination.pageSize),
    })

    searchableFields.value.forEach((field) => {
      const value = searchModel[field.prop]

      if (value !== '' && value !== undefined && value !== null) {
        params.set(field.prop, value)
      }
    })

    const response = await fetch(`${API_BASE}/runtime/pages/${PAGE_ID}/records?${params.toString()}`)

    if (!response.ok) {
      throw new Error('读取 records 失败')
    }

    const result = await response.json()
    recordRows.value = result.items.map((item) => ({ id: item.id, ...item.data }))
    pagination.total = result.total
  } catch (error) {
    recordRows.value = buildDemoRows()
    pagination.total = recordRows.value.length
  } finally {
    recordsLoading.value = false
  }
}

function syncModels() {
  syncObjectKeys(searchModel, searchableFields.value)
  syncObjectKeys(dialogForm, formFields.value)
  syncObjectKeys(formErrors, formFields.value, '')
}

function syncObjectKeys(target, fields, emptyValue) {
  Object.keys(target).forEach((key) => {
    if (!fields.some((field) => field.prop === key)) {
      delete target[key]
    }
  })

  fields.forEach((field) => {
    if (!(field.prop in target)) {
      target[field.prop] = emptyValue !== undefined ? emptyValue : getFieldInitialValue(field)
    }
  })
}

function resetSearch() {
  searchableFields.value.forEach((field) => {
    searchModel[field.prop] = ''
  })
  pagination.currentPage = 1
  loadRecords()
}

function applySearch() {
  pagination.currentPage = 1
  loadRecords()
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingRecordId.value = null
  dialogTitle.value = '新增数据'
  clearFormErrors()
  formFields.value.forEach((field) => {
    dialogForm[field.prop] = getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingRecordId.value = row.id
  dialogTitle.value = '编辑数据'
  clearFormErrors()
  formFields.value.forEach((field) => {
    dialogForm[field.prop] = row[field.prop] ?? getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

function openSelectedEditDialog() {
  if (selectedRows.value.length === 1) {
    openEditDialog(selectedRows.value[0])
  }
}

async function deleteSelectedRows() {
  if (selectedRows.value.length === 0) {
    return
  }

  await ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 条数据吗？`, '删除确认', { type: 'warning' })
  await Promise.all(selectedRows.value.map((row) => deleteRecord(row, false)))
  selectedRows.value = []
  ElMessage.success('删除成功')
  await loadRecords()
}

async function deleteRecord(row, reload = true) {
  if (reload) {
    await ElMessageBox.confirm('确认删除这条数据吗？', '删除确认', { type: 'warning' })
  }

  const response = await fetch(`${API_BASE}/runtime/pages/${PAGE_ID}/records/${row.id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('删除失败')
  }

  if (reload) {
    ElMessage.success('删除成功')
    await loadRecords()
  }
}

async function submitDialog() {
  clearFormErrors()

  if (!validateDialogForm()) {
    return
  }

  submitLoading.value = true

  try {
    const url =
      dialogMode.value === 'edit'
        ? `${API_BASE}/runtime/pages/${PAGE_ID}/records/${editingRecordId.value}`
        : `${API_BASE}/runtime/pages/${PAGE_ID}/records`
    const response = await fetch(url, {
      method: dialogMode.value === 'edit' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: toPlainRecord(dialogForm) }),
    })

    if (!response.ok) {
      throw new Error('提交失败')
    }

    dialogVisible.value = false
    ElMessage.success(dialogMode.value === 'edit' ? '编辑成功' : '新增成功')
    await loadRecords()
  } catch (error) {
    ElMessage.error('提交失败，请确认后端服务已启动')
  } finally {
    submitLoading.value = false
  }
}

function validateDialogForm() {
  let valid = true

  formFields.value.forEach((field) => {
    const failedRule = buildFieldRules(field).find((rule) => !rule.validator(dialogForm[field.prop]))

    if (failedRule) {
      formErrors[field.prop] = failedRule.message
      valid = false
    }
  })

  return valid
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((key) => {
    formErrors[key] = ''
  })
}

function toPlainRecord(source) {
  return formFields.value.reduce((record, field) => {
    record[field.prop] = source[field.prop]
    return record
  }, {})
}

function buildDemoRows() {
  return [
    { id: 1, username: 'admin', nickname: '系统管理员', role: 'admin', status: 'enabled', createdAt: '2026-05-01' },
    { id: 2, username: 'zhangsan', nickname: '张三', role: 'user', status: 'enabled', createdAt: '2026-05-03' },
    { id: 3, username: 'lisi', nickname: '李四', role: 'user', status: 'disabled', createdAt: '2026-05-08' },
    { id: 4, username: 'wangwu', nickname: '王五', role: 'guest', status: 'enabled', createdAt: '2026-05-12' },
  ]
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
