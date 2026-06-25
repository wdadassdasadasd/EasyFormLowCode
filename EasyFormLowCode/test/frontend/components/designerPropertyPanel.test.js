import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DesignerPropertyPanel from '../../../frontend/src/components/designer/DesignerPropertyPanel.vue'

const globalStubs = {
  Draggable: { template: '<div><slot /><slot name="item" :element="{}" :index="0" /></div>' },
  ElButton: { template: '<button><slot /></button>' },
  ElEmpty: { template: '<div class="el-empty-stub"><slot /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label'], template: '<div class="el-form-item-stub"><slot /></div>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElInput: { template: '<input class="el-input-stub" />' },
  ElInputNumber: { template: '<input class="el-input-number-stub" />' },
  ElOption: { template: '<option><slot /></option>' },
  ElSelect: { template: '<select class="el-select-stub"><slot /></select>' },
  ElSwitch: { template: '<input type="checkbox" class="el-switch-stub" />' },
}

function mountPanel(overrides = {}) {
  return mount(DesignerPropertyPanel, {
    props: {
      materialFieldTypes: [{ type: 'select', label: '下拉选择' }],
      pageSchema: {
        id: 'demo',
        title: 'Demo',
        datasource: { mode: 'runtime' },
        actions: { search: true, reset: true, create: true, edit: true, delete: true, batchDelete: true },
        fields: [],
        charts: [],
      },
      datasourceCapabilities: { create: true, update: true, delete: true, batchDelete: true },
      fieldPropFeedback: '',
      selectedArea: 'table',
      selectedField: null,
      setterGroups: [],
      usesOptionDefaultValue: false,
      ...overrides,
    },
    global: {
      stubs: globalStubs,
    },
  })
}

describe('DesignerPropertyPanel', () => {
  it('shows readonly datasource note only for rest mode', () => {
    const runtimeWrapper = mountPanel()
    expect(runtimeWrapper.text()).not.toContain('只读模式')

    const restWrapper = mountPanel({
      pageSchema: {
        id: 'demo',
        title: 'Demo',
        datasource: { mode: 'rest' },
        actions: { search: true, reset: true, create: true, edit: true, delete: true, batchDelete: true },
        fields: [],
        charts: [],
      },
      datasourceCapabilities: { create: false, update: false, delete: false, batchDelete: false },
    })

    expect(restWrapper.text()).toContain('只读模式')
  })

  it('keeps prop feedback and option default-value setter rendered together', () => {
    const wrapper = mountPanel({
      selectedField: {
        id: 'field_role',
        type: 'select',
        label: '角色',
        prop: 'role',
        defaultValue: 'admin',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '访客', value: 'guest' },
        ],
      },
      setterGroups: [
        {
          key: 'base',
          label: '基础',
          items: [
            { prop: 'prop', label: 'Prop', setter: 'input' },
            { prop: 'defaultValue', label: '默认值', setter: 'input' },
          ],
        },
      ],
      usesOptionDefaultValue: true,
      fieldPropFeedback: 'Prop 已自动调整为 role_2',
    })

    expect(wrapper.text()).toContain('Prop 已自动调整为 role_2')
    expect(wrapper.findAll('.el-select-stub').length).toBeGreaterThanOrEqual(1)
  })
  it('renders query and action configuration sections for stage-2 features', () => {
    const wrapper = mountPanel({
      pageSchema: {
        id: 'demo',
        title: 'Demo',
        datasource: { mode: 'rest' },
        actions: { search: true, reset: true, create: true, edit: true, delete: true, batchDelete: true },
        fields: [{ id: 'field_name', label: 'Name', prop: 'name', type: 'input', searchable: true }],
        charts: [],
        queries: [{ id: 'query_name', label: 'Name', fieldProp: 'name', paramKey: 'name', operator: 'contains', defaultValue: '' }],
        rowActions: [{ id: 'row_request', type: 'request', label: 'Sync', method: 'POST', url: '/sync/:id', refreshAfterSuccess: true }],
        batchActions: [{ id: 'batch_request', type: 'request', label: 'Archive', method: 'POST', url: '/archive', refreshAfterSuccess: true }],
      },
    })

    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('Sync')
    expect(wrapper.text()).toContain('Archive')
  })
})
