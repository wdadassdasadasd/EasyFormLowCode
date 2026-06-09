import { describe, expect, it } from 'vitest'

import { buildSchemaJson, buildVueSfc } from './codeExporter'

const schema = {
  id: 'user_manage',
  title: '用户管理',
  pageType: 'crud',
  fields: [
    {
      id: 'field_username',
      label: '用户名',
      prop: 'username',
      type: 'input',
      required: true,
      searchable: true,
      tableVisible: true,
      formVisible: true,
      placeholder: '请输入用户名',
      maxLength: 50,
    },
    {
      id: 'field_intro',
      label: '简介',
      prop: 'intro',
      type: 'textarea',
      searchable: false,
      tableVisible: true,
      formVisible: true,
      maxLength: 200,
    },
    {
      id: 'field_age',
      label: '年龄',
      prop: 'age',
      type: 'number',
      searchable: true,
      tableVisible: true,
      formVisible: true,
      min: 0,
      max: 120,
    },
    {
      id: 'field_role',
      label: '角色',
      prop: 'role',
      type: 'select',
      searchable: true,
      tableVisible: true,
      formVisible: true,
      options: [
        { label: '管理员', value: 'admin' },
        { label: '访客', value: 'guest' },
      ],
    },
    {
      id: 'field_created_at',
      label: '创建日期',
      prop: 'createdAt',
      type: 'date',
      searchable: true,
      tableVisible: true,
      formVisible: true,
    },
    {
      id: 'field_enabled',
      label: '启用',
      prop: 'enabled',
      type: 'switch',
      searchable: false,
      tableVisible: true,
      formVisible: true,
    },
    {
      id: 'field_gender',
      label: '性别',
      prop: 'gender',
      type: 'radio',
      searchable: true,
      tableVisible: true,
      formVisible: true,
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ],
    },
    {
      id: 'field_hidden',
      label: '隐藏字段',
      prop: 'hidden',
      type: 'input',
      searchable: false,
      tableVisible: false,
      formVisible: false,
    },
  ],
}

describe('codeExporter', () => {
  it('exports formatted schema json', () => {
    const result = buildSchemaJson(schema)

    expect(result).toContain('"title": "用户管理"')
    expect(JSON.parse(result).fields).toHaveLength(8)
  })

  it('exports a Vue SFC from all visible field types', () => {
    const result = buildVueSfc(schema)

    expect(result).toContain('<template>')
    expect(result).toContain('用户管理')
    expect(result).toContain('v-model="dialogForm.username"')
    expect(result).toContain('type="textarea"')
    expect(result).toContain('<el-input-number v-model="searchModel.age"')
    expect(result).toContain('<el-select v-model="dialogForm.role"')
    expect(result).toContain('<el-date-picker v-model="dialogForm.createdAt"')
    expect(result).toContain('<el-switch v-model="dialogForm.enabled"')
    expect(result).toContain('<el-radio-group v-model="dialogForm.gender"')
    expect(result).toContain('formatOptionValue(row.role')
    expect(result).not.toContain('dialogForm.hidden')
    expect(result).not.toContain('searchModel.hidden')
  })
})
