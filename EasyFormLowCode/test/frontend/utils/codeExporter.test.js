import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

import { buildSchemaJson, buildTemplateJson, buildVueSfc, parseImportedSchema } from '../../../frontend/src/utils/codeExporter'

const schema = {
  id: 'user_manage',
  title: '用户管理',
  pageType: 'crud',
  fields: [
    { id: 'field_username', label: '用户名', prop: 'username', type: 'input', required: true, searchable: true, tableVisible: true, formVisible: true, placeholder: '请输入用户名', maxLength: 50 },
    { id: 'field_email', label: '邮箱', prop: 'email', type: 'email', searchable: true, tableVisible: true, formVisible: true },
    { id: 'field_rate', label: '评分', prop: 'rate', type: 'rate', searchable: false, tableVisible: true, formVisible: true },
    { id: 'field_slider', label: '积分', prop: 'score', type: 'slider', searchable: true, tableVisible: true, formVisible: true, min: 0, max: 100 },
    { id: 'field_role', label: '角色', prop: 'role', type: 'select', searchable: true, tableVisible: true, formVisible: true, options: [{ label: '管理员', value: 'admin' }, { label: '访客', value: 'guest' }] },
    { id: 'field_created_at', label: '创建日期', prop: 'createdAt', type: 'datetime', searchable: true, tableVisible: true, formVisible: true },
    { id: 'field_enabled', label: '启用', prop: 'enabled', type: 'switch', searchable: false, tableVisible: true, formVisible: true },
    { id: 'field_tags', label: '标签', prop: 'tags', type: 'tag', searchable: false, tableVisible: true, formVisible: true, options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
    { id: 'field_hidden', label: '隐藏字段', prop: 'hidden', type: 'input', searchable: false, tableVisible: false, formVisible: false },
  ],
  metrics: [
    { id: 'total', title: '总数', type: 'total', tone: 'blue' },
    { id: 'avgScore', title: '平均积分', type: 'average', field: 'score', precision: 1, tone: 'teal' },
  ],
  charts: [
    { id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'role', metric: 'count' },
    { id: 'roleLine', type: 'line', title: '积分趋势', dimension: 'createdAt', metric: 'sum', measureField: 'score', sort: 'asc' },
    { id: 'scoreRank', type: 'rankBar', title: '积分排行', dimension: 'role', metric: 'average', measureField: 'score' },
  ],
}

describe('codeExporter', () => {
  it('exports formatted schema json', () => {
    const result = buildSchemaJson(schema)

    expect(result).toContain('"title": "用户管理"')
    expect(JSON.parse(result).fields).toHaveLength(9)
  })

  it('exports template json without page instance fields and can import it back', () => {
    const result = buildTemplateJson({
      ...schema,
      entity: { id: 1, name: 'User' },
      datasource: { mode: 'runtime', listUrl: '/api/runtime/pages/user_manage/records' },
      queries: [{ id: 'query_role', label: '角色', fieldProp: 'role', paramKey: 'role', operator: 'eq', defaultValue: '' }],
      rowActions: [{ id: 'row_archive', type: 'request', label: '归档', method: 'POST', url: '/api/users/:id/archive' }],
      batchActions: [{ id: 'batch_archive', type: 'request', label: '批量归档', method: 'POST', url: '/api/users/archive' }],
    })

    const parsed = JSON.parse(result)
    expect(parsed.id).toBeUndefined()
    expect(parsed.title).toBeUndefined()
    expect(parsed.entity).toBeUndefined()
    expect(parsed.queries).toHaveLength(1)
    expect(parsed.rowActions[0].url).toBe('/api/users/:id/archive')

    const imported = parseImportedSchema(result, 'orders')
    expect(imported.id).toBe('orders')
    expect(imported.rowActions[0].label).toBe('归档')
  })

  it('exports a Vue SFC from visible field types and charts', () => {
    const result = buildVueSfc(schema)

    expect(result).toContain('<template>')
    expect(result).toContain('用户管理')
    expect(result).toContain('metrics-grid')
    expect(result).toContain('chart-grid')
    expect(result).toContain('vue-echarts')
    expect(result).toContain('v-model="dialogForm.username"')
    expect(result).toContain('<el-rate v-model="dialogForm.rate"')
    expect(result).toContain('<el-slider v-model="dialogForm.score"')
    expect(result).toContain('<el-select v-model="dialogForm.role"')
    expect(result).toContain('<el-date-picker v-model="dialogForm.createdAt"')
    expect(result).toContain('<el-switch v-model="dialogForm.enabled"')
    expect(result).toContain('rankBar')
    expect(result).toContain('buildChartOption')
    expect(result).toContain('VITE_API_BASE_URL')
    expect(result).toContain('runtimeError')
    expect(result).toContain('pagination.total')
    expect(result).not.toContain('dialogForm.hidden')
    expect(result).not.toContain('searchModel.hidden')
  })

  it('exports a readonly runtime when datasource mode is rest', () => {
    const result = buildVueSfc({
      ...schema,
      datasource: {
        mode: 'rest',
        listUrl: '/api/external/users',
        createUrl: '/api/external/users',
        updateUrl: '/api/external/users/:id',
        deleteUrl: '/api/external/users/:id',
      },
      actions: {
        search: true,
        reset: true,
        create: true,
        edit: true,
        delete: true,
        batchDelete: true,
      },
    })

    expect(result).toContain('只读模式')
    expect(result).not.toContain('type="selection"')
    expect(result).not.toContain('@click="deleteRecord(row.id)"')
  })

  it('exports an SFC that can be parsed and compiled', () => {
    const result = buildVueSfc(schema)
    const parsed = parse(result, { filename: 'GeneratedPage.vue' })

    expect(parsed.errors).toHaveLength(0)

    const compiledScript = compileScript(parsed.descriptor, {
      id: 'generated-page',
    })
    const compiledTemplate = compileTemplate({
      id: 'generated-page',
      filename: 'GeneratedPage.vue',
      source: parsed.descriptor.template.content,
    })

    expect(compiledScript.content).toContain('loadRecords')
    expect(compiledTemplate.errors).toHaveLength(0)
  })
})
