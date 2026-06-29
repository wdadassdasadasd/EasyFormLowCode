<template>
  <div class="designer">
    <div v-if="isCompactLayout" class="designer-compact-toolbar">
      <el-button plain size="small" @click="showMaterialPanel = !showMaterialPanel">
        {{ showMaterialPanel ? '收起组件库' : '展开组件库' }}
      </el-button>
      <el-button plain size="small" @click="showPropertyPanel = !showPropertyPanel">
        {{ showPropertyPanel ? '收起属性面板' : '展开属性面板' }}
      </el-button>
    </div>

    <template v-if="isCompactLayout">
      <el-drawer :model-value="showMaterialPanel" direction="ltr" size="320px" @update:model-value="showMaterialPanel = $event">
        <DesignerMaterialPanel
          :icon-map="iconMap"
          :analytics-materials="analyticsMaterials"
          :material-drag-group="materialDragGroup"
          :material-groups="materialGroups"
          :page-modules="pageModules"
          :selected-area="selectedArea"
          @add-field="addField"
          @add-analytics="addAnalytics"
          @material-drag-end="handleMaterialDragEnd"
          @material-drag-start="handleMaterialDragStart"
          @select-area="handleAreaSelect"
        />
      </el-drawer>
    </template>
    <DesignerMaterialPanel
      v-else
      :icon-map="iconMap"
      :analytics-materials="analyticsMaterials"
      :material-drag-group="materialDragGroup"
      :material-groups="materialGroups"
      :page-modules="pageModules"
      :selected-area="selectedArea"
      @add-field="addField"
      @add-analytics="addAnalytics"
      @material-drag-end="handleMaterialDragEnd"
      @material-drag-start="handleMaterialDragStart"
      @select-area="handleAreaSelect"
    />

    <DesignerCanvas
      :dialog-form="dialogForm"
      :drop-targets="dropTargets"
      :field-drop-group="fieldDropGroup"
      :form-fields="formFields"
      :is-dragging-material="isDraggingMaterial"
      :is-offline="isOffline"
      :last-request="lastRequest"
      :request-history="requestHistory"
      :metric-cards="metricCards"
      :normalized-charts="normalizedCharts"
      :page-actions="effectivePageActions"
      :page-schema="pageSchema"
      :pagination="pagination"
      :row-actions="rowActions"
      :record-rows="recordRows"
      :records-loading="recordsLoading"
      :readonly-runtime="readonlyRuntime"
      :runtime-error="runtimeError"
      :search-model="searchModel"
      :searchable-fields="searchableFields"
      :selected-area="selectedArea"
      :batch-actions="batchActions"
      :selected-chart-id="selectedChartId"
      :selected-field-id="selectedFieldId"
      :selected-metric-id="selectedMetricId"
      :selected-rows="selectedRows"
      :stats-rows="statsRows"
      :status-text="statusText"
      :table-fields="tableFields"
      @apply-search="applySearch"
      @analytics-drop="handleAnalyticsDrop"
      @delete-record="deleteRecord"
      @delete-selected="deleteSelectedRows"
      @drop-change="handleDropChange"
      @open-create="openCreateDialog"
      @open-edit="openEditDialog"
      @open-selected-edit="openSelectedEditDialog"
      @run-batch-action="runBatchAction"
      @run-row-action="runRowAction"
      @reset-search="resetSearch"
      @select-area="handleAreaSelect"
      @select-chart="selectChart"
      @select-field="selectField"
      @select-metric="selectMetric"
      @update-dialog-field="updateDialogField"
      @update-pagination="updatePagination"
      @update-search-field="updateSearchField"
      @update-selected-rows="selectedRows = $event"
    />

    <template v-if="isCompactLayout">
      <el-drawer :model-value="showPropertyPanel" size="360px" @update:model-value="showPropertyPanel = $event">
        <DesignerPropertyPanel
          :datasource-capabilities="datasourceCapabilities"
          :field-prop-feedback="fieldPropFeedback"
          :material-field-types="materialFieldTypes"
          :page-schema="pageSchema"
          :selected-area="selectedArea"
          :selected-chart-id="selectedChartId"
          :selected-field="selectedField"
          :selected-metric-id="selectedMetricId"
          :setter-groups="setterGroups"
          :uses-option-default-value="usesOptionDefaultValue"
          @add-metric="addMetric"
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
          @remove-metric="removeMetric"
          @select-chart="selectChart"
          @select-field="selectField"
          @select-metric="selectMetric"
        />
      </el-drawer>
    </template>
    <DesignerPropertyPanel
      v-else
      :datasource-capabilities="datasourceCapabilities"
      :field-prop-feedback="fieldPropFeedback"
      :material-field-types="materialFieldTypes"
      :page-schema="pageSchema"
      :selected-area="selectedArea"
      :selected-chart-id="selectedChartId"
      :selected-field="selectedField"
      :selected-metric-id="selectedMetricId"
      :setter-groups="setterGroups"
      :uses-option-default-value="usesOptionDefaultValue"
      @add-metric="addMetric"
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
      @remove-metric="removeMetric"
      @select-chart="selectChart"
      @select-field="selectField"
      @select-metric="selectMetric"
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
      @download-template="downloadTemplate"
      @download-vue-sfc="downloadVueSfc"
      @import-schema="importSchemaFile"
      @import-template="importTemplateFile"
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'

import DesignerCanvas from '../components/designer/DesignerCanvas.vue'
import DesignerMaterialPanel from '../components/designer/DesignerMaterialPanel.vue'
import DesignerOverlays from '../components/designer/DesignerOverlays.vue'
import DesignerPropertyPanel from '../components/designer/DesignerPropertyPanel.vue'
import { publishPage, savePageSchema as savePageSchemaRequest, syncEntityPage as syncEntityPageRequest } from '../api/pages'
import { validatePageSchemaContract } from '../api/schemaContract'
import { listPageVersions, restorePageVersion } from '../api/versions'
import { usePageSchema } from '../composables/usePageSchema'
import { useSchemaHistory } from '../composables/useSchemaHistory'
import { setLocalPreview } from '../composables/previewSession'
import { useRuntimeCrud } from '../composables/useRuntimeCrud'
import { useSchemaModels } from '../composables/useSchemaModels'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import { buildDemoRows } from '../schema/defaultSchema'
import { createDroppedField } from '../schema/dropField'
import {
  MATERIAL_FIELD_TYPES,
  getPropertySetters,
  normalizeField,
  normalizeOptions,
} from '../schema/fieldTypes'
import { normalizePageSchema, validatePageSchema } from '../schema/pageSchema'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'
import { buildSchemaJson, buildTemplateJson, buildVueSfc, downloadTextFile, parseImportedSchema } from '../utils/codeExporter'
import { applyDatasourceCapabilityToActions, normalizeEditableFieldProp } from '../utils/schemaEditor'

const emit = defineEmits(['editor-status-change'])
const route = useRoute()
const router = useRouter()
const selectedFieldId = ref('')
const selectedArea = ref('search')
const selectedMetricId = ref('')
const selectedChartId = ref('')
const fieldPropFeedback = ref('')
const isDraggingMaterial = ref(false)
const isCompactLayout = ref(false)
const showMaterialPanel = ref(true)
const showPropertyPanel = ref(true)
const statusText = ref('正在加载页面配置...')
const editorStatus = ref('loading')
const versionDrawerVisible = ref(false)
const versions = ref([])
const selectedVersion = ref(null)
const exportDialogVisible = ref(false)
const bypassUnsavedConfirm = ref(false)
const pageId = computed(() => String(route.query.pageId || DEFAULT_PAGE_ID))
const runtimeMode = 'draft'
let syncSchemaModels = () => {}
const schemaHistory = useSchemaHistory()

const { pageSchema, pageStatus, replaceSchema, loadSchema: loadPageSchema, toPlainSchema } = usePageSchema({
  pageId,
  syncModels: () => syncSchemaModels(),
  afterReplace: (schema) => {
    selectedFieldId.value = schema.fields[0]?.id || ''
    syncAnalyticsSelection(schema)
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
  statsMetrics,
  statsCharts,
  runtimeError,
  isOffline,
  lastRequest,
  requestHistory,
  readonlyRuntime,
  datasourceCapabilities,
  pagination,
  rowActions,
  batchActions,
  loadRecords,
  resetSearch,
  applySearch,
  openCreateDialog,
  openEditDialog,
  openSelectedEditDialog,
  deleteSelectedRows,
  deleteRecord,
  runRowAction,
  runBatchAction,
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
  DataAnalysis,
  Histogram,
}

const analyticsMaterials = [
  { type: 'metric', label: '统计卡片', description: '显示总数或条件统计', icon: 'DataAnalysis' },
  { type: 'pie', label: '饼图', description: '按分类字段展示占比', icon: 'Histogram' },
  { type: 'bar', label: '柱状图', description: '按分类字段比较数量', icon: 'Histogram' },
]

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
const effectivePageActions = computed(() => applyDatasourceCapabilityToActions(pageSchema.actions || {}, pageSchema.datasource))
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
const metricCards = computed(() => (statsMetrics.value.length ? statsMetrics.value : buildMetricCards(statsRows.value, pageSchema.fields, pageSchema.metrics)))
const normalizedCharts = computed(() => buildChartViewModels(pageSchema, statsCharts.value))

function buildChartViewModels(schema, aggregates = []) {
  const configured = schema.charts?.length ? schema.charts : buildDefaultCharts(schema.fields)
  const aggregateById = new Map((aggregates || []).map((chart) => [chart.id, chart]))
  return configured.map((chart) => ({
    ...chart,
    aggregate: aggregateById.get(chart.id) || null,
  }))
}

function syncAnalyticsSelection(schema = pageSchema) {
  const metricIds = (schema.metrics || []).map((metric) => metric.id)
  const chartIds = (schema.charts || []).map((chart) => chart.id)
  if (!metricIds.includes(selectedMetricId.value)) {
    selectedMetricId.value = metricIds[0] || ''
  }
  if (!chartIds.includes(selectedChartId.value)) {
    selectedChartId.value = chartIds[0] || ''
  }
}

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

watch(selectedFieldId, () => {
  fieldPropFeedback.value = ''
})

watch(
  () => [(pageSchema.metrics || []).map((metric) => metric.id).join('|'), (pageSchema.charts || []).map((chart) => chart.id).join('|')],
  () => {
    syncAnalyticsSelection()
  },
  { immediate: true },
)

watch(pageId, async () => {
  setEditorStatus('loading')
  await refreshDesigner()
})

onMounted(async () => {
  syncCompactLayout()
  await refreshDesigner()
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleHistoryShortcut)
  window.addEventListener('resize', syncCompactLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleHistoryShortcut)
  window.removeEventListener('resize', syncCompactLayout)
})

onBeforeRouteLeave(async () => {
  return confirmDiscardChanges()
})

onBeforeRouteUpdate(async () => {
  return confirmDiscardChanges()
})

async function refreshDesigner() {
  await loadSchema()
  await loadRecords()
}

async function loadSchema() {
  const result = await loadPageSchema()
  schemaHistory.reset(toPlainSchema())
  setEditorStatus(result?.status === 'published' ? 'published' : result ? 'saved' : 'dirty')
  statusText.value = result ? '已从后端恢复页面配置' : '后端不可用，当前使用前端演示配置'
}

async function saveSchema() {
  const plainSchema = toPlainSchema()
  let validation = validatePageSchema(plainSchema)
  try {
    validation = await validatePageSchemaContract(pageId.value, plainSchema)
  } catch {
    validation = validatePageSchema(plainSchema)
  }
  if (!validation.valid) {
    ElMessage.error(`页面配置不合法：${validation.errors[0]}`)
    return
  }
  try {
    const result = await savePageSchemaRequest(pageId.value, {
      name: pageSchema.title,
      schema_json: validation.schema_json || plainSchema,
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

async function syncEntityPage() {
  if (!pageSchema.entity?.id) {
    ElMessage.info('当前页面未绑定数据实体')
    return
  }
  try {
    const result = await syncEntityPageRequest(pageId.value)
    replaceSchema(result.schema_json)
    setEditorStatus('dirty')
    statusText.value = '已同步实体新增字段，请保存并发布'
    ElMessage.success('实体字段已同步到页面')
  } catch (error) {
    ElMessage.error(error?.message || '实体字段同步失败')
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
  if (isCompactLayout.value) {
    showPropertyPanel.value = true
  }
}

function selectMetric(metricId) {
  selectedArea.value = 'metrics'
  selectedMetricId.value = metricId
  selectedFieldId.value = ''
  if (isCompactLayout.value) {
    showPropertyPanel.value = true
  }
}

function selectChart(chartId) {
  selectedArea.value = 'charts'
  selectedChartId.value = chartId
  selectedFieldId.value = ''
  if (isCompactLayout.value) {
    showPropertyPanel.value = true
  }
}

function handleAreaSelect(area) {
  selectedArea.value = area
  selectedFieldId.value = ''
  if (area === 'metrics') {
    selectedMetricId.value = pageSchema.metrics?.[0]?.id || ''
  }
  if (area === 'charts') {
    selectedChartId.value = pageSchema.charts?.[0]?.id || ''
  }
  if (isCompactLayout.value && ['search', 'table', 'form'].includes(area)) {
    showMaterialPanel.value = true
  }
}

function addMetric() {
  const id = `metric_${Date.now()}`
  pageSchema.metrics = [...(pageSchema.metrics || []), {
    id,
    title: '新统计卡片',
    type: 'total',
    tone: 'blue',
  }]
  selectMetric(id)
  markSchemaDirty()
}

function addAnalytics(type) {
  if (type === 'metric') {
    addMetric()
    return
  }
  addChart(type)
}

function handleAnalyticsDrop(area, event) {
  const type = event?.dataTransfer?.getData('application/x-lowcode-analytics')
  if (!type || (area === 'metrics' && type !== 'metric') || (area === 'charts' && type === 'metric')) return
  addAnalytics(type)
}

function removeMetric(index) {
  const removedId = pageSchema.metrics[index]?.id
  pageSchema.metrics.splice(index, 1)
  if (selectedMetricId.value === removedId) {
    selectedMetricId.value = pageSchema.metrics[Math.max(index - 1, 0)]?.id || pageSchema.metrics[0]?.id || ''
  }
  markSchemaDirty()
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

  const nextPatch = { ...patch }
  if ('prop' in nextPatch) {
    const fallback = `${field.type}_${pageSchema.fields.indexOf(field) + 1}`
    const normalizedProp = normalizeEditableFieldProp(nextPatch.prop, field.id, pageSchema.fields, fallback)
    nextPatch.prop = normalizedProp.value
    fieldPropFeedback.value = normalizedProp.message
  }

  Object.assign(field, nextPatch)
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
  const normalizedProp = normalizeEditableFieldProp(selectedField.value.prop, selectedField.value.id, pageSchema.fields, fallback)
  selectedField.value.prop = normalizedProp.value
  fieldPropFeedback.value = normalizedProp.message
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

function addChart(chartType = 'pie') {
  const field = pageSchema.fields[0]
  const nextCharts = [...normalizedCharts.value]
  const id = `chart_${Date.now()}`
  nextCharts.push({
    id,
    type: chartType,
    title: '新图表',
    dimension: field?.prop || '',
    metric: 'count',
  })
  pageSchema.charts = nextCharts.map(({ aggregate, ...chart }) => chart)
  selectChart(id)
  markSchemaDirty()
}

function removeChart(index) {
  const removedId = pageSchema.charts[index]?.id
  pageSchema.charts.splice(index, 1)
  if (selectedChartId.value === removedId) {
    selectedChartId.value = pageSchema.charts[Math.max(index - 1, 0)]?.id || pageSchema.charts[0]?.id || ''
  }
  markSchemaDirty()
}

function markSchemaDirty() {
  schemaHistory.commit(toPlainSchema())
  setEditorStatus('dirty')
}

function undoSchema() {
  const snapshot = schemaHistory.undo()
  if (!snapshot) return
  replaceSchema(snapshot)
  setEditorStatus('dirty')
}

function redoSchema() {
  const snapshot = schemaHistory.redo()
  if (!snapshot) return
  replaceSchema(snapshot)
  setEditorStatus('dirty')
}

function handleHistoryShortcut(event) {
  if (!event.ctrlKey && !event.metaKey) return
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoSchema() : undoSchema()
  }
}

function syncCompactLayout() {
  isCompactLayout.value = window.innerWidth <= 1080
  if (!isCompactLayout.value) {
    showMaterialPanel.value = true
    showPropertyPanel.value = true
  }
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges()) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

function hasUnsavedChanges() {
  return editorStatus.value === 'dirty'
}

async function confirmDiscardChanges() {
  if (bypassUnsavedConfirm.value) {
    bypassUnsavedConfirm.value = false
    return true
  }

  if (!hasUnsavedChanges()) {
    return true
  }

  try {
    await ElMessageBox.confirm('当前页面有未保存修改，确认离开并放弃本地更改吗？', '未保存修改', {
      type: 'warning',
      confirmButtonText: '离开页面',
      cancelButtonText: '继续编辑',
    })
    return true
  } catch {
    return false
  }
}

function setEditorStatus(status) {
  editorStatus.value = status
}

async function previewPage() {
  setLocalPreview(pageId.value, toPlainSchema())
  bypassUnsavedConfirm.value = true
  try {
    await router.push({ path: '/preview', query: { pageId: pageId.value, mode: 'draft', local: '1' } })
  } catch (error) {
    bypassUnsavedConfirm.value = false
    throw error
  }
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
    schemaHistory.reset(toPlainSchema())
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

function downloadTemplate() {
  downloadTextFile(`${pageSchema.id || 'page'}-template.json`, buildTemplateJson(toPlainSchema()), 'application/json;charset=utf-8')
}

function downloadVueSfc() {
  downloadTextFile(`${pageSchema.id || 'page'}.vue`, buildVueSfc(toPlainSchema()), 'text/plain;charset=utf-8')
}

async function importSchemaFile(file) {
  try {
    const importedSchema = parseImportedSchema(await readFileText(file), pageId.value)
    replaceSchema(importedSchema)
    markSchemaDirty()
    ElMessage.success('Schema 已导入到当前草稿')
  } catch (error) {
    ElMessage.error(error?.message || 'Schema 导入失败')
  }
}

async function importTemplateFile(file) {
  try {
    const importedTemplate = parseImportedSchema(await readFileText(file), pageId.value)
    const currentSchema = toPlainSchema()
    const preserveRuntimeDatasource = currentSchema.entity?.id || currentSchema.datasource?.mode === 'runtime'
    const mergedSchema = normalizePageSchema(pageId.value, {
      ...currentSchema,
      ...importedTemplate,
      id: currentSchema.id,
      title: currentSchema.title,
      entity: currentSchema.entity,
      datasource: preserveRuntimeDatasource ? currentSchema.datasource : (importedTemplate.datasource || currentSchema.datasource),
      api: preserveRuntimeDatasource ? currentSchema.datasource : (importedTemplate.datasource || currentSchema.datasource),
    })
    replaceSchema(mergedSchema)
    markSchemaDirty()
    ElMessage.success('Template 已应用到当前页面草稿')
  } catch (error) {
    ElMessage.error(error?.message || 'Template 导入失败')
  }
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'utf-8')
  })
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
  syncEntityPage,
  hasUnsavedChanges,
  redoSchema,
  editorStatusText,
  editorStatusType,
  undoSchema,
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

.designer-compact-toolbar {
  display: none;
}

@media (max-width: 1440px) {
  .designer {
    grid-template-columns: 220px minmax(0, 1fr) 340px;
  }
}

@media (max-width: 1080px) {
  .designer {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 0;
  }

  .designer-compact-toolbar {
    display: flex;
    gap: 8px;
  }

  .designer > :nth-child(1) { order: 2; }
  .designer > :nth-child(2) { order: 1; }
  .designer > :nth-child(3) { order: 3; }
}
</style>
