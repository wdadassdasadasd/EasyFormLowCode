import { getFieldInitialValue, getFieldTypeConfig, getFieldsByUsage } from '../schema/fieldTypes'
import { normalizePageSchema } from '../schema/pageSchema'
import { getDatasourceCapabilities } from './runtimeCrudHelpers'

export function buildSchemaJson(schema) {
  return JSON.stringify(normalizePageSchema(schema?.id, schema), null, 2)
}

export function buildTemplateJson(schema) {
  const normalizedSchema = normalizePageSchema(schema?.id, schema)
  const templateSchema = { ...normalizedSchema }
  delete templateSchema.id
  delete templateSchema.title
  delete templateSchema.entity
  if (templateSchema.datasource?.mode === 'runtime') {
    templateSchema.datasource = { mode: 'runtime' }
    templateSchema.api = { ...templateSchema.datasource }
  }
  return JSON.stringify(templateSchema, null, 2)
}

export function buildVueSfc(schema) {
  const normalizedSchema = normalizePageSchema(schema?.id, schema)
  const datasourceCapabilities = getDatasourceCapabilities(normalizedSchema.datasource)
  const exportedActions = {
    ...normalizedSchema.actions,
    create: datasourceCapabilities.create && normalizedSchema.actions.create,
    edit: datasourceCapabilities.update && normalizedSchema.actions.edit,
    delete: datasourceCapabilities.delete && normalizedSchema.actions.delete,
    batchDelete: datasourceCapabilities.batchDelete && normalizedSchema.actions.batchDelete,
  }
  const title = normalizedSchema.title || '低代码页面'
  const searchableFields = getFieldsByUsage(normalizedSchema.fields, 'search')
  const tableFields = getFieldsByUsage(normalizedSchema.fields, 'table')
  const formFields = getFieldsByUsage(normalizedSchema.fields, 'form')
  const charts = normalizedSchema.charts || []
  const metrics = normalizedSchema.metrics || []
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
    <el-alert
      v-if="!datasourceCapabilities.create"
      class="readonly-alert"
      type="info"
      title="当前数据源为只读模式"
      description="已自动隐藏新增、编辑、删除和批量删除入口。"
      show-icon
      :closable="false"
    />

    <el-form v-if="showSearchPanel" class="search-form" :model="searchModel" label-position="top">
${searchableFields.map((field) => renderSearchItem(field)).join('\n')}
      <div class="search-actions">
        <el-button v-if="pageActions.reset" @click="resetSearch">重置</el-button>
        <el-button v-if="pageActions.search" type="primary" @click="loadRecords">查询</el-button>
      </div>
    </el-form>

    <el-table v-loading="loading" :data="rows" border>
${pageSelectionColumn(exportedActions)}
${tableFields.map((field) => `      ${getFieldTypeConfig(field.type).exporter.table(field)}`).join('\n')}
${renderOperationColumn(exportedActions)}
    </el-table>
    <div class="pagination-row">
      <span>共 {{ pagination.total }} 条</span>
      <el-pagination v-model:current-page="pagination.currentPage" v-model:page-size="pagination.pageSize" layout="prev, pager, next, sizes" :page-sizes="[5, 10, 20, 50]" :total="pagination.total" @change="loadRecords" />
    </div>

    <section class="metrics-grid">
      <div v-for="metric in metricCards" :key="metric.id" class="metric-card" :class="metric.tone">
        <span>{{ metric.title }}</span>
        <strong>{{ metric.displayValue || metric.value }}</strong>
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
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const DATASOURCE = ${JSON.stringify(normalizedSchema.datasource, null, 2)}
const DATASOURCE_CAPABILITIES = ${JSON.stringify(datasourceCapabilities, null, 2)}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const PAGE_ACTIONS = ${JSON.stringify(exportedActions, null, 2)}
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
const metrics = ${JSON.stringify(metrics, null, 2)}
const pageActions = PAGE_ACTIONS
const datasourceCapabilities = DATASOURCE_CAPABILITIES
const showSearchPanel = ${Boolean(searchableFields.length > 0 || normalizedSchema.actions.search || normalizedSchema.actions.reset)}

const metricCards = computed(() => {
  return metrics.map((metric) => {
    const values = metric.field ? rows.value.map((row) => normalizeNumber(row[metric.field])).filter((value) => value !== null) : []
    let value = rows.value.length
    let trend = rows.value.length ? '当前数据集' : '暂无数据'
    if (metric.type === 'match') {
      value = rows.value.filter((row) => String(row[metric.field]) === String(metric.value)).length
      trend = metric.field || '未配置字段'
    } else if (metric.type === 'recent') {
      const days = Number(metric.recentDays) > 0 ? Number(metric.recentDays) : 30
      value = rows.value.filter((row) => Date.parse(row[metric.field]) >= Date.now() - days * 24 * 60 * 60 * 1000).length
      trend = \`最近 \${days} 天\`
    } else if (metric.type === 'sum') {
      value = values.reduce((sum, item) => sum + item, 0)
      trend = '求和'
    } else if (metric.type === 'average') {
      value = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0
      trend = '平均值'
    } else if (metric.type === 'min') {
      value = values.length ? Math.min(...values) : 0
      trend = '最小值'
    } else if (metric.type === 'max') {
      value = values.length ? Math.max(...values) : 0
      trend = '最大值'
    } else if (metric.type === 'percent') {
      const matched = rows.value.filter((row) => normalizeNumber(row[metric.field]) === normalizeNumber(metric.value)).length
      value = rows.value.length ? (matched / rows.value.length) * 100 : 0
      trend = '百分比'
    }
    return {
      ...metric,
      value,
      displayValue: formatMetricValue(value, metric),
      trend,
    }
  })
})

const chartOptions = computed(() => {
  return charts.map((chart) => {
    if (chart.type === 'metric') {
      return { ...chart, empty: false, option: null }
    }
    const entries = aggregateChart(chart)
    return {
      ...chart,
      empty: entries.labels.length === 0,
      option: buildChartOption(chart.type, entries.labels, entries.values),
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
  if (
    (type === 'create' && !datasourceCapabilities.create) ||
    (type === 'update' && !datasourceCapabilities.update) ||
    (type === 'delete' && !datasourceCapabilities.delete)
  ) {
    throw new Error('当前数据源为只读模式，无法执行写操作')
  }

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
  if (['checkbox', 'cascader', 'tag'].includes(field.type) || (field.type === 'select' && field.multiple)) return []
  if (['number', 'slider', 'rate'].includes(field.type)) return 0
  return ''
}

function buildFieldRules(field) {
  const rules = []
  if (field.required) {
    rules.push({
      validator: (value) => Array.isArray(value) ? value.length > 0 : value !== '' && value !== undefined && value !== null,
    })
  }
  if (field.type === 'number' || field.type === 'slider' || field.type === 'rate') {
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
  if (Array.isArray(value)) {
    return value.map((item) => formatOptionValue(item, options)).join('、')
  }
  const option = options.find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

function formatSwitchValue(value, activeText = '开启', inactiveText = '关闭') {
  if ([true, 'true', 'enabled', 'yes'].includes(value)) return activeText
  if ([false, 'false', 'disabled', 'no'].includes(value)) return inactiveText
  return value ?? ''
}

function formatMetricValue(value, metric = {}) {
  const precision = Number.isInteger(metric.precision) ? metric.precision : 0
  const prefix = metric.prefix || ''
  const suffix = metric.suffix || ''
  const normalized = Number.isFinite(Number(value)) ? Number(value) : 0
  return \`\${prefix}\${normalized.toFixed(precision)}\${suffix}\`
}

function aggregateChart(chart) {
  const groups = rows.value.reduce((result, row) => {
    const raw = row[chart.dimension]
    const label = formatFieldValue(chart.dimension, raw)
    const key = label || '未填写'
    if (!result.has(key)) {
      result.set(key, [])
    }
    result.get(key).push(row)
    return result
  }, new Map())

  const entries = Array.from(groups.entries()).map(([label, items]) => ({
    label,
    value: aggregateMetricValue(items, chart.metric || 'count', chart.measureField),
  }))
  const sorted = [...entries].sort((left, right) => chart.sort === 'asc' ? left.label.localeCompare(right.label, 'zh-CN') : right.value - left.value)
  const limited = sorted.slice(0, Number(chart.limit) > 0 ? Number(chart.limit) : 8)
  return {
    labels: limited.map((item) => item.label),
    values: limited.map((item) => item.value),
  }
}

function aggregateMetricValue(items, metric, measureField) {
  if (metric === 'count') return items.length
  const values = items.map((item) => normalizeNumber(item[measureField])).filter((value) => value !== null)
  if (!values.length) return 0
  if (metric === 'sum') return values.reduce((sum, value) => sum + value, 0)
  if (metric === 'average') return values.reduce((sum, value) => sum + value, 0) / values.length
  if (metric === 'min') return Math.min(...values)
  if (metric === 'max') return Math.max(...values)
  return items.length
}

function buildChartOption(type, labels, values) {
  if (type === 'bar' || type === 'rankBar') {
    const horizontal = type === 'rankBar'
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 24, bottom: 12, containLabel: true },
      xAxis: horizontal ? { type: 'value', minInterval: 1 } : { type: 'category', data: labels },
      yAxis: horizontal ? { type: 'category', data: labels } : { type: 'value', minInterval: 1 },
      series: [{ type: 'bar', data: values }],
    }
  }
  if (type === 'line' || type === 'area') {
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 24, bottom: 12, containLabel: true },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{ type: 'line', data: values, smooth: true, areaStyle: type === 'area' ? { opacity: 0.18 } : undefined }],
    }
  }
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: ['42%', '68%'], data: labels.map((label, index) => ({ name: label, value: values[index] })) }],
  }
}

function formatFieldValue(prop, value) {
  const field = fields.find((item) => item.prop === prop)
  if (field?.type === 'switch') {
    return formatSwitchValue(value, field.activeText, field.inactiveText)
  }
  if (Array.isArray(field?.options)) {
    return formatOptionValue(value, field.options)
  }
  if (Array.isArray(value)) {
    return value.join('、')
  }
  return value || '未填写'
}

function normalizeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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

export function parseImportedSchema(content, pageId = 'user_manage') {
  return normalizePageSchema(pageId, JSON.parse(content))
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
