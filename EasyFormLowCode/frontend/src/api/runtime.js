import { apiRequest } from './httpClient'

export function listRuntimeRecords(pageId, { datasource, mode = 'published', onRequestSettled, page, pageSize, filters = {}, signal } = {}) {
  const resolvedDatasource = datasource || {}
  const params = {
    ...filters,
  }
  if (resolveDatasourceMode(resolvedDatasource) === 'rest') {
    params[resolvedDatasource.pageParamKey || 'page'] = page
    params[resolvedDatasource.pageSizeParamKey || 'pageSize'] = pageSize
  } else {
    params.page = page
    params.pageSize = pageSize
  }

  return executeDatasourceRequest(resolvedDatasource, {
    pageId,
    onRequestSettled,
    runtimeMode: mode,
    requestType: 'list',
    params,
    signal,
  })
}

export function getRuntimeStats(pageId, { datasource, mode = 'published', onRequestSettled, filters = {}, signal } = {}) {
  if (resolveDatasourceMode(datasource) === 'rest') {
    return Promise.reject(new Error('外部数据源暂不支持统计能力'))
  }

  return executeDatasourceRequest(datasource, {
    pageId,
    onRequestSettled,
    runtimeMode: mode,
    requestType: 'stats',
    params: filters,
    signal,
  })
}

export function createRuntimeRecord(pageId, data, { datasource, mode, onRequestSettled } = {}) {
  return executeDatasourceRequest(datasource, {
    pageId,
    onRequestSettled,
    requestType: 'create',
    runtimeMode: mode,
    body: wrapRecordPayload(data, datasource),
  })
}

export function updateRuntimeRecord(pageId, recordId, data, { datasource, mode, onRequestSettled } = {}) {
  return executeDatasourceRequest(datasource, {
    pageId,
    recordId,
    onRequestSettled,
    requestType: 'update',
    runtimeMode: mode,
    body: wrapRecordPayload(data, datasource),
  })
}

export function deleteRuntimeRecord(pageId, recordId, { datasource, onRequestSettled } = {}) {
  return executeDatasourceRequest(datasource, {
    pageId,
    recordId,
    onRequestSettled,
    requestType: 'delete',
  })
}

export function deleteRuntimeRecords(pageId, recordIds, { datasource, onRequestSettled } = {}) {
  if (resolveDatasourceMode(datasource) === 'rest') {
    return Promise.reject(new Error('外部数据源暂不支持批量删除'))
  }

  return executeDatasourceRequest(datasource, {
    pageId,
    onRequestSettled,
    requestType: 'batchDelete',
    body: { record_ids: recordIds },
  })
}

export function executeRowAction(pageId, action, row, { datasource, mode, onRequestSettled } = {}) {
  return executeDatasourceRequest(datasource, {
    pageId,
    recordId: row?.id,
    onRequestSettled,
    requestType: 'customRowAction',
    runtimeMode: mode,
    action,
    body: row,
  })
}

export function executeBatchAction(pageId, action, ids, { datasource, mode, onRequestSettled } = {}) {
  return executeDatasourceRequest(datasource, {
    pageId,
    onRequestSettled,
    requestType: 'customBatchAction',
    runtimeMode: mode,
    action,
    body: { ids },
  })
}

function executeDatasourceRequest(datasource, options = {}) {
  const mode = resolveDatasourceMode(datasource)
  const method = resolveRequestMethod(mode, datasource, options)
  const path = resolveRequestPath(mode, datasource, options)
  const params = { ...options.params }

  if (!path) {
    const error = buildConfigError('Datasource endpoint is missing', { mode, requestType: options.requestType })
    options.onRequestSettled?.({
      method,
      url: '',
      params,
      body: options.body,
      status: null,
      ok: false,
      durationMs: 0,
      payload: null,
      error: error.message,
      configError: true,
    })
    return Promise.reject(error)
  }

  if (mode === 'runtime' && options.runtimeMode) {
    params.mode = options.runtimeMode
  }

  return apiRequest(path, {
    method,
    body: options.body,
    params,
    onRequestSettled: options.onRequestSettled,
    signal: options.signal,
  })
}

function resolveRequestMethod(mode, datasource, options) {
  if (options.action?.method) {
    return String(options.action.method).toUpperCase()
  }
  if (mode === 'rest') {
    const methodMap = {
      list: datasource?.listMethod || 'GET',
      create: datasource?.createMethod || 'POST',
      update: datasource?.updateMethod || 'PUT',
      delete: datasource?.deleteMethod || 'DELETE',
    }
    return methodMap[options.requestType] || 'GET'
  }
  const methodMap = {
    list: 'GET',
    stats: 'GET',
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
    batchDelete: 'DELETE',
    customRowAction: 'POST',
    customBatchAction: 'POST',
  }
  return methodMap[options.requestType] || 'GET'
}

function resolveRequestPath(mode, datasource, options) {
  if (options.action?.type === 'request' && !String(options.action?.url || '').trim()) {
    return ''
  }
  if (options.action?.url) {
    return applyUrlParams(String(options.action.url), options.recordId)
  }
  if (options.action && options.action.type === 'request') {
    return ''
  }
  if (mode === 'rest') {
    const keyMap = {
      list: datasource?.listUrl,
      create: datasource?.createUrl,
      update: datasource?.updateUrl,
      delete: datasource?.deleteUrl,
    }
    const template = keyMap[options.requestType] || datasource?.listUrl
    return applyUrlParams(String(template || ''), options.recordId)
  }

  const runtimeBase = `/runtime/pages/${options.pageId}`
  const pathMap = {
    list: `${runtimeBase}/records`,
    stats: `${runtimeBase}/stats`,
    create: `${runtimeBase}/records`,
    update: `${runtimeBase}/records/${options.recordId}`,
    delete: `${runtimeBase}/records/${options.recordId}`,
    batchDelete: `${runtimeBase}/records`,
    customRowAction: `${runtimeBase}/records/${options.recordId}`,
    customBatchAction: `${runtimeBase}/records`,
  }
  return pathMap[options.requestType]
}

function resolveDatasourceMode(datasource = {}) {
  return datasource?.mode === 'rest' ? 'rest' : 'runtime'
}

function wrapRecordPayload(data, datasource = {}) {
  if (datasource?.requestBodyMode === 'plain') {
    return data
  }
  const key = datasource?.requestBodyKey || 'data'
  return {
    [key]: data,
  }
}

function applyUrlParams(url, recordId) {
  return String(url || '').replace(':id', recordId ?? '')
}

function buildConfigError(message, meta = {}) {
  const error = new Error(message)
  error.configError = true
  Object.assign(error, meta)
  return error
}
