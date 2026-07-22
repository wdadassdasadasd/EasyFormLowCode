import { mount } from '@vue/test-utils'
import { ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus'
import { describe, expect, it } from 'vitest'

import { createFieldByType } from '../../../frontend/src/schema/fieldTypes'
import FieldControl from '../../../frontend/src/renderer/FieldControl.vue'

describe('FieldControl', () => {
  it('renders an input field from registry metadata', () => {
    const wrapper = mount(FieldControl, {
      props: {
        field: createFieldByType('input', { placeholder: '请输入' }),
        modelValue: '',
        mode: 'form',
      },
    })

    expect(wrapper.findComponent(ElInput).exists()).toBe(true)
    expect(wrapper.findComponent(ElInput).props('placeholder')).toBe('请输入')
  })

  it('renders a number field from registry metadata', () => {
    const wrapper = mount(FieldControl, {
      props: {
        field: createFieldByType('number', { min: 1, max: 10 }),
        modelValue: 3,
        mode: 'form',
      },
    })

    expect(wrapper.findComponent(ElInputNumber).exists()).toBe(true)
    expect(wrapper.findComponent(ElInputNumber).props('min')).toBe(1)
    expect(wrapper.findComponent(ElInputNumber).props('max')).toBe(10)
  })

  it('normalizes empty string to null for number fields', () => {
    // useSchemaModels 在初次同步时可能给 number 字段兜底为空串，ElInputNumber
    // 收到空串会触发运行时警告并写入脏值。FieldControl 应在分发控制件时
    // 把空串归一化为 null。
    const wrapper = mount(FieldControl, {
      props: {
        field: createFieldByType('number'),
        modelValue: '',
        mode: 'form',
      },
    })

    const input = wrapper.findComponent(ElInputNumber)
    expect(input.exists()).toBe(true)
    expect(input.props('modelValue')).toBe(null)
  })

  it('uses search control metadata for radio fields', () => {
    const wrapper = mount(FieldControl, {
      props: {
        field: createFieldByType('radio', {
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ],
        }),
        modelValue: '',
        mode: 'search',
      },
    })

    expect(wrapper.findComponent(ElSelect).exists()).toBe(true)
    expect(wrapper.findAllComponents(ElOption)).toHaveLength(2)
  })
})
