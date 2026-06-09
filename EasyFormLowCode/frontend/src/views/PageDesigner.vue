<template>
  <div class="designer">
    <aside class="material-panel">
      <section class="panel-section">
        <div class="panel-heading">
          <span>组件库</span>
          <small>点击添加</small>
        </div>

        <div v-for="group in materialGroups" :key="group.name" class="material-group">
          <div class="group-title">{{ group.name }}</div>
          <button
            v-for="fieldType in group.items"
            :key="fieldType.type"
            class="material-card"
            type="button"
            @click="addField(fieldType.type)"
          >
            <el-icon><component :is="iconMap[fieldType.material.icon]" /></el-icon>
            <span>{{ fieldType.label }}</span>
          </button>
        </div>
      </section>

      <section class="panel-section">
        <div class="panel-heading">
          <span>页面模块</span>
          <small>Schema 驱动</small>
        </div>
        <button
          v-for="module in pageModules"
          :key="module.key"
          class="module-card"
          type="button"
          :class="{ active: selectedArea === module.key }"
          @click="selectedArea = module.key"
        >
          <el-icon><component :is="module.icon" /></el-icon>
          <span>{{ module.label }}</span>
        </button>
      </section>
    </aside>

    <section class="canvas-panel">
      <div class="canvas-header">
      <div>
        <span class="eyebrow">PageSchema / CRUD</span>
        <h1>{{ pageSchema.title }}</h1>
        <p>{{ statusText }}</p>
      </div>
    </div>

      <section class="canvas-block search-block" :class="{ selected: selectedArea === 'search' }" @click="selectedArea = 'search'">
        <div class="block-title">
          <strong>搜索表单</strong>
          <span>{{ searchableFields.length }} 个字段</span>
        </div>
        <el-empty v-if="searchableFields.length === 0" description="暂无搜索字段" :image-size="58" />
        <el-form v-else class="search-form" label-position="top" :model="searchModel">
          <el-form-item
            v-for="field in searchableFields"
            :key="field.id"
            :label="field.label"
            class="field-target"
            :class="{ active: isFieldSelected(field) }"
            @click.stop="selectField(field.id)"
          >
            <FieldControl v-model="searchModel[field.prop]" :field="field" mode="search" @enter="applySearch" />
          </el-form-item>
          <div class="search-actions">
            <el-button @click.stop="resetSearch">重置</el-button>
            <el-button type="primary" :loading="recordsLoading" @click.stop="applySearch">查询</el-button>
          </div>
        </el-form>
      </section>

      <section class="canvas-block table-block" :class="{ selected: selectedArea === 'table' }" @click="selectedArea = 'table'">
        <div class="table-toolbar">
          <div>
            <strong>数据表格</strong>
            <span>{{ tableFields.length }} 列 · 共 {{ pagination.total }} 条</span>
          </div>
          <div class="toolbar-actions">
            <el-button type="primary" :icon="Plus" @click.stop="openCreateDialog">新增</el-button>
            <el-button :icon="EditPen" :disabled="selectedRows.length !== 1" @click.stop="openSelectedEditDialog">编辑</el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedRows.length === 0"
              @click.stop="deleteSelectedRows"
            >
              删除
            </el-button>
          </div>
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
          <TableFieldColumn v-for="field in tableFields" :key="field.id" :field="field">
            <template #header="{ field: headerField }">
              <button
                class="column-select-target"
                :class="{ active: isFieldSelected(headerField) }"
                type="button"
                @click.stop="selectField(headerField.id)"
              >
                {{ headerField.label }}
              </button>
            </template>
          </TableFieldColumn>
          <el-table-column label="操作" width="146" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openEditDialog(row)">编辑</el-button>
              <el-button link type="danger" @click.stop="deleteRecord(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <span>每次操作都来自当前 PageSchema</span>
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

      <section class="metrics-grid" :class="{ selected: selectedArea === 'metrics' }" @click="selectedArea = 'metrics'">
        <div v-for="metric in metricCards" :key="metric.id" class="metric-card" :class="metric.tone">
          <span>{{ metric.title }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.trend }}</small>
        </div>
      </section>

      <section class="chart-grid" :class="{ selected: selectedArea === 'charts' }" @click="selectedArea = 'charts'">
        <ChartRenderer v-for="chart in normalizedCharts" :key="chart.id" :chart="chart" :records="recordRows" :fields="pageSchema.fields" />
      </section>
    </section>

    <aside class="property-panel">
      <div class="property-header">
        <div>
          <strong>属性配置</strong>
          <span>{{ selectedField ? selectedField.label : '页面设置' }}</span>
        </div>
      </div>

      <section class="property-section">
        <div class="section-title">页面</div>
        <el-form label-position="top">
          <el-form-item label="页面标题" required>
            <el-input v-model="pageSchema.title" @input="markSchemaDirty" />
          </el-form-item>
          <el-form-item label="页面 ID">
            <el-input :model-value="pageSchema.id" disabled />
          </el-form-item>
        </el-form>
      </section>

      <template v-if="selectedField">
        <section v-for="group in setterGroups" :key="group.key" class="property-section">
          <div class="section-title">{{ group.label }}</div>
          <el-form label-position="top">
            <el-form-item v-for="setter in group.items" :key="setter.prop" :label="setter.label" :required="setter.required">
              <el-input
                v-if="setter.setter === 'input' && setter.prop !== 'defaultValue'"
                v-model="selectedField[setter.prop]"
                @input="handleSetterChange(setter)"
                @change="handleSetterCommit(setter)"
              />

              <el-input
                v-else-if="setter.setter === 'input' && setter.prop === 'defaultValue' && !usesOptionDefaultValue"
                v-model="selectedField.defaultValue"
                @input="markSchemaDirty"
              />

              <el-select
                v-else-if="setter.setter === 'input' && setter.prop === 'defaultValue' && usesOptionDefaultValue"
                v-model="selectedField.defaultValue"
                clearable
                @change="markSchemaDirty"
              >
                <el-option
                  v-for="option in selectedField.options"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <el-switch
                v-else-if="setter.setter === 'switch'"
                v-model="selectedField[setter.prop]"
                @change="handleSetterChange(setter)"
              />

              <el-input-number
                v-else-if="setter.setter === 'number'"
                v-model="selectedField[setter.prop]"
                :min="setter.min"
                :max="setter.max"
                controls-position="right"
                @change="handleSetterChange(setter)"
              />

              <el-select
                v-else-if="setter.setter === 'select'"
                v-model="selectedField[setter.prop]"
                @change="handleSetterChange(setter)"
              >
                <el-option
                  v-for="option in setter.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <el-select v-else-if="setter.setter === 'typeSelect'" v-model="selectedField.type" @change="handleFieldTypeChange">
                <el-option
                  v-for="fieldType in materialFieldTypes"
                  :key="fieldType.type"
                  :label="fieldType.label"
                  :value="fieldType.type"
                />
              </el-select>

              <div v-else-if="setter.setter === 'options'" class="option-setter">
                <div v-for="(option, optionIndex) in selectedField.options" :key="optionIndex" class="option-row">
                  <el-input v-model="option.label" placeholder="选项名" @input="markSchemaDirty" />
                  <el-input v-model="option.value" placeholder="选项值" @input="markSchemaDirty" />
                  <el-button text type="danger" @click="removeOption(optionIndex)">删除</el-button>
                </div>
                <el-button plain size="small" :icon="Plus" @click="addOption">添加选项</el-button>
              </div>
            </el-form-item>
          </el-form>
        </section>

        <section class="property-section">
          <div class="section-title">字段顺序</div>
          <Draggable v-model="pageSchema.fields" item-key="id" handle=".drag-handle" class="field-list" @end="handleFieldSort">
            <template #item="{ element, index }">
              <div class="field-list-item" :class="{ active: element.id === selectedField.id }">
                <button class="drag-handle" type="button" title="拖拽排序">
                  <el-icon><Rank /></el-icon>
                </button>
                <button class="field-pick" type="button" @click="selectField(element.id)">
                  <span>{{ element.label }}</span>
                  <small>{{ element.prop }}</small>
                </button>
                <div class="field-order-actions">
                  <el-button text size="small" :disabled="index === 0" @click="moveField(index, -1)">上移</el-button>
                  <el-button text size="small" :disabled="index === pageSchema.fields.length - 1" @click="moveField(index, 1)">下移</el-button>
                </div>
              </div>
            </template>
          </Draggable>

          <el-button type="danger" plain class="delete-field-button" :icon="Delete" @click="deleteSelectedField">
            删除当前字段
          </el-button>
        </section>
      </template>

      <section v-else class="empty-property">
        从左侧添加字段，或点击画布中的搜索项、表头、表单字段来编辑属性。
      </section>
    </aside>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-empty v-if="formFields.length === 0" description="暂无表单字段" :image-size="70" />
      <el-form v-else label-position="top" :model="dialogForm">
        <el-form-item
          v-for="field in formFields"
          :key="field.id"
          :label="field.label"
          :required="field.required"
          :error="formErrors[field.prop]"
          class="field-target dialog-field-target"
          :class="{ active: isFieldSelected(field) }"
          @click.stop="selectField(field.id)"
        >
          <FieldControl v-model="dialogForm[field.prop]" :field="field" mode="form" />
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
        <p>导出当前 PageSchema，以及基于统一字段注册表生成的 Vue 单文件组件。</p>
        <el-button type="primary" plain :icon="Document" @click="downloadSchema">下载 schema JSON</el-button>
        <el-button type="primary" :icon="Upload" @click="downloadVueSfc">下载 Vue SFC</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ArrowDown,
  Calendar,
  CircleCheck,
  DataAnalysis,
  Delete,
  Document,
  EditPen,
  Grid,
  Histogram,
  Plus,
  Rank,
  Search,
  SwitchButton,
  Tickets,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import { useRouter } from 'vue-router'

import ChartRenderer from '../renderer/ChartRenderer.vue'
import FieldControl from '../renderer/FieldControl.vue'
import TableFieldColumn from '../renderer/TableFieldColumn.vue'
import {
  MATERIAL_FIELD_TYPES,
  buildFieldRules,
  createFieldByType,
  ensureUniqueProp,
  getFieldInitialValue,
  getFieldsByUsage,
  getPropertySetters,
  normalizeField,
  normalizeOptions,
  normalizeProp,
} from '../schema/fieldTypes'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'
import { buildSchemaJson, buildVueSfc, downloadTextFile } from '../utils/codeExporter'

const PAGE_ID = 'user_manage'
const API_BASE = 'http://127.0.0.1:8000/api'

const emit = defineEmits(['editor-status-change'])
const router = useRouter()
const selectedFieldId = ref('')
const selectedArea = ref('search')
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
const materialFieldTypes = MATERIAL_FIELD_TYPES

const iconMap = {
  EditPen,
  Document,
  Tickets,
  ArrowDown,
  Calendar,
  SwitchButton,
  CircleCheck,
}

const pageModules = [
  { key: 'search', label: '搜索表单', icon: Search },
  { key: 'table', label: '数据表格', icon: Grid },
  { key: 'metrics', label: '统计卡片', icon: DataAnalysis },
  { key: 'charts', label: '图表区域', icon: Histogram },
]

const setterGroupMeta = [
  { key: 'base', label: '基础' },
  { key: 'display', label: '显示位置' },
  { key: 'validate', label: '校验' },
  { key: 'options', label: '选项' },
  { key: 'default', label: '默认值' },
]

const materialGroups = computed(() => {
  return materialFieldTypes.reduce((groups, item) => {
    const name = item.material.group
    let group = groups.find((target) => target.name === name)
    if (!group) {
      group = { name, items: [] }
      groups.push(group)
    }
    group.items.push(item)
    return groups
  }, [])
})

const selectedField = computed(() => pageSchema.fields.find((field) => field.id === selectedFieldId.value))
const selectedFieldSetters = computed(() => (selectedField.value ? getPropertySetters(selectedField.value) : []))
const setterGroups = computed(() => {
  return setterGroupMeta
    .map((group) => ({
      ...group,
      items: selectedFieldSetters.value.filter((setter) => (setter.group || 'base') === group.key),
    }))
    .filter((group) => group.items.length > 0)
})
const usesOptionDefaultValue = computed(() => ['select', 'radio'].includes(selectedField.value?.type))
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
const searchableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'search'))
const tableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'table'))
const formFields = computed(() => getFieldsByUsage(pageSchema.fields, 'form'))
const metricCards = computed(() => buildMetricCards(recordRows.value, pageSchema.fields))
const normalizedCharts = computed(() => (pageSchema.charts?.length ? pageSchema.charts : buildDefaultCharts(pageSchema.fields)))

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
    api: {
      mode: 'runtime',
      listUrl: `/api/runtime/pages/${PAGE_ID}/records`,
      createUrl: `/api/runtime/pages/${PAGE_ID}/records`,
      updateUrl: `/api/runtime/pages/${PAGE_ID}/records/:id`,
      deleteUrl: `/api/runtime/pages/${PAGE_ID}/records/:id`,
    },
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
        placeholder: '请选择角色',
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
        placeholder: '请选择状态',
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
    table: {
      rowKey: 'id',
      columns: [],
      actions: ['edit', 'delete'],
    },
    formDialog: {
      title: '编辑数据',
      width: '600px',
    },
    charts: [
      { id: 'recordMetric', type: 'metric', title: '记录总数', metric: 'count' },
      { id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'status', metric: 'count' },
      { id: 'roleBar', type: 'bar', title: '角色分布', dimension: 'role', metric: 'count' },
    ],
  }
}

function replaceSchema(nextSchema) {
  const defaultSchema = createDefaultSchema()
  const rawFields = Array.isArray(nextSchema?.fields) && nextSchema.fields.length > 0 ? nextSchema.fields : defaultSchema.fields
  const normalizedFields = rawFields.map((field, index) => normalizeField(field, index + 1, rawFields))

  Object.assign(pageSchema, {
    ...defaultSchema,
    ...nextSchema,
    fields: normalizedFields,
    charts: Array.isArray(nextSchema?.charts) && nextSchema.charts.length > 0 ? nextSchema.charts : defaultSchema.charts,
  })
  selectedFieldId.value = pageSchema.fields[0]?.id || ''
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
    setEditorStatus(result.status === 'published' ? 'published' : 'saved')
    statusText.value = '已从后端恢复页面配置'
  } catch (error) {
    replaceSchema(createDefaultSchema())
    pageStatus.value = 'draft'
    setEditorStatus('dirty')
    statusText.value = '后端未启动，当前使用前端演示配置'
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

function addField(type) {
  const field = createFieldByType(type, {}, pageSchema.fields.length + 1)
  field.prop = ensureUniqueProp(field.prop, field.id, pageSchema.fields)
  pageSchema.fields.push(field)
  selectedFieldId.value = field.id
  selectedArea.value = 'table'
  syncModels()
  markSchemaDirty()
}

function selectField(fieldId) {
  selectedFieldId.value = fieldId
}

async function deleteSelectedField() {
  if (!selectedField.value) {
    return
  }

  await ElMessageBox.confirm(`确认删除字段「${selectedField.value.label}」吗？`, '删除字段', { type: 'warning' })
  const index = pageSchema.fields.findIndex((field) => field.id === selectedField.value.id)
  pageSchema.fields.splice(index, 1)
  selectedFieldId.value = pageSchema.fields[Math.max(index - 1, 0)]?.id || ''
  syncModels()
  markSchemaDirty()
  ElMessage.success('字段已删除')
}

function moveField(index, offset) {
  const nextIndex = index + offset

  if (nextIndex < 0 || nextIndex >= pageSchema.fields.length) {
    return
  }

  const [field] = pageSchema.fields.splice(index, 1)
  pageSchema.fields.splice(nextIndex, 0, field)
  selectedFieldId.value = field.id
  markSchemaDirty()
}

function handleFieldSort() {
  syncModels()
  markSchemaDirty()
}

function handleSetterChange(setter) {
  if (setter.structural) {
    syncModels()
  }

  markSchemaDirty()
}

function handleSetterCommit(setter) {
  if (setter.prop === 'prop') {
    normalizeFieldProp()
  }
}

function handleFieldTypeChange() {
  if (!selectedField.value) {
    return
  }

  const current = selectedField.value
  const normalized = normalizeField(
    {
      id: current.id,
      label: current.label,
      prop: current.prop,
      type: current.type,
      required: current.required,
      searchable: current.searchable,
      tableVisible: current.tableVisible,
      formVisible: current.formVisible,
    },
    pageSchema.fields.indexOf(current) + 1,
    pageSchema.fields,
  )
  Object.keys(current).forEach((key) => {
    delete current[key]
  })
  Object.assign(current, normalized)
  syncModels()
  markSchemaDirty()
}

function normalizeFieldProp() {
  if (!selectedField.value) {
    return
  }

  const fallback = `${selectedField.value.type}_${pageSchema.fields.indexOf(selectedField.value) + 1}`
  const normalizedProp = normalizeProp(selectedField.value.prop, fallback)
  selectedField.value.prop = ensureUniqueProp(normalizedProp, selectedField.value.id, pageSchema.fields)
  syncModels()
  markSchemaDirty()
}

function addOption() {
  if (!selectedField.value) {
    return
  }

  selectedField.value.options.push({
    label: `选项${selectedField.value.options.length + 1}`,
    value: `option_${selectedField.value.options.length + 1}`,
  })
  markSchemaDirty()
}

function removeOption(index) {
  if (!selectedField.value) {
    return
  }

  selectedField.value.options.splice(index, 1)
  selectedField.value.options = normalizeOptions(selectedField.value.options)
  markSchemaDirty()
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

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingRecordId.value = row.id
  dialogTitle.value = '编辑数据'
  clearFormErrors()
  clearObject(originalDialogData)
  formFields.value.forEach((field) => {
    const value = row[field.prop] ?? getFieldInitialValue(field)
    dialogForm[field.prop] = value
    originalDialogData[field.prop] = value
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
    const rules = buildFieldRules(field)
    const value = dialogForm[field.prop]
    const failedRule = rules.find((rule) => !rule.validator(value))

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

function clearObject(target) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })
}

function toPlainRecord(source) {
  return formFields.value.reduce((record, field) => {
    record[field.prop] = source[field.prop]
    return record
  }, {})
}

function isFieldSelected(field) {
  return selectedFieldId.value === field.id
}

function markSchemaDirty() {
  setEditorStatus('dirty')
}

function setEditorStatus(status) {
  editorStatus.value = status
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
  } catch (error) {
    versions.value = []
    ElMessage.error('读取版本失败，请确认后端服务已启动')
  }
}

async function restoreVersion(version) {
  await ElMessageBox.confirm(`确认回滚到版本 ${version.version_no} 吗？`, '版本回滚', { type: 'warning' })

  try {
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
  } catch (error) {
    ElMessage.error('回滚失败，请确认后端服务已启动')
  }
}

function buildVersionSummary(schema) {
  return JSON.stringify(
    {
      title: schema.title,
      fields: schema.fields?.map((field) => ({
        label: field.label,
        prop: field.prop,
        type: field.type,
      })),
      charts: schema.charts || [],
    },
    null,
    2,
  )
}

function downloadSchema() {
  downloadTextFile(`${pageSchema.id || 'page'}-schema.json`, buildSchemaJson(toPlainSchema()), 'application/json;charset=utf-8')
}

function downloadVueSfc() {
  downloadTextFile(`${pageSchema.id || 'page'}.vue`, buildVueSfc(toPlainSchema()), 'text/plain;charset=utf-8')
}

function emitEditorStatus() {
  emit('editor-status-change', {
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

function buildDemoRows() {
  return [
    { id: 1, username: 'admin', nickname: '系统管理员', role: 'admin', status: 'enabled', createdAt: '2026-05-01' },
    { id: 2, username: 'zhangsan', nickname: '张三', role: 'user', status: 'enabled', createdAt: '2026-05-03' },
    { id: 3, username: 'lisi', nickname: '李四', role: 'user', status: 'disabled', createdAt: '2026-05-08' },
    { id: 4, username: 'wangwu', nickname: '王五', role: 'guest', status: 'enabled', createdAt: '2026-05-12' },
  ]
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
  grid-template-columns: 232px minmax(560px, 1fr) 360px;
  gap: 12px;
  height: calc(100vh - 88px);
  min-height: 760px;
}

.material-panel,
.canvas-panel,
.property-panel {
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.panel-section,
.property-section {
  padding: 14px;
  border-bottom: 1px solid #eef2f7;
}

.panel-heading,
.property-header,
.block-title,
.table-toolbar,
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading span,
.property-header strong,
.block-title strong,
.table-toolbar strong {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.panel-heading small,
.property-header span,
.block-title span,
.table-toolbar span,
.pagination-row {
  color: #6b7280;
  font-size: 12px;
}

.material-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.group-title {
  grid-column: 1 / -1;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.material-card,
.module-card {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  color: #374151;
  font: inherit;
  font-size: 13px;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;
}

.module-card {
  width: 100%;
  margin-top: 8px;
}

.material-card:hover,
.module-card:hover,
.module-card.active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.canvas-panel {
  padding: 16px;
}

.canvas-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.canvas-header h1 {
  margin: 4px 0;
  color: #111827;
  font-size: 24px;
}

.canvas-header p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.canvas-block,
.metrics-grid,
.chart-grid {
  border: 1px solid transparent;
  border-radius: 6px;
}

.canvas-block.selected,
.metrics-grid.selected,
.chart-grid.selected {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgb(37 99 235 / 8%);
}

.search-block {
  padding: 14px;
  margin-bottom: 14px;
  background: #f9fafb;
}

.search-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  align-items: end;
  margin-top: 12px;
}

.search-actions,
.toolbar-actions {
  display: flex;
  gap: 8px;
}

.search-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.toolbar-actions {
  justify-content: flex-end;
}

.field-target {
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.field-target.active {
  background: #eff6ff;
  border-color: #2563eb;
}

.table-block {
  overflow: hidden;
  margin-bottom: 14px;
  border-color: #e5e7eb;
}

.table-toolbar {
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

.data-table {
  width: 100%;
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

.column-select-target.active,
.column-select-target:hover {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.pagination-row {
  padding: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
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

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.property-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 14px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.property-header strong,
.property-header span {
  display: block;
}

.property-header span {
  margin-top: 3px;
}

.section-title {
  margin-bottom: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
}

.option-setter {
  display: grid;
  gap: 8px;
  width: 100%;
}

.option-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}

.field-list {
  display: grid;
  gap: 8px;
}

.field-list-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.field-list-item.active {
  background: #eff6ff;
  border-color: #2563eb;
}

.drag-handle,
.field-pick {
  padding: 0;
  color: #374151;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.drag-handle {
  color: #9ca3af;
}

.field-pick span,
.field-pick small {
  display: block;
}

.field-pick span {
  font-size: 13px;
  font-weight: 700;
}

.field-pick small {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.field-order-actions {
  display: flex;
  gap: 2px;
}

.delete-field-button {
  width: 100%;
  margin-top: 12px;
}

.empty-property {
  padding: 18px 14px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.7;
}

.dialog-field-target {
  padding: 8px;
}

.version-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.version-item strong,
.version-item span,
.version-item small {
  display: block;
}

.version-item small {
  color: #8a95a8;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-detail {
  margin-top: 16px;
}

.version-detail pre {
  max-height: 260px;
  padding: 12px;
  overflow: auto;
  background: #f8fafc;
  border-radius: 6px;
}

.export-dialog {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.export-dialog p {
  flex-basis: 100%;
  margin: 0 0 4px;
  color: #5d6b82;
}

:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.schema-field-control) {
  width: 100%;
}

@media (max-width: 1280px) {
  .designer {
    grid-template-columns: 214px minmax(520px, 1fr) 330px;
  }

  .search-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
