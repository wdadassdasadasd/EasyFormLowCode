import { createFieldByType } from './fieldTypes'

export const SCHEMA_VERSION = 2

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
  }
}

export function createDefaultPageSchema(pageId = 'user_manage') {
  const datasource = buildRuntimeDatasource(pageId)

  return {
    schemaVersion: SCHEMA_VERSION,
    id: pageId,
    title: '用户管理',
    pageType: 'crud',
    datasource,
    api: { ...datasource },
    actions: { ...DEFAULT_PAGE_ACTIONS },
    fields: [
      createFieldByType('input', {
        id: 'field_username',
        label: '用户名',
        prop: 'username',
        placeholder: '请输入用户名',
        required: true,
      }),
      createFieldByType('input', {
        id: 'field_nickname',
        label: '昵称',
        prop: 'nickname',
        placeholder: '请输入昵称',
      }),
      createFieldByType('select', {
        id: 'field_role',
        label: '用户角色',
        prop: 'role',
        placeholder: '请选择角色',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '普通用户', value: 'user' },
          { label: '访客', value: 'guest' },
        ],
      }),
      createFieldByType('select', {
        id: 'field_status',
        label: '状态',
        prop: 'status',
        placeholder: '请选择状态',
        options: [
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' },
        ],
      }),
      createFieldByType('date', {
        id: 'field_created_at',
        label: '创建时间',
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
      title: '编辑数据',
      width: '600px',
    },
    charts: [
      { id: 'recordMetric', type: 'metric', title: '记录总数', metric: 'count' },
      { id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'status', metric: 'count' },
      { id: 'roleBar', type: 'bar', title: '角色分布', dimension: 'role', metric: 'count' },
    ],
  }
}

export function buildDemoRows() {
  return [
    { id: 1, username: 'admin', nickname: '系统管理员', role: 'admin', status: 'enabled', createdAt: '2026-05-01' },
    { id: 2, username: 'zhangsan', nickname: '张三', role: 'user', status: 'enabled', createdAt: '2026-05-03' },
    { id: 3, username: 'lisi', nickname: '李四', role: 'user', status: 'disabled', createdAt: '2026-05-08' },
    { id: 4, username: 'wangwu', nickname: '王五', role: 'guest', status: 'enabled', createdAt: '2026-05-12' },
  ]
}
