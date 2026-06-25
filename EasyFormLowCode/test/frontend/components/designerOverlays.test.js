import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DesignerOverlays from '../../../frontend/src/components/designer/DesignerOverlays.vue'

describe('DesignerOverlays', () => {
  it('exposes schema/template import-export actions in the export dialog', () => {
    const wrapper = mount(DesignerOverlays, {
      props: {
        dialogForm: {},
        dialogTitle: '',
        dialogVisible: false,
        exportDialogVisible: true,
        formErrors: {},
        formFields: [],
        selectedFieldId: '',
        selectedVersion: null,
        submitLoading: false,
        versionDrawerVisible: false,
        versions: [],
      },
      global: {
        stubs: {
          ElDialog: { template: '<div class="el-dialog-stub"><slot /><slot name="footer" /></div>' },
          ElDrawer: { template: '<div class="el-drawer-stub"><slot /></div>' },
          ElButton: { template: '<button><slot /></button>' },
          ElDivider: { template: '<hr />' },
          ElEmpty: { template: '<div><slot /></div>' },
          ElForm: { template: '<form><slot /></form>' },
          ElFormItem: { template: '<div><slot /></div>' },
          FieldControl: { template: '<input />' },
        },
      },
    })

    expect(wrapper.text()).toContain('template JSON')
    expect(wrapper.text()).toContain('导入 schema JSON')
    expect(wrapper.text()).toContain('导入 template JSON')
  })
})
