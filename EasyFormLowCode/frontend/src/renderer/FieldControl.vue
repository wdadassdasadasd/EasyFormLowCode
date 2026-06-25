<template>
  <component
    :is="resolvedComponent"
    v-model="fieldValue"
    class="schema-field-control"
    v-bind="controlProps"
    @keyup.enter="emit('enter')"
  >
    <template v-if="isOptionSelect">
      <el-option
        v-for="option in normalizedOptions"
        :key="String(option.value)"
        :label="option.label"
        :value="option.value"
      />
    </template>

    <template v-if="isRadioGroup">
      <el-radio v-for="option in normalizedOptions" :key="String(option.value)" :value="option.value">
        {{ option.label }}
      </el-radio>
    </template>

    <template v-if="isCheckboxGroup">
      <el-checkbox v-for="option in normalizedOptions" :key="String(option.value)" :value="option.value">
        {{ option.label }}
      </el-checkbox>
    </template>
  </component>
</template>

<script setup>
import {
  ElDatePicker,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import { computed } from 'vue'

import { getFieldTypeConfig, normalizeField, normalizeOptions } from '../schema/fieldTypes'

const props = defineProps({
  field: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [String, Number, Boolean, Array, Object, Date],
    default: '',
  },
  mode: {
    type: String,
    default: 'form',
    validator: (value) => ['form', 'search'].includes(value),
  },
})

const emit = defineEmits(['update:modelValue', 'enter'])

const componentMap = {
  ElInput,
  ElInputNumber,
  ElSelect,
  ElDatePicker,
  ElSwitch,
  ElRadioGroup,
  ElCheckboxGroup,
  ElCascader,
}

const normalizedField = computed(() => normalizeField(props.field))
const fieldConfig = computed(() => getFieldTypeConfig(normalizedField.value.type))
const controlConfig = computed(() => {
  return props.mode === 'search' ? fieldConfig.value.searchControl : fieldConfig.value.formControl
})
const resolvedComponent = computed(() => componentMap[controlConfig.value.component] || ElInput)
const normalizedOptions = computed(() => normalizeOptions(normalizedField.value.relationOptions?.length ? normalizedField.value.relationOptions : normalizedField.value.options))
const isOptionSelect = computed(() => controlConfig.value.component === 'ElSelect')
const isRadioGroup = computed(() => controlConfig.value.component === 'ElRadioGroup')
const isCheckboxGroup = computed(() => controlConfig.value.component === 'ElCheckboxGroup')

const fieldValue = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

const controlProps = computed(() => {
  const field = normalizedField.value
  const baseProps = {
    placeholder: field.placeholder,
    ...controlConfig.value.props,
  }

  if (field.type === 'input' || field.type === 'textarea') {
    baseProps.maxlength = field.maxLength || undefined
  }

  if (field.type === 'textarea') {
    baseProps.rows = field.rows || baseProps.rows || 3
  }

  if (field.type === 'number') {
    baseProps.min = field.min === '' ? undefined : field.min
    baseProps.max = field.max === '' ? undefined : field.max
  }

  if (field.type === 'date') {
    baseProps.type = field.dateType || 'date'
  }

  if (field.type === 'select') {
    baseProps.multiple = Boolean(field.multiple)
  }

  if (field.type === 'cascader') {
    baseProps.options = normalizedOptions.value
  }

  if (field.type === 'switch' && props.mode === 'form') {
    baseProps.activeText = field.activeText || '是'
    baseProps.inactiveText = field.inactiveText || '否'
  }

  return baseProps
})
</script>
