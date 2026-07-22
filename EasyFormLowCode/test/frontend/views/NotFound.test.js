import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import NotFound from '../../../frontend/src/views/NotFound.vue'

describe('NotFound', () => {
  it('renders the 404 result and navigates home when the button is clicked', async () => {
    const wrapper = mount(NotFound, {
      global: {
        stubs: {
          ElButton: { template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>' },
          ElResult: {
            template: '<div class="el-result"><h1>{{ title }}</h1><p>{{ subTitle }}</p><slot name="extra" /></div>',
            props: ['title', 'subTitle'],
          },
        },
      },
    })

    expect(wrapper.find('h1').text()).toBe('404')
    expect(wrapper.text()).toContain('页面不存在或已被移除')

    await wrapper.find('button').trigger('click')
    expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'WorkBench' }))
  })
})