<template>
  <div class="designer">
    <DesignerMaterialPanel
      :icon-map="iconMap"
      :material-drag-group="materialDragGroup"
      :material-groups="materialGroups"
      :page-modules="pageModules"
      :selected-area="selectedArea"
      @add-field="addField"
      @material-drag-end="handleMaterialDragEnd"
      @material-drag-start="handleMaterialDragStart"
      @select-area="selectedArea = $event"
    />

    <DesignerCanvas
      :dialog-form="dialogForm"
      :drop-targets="dropTargets"
      :field-drop-group="fieldDropGroup"
      :form-fields="formFields"
      :is-dragging-material="isDraggingMaterial"
      :is-offline="isOffline"
      :last-request="lastRequest"
      :metric-cards="metricCards"
      :normalized-charts="normalizedCharts"
      :page-actions="pageSchema.actions"
      :page-schema="pageSchema"
      :pagination="pagination"
      :record-rows="recordRows"
      :records-loading="recordsLoading"
      :runtime-error="runtimeError"
      :search-model="searchModel"
      :searchable-fields="searchableFields"
      :selected-area="selectedArea"
      :selected-field-id="selectedFieldId"
      :selected-rows="selectedRows"
      :stats-rows="statsRows"
      :status-text="statusText"
      :table-fields="tableFields"
      @apply-search="applySearch"
      @delete-record="deleteRecord"
      @delete-selected="deleteSelectedRows"
      @drop-change="handleDropChange"
      @open-create="openCreateDialog"
      @open-edit="openEditDialog"
      @open-selected-edit="openSelectedEditDialog"
      @reset-search="resetSearch"
      @select-area="selectedArea = $event"
      @select-field="selectField"
      @update-dialog-field="updateDialogField"
      @update-pagination="updatePagination"
      @update-search-field="updateSearchField"
      @update-selected-rows="selectedRows = $event"
    />

    <DesignerPropertyPanel
      :material-field-types="materialFieldTypes"
      :page-schema="pageSchema"
      :selected-area="selectedArea"
      :selected-field="selectedField"
      :setter-groups="setterGroups"
      :uses-option-default-value="usesOptionDefaultValue"
      @add-chart="addChart"
      @add-option="addOption"
      @change-field-type="handleFieldTypeChange"
      @delete-selected-field="deleteSelectedField"
      @field-sort="handleFieldSort"
      @move-field="moveField"
      @normalize-field-prop="normalizeSelectedFieldProp"
      @patch-field="applyFieldPatch"
      @patch-page="applyPagePatch"
      @remove-chart="removeChart"
      @remove-option="removeOption"
      @select-field="selectField"
    />

    <DesignerOverlays
      :dialog-form="dialogForm"
      :dialog-title="dialogTitle"
      :dialog-visible="dialogVisible"
      :export-dialog-visible="exportDialogVisible"
      :form-errors="formErrors"
      :form-fields="formFields"
      :selected-field-id="selectedFieldId"
      :selected-version="selectedVersion"
      :submit-loading="submitLoading"
      :version-drawer-visible="versionDrawerVisible"
      :versions="versions"
      @download-schema="downloadSchema"
      @download-vue-sfc="downloadVueSfc"
      @load-versions="loadVersions"
      @restore-version="restoreVersion"
      @select-field="selectField"
      @select-version="setSelectedVersion"
      @submit-dialog="submitDialog"
      @update-dialog-field="updateDialogField"
      @update:dialogVisible="setDialogVisible"
      @update:exportDialogVisible="setExportDialogVisible"
      @update:versionDrawerVisible="setVersionDrawerVisible"
    />
  </div>
</template>

<script setup>
import {
  ArrowDown,
  Calendar,
  CircleCheck,
  DataAnalysis,
  Document,
  EditPen,
  Grid,
  Histogram,
  Search,
  SwitchButton,
  Tickets,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DesignerCanvas from '../components/designer/DesignerCanvas.vue'
import DesignerMaterialPanel from '../components/designer/DesignerMaterialPanel.vue'
import DesignerOverlays from '../components/designer/DesignerOverlays.vue'
import DesignerPropertyPanel from '../components/designer/DesignerPropertyPanel.vue'
import { publishPage, savePageSchema as savePageSchemaRequest } from '../api/pages'
import { listPageVersions, restorePageVersion } from '../api/versions'
import { usePageSchema } from '../composables/usePageSchema'
import { useRuntimeCrud } from '../composables/useRuntimeCrud'
import { useSchemaModels } from '../composables/useSchemaModels'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import { buildDemoRows } from '../schema/defaultSchema'
import { createDroppedField } from '../schema/dropField'
import {
  MATERIAL_FIELD_TYPES,
  ensureUniqueProp,
  getPropertySetters,
  normalizeField,
  normalizeOptions,
  normalizeProp,
} from '../schema/fieldTypes'
import { normalizePageSchema } from '../schema/pageSchema'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'
import { buildSchemaJson, buildVueSfc, downloadTextFile } from '../utils/codeExporter'

const emit = defineEmits(['editor-status-change'])
const route = useRoute()
const router = useRouter()
const selectedFieldId = ref('')
const selectedArea = ref('search')
const isDraggingMaterial = ref(false)
const statusText = ref('正在加载页面配置...')
const editorStatus = ref('loading')
const versionDrawerVisible = ref(false)
const versions = ref([])
const selectedVersion = ref(null)
const exportDialogVisible = ref(false)
const pageId = computed(() => String(route.query.pageId || DEFAULT_PAGE_ID))
const runtimeMode = 'draft'
let syncSchemaModels = () => {}

const { pageSchema, pageStatus, replaceSchema, loadSchema: loadPageSchema, toPlainSchema } = usePageSchema({
  pageId,
  syncModels: () => syncSchemaModels(),
  afterReplace: (schema) => {
    selectedFieldId.value = schema.fields[0]?.id || ''
  },
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
  isOffline,
  lastRequest,
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

const materialFieldTypes = MATERIAL_FIELD_TYPES
const dropTargets = reactive({
  search: [],
  table: [],
  form: [],
})
const materialDragGroup = {
  name: 'page-fields',
  pull: 'clone',
  put: false,
}
const fieldDropGroup = {
  name: 'page-fields',
  pull: false,
  put: true,
}

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
  { key: 'form', label: '弹窗表单', icon: Tickets },
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
const metricCards = computed(() => buildMetricCards(statsRows.value, pageSchema.fields))
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

watch(pageId, async () => {
  setEditorStatus('loading')
  await refreshDesigner()
})

onMounted(async () => {
  await refreshDesigner()
})

async function refreshDesigner() {
  await loadSchema()
  await loadRecords()
}

async function loadSchema() {
  const result = await loadPageSchema()
  setEditorStatus(result?.status === 'published' ? 'published' : result ? 'saved' : 'dirty')
  statusText.value = result ? '已从后端恢复页面配置' : '后端不可用，当前使用前端演示配置'
}

async function saveSchema() {
  try {
    const result = await savePageSchemaRequest(pageId.value, {
      name: pageSchema.title,
      schema_json: toPlainSchema(),
    })
    pageStatus.value = result.status
    setEditorStatus('saved')
    statusText.value = '页面配置已保存，并生成历史版本'
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error(error?.message || '保存失败，请确认后端服务已启动')
  }
}

async function publishSchema() {
  try {
    const result = await publishPage(pageId.value)
    pageStatus.value = result.status
    setEditorStatus('published')
    statusText.value = '页面已发布，可进入运行预览'
    ElMessage.success('发布成功')
  } catch (error) {
    ElMessage.error(error?.message || '发布失败，请确认后端服务已启动')
  }
}

function addField(type, area = 'table') {
  const field = createDroppedField(type, area, pageSchema.fields)
  pageSchema.fields.push(field)
  selectedFieldId.value = field.id
  selectedArea.value = area
  syncModels()
  markSchemaDirty()
}

function handleMaterialDragStart() {
  isDraggingMaterial.value = true
}

function handleMaterialDragEnd() {
  isDraggingMaterial.value = false
  clearDropTargets()
}

function handleDropChange(area, event) {
  const dropped = event?.added?.element

  if (!dropped) {
    return
  }

  addField(dropped.type, area)
  clearDropTargets()
}

function clearDropTargets() {
  Object.values(dropTargets).forEach((items) => {
    items.splice(0, items.length)
  })
}

function updateSearchField({ prop, value }) {
  searchModel[prop] = value
}

function updateDialogField({ prop, value }) {
  dialogForm[prop] = value
}

function updatePagination(patch) {
  Object.assign(pagination, patch)
}

function selectField(fieldId) {
  selectedFieldId.value = fieldId
}

function applyPagePatch(patch) {
  const normalized = normalizePageSchema(pageId.value, { ...toPlainSchema(), ...patch })
  Object.assign(pageSchema, normalized)
  markSchemaDirty()
}

function applyFieldPatch(fieldId, patch, structural = false) {
  const field = pageSchema.fields.find((item) => item.id === fieldId)
  if (!field) {
    return
  }

  Object.assign(field, patch)
  if (Array.isArray(field.options)) {
    field.options = normalizeOptions(field.options)
  }
  if (structural) {
    syncModels()
  }
  markSchemaDirty()
}

async function deleteSelectedField() {
  if (!selectedField.value) {
    return
  }

  await ElMessageBox.confirm(`确认删除字段“${selectedField.value.label}”吗？`, '删除字段', { type: 'warning' })
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

function handleFieldTypeChange(nextType) {
  if (!selectedField.value) {
    return
  }

  const current = selectedField.value
  const normalized = normalizeField(
    {
      id: current.id,
      label: current.label,
      prop: current.prop,
      type: nextType,
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

function normalizeSelectedFieldProp() {
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
  selectedField.value.options = normalizeOptions(selectedField.value.options)
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

function addChart() {
  const field = pageSchema.fields[0]
  const nextCharts = [...normalizedCharts.value]
  nextCharts.push({
    id: `chart_${Date.now()}`,
    type: 'pie',
    title: '新图表',
    dimension: field?.prop || '',
    metric: 'count',
  })
  pageSchema.charts = nextCharts
  selectedArea.value = 'charts'
  markSchemaDirty()
}

function removeChart(index) {
  pageSchema.charts.splice(index, 1)
  markSchemaDirty()
}

function markSchemaDirty() {
  setEditorStatus('dirty')
}

function setEditorStatus(status) {
  editorStatus.value = status
}

function previewPage() {
  router.push({ path: '/preview', query: { pageId: pageId.value, mode: 'draft' } })
}

function showVersion() {
  versionDrawerVisible.value = true
}

function exportSchema() {
  exportDialogVisible.value = true
}

function setDialogVisible(value) {
  dialogVisible.value = value
}

function setVersionDrawerVisible(value) {
  versionDrawerVisible.value = value
}

function setExportDialogVisible(value) {
  exportDialogVisible.value = value
}

function setSelectedVersion(value) {
  selectedVersion.value = value
}

async function loadVersions() {
  try {
    versions.value = await listPageVersions(pageId.value)
  } catch (error) {
    versions.value = []
    ElMessage.error(error?.message || '读取版本失败，请确认后端服务已启动')
  }
}

async function restoreVersion(version) {
  await ElMessageBox.confirm(`确认回滚到版本 ${version.version_no} 吗？`, '版本回滚', { type: 'warning' })

  try {
    const result = await restorePageVersion(pageId.value, version.id)
    replaceSchema(result.schema_json)
    pageStatus.value = result.status
    setEditorStatus('saved')
    statusText.value = `已回滚到版本 ${version.version_no}`
    ElMessage.success('回滚成功')
    await loadVersions()
  } catch (error) {
    ElMessage.error(error?.message || '回滚失败，请确认后端服务已启动')
  }
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

@media (max-width: 1440px) {
  .designer {
    grid-template-columns: 220px minmax(0, 1fr) 340px;
  }
}
</style>
