import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref, unref } from 'vue'

import {
  createRuntimeRecord,
  deleteRuntimeRecord,
  getRuntimeStats,
  listRuntimeRecords,
  updateRuntimeRecord,
} from '../api/runtime'
import { buildFieldRules, getFieldInitialValue } from '../schema/fieldTypes'

export function useRuntimeCrud({
  pageId,
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
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  })

  async function loadRecords() {
    recordsLoading.value = true
    runtimeError.value = ''
    isOffline.value = false

    try {
      const filters = buildFilters()
      const result = await listRuntimeRecords(unref(pageId), {
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        filters,
      })

      recordRows.value = result.items.map((item) => ({ id: item.id, ...item.data }))
      pagination.total = result.total
      pagination.currentPage = result.page
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
    const result = await getRuntimeStats(unref(pageId), { filters })
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
    formFields.value.forEach((field) => {
      dialogForm[field.prop] = row[field.prop] ?? getFieldInitialValue(field)
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

    await deleteRuntimeRecord(unref(pageId), row.id)

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
        await updateRuntimeRecord(unref(pageId), editingRecordId.value, toPlainRecord(dialogForm))
      } else {
        await createRuntimeRecord(unref(pageId), toPlainRecord(dialogForm))
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

  function toPlainRecord(source) {
    return formFields.value.reduce((record, field) => {
      record[field.prop] = source[field.prop]
      return record
    }, {})
  }

  function buildFilters() {
    return searchableFields.value.reduce((result, field) => {
      const value = searchModel[field.prop]

      if (value !== '' && value !== undefined && value !== null) {
        result[field.prop] = value
      }

      return result
    }, {})
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
