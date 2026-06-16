import { getFieldInitialValue, getFieldTypeConfig, getFieldsByUsage, normalizeField } from '../schema/fieldTypes'
import { normalizePageSchema } from '../schema/pageSchema'

export function buildSchemaJson(schema) {
  return JSON.stringify(normalizePageSchema(schema?.id, schema), null, 2)
}

export function buildVueSfc(schema) {
  const normalizedSchema = normalizeSchema(schema)
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
      <el-button type="primary" @click="openCreateDialog">新增</el-button>
    </header>

    <el-form class="search-form" :model="searchModel" label-position="top">
${searchableFields.map((field) => renderSearchItem(field)).join('\n')}
      <div class="search-actions">
        <el-button @click="resetSearch">重置</el-button>
        <el-button type="primary" @click="loadRecords">查询</el-button>
      </div>
    </el-form>

    <el-table :data="rows" border>
${tableFields.map((field) => `      ${getFieldTypeConfig(field.type).exporter.table(field)}`).join('\n')}
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="deleteRecord(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'
const PAGE_ID = '${escapeScriptString(normalizedSchema.id || 'user_manage')}'
const rows = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增数据')
const editingRecordId = ref(null)
const searchModel = reactive(${JSON.stringify(searchModel, null, 2)})
const dialogForm = reactive(${JSON.stringify(dialogForm, null, 2)})
const formFields = ${JSON.stringify(formFields, null, 2)}
const fields = ${JSON.stringify(normalizedSchema.fields, null, 2)}
const charts = ${JSON.stringify(charts, null, 2)}

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
  const params = new URLSearchParams({ page: '1', pageSize: '10' })
  Object.entries(searchModel).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) params.set(key, value)
  })
  const response = await fetch(\`\${API_BASE}/runtime/pages/\${PAGE_ID}/records?\${params}\`)
  const result = await response.json()
  rows.value = result.items.map((item) => ({ id: item.id, ...item.data }))
}

function resetSearch() {
  Object.keys(searchModel).forEach((key) => {
    searchModel[key] = ''
  })
  loadRecords()
}

function openCreateDialog() {
  editingRecordId.value = null
  dialogTitle.value = '新增数据'
  formFields.forEach((field) => {
    dialogForm[field.prop] = field.defaultValue ?? ''
  })
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingRecordId.value = row.id
  dialogTitle.value = '编辑数据'
  formFields.forEach((field) => {
    dialogForm[field.prop] = row[field.prop] ?? field.defaultValue ?? ''
  })
  dialogVisible.value = true
}

async function submitDialog() {
  const invalidField = formFields.find((field) => {
    const value = dialogForm[field.prop]
    if (field.required && String(value ?? '').trim() === '') return true
    if (field.maxLength && String(value ?? '').length > Number(field.maxLength)) return true
    if (field.type === 'number' && field.min !== undefined && value !== '' && Number(value) < Number(field.min)) return true
    if (field.type === 'number' && field.max !== undefined && value !== '' && Number(value) > Number(field.max)) return true
    return false
  })

  if (invalidField) {
    ElMessage.warning(\`请检查字段：\${invalidField.label}\`)
    return
  }

  const url = editingRecordId.value
    ? \`\${API_BASE}/runtime/pages/\${PAGE_ID}/records/\${editingRecordId.value}\`
    : \`\${API_BASE}/runtime/pages/\${PAGE_ID}/records\`
  const response = await fetch(url, {
    method: editingRecordId.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dialogForm }),
  })
  if (!response.ok) {
    ElMessage.error('提交失败')
    return
  }
  dialogVisible.value = false
  ElMessage.success('提交成功')
  loadRecords()
}

async function deleteRecord(recordId) {
  await ElMessageBox.confirm('确认删除这条数据吗？', '删除确认', { type: 'warning' })
  await fetch(\`\${API_BASE}/runtime/pages/\${PAGE_ID}/records/\${recordId}\`, { method: 'DELETE' })
  ElMessage.success('删除成功')
  loadRecords()
}

function formatOptionValue(value, options) {
  const option = options.find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

function formatSwitchValue(value, activeText = '是', inactiveText = '否') {
  if ([true, 'true', 'enabled', 'yes'].includes(value)) return activeText
  if ([false, 'false', 'disabled', 'no'].includes(value)) return inactiveText
  return value ?? ''
}

function formatFieldValue(prop, value) {
  const field = fields.find((item) => item.prop === prop)
  const option = field?.options?.find((item) => String(item.value) === String(value))
  return option?.label || value || '未填写'
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

function normalizeSchema(schema) {
  const fields = Array.isArray(schema?.fields) ? schema.fields.map((field, index) => normalizeField(field, index + 1)) : []

  return {
    ...schema,
    fields,
  }
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeScriptString(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")
}
