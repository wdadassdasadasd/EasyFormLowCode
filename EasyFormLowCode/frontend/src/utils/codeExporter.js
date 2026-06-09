import { getFieldInitialValue, getFieldTypeConfig, getFieldsByUsage, normalizeField } from '../schema/fieldTypes'

export function buildSchemaJson(schema) {
  return JSON.stringify(schema, null, 2)
}

export function buildVueSfc(schema) {
  const normalizedSchema = normalizeSchema(schema)
  const title = normalizedSchema.title || '低代码页面'
  const searchableFields = getFieldsByUsage(normalizedSchema.fields, 'search')
  const tableFields = getFieldsByUsage(normalizedSchema.fields, 'table')
  const formFields = getFieldsByUsage(normalizedSchema.fields, 'form')
  const searchModel = buildInitialModel(searchableFields, '')
  const dialogForm = buildInitialModel(formFields)

  return `<template>
  <section class="runtime-page">
    <h1>${escapeHtml(title)}</h1>

    <el-form class="search-form" :model="searchModel" label-position="left">
${searchableFields.map((field) => renderSearchItem(field)).join('\n')}
      <el-button @click="resetSearch">重置</el-button>
      <el-button type="primary" @click="loadRecords">查询</el-button>
    </el-form>

    <el-button type="primary" @click="openCreateDialog">新增</el-button>

    <el-table :data="rows" border>
${tableFields.map((field) => `      ${getFieldTypeConfig(field.type).exporter.table(field)}`).join('\n')}
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="deleteRecord(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="dialogForm" label-width="96px">
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
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = 'http://127.0.0.1:8000/api'
const PAGE_ID = '${escapeScriptString(normalizedSchema.id || 'user_manage')}'
const rows = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增数据')
const editingRecordId = ref(null)
const searchModel = reactive(${JSON.stringify(searchModel, null, 2)})
const dialogForm = reactive(${JSON.stringify(dialogForm, null, 2)})
const formFields = ${JSON.stringify(formFields, null, 2)}

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

loadRecords()
</script>

<style scoped>
.runtime-page {
  padding: 24px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
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
