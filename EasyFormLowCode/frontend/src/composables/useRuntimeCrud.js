import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, unref } from 'vue'

import {
  createRuntimeRecord,
  deleteRuntimeRecord,
  deleteRuntimeRecords,
  getRuntimeStats,
  listRuntimeRecords,
  updateRuntimeRecord,
} from '../api/runtime'
import {
  applyFormErrors,
  buildFormValues,
  buildPlainRecord,
  buildSearchFilters,
  resetFieldValues,
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
  const readonlyRuntime = computed(() => datasource.value?.mode === 'rest')

  async function loadRecords() {
    recordsLoading.value = true
    runtimeError.value = ''
    runtimeNotice.value = readonlyRuntime.value
      ? 'External datasource is read-only in runtime preview. Create, edit, delete, and stats are disabled.'
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
      const normalizedResult = normalizeRecordListResponse(result)

      recordRows.value = normalizedResult.items
      pagination.total = normalizedResult.total
      pagination.currentPage = normalizedResult.page
      await loadStats(filters)
    } catch (error) {
      recordRows.value = fallbackRows()
      statsRows.value = recordRows.value
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
      return
    }

    const result = await getRuntimeStats(unref(pageId), {
      datasource: datasource.value,
      mode: unref(runtimeMode),
      onRequestSettled: trackRequest,
      filters,
    })
    statsRows.value = result.records || []
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
    if (!ensureRuntimeDatasource('create')) {
      return
    }
    dialogMode.value = 'create'
    editingRecordId.value = null
    dialogTitle.value = 'Create record'
    clearFormErrors()
    resetFieldValues(dialogForm, formFields.value)
    dialogVisible.value = true
  }

  function openEditDialog(row) {
    if (!ensureRuntimeDatasource('edit')) {
      return
    }
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
    if (selectedRows.value.length === 0) {
      return
    }

    try {
      if (!ensureRuntimeDatasource('batch delete')) {
        return
      }
      await ElMessageBox.confirm(
        `Delete ${selectedRows.value.length} selected records?`,
        'Delete records',
        { type: 'warning' },
      )
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
      if (!ensureRuntimeDatasource('delete')) {
        return
      }
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

  async function submitDialog() {
    clearFormErrors()

    if (!validateDialogForm()) {
      return
    }

    submitLoading.value = true

    try {
      if (!ensureRuntimeDatasource(dialogMode.value === 'edit' ? 'edit' : 'create')) {
        return
      }
      if (dialogMode.value === 'edit') {
        await updateRuntimeRecord(unref(pageId), editingRecordId.value, toPlainRecord(dialogForm), {
          datasource: datasource.value,
          onRequestSettled: trackRequest,
        })
      } else {
        await createRuntimeRecord(unref(pageId), toPlainRecord(dialogForm), {
          datasource: datasource.value,
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
    return buildSearchFilters(searchableFields.value, searchModel)
  }

  function trackRequest(request) {
    const sanitized = sanitizeRequest(request)
    lastRequest.value = sanitized
    requestHistory.value = [sanitized, ...requestHistory.value].slice(0, 20)
  }

  function ensureRuntimeDatasource(actionLabel = 'write') {
    if (!readonlyRuntime.value) {
      return true
    }
    ElMessage.warning(`External datasource does not support ${actionLabel}`)
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
    runtimeError,
    runtimeNotice,
    isOffline,
    lastRequest,
    requestHistory,
    readonlyRuntime,
    pagination,
    loadRecords,
    loadStats,
    resetSearch,
    applySearch,
    openCreateDialog,
    openEditDialog,
    openSelectedEditDialog,
    deleteSelectedRows,
    deleteRecord,
    submitDialog,
  }
}

function sanitizeRequest(request = {}) {
  return {
    ...request,
    params: redactValue(request.params),
    body: redactValue(request.body),
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

function normalizeRecordListResponse(result) {
  const rows = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : []
  const items = rows.map((item, index) => {
    if (item?.data && item.id !== undefined) {
      return { id: item.id, ...item.data }
    }

    return {
      id: item?.id ?? index + 1,
      ...item,
    }
  })

  return {
    items,
    total: Number(result?.total ?? items.length),
    page: Number(result?.page ?? 1),
    pageSize: Number(result?.pageSize ?? (items.length || 10)),
  }
}

function isCancelError(error) {
  return error === 'cancel' || error === 'close' || error === 'closed'
}
