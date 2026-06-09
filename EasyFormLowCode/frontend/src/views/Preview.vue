<template>
  <section class="runtime-page">
    <div class="runtime-header">
      <div>
        <h1>{{ pageSchema.title }}</h1>
        <p>{{ statusText }}</p>
      </div>
      <el-tag :type="pageStatus === 'published' ? 'success' : 'info'">
        {{ pageStatus === 'published' ? '已发布' : '草稿预览' }}
      </el-tag>
    </div>

    <section class="search-card">
      <el-empty v-if="searchableFields.length === 0" description="暂无可搜索字段" :image-size="64" />
      <el-form v-else class="search-form" :model="searchModel" label-position="left">
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
        <div class="toolbar-left">
          <el-button type="primary" @click="openCreateDialog">新增</el-button>
          <el-button :disabled="selectedRows.length !== 1" @click="openSelectedEditDialog">编辑</el-button>
          <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="deleteSelectedRows">
            删除
          </el-button>
        </div>
        <span>运行态 CRUD</span>
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
        <span>共 {{ pagination.total }} 条</span>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-empty v-if="formFields.length === 0" description="暂无表单字段" :image-size="70" />
      <el-form v-else label-position="left" label-width="96px" :model="dialogForm">
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

import FieldControl from '../renderer/FieldControl.vue'
import TableFieldColumn from '../renderer/TableFieldColumn.vue'
import {
  buildFieldRules,
  createFieldByType,
  getFieldInitialValue,
  getFieldsByUsage,
  normalizeField,
} from '../schema/fieldTypes'

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
const originalDialogData = reactive({})
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
      }),
    ],
  }
}

function replaceSchema(nextSchema) {
  const defaultSchema = createDefaultSchema()
  const fields = Array.isArray(nextSchema?.fields)
    ? nextSchema.fields.map((field, index) => normalizeField(field, index + 1, nextSchema.fields))
    : defaultSchema.fields

  Object.assign(pageSchema, {
    ...defaultSchema,
    ...nextSchema,
    fields,
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
    statusText.value = '运行态页面已加载'
  } catch (error) {
    replaceSchema(createDefaultSchema())
    pageStatus.value = 'draft'
    statusText.value = '后端未启动，当前使用默认 schema'
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
    recordRows.value = []
    pagination.total = 0
    ElMessage.error('读取运行态数据失败，请确认后端服务已启动')
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
  clearObject(originalDialogData)
  formFields.value.forEach((field) => {
    dialogForm[field.prop] = getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

function openSelectedEditDialog() {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条数据进行编辑')
    return
  }

  openEditDialog(selectedRows.value[0])
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingRecordId.value = row.id
  dialogTitle.value = '编辑数据'
  clearFormErrors()
  clearObject(originalDialogData)
  Object.assign(originalDialogData, row)
  formFields.value.forEach((field) => {
    dialogForm[field.prop] = row[field.prop] ?? getFieldInitialValue(field)
  })
  dialogVisible.value = true
}

async function submitDialog() {
  if (!validateDialog()) {
    return
  }

  submitLoading.value = true

  try {
    const payload = { ...originalDialogData }
    delete payload.id
    formFields.value.forEach((field) => {
      payload[field.prop] = dialogForm[field.prop]
    })

    const isEdit = dialogMode.value === 'edit' && editingRecordId.value
    const url = isEdit
      ? `${API_BASE}/runtime/pages/${PAGE_ID}/records/${editingRecordId.value}`
      : `${API_BASE}/runtime/pages/${PAGE_ID}/records`
    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: payload }),
    })

    if (!response.ok) {
      throw new Error('提交失败')
    }

    dialogVisible.value = false
    ElMessage.success(isEdit ? '编辑成功' : '新增成功')
    await loadRecords()
  } catch (error) {
    ElMessage.error('提交失败，请确认后端服务已启动')
  } finally {
    submitLoading.value = false
  }
}

function validateDialog() {
  clearFormErrors()
  let valid = true

  formFields.value.forEach((field) => {
    const value = dialogForm[field.prop]
    const failedRule = buildFieldRules(field).find((rule) => !rule.validator(value))

    if (failedRule) {
      formErrors[field.prop] = failedRule.message
      valid = false
    }
  })

  return valid
}

async function deleteSelectedRows() {
  if (selectedRows.value.length === 0) {
    return
  }

  await deleteRows(selectedRows.value)
}

async function deleteRecord(row) {
  await deleteRows([row])
}

async function deleteRows(rows) {
  try {
    await ElMessageBox.confirm(`确认删除 ${rows.length} 条数据吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })

    const responses = await Promise.all(
      rows.map((row) => fetch(`${API_BASE}/runtime/pages/${PAGE_ID}/records/${row.id}`, { method: 'DELETE' })),
    )

    if (responses.some((response) => !response.ok)) {
      throw new Error('删除失败')
    }

    selectedRows.value = []
    ElMessage.success('删除成功')
    await loadRecords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败，请确认后端服务已启动')
    }
  }
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((key) => {
    formErrors[key] = ''
  })
}

function clearObject(target) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })
}
</script>

<style lang="scss" scoped>
.runtime-page {
  min-height: calc(100vh - 90px);
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 6px;
}

.runtime-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.runtime-header h1 {
  margin: 0;
  color: #172033;
  font-size: 24px;
}

.runtime-header p {
  margin: 6px 0 0;
  color: #7b8798;
  font-size: 13px;
}

.search-card {
  padding: 18px;
  margin-bottom: 18px;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 1fr)) 140px;
  gap: 16px 18px;
  align-items: center;
}

.search-actions,
.toolbar-left {
  display: flex;
  gap: 10px;
}

.table-card {
  overflow: hidden;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  color: #8a95a8;
  background: #ffffff;
  border-bottom: 1px solid #eef2f7;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: #4d5b70;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

@media (max-width: 1280px) {
  .search-form {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }
}
</style>
