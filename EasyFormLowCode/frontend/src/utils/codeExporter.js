import { getFieldInitialValue, getFieldTypeConfig, getFieldsByUsage } from '../schema/fieldTypes'
import { normalizePageSchema } from '../schema/pageSchema'

export function buildSchemaJson(schema) {
  return JSON.stringify(normalizePageSchema(schema?.id, schema), null, 2)
}

export function buildVueSfc(schema) {
  const normalizedSchema = normalizePageSchema(schema?.id, schema)
  const title = normalizedSchema.title || '低代码页面'
  const searchableFields = getFieldsByUsage(normalizedSchema.fields, 'search')
  const tableFields = getFieldsByUsage(normalizedSchema.fields, 'table')
  const formFields = getFieldsByUsage(normalizedSchema.fields, 'form')
  const charts = normalizedSchema.charts || []
  const searchModel = buildInitialModel(searchableFields, '')
  const dialogForm = buildInitialModel(formFields)

  return `<template>
  <section class="runtime-page">
    <header class="runtime-header">
      <div>
        <span>PageSchema Runtime</span>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <el-button v-if="pageActions.create" type="primary" @click="openCreateDialog">新增</el-button>
    </header>

    <el-alert v-if="runtimeError" type="error" :title="runtimeError" show-icon :closable="false" />

    <el-form v-if="showSearchPanel" class="search-form" :model="searchModel" label-position="top">
${searchableFields.map((field) => renderSearchItem(field)).join('\n')}
      <div class="search-actions">
        <el-button v-if="pageActions.reset" @click="resetSearch">重置</el-button>
        <el-button v-if="pageActions.search" type="primary" @click="loadRecords">查询</el-button>
      </div>
    </el-form>

    <el-table v-loading="loading" :data="rows" border>
${pageSelectionColumn(normalizedSchema.actions)}
${tableFields.map((field) => `      ${getFieldTypeConfig(field.type).exporter.table(field)}`).join('\n')}
${renderOperationColumn(normalizedSchema.actions)}
    </el-table>
    <div class="pagination-row">
      <span>共 {{ pagination.total }} 条</span>
      <el-pagination v-model:current-page="pagination.currentPage" v-model:page-size="pagination.pageSize" layout="prev, pager, next, sizes" :page-sizes="[5, 10, 20, 50]" :total="pagination.total" @change="loadRecords" />
    </div>

    <section class="metrics-grid">
      <div v-for="metric in metricCards" :key="metric.id" class="metric-card">
        <span>{{ metric.title }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.trend }}</small>
      </div>
    </section>

    <section class="chart-grid">
      <div v-for="chart in chartOptions" :key="chart.id" class="chart-card">
        <strong>{{ chart.title }}</strong>
        <v-chart v-if="!chart.empty" class="chart" :option="chart.option" autoresize />
        <el-empty v-else description="暂无可统计数据" :image-size="64" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="dialogForm" label-position="top">
${formFields.map((field) => renderFormItem(field)).join('\n')}
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDialog">确定</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const DATASOURCE = ${JSON.stringify(normalizedSchema.datasource, null, 2)}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const PAGE_ACTIONS = ${JSON.stringify(normalizedSchema.actions, null, 2)}
const rows = ref([])
const loading = ref(false)
const runtimeError = ref('')
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const dialogVisible = ref(false)
const dialogTitle = ref('新增数据')
const editingRecordId = ref(null)
const searchModel = reactive(${JSON.stringify(searchModel, null, 2)})
const dialogForm = reactive(${JSON.stringify(dialogForm, null, 2)})
const formFields = ${JSON.stringify(formFields, null, 2)}
const fields = ${JSON.stringify(normalizedSchema.fields, null, 2)}
const charts = ${JSON.stringify(charts, null, 2)}
const pageActions = PAGE_ACTIONS
const showSearchPanel = ${Boolean(searchableFields.length > 0 || normalizedSchema.actions.search || normalizedSchema.actions.reset)}

const metricCards = computed(() => {
  const total = rows.value.length
  const enabled = rows.value.filter((row) => ['enabled', 'true', true, '启用'].includes(row.status ?? row.enabled)).length
  return [
    { id: 'total', title: '记录总数', value: total, trend: '当前数据集' },
    { id: 'enabled', title: '启用记录', value: enabled, trend: total ? Math.round((enabled / total) * 100) + '% 占比' : '0% 占比' },
  ]
})

const chartOptions = computed(() => {
  return charts.map((chart) => {
    if (chart.type === 'metric') {
      return { ...chart, empty: false, option: null }
    }

    const groups = rows.value.reduce((result, row) => {
      const raw = row[chart.dimension]
      const label = formatFieldValue(chart.dimension, raw)
      result.set(label, (result.get(label) || 0) + 1)
      return result
    }, new Map())
    const labels = Array.from(groups.keys())
    const values = Array.from(groups.values())

    return {
      ...chart,
      empty: labels.length === 0,
      option: chart.type === 'bar'
        ? {
            tooltip: { trigger: 'axis' },
            grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
            xAxis: { type: 'category', data: labels },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ type: 'bar', data: values }],
          }
        : {
            tooltip: { trigger: 'item' },
            legend: { bottom: 0 },
            series: [{ type: 'pie', radius: ['42%', '68%'], data: labels.map((label, index) => ({ name: label, value: values[index] })) }],
          },
    }
  }).filter((chart) => chart.type !== 'metric')
})

async function loadRecords() {
  loading.value = true
  runtimeError.value = ''
  try {
    const response = await requestDatasource('list', { params: { ...buildSearchParams(), page: pagination.currentPage, pageSize: pagination.pageSize } })
    const result = normalizeListResponse(response)
    rows.value = result.items
    pagination.total = result.total
  } catch (error) {
    rows.value = []
    pagination.total = 0
    runtimeError.value = error?.message || '数据请求失败'
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  Object.keys(searchModel).forEach((key) => {
    searchModel[key] = ''
  })
  pagination.currentPage = 1
  loadRecords()
}

function openCreateDialog() {
  editingRecordId.value = null
  dialogTitle.value = '新增数据'
  formFields.forEach((field) => {
    dialogForm[field.prop] = field.defaultValue !== undefined && field.defaultValue !== '' ? field.defaultValue : getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingRecordId.value = row.id
  dialogTitle.value = '编辑数据'
  formFields.forEach((field) => {
    dialogForm[field.prop] = row[field.prop] ?? getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

async function submitDialog() {
  const invalidField = formFields.find((field) => {
    return buildFieldRules(field).some((rule) => !rule.validator(dialogForm[field.prop]))
  })

  if (invalidField) {
    ElMessage.warning(\`请检查字段：\${invalidField.label}\`)
    return
  }

  const body = { data: buildPlainRecord(dialogForm) }
  const requestType = editingRecordId.value ? 'update' : 'create'
  const response = await requestDatasource(requestType, { recordId: editingRecordId.value, body })
  if (response?.detail) {
    ElMessage.error(response.detail)
    return
  }

  dialogVisible.value = false
  ElMessage.success('提交成功')
  loadRecords()
}

async function deleteRecord(recordIdOrRow) {
  const recordId = typeof recordIdOrRow === 'object' ? recordIdOrRow.id : recordIdOrRow
  await ElMessageBox.confirm('确认删除这条数据吗？', '删除确认', { type: 'warning' })
  await requestDatasource('delete', { recordId })
  ElMessage.success('删除成功')
  loadRecords()
}

function buildSearchParams() {
  const params = {}
  Object.entries(searchModel).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      params[key] = value
    }
  })
  return params
}

function buildPlainRecord(source) {
  return formFields.reduce((record, field) => {
    record[field.prop] = source[field.prop]
    return record
  }, {})
}

function requestUrl(type, recordId) {
  const urlMap = {
    list: DATASOURCE.listUrl,
    create: DATASOURCE.createUrl,
    update: DATASOURCE.updateUrl,
    delete: DATASOURCE.deleteUrl,
  }
  return String(urlMap[type] || '').replace(':id', recordId ?? '')
}

async function requestDatasource(type, { body, params = {}, recordId } = {}) {
  const query = new URLSearchParams(params)
  if (DATASOURCE.mode === 'runtime') {
    query.set('mode', 'published')
  }

  const url = requestUrl(type, recordId)
  const targetUrl = /^https?:\\/\\//.test(url) ? url : \`\${API_BASE_URL.replace(/\\/$/, '')}\${url}\`
  const response = await fetch(query.size ? \`\${targetUrl}?\${query}\` : targetUrl, {
    method: type === 'list' ? 'GET' : type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(payload?.detail || \`请求失败（\${response.status}）\`)
  return payload
}

function normalizeListResponse(result) {
  const source = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : []
  return {
    items: source.map((item, index) => {
      if (item?.data && item.id !== undefined) {
        return { id: item.id, ...item.data }
      }

      return {
        id: item?.id ?? index + 1,
        ...(item || {}),
      }
    }),
    total: Number(result?.total ?? source.length),
  }
}

function getFieldInitialValue(field) {
  if (field.defaultValue !== undefined && field.defaultValue !== '') return field.defaultValue
  if (field.type === 'switch') return false
  if (field.type === 'number') return 0
  return ''
}

function buildFieldRules(field) {
  const rules = []
  if (field.required) {
    rules.push({
      validator: (value) => value !== '' && value !== undefined && value !== null,
    })
  }
  if (field.type === 'number') {
    rules.push({
      validator: (value) => field.min === undefined || value === '' || value === null || Number(value) >= Number(field.min),
    })
    rules.push({
      validator: (value) => field.max === undefined || value === '' || value === null || Number(value) <= Number(field.max),
    })
  }
  if (field.maxLength) {
    rules.push({
      validator: (value) => String(value ?? '').length <= Number(field.maxLength),
    })
  }
  return rules
}

function formatOptionValue(value, options) {
  const option = options.find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

function formatFieldValue(prop, value) {
  const field = fields.find((item) => item.prop === prop)
  if (field?.type === 'switch') {
    if ([true, 'true', 'enabled', 'yes'].includes(value)) return field.activeText || '是'
    if ([false, 'false', 'disabled', 'no'].includes(value)) return field.inactiveText || '否'
  }
  if (Array.isArray(field?.options)) {
    return formatOptionValue(value, field.options)
  }
  return value || '未填写'
}

loadRecords()
</script>

<style scoped>
.runtime-page {
  padding: 24px;
  color: #111827;
}

.runtime-header,
.search-form,
.metrics-grid,
.chart-grid {
  display: grid;
  gap: 12px;
}

.runtime-header {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.runtime-header h1 {
  margin: 4px 0 0;
}

.runtime-header span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.search-form {
  grid-template-columns: repeat(3, minmax(160px, 1fr)) 132px;
  align-items: end;
  margin: 16px 0;
}

.search-actions {
  display: flex;
  gap: 8px;
}

.metrics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
}

.metric-card,
.chart-card {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.metric-card span,
.metric-card strong,
.metric-card small {
  display: block;
}

.metric-card strong {
  margin-top: 8px;
  font-size: 28px;
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.chart {
  width: 100%;
  height: 220px;
}
</style>
`
}

export function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function renderSearchItem(field) {
  return `      <el-form-item label="${escapeHtml(field.label)}">
        ${getFieldTypeConfig(field.type).exporter.search(field, 'searchModel')}
      </el-form-item>`
}

function renderFormItem(field) {
  return `        <el-form-item label="${escapeHtml(field.label)}"${field.required ? ' required' : ''}>
          ${getFieldTypeConfig(field.type).exporter.form(field, 'dialogForm')}
        </el-form-item>`
}

function buildInitialModel(fields, emptyValue) {
  return fields.reduce((model, field) => {
    model[field.prop] = emptyValue !== undefined ? emptyValue : getFieldInitialValue(field)
    return model
  }, {})
}

function pageSelectionColumn(actions = {}) {
  return actions.batchDelete ? '      <el-table-column type="selection" width="44" />' : ''
}

function renderOperationColumn(actions = {}) {
  if (!actions.edit && !actions.delete) {
    return ''
  }

  return `      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          ${actions.edit ? '<el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>' : ''}
          ${actions.delete ? '<el-button link type="danger" @click="deleteRecord(row.id)">删除</el-button>' : ''}
        </template>
      </el-table-column>`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
