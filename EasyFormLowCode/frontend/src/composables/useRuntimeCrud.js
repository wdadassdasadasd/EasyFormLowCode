import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, unref } from 'vue'

import {
  createRuntimeRecord,
  deleteRuntimeRecord,
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
  const dialogTitle = ref('新增数据')
  const dialogMode = ref('create')
  const editingRecordId = ref(null)
  const selectedRows = ref([])
  const recordRows = ref([])
  const statsRows = ref([])
  const runtimeError = ref('')
  const isOffline = ref(false)
  const lastRequest = ref(null)
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  })
  const datasource = computed(() => unref(pageSchema)?.datasource || unref(pageSchema)?.api || {})

  async function loadRecords() {
    recordsLoading.value = true
    runtimeError.value = ''
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
    if (datasource.value?.mode === 'rest') {
      statsRows.value = [...recordRows.value]
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
    dialogMode.value = 'create'
    editingRecordId.value = null
    dialogTitle.value = '新增数据'
    clearFormErrors()
    resetFieldValues(dialogForm, formFields.value)
    dialogVisible.value = true
  }

  function openEditDialog(row) {
    dialogMode.value = 'edit'
    editingRecordId.value = row.id
    dialogTitle.value = '编辑数据'
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

    await ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 条数据吗？`, '删除确认', { type: 'warning' })
    await Promise.all(selectedRows.value.map((row) => deleteRecord(row, false)))
    if (selectedRows.value.length >= recordRows.value.length && pagination.currentPage > 1) {
      pagination.currentPage -= 1
    }
    selectedRows.value = []
    ElMessage.success('删除成功')
    await loadRecords()
  }

  async function deleteRecord(row, reload = true) {
    if (reload) {
      await ElMessageBox.confirm('确认删除这条数据吗？', '删除确认', { type: 'warning' })
    }

    await deleteRuntimeRecord(unref(pageId), row.id, {
      datasource: datasource.value,
      onRequestSettled: trackRequest,
    })

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
      ElMessage.success(dialogMode.value === 'edit' ? '编辑成功' : '新增成功')
      await loadRecords()
    } catch (error) {
      ElMessage.error(error?.message || '提交失败，请确认后端服务已启动')
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
    lastRequest.value = request
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
    isOffline,
    lastRequest,
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
