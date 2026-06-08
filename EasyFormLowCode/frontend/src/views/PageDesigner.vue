<template>
  <div class="designer">
    <aside class="material-panel">
      <section class="panel-block">
        <div class="panel-title">
          <span>基础字段</span>
          <span class="collapse-mark">⌃</span>
        </div>

        <button class="material-card active" type="button" @click="addTextField">
          <span class="material-icon">T</span>
          <span>单行文本</span>
        </button>

        <div class="material-empty">
          <strong>更多字段类型后续开放</strong>
          <p>当前版本聚焦后台 CRUD 字段配置，搜索表单、数据表格和弹窗表单会由 PageSchema 自动生成。</p>
        </div>
      </section>
    </aside>

    <section class="preview-panel">
      <div class="preview-header">
        <div>
          <h1>{{ pageSchema.title }}</h1>
          <p>{{ statusText }}</p>
        </div>
        <el-tag :type="editorStatusType">
          {{ editorStatusText }}
        </el-tag>
      </div>

      <section class="search-area" :class="{ selected: selectedArea === 'search' }" @click="selectedArea = 'search'">
        <el-empty v-if="searchableFields.length === 0" description="暂无可搜索字段" :image-size="64" />
        <el-form v-else class="search-form" label-position="left" :model="searchModel">
          <el-form-item
            v-for="field in searchableFields"
            :key="field.id"
            :label="field.label"
            class="field-select-target"
            :class="{ active: isFieldSelected(field) }"
            @click.stop="selectField(field.id)"
          >
            <span v-if="isFieldSelected(field)" class="selected-field-badge">已选中</span>
            <el-input
              v-model="searchModel[field.prop]"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              clearable
              @keyup.enter="applySearch"
            />
          </el-form-item>

          <div class="search-actions">
            <el-button @click.stop="resetSearch">重置</el-button>
            <el-button type="primary" :loading="recordsLoading" @click.stop="applySearch">查询</el-button>
          </div>
        </el-form>
      </section>

      <section class="table-card">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <el-button type="primary" @click="openCreateDialog">+ 新增</el-button>
            <el-button :disabled="selectedRows.length !== 1" @click="openSelectedEditDialog">✎ 编辑</el-button>
            <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="deleteSelectedRows">
              删除
            </el-button>
          </div>
          <span class="toolbar-tip">物料仅开放单行文本，表格/搜索/表单由 PageSchema 驱动</span>
        </div>

        <el-table
          v-loading="recordsLoading"
          :data="recordRows"
          border
          class="data-table"
          row-key="id"
          @selection-change="selectedRows = $event"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column
            v-for="field in tableFields"
            :key="field.id"
            :prop="field.prop"
            :label="field.label"
            min-width="140"
          >
            <template #header>
              <button
                class="column-select-target"
                :class="{ active: isFieldSelected(field) }"
                type="button"
                @click.stop="selectField(field.id)"
              >
                {{ field.label }}
              </button>
            </template>
          </el-table-column>
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

    </section>

    <aside class="property-panel">
      <div class="property-header">属性配置</div>

      <el-tabs v-model="activePropertyTab" class="property-tabs">
        <el-tab-pane label="页面属性" name="page">
          <el-form class="property-form" label-position="left" label-width="76px">
            <el-form-item label="页面标题" required>
              <el-input v-model="pageSchema.title" @input="markSchemaDirty" />
            </el-form-item>
            <el-form-item label="页面 ID">
              <el-input :model-value="pageSchema.id" disabled />
            </el-form-item>
            <el-form-item label="页面类型">
              <el-input :model-value="pageSchema.pageType" disabled />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="字段属性" name="field">
          <template v-if="selectedField">
            <el-form class="property-form" label-position="left" label-width="76px">
              <el-form-item label="标签名" required>
                <el-input v-model="selectedField.label" @input="markSchemaDirty" />
              </el-form-item>
              <el-form-item label="Prop" required>
                <el-input v-model="selectedField.prop" @change="normalizeFieldProp" />
              </el-form-item>
              <el-form-item label="类型" required>
                <el-select v-model="selectedField.type" disabled>
                  <el-option label="单行文本" value="input" />
                </el-select>
              </el-form-item>
              <el-form-item label="必填">
                <el-switch v-model="selectedField.required" @change="markSchemaDirty" />
              </el-form-item>
              <el-form-item label="可搜索">
                <el-switch v-model="selectedField.searchable" @change="handleFieldStructureChange" />
              </el-form-item>
              <el-form-item label="表格显示">
                <el-switch v-model="selectedField.tableVisible" @change="markSchemaDirty" />
              </el-form-item>
              <el-form-item label="表单显示">
                <el-switch v-model="selectedField.formVisible" @change="handleFieldStructureChange" />
              </el-form-item>
              <el-form-item label="占位提示">
                <el-input v-model="selectedField.placeholder" @input="markSchemaDirty" />
              </el-form-item>
              <el-form-item label="默认值">
                <el-input v-model="selectedField.defaultValue" @input="markSchemaDirty" />
              </el-form-item>
              <el-form-item label="最大长度">
                <el-input-number
                  v-model="selectedField.maxLength"
                  :min="1"
                  :max="200"
                  controls-position="right"
                  @change="markSchemaDirty"
                />
              </el-form-item>

              <el-button type="danger" plain class="delete-field-button" @click="deleteSelectedField">
                删除字段
              </el-button>
            </el-form>

            <div class="field-list-title">字段列表</div>
            <div class="field-list">
              <button
                v-for="field in pageSchema.fields"
                :key="field.id"
                type="button"
                :class="{ active: field.id === selectedField.id }"
                @click="selectField(field.id)"
              >
                <span>{{ field.label }}</span>
                <small>{{ field.prop }}</small>
              </button>
            </div>
          </template>

          <div v-else class="empty-property">
            点击左侧“单行文本”新增字段，或选择预览区中的搜索项、表格列、弹窗字段。
          </div>
        </el-tab-pane>

        <el-tab-pane label="表格属性" name="table">
          <div class="property-summary">
            <strong>数据表格</strong>
            <p>当前展示 {{ tableFields.length }} 个字段列，行主键为 {{ pageSchema.table?.rowKey || 'id' }}。</p>
            <p>第一版表格由字段的“表格显示”配置自动生成，复杂列配置后续开放。</p>
          </div>
        </el-tab-pane>

        <el-tab-pane label="表单属性" name="form">
          <div class="property-summary">
            <strong>新增/编辑弹窗</strong>
            <p>当前展示 {{ formFields.length }} 个表单字段，弹窗宽度 {{ pageSchema.formDialog?.width || '600px' }}。</p>
            <p>第一版表单由字段的“表单显示”和“必填”配置自动生成。</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </aside>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-empty v-if="formFields.length === 0" description="暂无表单字段" :image-size="70" />
      <el-form v-else label-position="left" label-width="96px" :model="dialogForm">
        <el-form-item
          v-for="field in formFields"
          :key="field.id"
          :label="field.label"
          :required="field.required"
          :error="formErrors[field.prop]"
          class="field-select-target dialog-field-target"
          :class="{ active: isFieldSelected(field) }"
          @click.stop="selectField(field.id)"
        >
          <span v-if="isFieldSelected(field)" class="selected-field-badge">已选中</span>
          <el-input
            v-model="dialogForm[field.prop]"
            :maxlength="field.maxLength"
            :placeholder="field.placeholder"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitDialog">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" title="版本管理" size="420px" @open="loadVersions">
      <div class="version-drawer">
        <el-empty v-if="versions.length === 0" description="暂无版本记录" />
        <div v-for="version in versions" v-else :key="version.id" class="version-item">
          <div>
            <strong>版本 {{ version.version_no }}</strong>
            <span>{{ version.message }}</span>
            <small>{{ formatDateTime(version.created_at) }}</small>
          </div>
          <div class="version-actions">
            <el-button size="small" @click="selectedVersion = version">查看</el-button>
            <el-button size="small" type="primary" plain @click="restoreVersion(version)">回滚</el-button>
          </div>
        </div>

        <div v-if="selectedVersion" class="version-detail">
          <h3>{{ selectedVersion.schema_json.title }}</h3>
          <p>字段数：{{ selectedVersion.schema_json.fields?.length || 0 }}</p>
          <pre>{{ buildVersionSummary(selectedVersion.schema_json) }}</pre>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="exportDialogVisible" title="导出代码" width="520px">
      <div class="export-dialog">
        <p>导出当前 PageSchema，以及基于单行文本字段生成的 Vue 单文件组件。</p>
        <el-button type="primary" plain @click="downloadSchema">下载 schema JSON</el-button>
        <el-button type="primary" @click="downloadVueSfc">下载 Vue SFC</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { buildSchemaJson, buildVueSfc, downloadTextFile } from '../utils/codeExporter'

const PAGE_ID = 'user_manage'
const API_BASE = 'http://127.0.0.1:8000/api'

const emit = defineEmits(['editor-status-change'])
const router = useRouter()
const selectedFieldId = ref('')
const selectedArea = ref('search')
const activePropertyTab = ref('field')
const dialogVisible = ref(false)
const dialogTitle = ref('新增数据')
const dialogMode = ref('create')
const editingRecordId = ref(null)
const recordsLoading = ref(false)
const submitLoading = ref(false)
const statusText = ref('正在加载页面配置...')
const pageStatus = ref('draft')
const editorStatus = ref('loading')
const selectedRows = ref([])
const versionDrawerVisible = ref(false)
const versions = ref([])
const selectedVersion = ref(null)
const exportDialogVisible = ref(false)
const searchModel = reactive({})
const dialogForm = reactive({})
const originalDialogData = reactive({})
const formErrors = reactive({})
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const pageSchema = reactive(createDefaultSchema())
const recordRows = ref([])

const selectedField = computed(() => {
  return pageSchema.fields.find((field) => field.id === selectedFieldId.value)
})

const editorStatusText = computed(() => {
  const statusMap = {
    loading: '正在加载',
    dirty: '未保存修改',
    saved: '已保存',
    published: '已发布',
  }

  return statusMap[editorStatus.value] || '未保存修改'
})

const editorStatusType = computed(() => {
  const typeMap = {
    loading: 'info',
    dirty: 'warning',
    saved: 'success',
    published: 'success',
  }

  return typeMap[editorStatus.value] || 'warning'
})

const searchableFields = computed(() => {
  return pageSchema.fields.filter((field) => field.searchable)
})

const tableFields = computed(() => {
  return pageSchema.fields.filter((field) => field.tableVisible)
})

const formFields = computed(() => {
  return pageSchema.fields.filter((field) => field.formVisible)
})

watch(
  [editorStatusText, editorStatusType],
  () => {
    emitEditorStatus()
  },
  { immediate: true },
)

watch(
  () => [pagination.currentPage, pagination.pageSize],
  () => {
    loadRecords()
  },
)

watch(
  () => pageSchema.fields.map((field) => field.prop),
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
    api: {
      mode: 'runtime',
      listUrl: `/api/runtime/pages/${PAGE_ID}/records`,
      createUrl: `/api/runtime/pages/${PAGE_ID}/records`,
      updateUrl: `/api/runtime/pages/${PAGE_ID}/records/:id`,
      deleteUrl: `/api/runtime/pages/${PAGE_ID}/records/:id`,
    },
    fields: [
      createTextField({
        id: 'field_username',
        label: '用户名',
        prop: 'username',
        placeholder: '请输入用户名',
      }),
    ],
    table: {
      rowKey: 'id',
      columns: [],
      actions: ['edit', 'delete'],
    },
    formDialog: {
      title: '编辑数据',
      width: '600px',
    },
    charts: [],
  }
}

function createTextField(overrides = {}, index = 1) {
  return {
    id: `field_${Date.now()}_${index}`,
    label: `单行文本${index}`,
    prop: `text_${index}`,
    type: 'input',
    required: false,
    searchable: true,
    tableVisible: true,
    formVisible: true,
    placeholder: `请输入单行文本${index}`,
    defaultValue: '',
    maxLength: 50,
    options: [],
    ...overrides,
  }
}

function replaceSchema(nextSchema) {
  const defaultSchema = createDefaultSchema()
  const normalized = {
    ...defaultSchema,
    ...nextSchema,
    fields: Array.isArray(nextSchema?.fields) ? nextSchema.fields.map(normalizeField) : defaultSchema.fields,
  }

  Object.assign(pageSchema, normalized)
  selectedFieldId.value = pageSchema.fields[0]?.id || ''
  syncModels()
}

function normalizeField(field, index) {
  return {
    ...createTextField({}, index + 1),
    ...field,
    type: 'input',
    options: [],
  }
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
    setEditorStatus(result.status === 'published' ? 'published' : 'saved')
    statusText.value = '已从后端恢复页面配置'
  } catch (error) {
    replaceSchema(createDefaultSchema())
    pageStatus.value = 'draft'
    setEditorStatus('dirty')
    statusText.value = '后端未启动，当前使用前端默认配置'
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

      if (value) {
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

async function saveSchema() {
  try {
    const response = await fetch(`${API_BASE}/pages/${PAGE_ID}/schema`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: pageSchema.title,
        schema_json: toPlainSchema(),
      }),
    })

    if (!response.ok) {
      throw new Error('保存失败')
    }

    const result = await response.json()
    pageStatus.value = result.status
    setEditorStatus('saved')
    statusText.value = '页面配置已保存，并生成历史版本'
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请确认后端服务已启动')
  }
}

async function publishSchema() {
  try {
    const response = await fetch(`${API_BASE}/pages/${PAGE_ID}/publish`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('发布失败')
    }

    const result = await response.json()
    pageStatus.value = result.status
    setEditorStatus('published')
    statusText.value = '页面已发布，可进入运行预览'
    ElMessage.success('发布成功')
  } catch (error) {
    ElMessage.error('发布失败，请确认后端服务已启动')
  }
}

function addTextField() {
  const field = createTextField({}, pageSchema.fields.length + 1)
  pageSchema.fields.push(field)
  selectedFieldId.value = field.id
  activePropertyTab.value = 'field'
  syncModels()
  markSchemaDirty()
}

function selectField(fieldId) {
  selectedFieldId.value = fieldId
  activePropertyTab.value = 'field'
}

function deleteSelectedField() {
  if (!selectedField.value) {
    return
  }

  const index = pageSchema.fields.findIndex((field) => field.id === selectedField.value.id)
  pageSchema.fields.splice(index, 1)
  selectedFieldId.value = pageSchema.fields[Math.max(index - 1, 0)]?.id || ''
  syncModels()
  markSchemaDirty()
  ElMessage.success('字段已删除')
}

function normalizeFieldProp() {
  if (!selectedField.value) {
    return
  }

  const fallback = `text_${pageSchema.fields.indexOf(selectedField.value) + 1}`
  const normalizedProp =
    selectedField.value.prop
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '') || fallback
  const duplicated = pageSchema.fields.some((field) => {
    return field.id !== selectedField.value.id && field.prop === normalizedProp
  })

  selectedField.value.prop = duplicated ? `${normalizedProp}_${Date.now().toString().slice(-4)}` : normalizedProp
  syncModels()
  markSchemaDirty()
}

function handleFieldStructureChange() {
  syncModels()
  markSchemaDirty()
}

function syncModels() {
  syncObjectKeys(searchModel, searchableFields.value)
  syncObjectKeys(dialogForm, formFields.value)
  syncObjectKeys(formErrors, formFields.value)
}

function syncObjectKeys(target, fields) {
  Object.keys(target).forEach((key) => {
    if (!fields.some((field) => field.prop === key)) {
      delete target[key]
    }
  })

  fields.forEach((field) => {
    if (!(field.prop in target)) {
      target[field.prop] = field.defaultValue || ''
    }
  })
}

function resetSearch() {
  Object.keys(searchModel).forEach((key) => {
    searchModel[key] = ''
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
    dialogForm[field.prop] = field.defaultValue || ''
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
    dialogForm[field.prop] = row[field.prop] || field.defaultValue || ''
  })
  dialogVisible.value = true
}

async function submitDialog() {
  if (!validateDialog()) {
    return
  }

  submitLoading.value = true

  try {
    const payload = {
      ...originalDialogData,
    }
    delete payload.id
    formFields.value.forEach((field) => {
      payload[field.prop] = dialogForm[field.prop] || ''
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
    const value = dialogForm[field.prop] || ''

    if (field.required && !String(value).trim()) {
      formErrors[field.prop] = '请输入必填项'
      valid = false
      return
    }

    if (field.maxLength && String(value).length > field.maxLength) {
      formErrors[field.prop] = `最多输入 ${field.maxLength} 个字符`
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
      rows.map((row) => {
        return fetch(`${API_BASE}/runtime/pages/${PAGE_ID}/records/${row.id}`, {
          method: 'DELETE',
        })
      }),
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

function previewPage() {
  router.push('/preview')
}

function showVersion() {
  versionDrawerVisible.value = true
}

function exportSchema() {
  exportDialogVisible.value = true
}

async function loadVersions() {
  try {
    const response = await fetch(`${API_BASE}/pages/${PAGE_ID}/versions`)

    if (!response.ok) {
      throw new Error('读取版本失败')
    }

    versions.value = await response.json()
    selectedVersion.value = versions.value[0] || null
  } catch (error) {
    versions.value = []
    selectedVersion.value = null
    ElMessage.error('读取版本失败，请先保存页面配置')
  }
}

async function restoreVersion(version) {
  try {
    await ElMessageBox.confirm(`确认回滚到版本 ${version.version_no} 吗？`, '版本回滚', {
      type: 'warning',
      confirmButtonText: '回滚',
      cancelButtonText: '取消',
    })

    const response = await fetch(`${API_BASE}/pages/${PAGE_ID}/versions/${version.id}/restore`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('回滚失败')
    }

    const result = await response.json()
    replaceSchema(result.schema_json)
    pageStatus.value = result.status
    setEditorStatus('saved')
    statusText.value = `已回滚到版本 ${version.version_no}`
    ElMessage.success('回滚成功')
    await loadVersions()
    await loadRecords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败，请确认后端服务已启动')
    }
  }
}

function downloadSchema() {
  downloadTextFile(`${PAGE_ID}.schema.json`, buildSchemaJson(toPlainSchema()), 'application/json;charset=utf-8')
}

function downloadVueSfc() {
  downloadTextFile(`${PAGE_ID}.vue`, buildVueSfc(toPlainSchema()), 'text/plain;charset=utf-8')
}

function buildVersionSummary(schema) {
  return buildSchemaJson({
    id: schema.id,
    title: schema.title,
    pageType: schema.pageType,
    fields: schema.fields?.map((field) => ({
      label: field.label,
      prop: field.prop,
      searchable: field.searchable,
      tableVisible: field.tableVisible,
      formVisible: field.formVisible,
    })),
  })
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

function isFieldSelected(field) {
  return field.id === selectedFieldId.value
}

function markSchemaDirty() {
  setEditorStatus('dirty')
}

function setEditorStatus(status) {
  editorStatus.value = status
  emitEditorStatus()
}

function emitEditorStatus() {
  emit('editor-status-change', {
    status: editorStatus.value,
    text: editorStatusText.value,
    type: editorStatusType.value,
  })
}

function formatDateTime(value) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function toPlainSchema() {
  return JSON.parse(JSON.stringify(pageSchema))
}

defineExpose({
  saveSchema,
  publishSchema,
  previewPage,
  showVersion,
  exportSchema,
  editorStatusText,
  editorStatusType,
})
</script>

<style lang="scss" scoped>
.designer {
  display: grid;
  grid-template-columns: 210px minmax(560px, 1fr) 340px;
  gap: 12px;
  height: calc(100vh - 90px);
  min-height: 760px;
}

.material-panel,
.preview-panel,
.property-panel {
  min-height: 0;
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 6px;
}

.material-panel,
.property-panel {
  overflow-y: auto;
}

.panel-block {
  padding: 16px 14px 12px;
  border-bottom: 1px solid #eef2f7;
}

.panel-title,
.property-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.collapse-mark {
  font-size: 18px;
}

.material-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  margin-bottom: 10px;
  color: #24324b;
  font: inherit;
  font-size: 14px;
  background: #ffffff;
  border: 1px solid #dfe6f0;
  border-radius: 5px;
  cursor: pointer;
}

.material-card.active:hover {
  color: #1267f8;
  border-color: #1267f8;
  box-shadow: 0 6px 16px rgb(18 103 248 / 12%);
}

.material-icon {
  color: #1267f8;
  font-size: 20px;
  font-weight: 700;
}

.material-empty {
  padding: 12px;
  color: #5d6b82;
  background: #f8fafc;
  border: 1px dashed #d8e0eb;
  border-radius: 6px;
}

.material-empty strong,
.material-empty p {
  display: block;
  margin: 0;
}

.material-empty strong {
  color: #344054;
  font-size: 13px;
}

.material-empty p {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
}

.preview-panel {
  overflow-y: auto;
  padding: 18px 14px 16px;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.preview-header h1 {
  margin: 0;
  color: #172033;
  font-size: 24px;
}

.preview-header p {
  margin: 6px 0 0;
  color: #7b8798;
  font-size: 13px;
}

.search-area {
  padding: 20px;
  margin-bottom: 20px;
  border: 1px dashed transparent;
  border-radius: 6px;
}

.search-area.selected {
  border-color: #1267f8;
  background: #fbfdff;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 1fr)) 140px;
  gap: 16px 18px;
  align-items: center;
}

.search-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.field-select-target {
  position: relative;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.field-select-target.active {
  background: #f4f8ff;
  border-color: #1267f8;
}

.dialog-field-target {
  padding: 8px;
}

.selected-field-badge {
  position: absolute;
  top: -8px;
  right: 8px;
  z-index: 1;
  padding: 1px 6px;
  color: #1267f8;
  font-size: 11px;
  line-height: 18px;
  background: #eef5ff;
  border: 1px solid #b9d4ff;
  border-radius: 10px;
}

.column-select-target {
  width: 100%;
  padding: 4px 6px;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
}

.column-select-target.active {
  color: #1267f8;
  background: #eef5ff;
  border-color: #1267f8;
}

.table-card {
  overflow: hidden;
  margin-bottom: 18px;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid #eef2f7;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.toolbar-tip {
  color: #8a95a8;
  font-size: 12px;
}

.data-table {
  width: 100%;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: #4d5b70;
}

.property-panel {
  padding-bottom: 18px;
}

.property-header {
  height: 48px;
  padding: 0 20px;
  margin: 0;
  border-bottom: 1px solid #e8edf5;
}

.property-tabs {
  --el-tabs-header-height: 44px;
}

:deep(.property-tabs .el-tabs__header) {
  padding: 0 10px;
  margin: 0;
  border-bottom: 1px solid #e8edf5;
}

:deep(.property-tabs .el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.property-tabs .el-tabs__item) {
  padding: 0 8px;
  font-size: 13px;
}

.property-form {
  padding: 16px 20px 4px;
}

.delete-field-button {
  width: 100%;
  margin-top: 2px;
}

.field-list-title {
  padding: 14px 20px 10px;
  color: #172033;
  font-weight: 700;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 20px;
}

.field-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 12px;
  color: #344054;
  font: inherit;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  cursor: pointer;
}

.field-list button.active {
  color: #1267f8;
  background: #edf5ff;
  border-color: #1267f8;
}

.field-list small {
  color: #8a95a8;
}

.empty-property {
  padding: 28px 20px;
  color: #7b8798;
  line-height: 1.7;
}

.property-summary {
  padding: 18px 20px;
  color: #5d6b82;
  line-height: 1.7;
}

.property-summary strong {
  display: block;
  margin-bottom: 8px;
  color: #172033;
  font-size: 15px;
}

.property-summary p {
  margin: 0 0 8px;
  font-size: 13px;
}

.version-drawer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}

.version-item strong,
.version-item span,
.version-item small {
  display: block;
}

.version-item span,
.version-item small {
  margin-top: 4px;
  color: #68748a;
  font-size: 12px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-detail {
  padding: 12px;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}

.version-detail h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.version-detail p {
  margin: 0 0 10px;
  color: #68748a;
}

.version-detail pre {
  overflow: auto;
  max-height: 260px;
  padding: 10px;
  margin: 0;
  color: #24324b;
  background: #f8fafc;
  border-radius: 5px;
}

.export-dialog {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.export-dialog p {
  width: 100%;
  margin: 0 0 4px;
  color: #5d6b82;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.property-form .el-form-item) {
  margin-bottom: 16px;
}

@media (max-width: 1280px) {
  .designer {
    grid-template-columns: 200px minmax(500px, 1fr) 320px;
  }

  .search-form {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }

}
</style>
