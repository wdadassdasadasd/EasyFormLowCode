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
    expect(JSON.parse(result).fields).toHaveLength(2)
  })

  it('exports a Vue SFC from visible input fields', () => {
    const result = buildVueSfc(schema)

    expect(result).toContain('<template>')
    expect(result).toContain('用户管理')
    expect(result).toContain('v-model="dialogForm.username"')
    expect(result).not.toContain('dialogForm.hidden')
  })
})
