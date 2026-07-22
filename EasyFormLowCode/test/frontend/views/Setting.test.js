import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import Setting from '../../../frontend/src/views/Setting.vue'

describe('Setting', () => {
  it('renders the runtime explanation header', () => {
    const wrapper = mount(Setting, {
      global: {
        stubs: {
          ElDescriptions: { template: '<dl class="el-descriptions"><slot /></dl>' },
          ElDescriptionsItem: {
            props: ['label'],
            template: '<div class="el-descriptions-item"><dt>{{ label }}</dt><dd><slot /></dd></div>',
          },
        },
      },
    })

    expect(wrapper.find('h1').text()).toBe('运行说明')
    expect(wrapper.text()).toContain('当前版本专注单表后台 CRUD 生成')
  })

  it('documents the external REST data source limitation', () => {
    const wrapper = mount(Setting, {
      global: {
        stubs: {
          ElDescriptions: { template: '<dl><slot /></dl>' },
          ElDescriptionsItem: {
            props: ['label'],
            template: '<div><dt>{{ label }}</dt><dd><slot /></dd></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('仅兼容读取预览，暂不支持写入或统计')
  })
})