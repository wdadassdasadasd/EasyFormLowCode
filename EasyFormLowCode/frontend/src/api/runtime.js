import { apiRequest } from './httpClient'

export function listRuntimeRecords(pageId, { datasource, mode = 'published', onRequestSettled, page, pageSize, filters = {} } = {}) {
  return requestByDatasource(datasource, {
    pageId,
    onRequestSettled,
    runtimeMode: mode,
    requestType: 'list',
    params: {
      page,
      pageSize,
      ...filters,
    },
  })
}

export function getRuntimeStats(pageId, { datasource, mode = 'published', onRequestSettled, filters = {} } = {}) {
  if (resolveDatasourceMode(datasource) === 'rest') {
    return Promise.reject(new Error('外部数据源暂不支持统计能力'))
  }

  return requestByDatasource(datasource, {
    pageId,
    onRequestSettled,
    runtimeMode: mode,
    requestType: 'stats',
    params: filters,
  })
}

export function createRuntimeRecord(pageId, data, { datasource, onRequestSettled } = {}) {
  return requestByDatasource(datasource, {
    pageId,
    onRequestSettled,
    requestType: 'create',
    method: 'POST',
    body: { data },
  })
}

export function updateRuntimeRecord(pageId, recordId, data, { datasource, onRequestSettled } = {}) {
  return requestByDatasource(datasource, {
    pageId,
    recordId,
    onRequestSettled,
    requestType: 'update',
    method: 'PUT',
    body: { data },
  })
}

export function deleteRuntimeRecord(pageId, recordId, { datasource, onRequestSettled } = {}) {
  return requestByDatasource(datasource, {
    pageId,
    recordId,
    onRequestSettled,
    requestType: 'delete',
    method: 'DELETE',
  })
}

export function deleteRuntimeRecords(pageId, recordIds, { datasource, onRequestSettled } = {}) {
  if (resolveDatasourceMode(datasource) === 'rest') {
    return Promise.reject(new Error('外部数据源暂不支持批量删除'))
  }

  return requestByDatasource(datasource, {
    pageId,
    onRequestSettled,
    requestType: 'batchDelete',
    method: 'DELETE',
    body: { record_ids: recordIds },
  })
}

function requestByDatasource(datasource, options = {}) {
  const mode = resolveDatasourceMode(datasource)
  const path = resolveRequestPath(mode, datasource, options)
  const params = { ...options.params }

  if (mode === 'runtime' && options.runtimeMode) {
    params.mode = options.runtimeMode
  }

  return apiRequest(path, {
    method: options.method,
    body: options.body,
    params,
    onRequestSettled: options.onRequestSettled,
  })
}

function resolveRequestPath(mode, datasource, options) {
  if (mode === 'rest') {
    const keyMap = {
      list: datasource?.listUrl,
      create: datasource?.createUrl,
      update: datasource?.updateUrl,
      delete: datasource?.deleteUrl,
    }
    const template = keyMap[options.requestType] || datasource?.listUrl
    return String(template || '').replace(':id', options.recordId ?? '')
  }

  const runtimeBase = `/runtime/pages/${options.pageId}`
  const pathMap = {
    list: `${runtimeBase}/records`,
    stats: `${runtimeBase}/stats`,
    create: `${runtimeBase}/records`,
    update: `${runtimeBase}/records/${options.recordId}`,
    delete: `${runtimeBase}/records/${options.recordId}`,
    batchDelete: `${runtimeBase}/records`,
  }
  return pathMap[options.requestType]
}

function resolveDatasourceMode(datasource = {}) {
  return datasource?.mode === 'rest' ? 'rest' : 'runtime'
}
