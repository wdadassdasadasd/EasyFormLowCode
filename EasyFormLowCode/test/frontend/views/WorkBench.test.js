import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: pushMock }),
}))

import WorkBench from '../../../frontend/src/views/WorkBench.vue'

function mountWorkBench(catalog) {
  return mount(WorkBench, {
    global: {
      provide: {
        projectCatalog: catalog,
      },
      stubs: {
        ElButton: { template: '<button><slot /></button>' },
        ElSkeleton: { template: '<div class="el-skeleton" />' },
        ElEmpty: { props: ['description'], template: '<div class="el-empty">{{ description }}<slot /></div>' },
        ElTag: { template: '<span><slot /></span>' },
      },
    },
  })
}

describe('WorkBench', () => {
  it('renders the active project name in the header', () => {
    const catalog = {
      activeProject: ref({ id: 7, name: '演示项目' }),
      catalogLoading: ref(false),
      pages: ref([]),
    }
    const wrapper = mountWorkBench(catalog)
    expect(wrapper.text()).toContain('演示项目')
  })

  it('shows the empty-state CTA when the current project has no pages', () => {
    const catalog = {
      activeProject: ref({ id: 7, name: '演示项目' }),
      catalogLoading: ref(false),
      pages: ref([]),
    }
    const wrapper = mountWorkBench(catalog)
    expect(wrapper.find('.el-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('当前项目还没有页面')
  })

  it('renders metrics using catalog pages (published count)', () => {
    const catalog = {
      activeProject: ref({ id: 7, name: '演示项目' }),
      catalogLoading: ref(false),
      pages: ref([
        { page_id: 'a', name: '页面 A', has_published: true },
        { page_id: 'b', name: '页面 B', has_published: false },
      ]),
    }
    const wrapper = mountWorkBench(catalog)
    expect(wrapper.text()).toContain('2 个页面')
    const overview = wrapper.findAll('.overview-item strong')
    expect(overview.some((node) => node.text() === '1')).toBe(true)
  })

  it('falls back to 工作台 title when activeProject is missing', () => {
    const catalog = {
      activeProject: ref(null),
      catalogLoading: ref(false),
      pages: ref([]),
    }
    const wrapper = mountWorkBench(catalog)
    expect(wrapper.find('h1').text()).toBe('工作台')
  })

  it('navigates to the manage page when the empty-state CTA is clicked', async () => {
    const catalog = {
      activeProject: ref({ id: 9, name: '空项目' }),
      catalogLoading: ref(false),
      pages: ref([]),
    }
    const wrapper = mountWorkBench(catalog)
    await wrapper.find('.el-empty button').trigger('click')
    expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ path: '/appmanage' }))
  })
})