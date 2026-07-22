<template>
  <component
    :is="resolvedComponent"
    v-model="fieldValue"
    class="schema-field-control"
    :data-testid="`field-${field.prop}`"
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
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
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
  ElTimePicker,
  ElSwitch,
  ElRadioGroup,
  ElCheckboxGroup,
  ElCascader,
  ElRate,
  ElSlider,
}

const normalizedField = computed(() => normalizeField(props.field))
const fieldConfig = computed(() => getFieldTypeConfig(normalizedField.value.type))
const controlConfig = computed(() => (props.mode === 'search' ? fieldConfig.value.searchControl : fieldConfig.value.formControl))
const resolvedComponent = computed(() => componentMap[controlConfig.value.component] || ElInput)
const normalizedOptions = computed(() => normalizeOptions(normalizedField.value.relationOptions?.length ? normalizedField.value.relationOptions : normalizedField.value.options))
const isOptionSelect = computed(() => controlConfig.value.component === 'ElSelect')
const isRadioGroup = computed(() => controlConfig.value.component === 'ElRadioGroup')
const isCheckboxGroup = computed(() => controlConfig.value.component === 'ElCheckboxGroup')

const fieldValue = computed({
  get() {
    // ElInputNumber 要求 modelValue 为 Number | null，传入空串会触发
    // "Expected Number | Null, got String" 运行时警告。初始归一化阶段
    // useSchemaModels 可能以空串兜底，这里在分发到 number 控件时再做一次断言，
    // 避免脏值污染与控制台噪声。
    if (controlConfig.value.component === 'ElInputNumber' && props.modelValue === '') {
      return null
    }
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

  if (['input', 'textarea', 'password', 'email', 'phone', 'url'].includes(field.type)) {
    baseProps.maxlength = field.maxLength || undefined
  }

  if (field.type === 'textarea') {
    baseProps.rows = field.rows || baseProps.rows || 3
  }

  if (field.type === 'number') {
    baseProps.min = field.min === '' ? undefined : field.min
    baseProps.max = field.max === '' ? undefined : field.max
    baseProps.step = field.step === '' ? undefined : field.step
  }

  if (field.type === 'slider') {
    baseProps.min = field.min === '' ? undefined : field.min
    baseProps.max = field.max === '' ? undefined : field.max
    baseProps.step = field.step === '' ? undefined : field.step
    baseProps.showStops = Boolean(field.showStops)
    baseProps.range = Boolean(field.range)
  }

  if (field.type === 'rate') {
    baseProps.allowHalf = Boolean(field.allowHalf)
    baseProps.showScore = field.showScore !== false
  }

  if (field.type === 'date' || field.type === 'datetime') {
    baseProps.type = field.dateType || controlConfig.value.props?.type || 'date'
    baseProps.valueFormat = controlConfig.value.props?.valueFormat || field.valueFormat
  }

  if (field.type === 'time') {
    baseProps.format = field.timeFormat || 'HH:mm:ss'
    baseProps.valueFormat = field.timeFormat || 'HH:mm:ss'
  }

  if (field.type === 'select') {
    baseProps.multiple = Boolean(field.multiple)
  }

  if (field.type === 'tag') {
    baseProps.multiple = true
    baseProps.collapseTags = true
    baseProps.collapseTagsTooltip = true
  }

  if (field.type === 'cascader') {
    baseProps.options = normalizedOptions.value
  }

  if (field.type === 'switch' && props.mode === 'form') {
    baseProps.activeText = field.activeText || '开启'
    baseProps.inactiveText = field.inactiveText || '关闭'
  }

  return baseProps
})
</script>
