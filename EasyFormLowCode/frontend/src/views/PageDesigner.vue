<template>
  <div class="designer" :class="{ 'designer-stacked': isStackedLayout }" :style="designerGridStyle">
    <div class="designer-panel-toolbar">
      <el-button plain size="small" :icon="Grid" title="切换组件库" @click="toggleMaterialPanel" />
      <el-button plain size="small" :icon="Operation" title="切换属性配置" @click="togglePropertyPanel" />
    </div>

    <template v-if="isCompactLayout">
      <el-drawer :model-value="showMaterialPanel" direction="ltr" size="304px" @update:model-value="setMaterialPanelVisible($event)">
        <DesignerMaterialPanel
          :icon-map="iconMap"
          :analytics-materials="analyticsMaterials"
          :material-drag-group="materialDragGroup"
          :material-groups="materialGroups"
          :page-modules="pageModules"
          :selected-area="selectedArea"
          :show-collapse-toggle="true"
          @add-field="addField"
          @add-analytics="addAnalytics"
          @material-drag-end="handleMaterialDragEnd"
          @material-drag-start="handleMaterialDragStart"
          @select-area="handleAreaSelect"
          @toggle-collapse="setMaterialPanelVisible(false)"
        />
      </el-drawer>
    </template>
    <DesignerMaterialPanel
      v-else-if="showMaterialPanel"
      :icon-map="iconMap"
      :analytics-materials="analyticsMaterials"
      :material-drag-group="materialDragGroup"
      :material-groups="materialGroups"
      :page-modules="pageModules"
      :selected-area="selectedArea"
      :show-collapse-toggle="true"
      @add-field="addField"
      @add-analytics="addAnalytics"
      @material-drag-end="handleMaterialDragEnd"
      @material-drag-start="handleMaterialDragStart"
      @select-area="handleAreaSelect"
      @toggle-collapse="toggleMaterialPanel"
    />

    <DesignerCanvas
      :dialog-form="dialogForm"
      :drop-targets="dropTargets"
      :field-drop-group="fieldDropGroup"
      :form-fields="formFields"
      :is-dragging-material="isDraggingMaterial"
      :is-offline="isOffline"
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
      <el-drawer :model-value="showPropertyPanel" size="320px" @update:model-value="setPropertyPanelVisible($event)">
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
          :show-collapse-toggle="true"
          :uses-option-default-value="usesOptionDefaultValue"
          @add-metric="addMetric"
          @add-chart="addChart"
          @add-option="addOption"
          @change-field-type="handleFieldTypeChange"
          @commit-field-patch="commitSchemaChange"
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
          @toggle-collapse="setPropertyPanelVisible(false)"
        />
      </el-drawer>
    </template>
    <DesignerPropertyPanel
      v-else-if="showPropertyPanel"
      :datasource-capabilities="datasourceCapabilities"
      :field-prop-feedback="fieldPropFeedback"
      :material-field-types="materialFieldTypes"
      :page-schema="pageSchema"
      :selected-area="selectedArea"
      :selected-chart-id="selectedChartId"
      :selected-field="selectedField"
      :selected-metric-id="selectedMetricId"
      :setter-groups="setterGroups"
      :show-collapse-toggle="true"
      :uses-option-default-value="usesOptionDefaultValue"
      @add-metric="addMetric"
      @add-chart="addChart"
      @add-option="addOption"
      @change-field-type="handleFieldTypeChange"
      @commit-field-patch="commitSchemaChange"
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
      @toggle-collapse="togglePropertyPanel"
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
  Clock,
  DataAnalysis,
  Document,
  EditPen,
  Grid,
  Histogram,
  Link,
  Lock,
  Message,
  Operation,
  Phone,
  PriceTag,
  Search,
  Star,
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
import { useDesignerSchemaEditor } from '../composables/useDesignerSchemaEditor'
import { usePageSchema } from '../composables/usePageSchema'
import { setLocalPreview } from '../composables/previewSession'
import { useRuntimeCrud } from '../composables/useRuntimeCrud'
import { useSchemaModels } from '../composables/useSchemaModels'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import { buildDemoRows } from '../schema/defaultSchema'
import { MATERIAL_FIELD_TYPES, getPropertySetters, normalizeField, normalizeOptions } from '../schema/fieldTypes'
import { normalizePageSchema, validatePageSchema } from '../schema/pageSchema'
import { buildDefaultCharts, buildMetricCards } from '../utils/chartAggregator'
import { buildSchemaJson, buildTemplateJson, buildVueSfc, downloadTextFile, parseImportedSchema } from '../utils/codeExporter'
import { applyDatasourceCapabilityToActions, normalizeEditableFieldProp } from '../utils/schemaEditor'

const emit = defineEmits(['editor-status-change'])
const DESIGNER_MATERIAL_PANEL_KEY = 'lowcode_designer_material_collapsed'
const DESIGNER_PROPERTY_PANEL_KEY = 'lowcode_designer_property_collapsed'
const route = useRoute()
const router = useRouter()
const isDraggingMaterial = ref(false)
const isCompactLayout = ref(false)
const showMaterialPanel = ref(false)
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
let syncDesignerSelection = () => {}

const { pageSchema, pageStatus, replaceSchema, loadSchema: loadPageSchema, toPlainSchema } = usePageSchema({
  pageId,
  syncModels: () => syncSchemaModels(),
  afterReplace: (schema) => {
    syncDesignerSelection(schema)
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

const {
  fieldPropFeedback,
  selectedArea,
  selectedChartId,
  selectedField,
  selectedFieldId,
  selectedMetricId,
  addChart: editorAddChart,
  addField: editorAddField,
  addMetric: editorAddMetric,
  addOption: editorAddOption,
  applyFieldPatch: editorApplyFieldPatch,
  applyPagePatch: editorApplyPagePatch,
  commitSchemaChange,
  handleDropChange: editorHandleDropChange,
  handleAreaSelect: editorHandleAreaSelect,
  handleFieldSort: editorHandleFieldSort,
  handleFieldTypeChange: editorHandleFieldTypeChange,
  markSchemaDirty: editorMarkSchemaDirty,
  moveField: editorMoveField,
  normalizeSelectedFieldProp: editorNormalizeSelectedFieldProp,
  redoSchema: editorRedoSchema,
  removeChart: editorRemoveChart,
  removeMetric: editorRemoveMetric,
  removeOption: editorRemoveOption,
  removeSelectedField,
  replaceAndResetHistory,
  resetHistory,
  selectChart: editorSelectChart,
  selectField: editorSelectField,
  selectMetric: editorSelectMetric,
  syncSelectionAfterSchema,
  undoSchema: editorUndoSchema,
} = useDesignerSchemaEditor({
  pageId,
  pageSchema,
  replaceSchema,
  toPlainSchema,
  syncModels,
  setEditorStatus,
  syncAnalyticsSelection,
  openPropertyPanel,
  isCompactLayout,
  getNormalizedCharts: () => normalizedCharts.value,
})
syncDesignerSelection = syncSelectionAfterSchema

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
  Clock,
  SwitchButton,
  CircleCheck,
  DataAnalysis,
  Histogram,
  Lock,
  Message,
  Phone,
  Link,
  Operation,
  Star,
  PriceTag,
}

const analyticsMaterials = [
  { type: 'metric', label: '统计卡片', description: '显示总数、比例和汇总指标', icon: 'DataAnalysis' },
  { type: 'pie', label: '饼图', description: '按分类字段展示占比', icon: 'Histogram' },
  { type: 'bar', label: '柱状图', description: '按分类字段比较数量', icon: 'Histogram' },
  { type: 'line', label: '折线图', description: '适合趋势变化', icon: 'Histogram' },
  { type: 'area', label: '面积图', description: '适合累计趋势', icon: 'Histogram' },
  { type: 'rankBar', label: '排行图', description: '适合榜单和 Top N', icon: 'Histogram' },
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
const isStackedLayout = computed(() => isCompactLayout.value)
const designerGridStyle = computed(() => {
  if (isCompactLayout.value) {
    return { gridTemplateColumns: 'minmax(0, 1fr)' }
  }
  const columns = []
  if (showMaterialPanel.value) columns.push('240px')
  columns.push('minmax(0, 1fr)')
  if (showPropertyPanel.value) columns.push('312px')
  return { gridTemplateColumns: columns.join(' ') }
})

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
  restorePanelPreferences()
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
  resetHistory(toPlainSchema(), 'load-schema')
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
    syncSelectionAfterSchema(pageSchema)
    markSchemaDirty('sync-entity-page')
    statusText.value = '已同步实体新增字段，请保存并发布'
    ElMessage.success('实体字段已同步到页面')
  } catch (error) {
    ElMessage.error(error?.message || '实体字段同步失败')
  }
}

function addField(type, area = 'table') {
  return editorAddField(type, area)
}

function handleMaterialDragStart() {
  isDraggingMaterial.value = true
}

function handleMaterialDragEnd() {
  isDraggingMaterial.value = false
  clearDropTargets()
}

function handleDropChange(area, event) {
  const field = editorHandleDropChange(area, event)
  if (field) clearDropTargets()
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

function persistPanelPreferences() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DESIGNER_MATERIAL_PANEL_KEY, showMaterialPanel.value ? '1' : '0')
  window.localStorage.setItem(DESIGNER_PROPERTY_PANEL_KEY, showPropertyPanel.value ? '1' : '0')
}

function setMaterialPanelVisible(value) {
  showMaterialPanel.value = value
  persistPanelPreferences()
}

function setPropertyPanelVisible(value) {
  showPropertyPanel.value = value
  persistPanelPreferences()
}

function openMaterialPanel() {
  showMaterialPanel.value = true
  persistPanelPreferences()
}

function openPropertyPanel() {
  showPropertyPanel.value = true
  persistPanelPreferences()
}

function toggleMaterialPanel() {
  showMaterialPanel.value = !showMaterialPanel.value
  persistPanelPreferences()
}

function togglePropertyPanel() {
  showPropertyPanel.value = !showPropertyPanel.value
  persistPanelPreferences()
}

function selectField(selection) {
  editorSelectField(selection)
}

function selectMetric(metricId) {
  editorSelectMetric(metricId)
}

function selectChart(chartId) {
  editorSelectChart(chartId)
}

function handleAreaSelect(area) {
  editorHandleAreaSelect(area)
  if (isCompactLayout.value && ['search', 'table', 'form'].includes(area)) {
    openMaterialPanel()
  }
}

function addMetric() {
  return editorAddMetric()
  const id = `metric_${Date.now()}`
  pageSchema.metrics = [...(pageSchema.metrics || []), {
    id,
    title: '新统计卡片',
    type: 'total',
    tone: 'blue',
    prefix: '',
    suffix: '',
    precision: 0,
    recentDays: 30,
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
  editorRemoveMetric(index)
}

function applyPagePatch(patch) {
  editorApplyPagePatch(patch)
}

function applyFieldPatch(fieldId, patch, structural = false, options = {}) {
  editorApplyFieldPatch(fieldId, patch, structural, options)
}

async function deleteSelectedField() {
  if (!selectedField.value) {
    return
  }

  await ElMessageBox.confirm(`确认删除字段“${selectedField.value.label}”吗？`, '删除字段', { type: 'warning' })
  removeSelectedField()
  ElMessage.success('字段已删除')
}

function moveField(index, offset) {
  editorMoveField(index, offset)
}

function handleFieldSort() {
  editorHandleFieldSort()
}

function handleFieldTypeChange(nextType) {
  editorHandleFieldTypeChange(nextType)
}

function normalizeSelectedFieldProp() {
  editorNormalizeSelectedFieldProp()
}

function addOption() {
  return editorAddOption()
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
  return editorRemoveOption(index)
  if (!selectedField.value) {
    return
  }

  selectedField.value.options.splice(index, 1)
  selectedField.value.options = normalizeOptions(selectedField.value.options)
  markSchemaDirty()
}

function addChart(chartType = 'pie') {
  return editorAddChart(chartType)
  const field = pageSchema.fields[0]
  const numericField = pageSchema.fields.find((item) => ['number', 'slider', 'rate'].includes(item.type))
  const nextCharts = [...normalizedCharts.value]
  const id = `chart_${Date.now()}`
  nextCharts.push({
    id,
    type: chartType,
    title: '新图表',
    dimension: field?.prop || '',
    metric: ['line', 'area'].includes(chartType) && numericField ? 'sum' : 'count',
    measureField: numericField?.prop || '',
    limit: 8,
    sort: ['line', 'area'].includes(chartType) ? 'asc' : 'desc',
  })
  pageSchema.charts = nextCharts.map(({ aggregate, ...chart }) => chart)
  selectChart(id)
  markSchemaDirty()
}

function removeChart(index) {
  return editorRemoveChart(index)
  const removedId = pageSchema.charts[index]?.id
  pageSchema.charts.splice(index, 1)
  if (selectedChartId.value === removedId) {
    selectedChartId.value = pageSchema.charts[Math.max(index - 1, 0)]?.id || pageSchema.charts[0]?.id || ''
  }
  markSchemaDirty()
}

function markSchemaDirty() {
  editorMarkSchemaDirty()
}

function undoSchema() {
  editorUndoSchema()
}

function redoSchema() {
  editorRedoSchema()
}

function handleHistoryShortcut(event) {
  if (!event.ctrlKey && !event.metaKey) return
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoSchema() : undoSchema()
  }
}

function syncCompactLayout() {
  isCompactLayout.value = window.innerWidth <= 1440
  if (!isCompactLayout.value) {
    showMaterialPanel.value = true
    showPropertyPanel.value = true
    return
  }
  if (window.innerWidth <= 1200) {
    showMaterialPanel.value = false
    showPropertyPanel.value = false
    return
  }
  showMaterialPanel.value = false
  showPropertyPanel.value = window.localStorage.getItem(DESIGNER_PROPERTY_PANEL_KEY) !== '0'
}

function restorePanelPreferences() {
  if (typeof window === 'undefined') return
  showMaterialPanel.value = window.localStorage.getItem(DESIGNER_MATERIAL_PANEL_KEY) === '1'
  const storedProperty = window.localStorage.getItem(DESIGNER_PROPERTY_PANEL_KEY)
  showPropertyPanel.value = storedProperty === null ? true : storedProperty === '1'
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
    replaceAndResetHistory(result.schema_json, 'restore-version')
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
    syncSelectionAfterSchema(pageSchema)
    markSchemaDirty('import-schema')
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
    syncSelectionAfterSchema(pageSchema)
    markSchemaDirty('import-template')
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
  gap: 8px;
  height: calc(100vh - 88px);
  min-height: 720px;
  padding: 0;
}

.designer-panel-toolbar {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 15;
  display: flex;
  gap: 6px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
}

.designer-panel-toolbar :deep(.el-button) {
  margin-left: 0;
}

@media (min-width: 1441px) {
  .designer {
    min-height: 0;
  }
}

@media (max-width: 1440px) {
  .designer {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 0;
    gap: 0;
  }
}

@media (max-width: 768px) {
  .designer-panel-toolbar {
    right: 16px;
    bottom: 16px;
  }
}
</style>
