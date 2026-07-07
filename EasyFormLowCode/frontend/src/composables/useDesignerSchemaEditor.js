import { computed, ref } from 'vue'

import { createDroppedField } from '../schema/dropField'
import { normalizeField, normalizeOptions } from '../schema/fieldTypes'
import { clonePageSchema, normalizePageSchema } from '../schema/pageSchema'
import { normalizeEditableFieldProp } from '../utils/schemaEditor'
import { useSchemaHistory } from './useSchemaHistory'

const FIELD_AREAS = new Set(['search', 'table', 'form'])
const STRUCTURAL_FIELD_PROPS = new Set(['prop', 'type', 'searchable', 'tableVisible', 'formVisible', 'options'])

export function useDesignerSchemaEditor({
  pageId,
  pageSchema,
  replaceSchema,
  toPlainSchema,
  syncModels,
  setEditorStatus,
  syncAnalyticsSelection,
  openPropertyPanel,
  isCompactLayout,
  getNormalizedCharts,
} = {}) {
  const selectedFieldId = ref('')
  const selectedArea = ref('search')
  const selectedMetricId = ref('')
  const selectedChartId = ref('')
  const fieldPropFeedback = ref('')
  const schemaHistory = useSchemaHistory()
  const selectedField = computed(() => pageSchema.fields.find((field) => field.id === selectedFieldId.value))

  function selectField(selection) {
    const fieldId = typeof selection === 'object' ? selection?.fieldId : selection
    const area = typeof selection === 'object' ? selection?.area : ''
    selectedFieldId.value = fieldId || ''
    if (FIELD_AREAS.has(area)) {
      selectedArea.value = area
    }
    if (isCompactLayout?.value) {
      openPropertyPanel?.()
    }
  }

  function selectMetric(metricId) {
    selectedArea.value = 'metrics'
    selectedMetricId.value = metricId || ''
    selectedFieldId.value = ''
    if (isCompactLayout?.value) {
      openPropertyPanel?.()
    }
  }

  function selectChart(chartId) {
    selectedArea.value = 'charts'
    selectedChartId.value = chartId || ''
    selectedFieldId.value = ''
    if (isCompactLayout?.value) {
      openPropertyPanel?.()
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
  }

  function resetHistory(schema = toPlainSchema?.(), label = 'reset') {
    schemaHistory.reset(schema, label)
    syncSelectionAfterSchema(schema)
  }

  function commitSchemaChange(label = 'edit') {
    schemaHistory.commit(toPlainSchema(), label)
    setEditorStatus?.('dirty')
  }

  function markSchemaDirty(label = 'edit', { commit = true } = {}) {
    if (commit) {
      schemaHistory.commit(toPlainSchema(), label)
    }
    setEditorStatus?.('dirty')
  }

  function addField(type, area = 'table') {
    const field = createDroppedField(type, area, pageSchema.fields)
    pageSchema.fields.push(field)
    selectField({ fieldId: field.id, area })
    syncModels?.()
    markSchemaDirty('add-field')
    return field
  }

  function handleDropChange(area, event) {
    const dropped = event?.added?.element

    if (!dropped) {
      return null
    }

    return addField(dropped.type, area)
  }

  function applyPagePatch(patch, { label = 'patch-page', commit = true } = {}) {
    const normalized = normalizePageSchema(resolvePageId(pageId), { ...toPlainSchema(), ...patch })
    replacePageSchemaObject(normalized)
    syncModels?.()
    syncAnalyticsSelection?.(pageSchema)
    markSchemaDirty(label, { commit })
  }

  function applyFieldPatch(fieldId, patch, structural = false, options = {}) {
    const field = pageSchema.fields.find((item) => item.id === fieldId)
    if (!field) {
      return
    }

    const nextPatch = { ...patch }
    const hasStructuralPatch = structural || Object.keys(nextPatch).some((key) => STRUCTURAL_FIELD_PROPS.has(key))
    const shouldCommit = options.commit ?? hasStructuralPatch

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
    if (hasStructuralPatch) {
      syncModels?.()
    }
    markSchemaDirty(options.label || 'patch-field', { commit: shouldCommit })
  }

  function removeSelectedField() {
    if (!selectedField.value) {
      return null
    }

    const index = pageSchema.fields.findIndex((field) => field.id === selectedField.value.id)
    const removed = pageSchema.fields.splice(index, 1)[0]
    selectedFieldId.value = pageSchema.fields[Math.max(index - 1, 0)]?.id || ''
    syncModels?.()
    markSchemaDirty('delete-field')
    return removed
  }

  function moveField(index, offset) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= pageSchema.fields.length) {
      return
    }

    const [field] = pageSchema.fields.splice(index, 1)
    pageSchema.fields.splice(nextIndex, 0, field)
    selectedFieldId.value = field.id
    markSchemaDirty('move-field')
  }

  function handleFieldSort() {
    syncModels?.()
    markSchemaDirty('sort-field')
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
    syncModels?.()
    markSchemaDirty('change-field-type')
  }

  function normalizeSelectedFieldProp() {
    if (!selectedField.value) {
      return
    }

    const fallback = `${selectedField.value.type}_${pageSchema.fields.indexOf(selectedField.value) + 1}`
    const normalizedProp = normalizeEditableFieldProp(selectedField.value.prop, selectedField.value.id, pageSchema.fields, fallback)
    selectedField.value.prop = normalizedProp.value
    fieldPropFeedback.value = normalizedProp.message
    syncModels?.()
    markSchemaDirty('normalize-field-prop')
  }

  function addOption() {
    if (!selectedField.value) {
      return
    }

    selectedField.value.options.push({
      label: `Option ${selectedField.value.options.length + 1}`,
      value: `option_${selectedField.value.options.length + 1}`,
    })
    selectedField.value.options = normalizeOptions(selectedField.value.options)
    markSchemaDirty('add-option')
  }

  function removeOption(index) {
    if (!selectedField.value) {
      return
    }

    selectedField.value.options.splice(index, 1)
    selectedField.value.options = normalizeOptions(selectedField.value.options)
    markSchemaDirty('remove-option')
  }

  function addMetric() {
    const id = `metric_${Date.now()}`
    pageSchema.metrics = [...(pageSchema.metrics || []), {
      id,
      title: 'New metric',
      type: 'total',
      tone: 'blue',
      prefix: '',
      suffix: '',
      precision: 0,
      recentDays: 30,
    }]
    selectMetric(id)
    markSchemaDirty('add-metric')
  }

  function removeMetric(index) {
    const removedId = pageSchema.metrics[index]?.id
    pageSchema.metrics.splice(index, 1)
    if (selectedMetricId.value === removedId) {
      selectedMetricId.value = pageSchema.metrics[Math.max(index - 1, 0)]?.id || pageSchema.metrics[0]?.id || ''
    }
    markSchemaDirty('remove-metric')
  }

  function addChart(chartType = 'pie') {
    const field = pageSchema.fields[0]
    const numericField = pageSchema.fields.find((item) => ['number', 'slider', 'rate'].includes(item.type))
    const nextCharts = [...(getNormalizedCharts?.() || pageSchema.charts || [])]
    const id = `chart_${Date.now()}`
    nextCharts.push({
      id,
      type: chartType,
      title: 'New chart',
      dimension: field?.prop || '',
      metric: ['line', 'area'].includes(chartType) && numericField ? 'sum' : 'count',
      measureField: numericField?.prop || '',
      limit: 8,
      sort: ['line', 'area'].includes(chartType) ? 'asc' : 'desc',
    })
    pageSchema.charts = nextCharts.map(({ aggregate, ...chart }) => chart)
    selectChart(id)
    markSchemaDirty('add-chart')
  }

  function removeChart(index) {
    const removedId = pageSchema.charts[index]?.id
    pageSchema.charts.splice(index, 1)
    if (selectedChartId.value === removedId) {
      selectedChartId.value = pageSchema.charts[Math.max(index - 1, 0)]?.id || pageSchema.charts[0]?.id || ''
    }
    markSchemaDirty('remove-chart')
  }

  function undoSchema() {
    const snapshot = schemaHistory.undo()
    if (!snapshot) return
    replaceSchema(snapshot)
    syncSelectionAfterSchema(snapshot)
    setEditorStatus?.('dirty')
  }

  function redoSchema() {
    const snapshot = schemaHistory.redo()
    if (!snapshot) return
    replaceSchema(snapshot)
    syncSelectionAfterSchema(snapshot)
    setEditorStatus?.('dirty')
  }

  function replaceAndResetHistory(nextSchema, label = 'replace') {
    replaceSchema(nextSchema)
    resetHistory(toPlainSchema(), label)
  }

  function syncSelectionAfterSchema(schema = pageSchema) {
    const plainSchema = clonePageSchema(schema)
    const fieldIds = (plainSchema.fields || []).map((field) => field.id)
    if (!fieldIds.includes(selectedFieldId.value)) {
      selectedFieldId.value = fieldIds[0] || ''
    }
    syncAnalyticsSelection?.(plainSchema)
    const metricIds = (plainSchema.metrics || []).map((metric) => metric.id)
    const chartIds = (plainSchema.charts || []).map((chart) => chart.id)
    if (!metricIds.includes(selectedMetricId.value)) {
      selectedMetricId.value = metricIds[0] || ''
    }
    if (!chartIds.includes(selectedChartId.value)) {
      selectedChartId.value = chartIds[0] || ''
    }
  }

  function replacePageSchemaObject(normalized) {
    Object.keys(pageSchema).forEach((key) => {
      delete pageSchema[key]
    })
    Object.assign(pageSchema, normalized)
  }

  return {
    canRedo: schemaHistory.canRedo,
    canUndo: schemaHistory.canUndo,
    fieldPropFeedback,
    selectedArea,
    selectedChartId,
    selectedField,
    selectedFieldId,
    selectedMetricId,
    addChart,
    addField,
    addMetric,
    addOption,
    applyFieldPatch,
    applyPagePatch,
    commitSchemaChange,
    handleAreaSelect,
    handleDropChange,
    handleFieldSort,
    handleFieldTypeChange,
    markSchemaDirty,
    moveField,
    normalizeSelectedFieldProp,
    redoSchema,
    removeChart,
    removeMetric,
    removeOption,
    removeSelectedField,
    replaceAndResetHistory,
    resetHistory,
    selectChart,
    selectField,
    selectMetric,
    syncSelectionAfterSchema,
    undoSchema,
  }
}

function resolvePageId(pageId) {
  return String(pageId?.value || pageId || 'user_manage')
}
