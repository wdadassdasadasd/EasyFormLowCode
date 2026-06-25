import { createFieldByType } from './fieldTypes'

export const SCHEMA_VERSION = 5

export const DEFAULT_PAGE_ACTIONS = {
  search: true,
  reset: true,
  create: true,
  edit: true,
  delete: true,
  batchDelete: true,
}

export function buildRuntimeDatasource(pageId = 'user_manage') {
  return {
    mode: 'runtime',
    listUrl: `/api/runtime/pages/${pageId}/records`,
    createUrl: `/api/runtime/pages/${pageId}/records`,
    updateUrl: `/api/runtime/pages/${pageId}/records/:id`,
    deleteUrl: `/api/runtime/pages/${pageId}/records/:id`,
    listMethod: 'GET',
    createMethod: 'POST',
    updateMethod: 'PUT',
    deleteMethod: 'DELETE',
    pageParamKey: 'page',
    pageSizeParamKey: 'pageSize',
    requestBodyMode: 'wrapped',
    requestBodyKey: 'data',
    responseItemsKey: 'items',
    responseTotalKey: 'total',
    recordIdKey: 'id',
    errorMessageKey: 'detail',
    successMessageKey: 'message',
    restWriteEnabled: false,
  }
}

export function createDefaultPageSchema(pageId = 'user_manage') {
  const datasource = buildRuntimeDatasource(pageId)

  return {
    schemaVersion: SCHEMA_VERSION,
    id: pageId,
    title: '鐢ㄦ埛绠＄悊',
    pageType: 'crud',
    datasource,
    api: { ...datasource },
    actions: { ...DEFAULT_PAGE_ACTIONS },
    fields: [
      createFieldByType('input', {
        id: 'field_username',
        label: '鐢ㄦ埛鍚?',
        prop: 'username',
        placeholder: '璇疯緭鍏ョ敤鎴峰悕',
        required: true,
      }),
      createFieldByType('input', {
        id: 'field_nickname',
        label: '鏄电О',
        prop: 'nickname',
        placeholder: '璇疯緭鍏ユ樀绉?',
      }),
      createFieldByType('select', {
        id: 'field_role',
        label: '鐢ㄦ埛瑙掕壊',
        prop: 'role',
        placeholder: '璇烽€夋嫨瑙掕壊',
        options: [
          { label: '绠＄悊鍛?', value: 'admin' },
          { label: '鏅€氱敤鎴?', value: 'user' },
          { label: '璁垮', value: 'guest' },
        ],
      }),
      createFieldByType('select', {
        id: 'field_status',
        label: '鐘舵€?',
        prop: 'status',
        placeholder: '璇烽€夋嫨鐘舵€?',
        options: [
          { label: '鍚敤', value: 'enabled' },
          { label: '鍋滅敤', value: 'disabled' },
        ],
      }),
      createFieldByType('date', {
        id: 'field_created_at',
        label: '鍒涘缓鏃堕棿',
        prop: 'createdAt',
        searchable: false,
      }),
    ],
    table: {
      rowKey: 'id',
      columns: [],
      actions: ['edit', 'delete'],
    },
    formDialog: {
      title: '缂栬緫鏁版嵁',
      width: '600px',
    },
    charts: [
      { id: 'recordMetric', type: 'metric', title: '璁板綍鎬绘暟', metric: 'count' },
      { id: 'statusPie', type: 'pie', title: '鐘舵€佸垎甯?', dimension: 'status', metric: 'count' },
      { id: 'roleBar', type: 'bar', title: '瑙掕壊鍒嗗竷', dimension: 'role', metric: 'count' },
    ],
    metrics: [
      { id: 'total', title: '璁板綍鎬绘暟', type: 'total', tone: 'blue' },
      { id: 'enabled', title: '鍚敤璁板綍', type: 'match', field: 'status', value: 'enabled', tone: 'green' },
      { id: 'recent', title: '杩?30 澶╂柊澧?', type: 'recent', field: 'createdAt', tone: 'orange' },
    ],
    queries: [],
    rowActions: [],
    batchActions: [],
    entity: null,
    templateKey: null,
  }
}

export function buildDemoRows() {
  return [
    { id: 1, username: 'admin', nickname: '绯荤粺绠＄悊鍛?', role: 'admin', status: 'enabled', createdAt: '2026-05-01' },
    { id: 2, username: 'zhangsan', nickname: '寮犱笁', role: 'user', status: 'enabled', createdAt: '2026-05-03' },
    { id: 3, username: 'lisi', nickname: '鏉庡洓', role: 'user', status: 'disabled', createdAt: '2026-05-08' },
    { id: 4, username: 'wangwu', nickname: '鐜嬩簲', role: 'guest', status: 'enabled', createdAt: '2026-05-12' },
  ]
}
