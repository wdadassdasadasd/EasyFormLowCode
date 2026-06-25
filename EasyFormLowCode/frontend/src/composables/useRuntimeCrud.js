import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, unref } from 'vue'

import {
  createRuntimeRecord,
  deleteRuntimeRecord,
  deleteRuntimeRecords,
  executeBatchAction,
  executeRowAction,
  getRuntimeStats,
  listRuntimeRecords,
  updateRuntimeRecord,
} from '../api/runtime'
import {
  applyFormErrors,
  buildFormValues,
  buildPlainRecord,
  buildSearchFilters,
  classifyRequestFailure,
  resetFieldValues,
  getDatasourceCapabilities,
  summarizeResponse,
  validateRecord,
} from '../utils/runtimeCrudHelpers'

export function useRuntimeCrud({
  pageId,
  pageSchema,
  runtimeMode = 'published',
  searchableFields,
  formFields,
  searchModel,
  dialogForm,
  formErrors,
  fallbackRows = () => [],
}) {
  const recordsLoading = ref(false)
  const submitLoading = ref(false)
  const dialogVisible = ref(false)
  const dialogTitle = ref('Create record')
  const dialogMode = ref('create')
  const editingRecordId = ref(null)
  const selectedRows = ref([])
  const recordRows = ref([])
  const statsRows = ref([])
  const statsMetrics = ref([])
  const statsCharts = ref([])
  const runtimeError = ref('')
  const runtimeNotice = ref('')
  const isOffline = ref(false)
  const lastRequest = ref(null)
  const requestHistory = ref([])
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  })
  const datasource = computed(() => unref(pageSchema)?.datasource || unref(pageSchema)?.api || {})
  const datasourceCapabilities = computed(() => getDatasourceCapabilities(datasource.value))
  const readonlyRuntime = computed(() => !datasourceCapabilities.value.create && !datasourceCapabilities.value.update && !datasourceCapabilities.value.delete)
  const queryItems = computed(() => Array.isArray(unref(pageSchema)?.queries) ? unref(pageSchema).queries : [])
  const rowActions = computed(() => Array.isArray(unref(pageSchema)?.rowActions) ? unref(pageSchema).rowActions : [])
  const batchActions = computed(() => Array.isArray(unref(pageSchema)?.batchActions) ? unref(pageSchema).batchActions : [])

  async function loadRecords() {
    recordsLoading.value = true
    runtimeError.value = ''
    runtimeNotice.value = datasource.value?.mode === 'rest' && readonlyRuntime.value
      ? 'External datasource is read-only until write operations are enabled and endpoints are configured.'
      : ''
    isOffline.value = false

    try {
      const filters = buildFilters()
      const result = await listRuntimeRecords(unref(pageId), {
        datasource: datasource.value,
        mode: unref(runtimeMode),
        onRequestSettled: trackRequest,
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        filters,
      })
      const normalizedResult = normalizeRecordListResponse(result, datasource.value)
      recordRows.value = normalizedResult.items
      pagination.total = normalizedResult.total
      pagination.currentPage = normalizedResult.page
      await loadStats(filters)
    } catch (error) {
      recordRows.value = fallbackRows()
      statsRows.value = recordRows.value
      statsMetrics.value = []
      statsCharts.value = []
      pagination.total = recordRows.value.length
      runtimeError.value = error?.message || 'Runtime data request failed'
      isOffline.value = true
    } finally {
      recordsLoading.value = false
    }
  }

  async function loadStats(filters = buildFilters()) {
    if (readonlyRuntime.value) {
      statsRows.value = []
      statsMetrics.value = []
      statsCharts.value = []
      return
    }

    const result = await getRuntimeStats(unref(pageId), {
      datasource: datasource.value,
      mode: unref(runtimeMode),
      onRequestSettled: trackRequest,
      filters,
    })
    statsRows.value = result.records || []
    statsMetrics.value = result.metrics || []
    statsCharts.value = result.charts || []
  }

  function resetSearch() {
    if (queryItems.value.length > 0) {
      queryItems.value.forEach((query) => {
        searchModel[query.id] = query.defaultValue ?? ''
      })
    } else {
      searchableFields.value.forEach((field) => {
        searchModel[field.prop] = ''
      })
    }
    pagination.currentPage = 1
    loadRecords()
  }

  function applySearch() {
    pagination.currentPage = 1
    loadRecords()
  }

  function openCreateDialog() {
    if (!ensureRuntimeDatasource('create')) return
    dialogMode.value = 'create'
    editingRecordId.value = null
    dialogTitle.value = 'Create record'
    clearFormErrors()
    resetFieldValues(dialogForm, formFields.value)
    dialogVisible.value = true
  }

  function openEditDialog(row) {
    if (!ensureRuntimeDatasource('edit')) return
    dialogMode.value = 'edit'
    editingRecordId.value = row.id
    dialogTitle.value = 'Edit record'
    clearFormErrors()
    Object.assign(dialogForm, buildFormValues(formFields.value, row))
    dialogVisible.value = true
  }

  function openSelectedEditDialog() {
    if (selectedRows.value.length === 1) {
      openEditDialog(selectedRows.value[0])
    }
  }

  async function deleteSelectedRows() {
    if (selectedRows.value.length === 0) return
    try {
      if (!ensureRuntimeDatasource('batch delete')) return
      await ElMessageBox.confirm(`Delete ${selectedRows.value.length} selected records?`, 'Delete records', { type: 'warning' })
      await deleteRuntimeRecords(
        unref(pageId),
        selectedRows.value.map((row) => row.id),
        { datasource: datasource.value, onRequestSettled: trackRequest },
      )
      if (selectedRows.value.length >= recordRows.value.length && pagination.currentPage > 1) {
        pagination.currentPage -= 1
      }
      selectedRows.value = []
      ElMessage.success('Delete successful')
      await loadRecords()
    } catch (error) {
      if (!isCancelError(error)) {
        ElMessage.error(error?.message || 'Batch delete failed')
      }
    }
  }

  async function deleteRecord(row, reload = true) {
    try {
      if (!ensureRuntimeDatasource('delete')) return
      if (reload) {
        await ElMessageBox.confirm('Delete this record?', 'Delete record', { type: 'warning' })
      }
      await deleteRuntimeRecord(unref(pageId), row.id, {
        datasource: datasource.value,
        onRequestSettled: trackRequest,
      })
      if (reload) {
        ElMessage.success('Delete successful')
        await loadRecords()
      }
    } catch (error) {
      if (!isCancelError(error)) {
        ElMessage.error(error?.message || 'Delete failed')
      }
    }
  }

  async function runRowAction(action, row) {
    if (!action) return
    if (action.type === 'edit') {
      openEditDialog(row)
      return
    }
    if (action.type === 'delete') {
      await deleteRecord(row, true)
      return
    }
    try {
      await maybeConfirm(action.confirmText, 'Row action')
      await executeRowAction(unref(pageId), action, row, {
        datasource: datasource.value,
        mode: unref(runtimeMode),
        onRequestSettled: trackRequest,
      })
      ElMessage.success(action.successText || 'Action successful')
      if (action.refreshAfterSuccess !== false) {
        await loadRecords()
      }
    } catch (error) {
      if (!isCancelError(error)) {
        ElMessage.error(action.errorText || error?.message || 'Action failed')
      }
    }
  }

  async function runBatchAction(action) {
    if (!action || selectedRows.value.length === 0) return
    if (action.type === 'batchDelete') {
      await deleteSelectedRows()
      return
    }
    try {
      await maybeConfirm(action.confirmText, 'Batch action')
      await executeBatchAction(
        unref(pageId),
        action,
        selectedRows.value.map((row) => row.id),
        {
          datasource: datasource.value,
          mode: unref(runtimeMode),
          onRequestSettled: trackRequest,
        },
      )
      ElMessage.success(action.successText || 'Action successful')
      if (action.refreshAfterSuccess !== false) {
        await loadRecords()
      }
    } catch (error) {
      if (!isCancelError(error)) {
        ElMessage.error(action.errorText || error?.message || 'Action failed')
      }
    }
  }

  async function submitDialog() {
    clearFormErrors()
    if (!validateDialogForm()) return
    submitLoading.value = true
    try {
      if (!ensureRuntimeDatasource(dialogMode.value === 'edit' ? 'edit' : 'create')) return
      if (dialogMode.value === 'edit') {
        await updateRuntimeRecord(unref(pageId), editingRecordId.value, toPlainRecord(dialogForm), {
          datasource: datasource.value,
          mode: unref(runtimeMode),
          onRequestSettled: trackRequest,
        })
      } else {
        await createRuntimeRecord(unref(pageId), toPlainRecord(dialogForm), {
          datasource: datasource.value,
          mode: unref(runtimeMode),
          onRequestSettled: trackRequest,
        })
      }
      dialogVisible.value = false
      ElMessage.success(dialogMode.value === 'edit' ? 'Edit successful' : 'Create successful')
      await loadRecords()
    } catch (error) {
      ElMessage.error(error?.message || 'Submit failed')
    } finally {
      submitLoading.value = false
    }
  }

  function validateDialogForm() {
    const validation = validateRecord(formFields.value, dialogForm)
    applyFormErrors(formErrors, validation.errors)
    return validation.valid
  }

  function clearFormErrors() {
    applyFormErrors(formErrors, {})
  }

  function toPlainRecord(source) {
    return buildPlainRecord(formFields.value, source)
  }

  function buildFilters() {
    return buildSearchFilters(searchableFields.value, searchModel, queryItems.value)
  }

  function trackRequest(request) {
    const sanitized = sanitizeRequest(request)
    sanitized.failureReason = classifyRequestFailure(sanitized)
    sanitized.responseSummary = summarizeResponse(sanitized)
    lastRequest.value = sanitized
    requestHistory.value = [sanitized, ...requestHistory.value].slice(0, 20)
  }

  function ensureRuntimeDatasource(actionLabel = 'write') {
    const keyMap = { create: 'create', edit: 'update', delete: 'delete', 'batch delete': 'batchDelete' }
    if (datasourceCapabilities.value[keyMap[actionLabel] || 'create']) {
      return true
    }
    ElMessage.warning(`The current datasource does not support ${actionLabel}`)
    return false
  }

  return {
    recordsLoading,
    submitLoading,
    dialogVisible,
    dialogTitle,
    dialogMode,
    editingRecordId,
    selectedRows,
    recordRows,
    statsRows,
    statsMetrics,
    statsCharts,
    runtimeError,
    runtimeNotice,
    isOffline,
    lastRequest,
    requestHistory,
    readonlyRuntime,
    datasourceCapabilities,
    pagination,
    queryItems,
    rowActions,
    batchActions,
    loadRecords,
    loadStats,
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
  }
}

function sanitizeRequest(request = {}) {
  return {
    ...request,
    params: redactValue(request.params),
    body: redactValue(request.body),
    payload: redactValue(request.payload),
  }
}

function redactValue(value) {
  if (Array.isArray(value)) return value.map(redactValue)
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, [key, item]) => {
      result[key] = /token|password|secret/i.test(key) ? '***' : redactValue(item)
      return result
    }, {})
  }
  return value
}

function normalizeRecordListResponse(result, datasource = {}) {
  const itemsKey = datasource?.responseItemsKey || 'items'
  const totalKey = datasource?.responseTotalKey || 'total'
  const idKey = datasource?.recordIdKey || 'id'
  const rows = Array.isArray(result?.[itemsKey]) ? result[itemsKey] : Array.isArray(result) ? result : []
  const items = rows.map((item, index) => {
    if (item?.data && item[idKey] !== undefined) {
      return { id: item[idKey], ...item.data }
    }
    return {
      id: item?.[idKey] ?? index + 1,
      ...item,
    }
  })

  return {
    items,
    total: Number(result?.[totalKey] ?? items.length),
    page: Number(result?.page ?? 1),
    pageSize: Number(result?.pageSize ?? (items.length || 10)),
  }
}

async function maybeConfirm(message, title) {
  if (!message) return
  await ElMessageBox.confirm(message, title, { type: 'warning' })
}

function isCancelError(error) {
  return error === 'cancel' || error === 'close' || error === 'closed'
}
