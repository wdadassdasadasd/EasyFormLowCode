const BASE_FIELD_SCHEMA = {
  required: false,
  searchable: true,
  tableVisible: true,
  formVisible: true,
  placeholder: '',
  defaultValue: '',
  options: [],
}

const OPTION_DEFAULTS = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]

const RADIO_DEFAULTS = [
  { label: '是', value: 'yes' },
  { label: '否', value: 'no' },
]

const SWITCH_OPTIONS = [
  { label: '是', value: true },
  { label: '否', value: false },
]

const SETTERS = {
  label: { prop: 'label', label: '标签名', setter: 'input', required: true, group: 'base' },
  prop: { prop: 'prop', label: 'Prop', setter: 'input', required: true, group: 'base' },
  type: { prop: 'type', label: '类型', setter: 'typeSelect', required: true, group: 'base' },
  required: { prop: 'required', label: '必填', setter: 'switch', group: 'validate' },
  searchable: { prop: 'searchable', label: '搜索区', setter: 'switch', structural: true, group: 'display' },
  tableVisible: { prop: 'tableVisible', label: '表格列', setter: 'switch', group: 'display' },
  formVisible: { prop: 'formVisible', label: '弹窗表单', setter: 'switch', structural: true, group: 'display' },
  placeholder: { prop: 'placeholder', label: '占位提示', setter: 'input', group: 'base' },
  defaultValue: { prop: 'defaultValue', label: '默认值', setter: 'input', group: 'default' },
  maxLength: { prop: 'maxLength', label: '最大长度', setter: 'number', min: 1, max: 500, group: 'validate' },
  min: { prop: 'min', label: '最小值', setter: 'number', group: 'validate' },
  max: { prop: 'max', label: '最大值', setter: 'number', group: 'validate' },
  dateType: {
    prop: 'dateType',
    label: '日期类型',
    setter: 'select',
    group: 'base',
    options: [
      { label: '日期', value: 'date' },
      { label: '日期时间', value: 'datetime' },
    ],
  },
  options: { prop: 'options', label: '选项列表', setter: 'options', group: 'options' },
  activeText: { prop: 'activeText', label: '开启文案', setter: 'input', group: 'options' },
  inactiveText: { prop: 'inactiveText', label: '关闭文案', setter: 'input', group: 'options' },
}

const COMMON_SETTERS = [
  SETTERS.label,
  SETTERS.prop,
  SETTERS.type,
  SETTERS.searchable,
  SETTERS.tableVisible,
  SETTERS.formVisible,
  SETTERS.required,
]

function control(component, props = {}) {
  return { component, props }
}

function inputExporter(field, modelName) {
  return `<el-input v-model="${modelName}.${field.prop}"${field.maxLength ? ` :maxlength="${field.maxLength}"` : ''} placeholder="${escapeHtml(field.placeholder || '')}" clearable />`
}

function textareaExporter(field, modelName) {
  return `<el-input v-model="${modelName}.${field.prop}" type="textarea" :rows="${field.rows || 3}"${field.maxLength ? ` :maxlength="${field.maxLength}" show-word-limit` : ''} placeholder="${escapeHtml(field.placeholder || '')}" />`
}

function numberExporter(field, modelName) {
  const min = field.min !== undefined && field.min !== '' ? ` :min="${field.min}"` : ''
  const max = field.max !== undefined && field.max !== '' ? ` :max="${field.max}"` : ''
  return `<el-input-number v-model="${modelName}.${field.prop}"${min}${max} controls-position="right" />`
}

function optionExporter(field) {
  return normalizeOptions(field.options)
    .map((option) => `<el-option label="${escapeHtml(option.label)}" :value='${escapeAttr(JSON.stringify(option.value))}' />`)
    .join('\n')
}

function selectExporter(field, modelName) {
  return `<el-select v-model="${modelName}.${field.prop}" placeholder="${escapeHtml(field.placeholder || '请选择')}" clearable>
            ${optionExporter(field)}
          </el-select>`
}

function radioExporter(field, modelName) {
  return `<el-radio-group v-model="${modelName}.${field.prop}">
            ${normalizeOptions(field.options)
              .map((option) => `<el-radio :value='${escapeAttr(JSON.stringify(option.value))}'>${escapeHtml(option.label)}</el-radio>`)
              .join('\n            ')}
          </el-radio-group>`
}

function dateExporter(field, modelName) {
  return `<el-date-picker v-model="${modelName}.${field.prop}" type="${field.dateType || 'date'}" value-format="YYYY-MM-DD" placeholder="${escapeHtml(field.placeholder || '请选择日期')}" />`
}

function switchExporter(field, modelName) {
  return `<el-switch v-model="${modelName}.${field.prop}" active-text="${escapeHtml(field.activeText || '是')}" inactive-text="${escapeHtml(field.inactiveText || '否')}" />`
}

function displayByOptions(field, value) {
  const option = normalizeOptions(field.options).find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

function displaySwitch(field, value) {
  if (value === true || value === 'true' || value === 'enabled' || value === 'yes') {
    return field.activeText || '是'
  }

  if (value === false || value === 'false' || value === 'disabled' || value === 'no') {
    return field.inactiveText || '否'
  }

  return value ?? ''
}

export const FIELD_TYPE_REGISTRY = {
  input: {
    type: 'input',
    label: '单行文本',
    material: { group: '基础字段', icon: 'EditPen', order: 10, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'input',
      label: '单行文本',
      prop: 'text',
      placeholder: '请输入文本',
      maxLength: 50,
    },
    formControl: control('ElInput', { clearable: true, showWordLimit: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 140, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: inputExporter, search: inputExporter, table: tableColumnExporter },
    buildRules: buildTextRules,
  },
  textarea: {
    type: 'textarea',
    label: '多行文本',
    material: { group: '基础字段', icon: 'Document', order: 20, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'textarea',
      label: '多行文本',
      prop: 'textarea',
      searchable: false,
      placeholder: '请输入多行文本',
      maxLength: 200,
      rows: 3,
    },
    formControl: control('ElInput', { type: 'textarea', rows: 3, showWordLimit: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 180, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: textareaExporter, search: inputExporter, table: tableColumnExporter },
    buildRules: buildTextRules,
  },
  number: {
    type: 'number',
    label: '数字输入',
    material: { group: '基础字段', icon: 'Tickets', order: 30, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'number',
      label: '数字输入',
      prop: 'number',
      placeholder: '请输入数字',
      defaultValue: 0,
      min: 0,
      max: 999999,
    },
    formControl: control('ElInputNumber', { controlsPosition: 'right' }),
    searchControl: control('ElInputNumber', { controlsPosition: 'right' }),
    table: { minWidth: 120, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.min, SETTERS.max],
    exporter: { form: numberExporter, search: numberExporter, table: tableColumnExporter },
    buildRules: buildNumberRules,
  },
  select: {
    type: 'select',
    label: '下拉选择',
    material: { group: '选择字段', icon: 'ArrowDown', order: 40, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'select',
      label: '下拉选择',
      prop: 'select',
      placeholder: '请选择',
      options: OPTION_DEFAULTS,
    },
    formControl: control('ElSelect', { clearable: true }),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 130, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.options],
    exporter: { form: selectExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  date: {
    type: 'date',
    label: '日期选择',
    material: { group: '基础字段', icon: 'Calendar', order: 50, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'date',
      label: '日期选择',
      prop: 'date',
      placeholder: '请选择日期',
      dateType: 'date',
    },
    formControl: control('ElDatePicker', { valueFormat: 'YYYY-MM-DD' }),
    searchControl: control('ElDatePicker', { valueFormat: 'YYYY-MM-DD' }),
    table: { minWidth: 140, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.dateType],
    exporter: { form: dateExporter, search: dateExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  switch: {
    type: 'switch',
    label: '开关',
    material: { group: '选择字段', icon: 'SwitchButton', order: 60, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'switch',
      label: '开关',
      prop: 'switch',
      searchable: false,
      defaultValue: false,
      activeText: '是',
      inactiveText: '否',
      options: SWITCH_OPTIONS,
    },
    formControl: control('ElSwitch'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 110, formatter: displaySwitch },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.activeText, SETTERS.inactiveText],
    exporter: { form: switchExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  radio: {
    type: 'radio',
    label: '单选框组',
    material: { group: '选择字段', icon: 'CircleCheck', order: 70, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'radio',
      label: '单选框组',
      prop: 'radio',
      placeholder: '请选择',
      options: RADIO_DEFAULTS,
    },
    formControl: control('ElRadioGroup'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 120, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.options],
    exporter: { form: radioExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  upload: {
    type: 'upload',
    label: '上传',
    material: { group: '保留字段', icon: 'Upload', order: 999, visible: false },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'upload',
      label: '上传',
      prop: 'upload',
      searchable: false,
    },
    formControl: control('ElInput', { disabled: true, placeholder: '上传字段预留' }),
    searchControl: control('ElInput', { disabled: true }),
    table: { minWidth: 160, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS],
    exporter: { form: inputExporter, search: inputExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
}

export const FIELD_TYPES = Object.values(FIELD_TYPE_REGISTRY)
export const MATERIAL_FIELD_TYPES = FIELD_TYPES.filter((item) => item.material.visible).sort((a, b) => {
  return a.material.order - b.material.order
})

export function getFieldTypeConfig(type) {
  return FIELD_TYPE_REGISTRY[type] || FIELD_TYPE_REGISTRY.input
}

export function createFieldByType(type = 'input', overrides = {}, index = 1) {
  const config = getFieldTypeConfig(type)
  const base = structuredClone(config.defaultSchema)
  const label = overrides.label || base.label
  const prop = overrides.prop || normalizeProp(label || base.prop, `${base.prop}_${index}`)

  return normalizeField(
    {
      id: overrides.id || createFieldId(),
      ...base,
      ...overrides,
      type: config.type,
      label,
      prop,
    },
    index,
  )
}

function createFieldId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `field_${crypto.randomUUID()}`
  }

  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeField(field = {}, index = 1, siblings = []) {
  const config = getFieldTypeConfig(field.type)
  const defaults = structuredClone(config.defaultSchema)
  const merged = {
    ...defaults,
    ...field,
    type: config.type,
    id: field.id || `field_${index}`,
    label: field.label || defaults.label,
    prop: normalizeProp(field.prop || defaults.prop, `${defaults.prop}_${index}`),
    required: Boolean(field.required),
    searchable: field.searchable !== undefined ? Boolean(field.searchable) : Boolean(defaults.searchable),
    tableVisible: field.tableVisible !== undefined ? Boolean(field.tableVisible) : Boolean(defaults.tableVisible),
    formVisible: field.formVisible !== undefined ? Boolean(field.formVisible) : Boolean(defaults.formVisible),
    options: normalizeOptions(field.options?.length ? field.options : defaults.options),
  }

  merged.prop = ensureUniqueProp(merged.prop, merged.id, siblings)
  return merged
}

export function getFieldsByUsage(fields = [], usage) {
  const flagMap = {
    search: 'searchable',
    table: 'tableVisible',
    form: 'formVisible',
  }
  const flag = flagMap[usage]

  return fields.map((field, index) => normalizeField(field, index + 1, fields)).filter((field) => !flag || field[flag])
}

export function buildFieldRules(field) {
  return getFieldTypeConfig(field.type).buildRules(normalizeField(field))
}

export function getFieldInitialValue(field) {
  const normalized = normalizeField(field)

  if (normalized.defaultValue !== undefined && normalized.defaultValue !== '') {
    return normalized.defaultValue
  }

  if (normalized.type === 'switch') {
    return false
  }

  if (normalized.type === 'number') {
    return 0
  }

  return ''
}

export function formatFieldValue(field, value) {
  const normalized = normalizeField(field)
  return getFieldTypeConfig(normalized.type).table.formatter(normalized, value)
}

export function getPropertySetters(field) {
  return getFieldTypeConfig(field?.type).propertySetters
}

export function normalizeOptions(options = []) {
  return options
    .filter((option) => option && option.label !== undefined)
    .map((option, index) => ({
      label: String(option.label || `选项${index + 1}`),
      value: option.value !== undefined ? option.value : `option_${index + 1}`,
    }))
}

export function normalizeProp(value, fallback = 'field') {
  const source = String(value || fallback).trim()
  const ascii = source
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return ascii || fallback
}

export function ensureUniqueProp(prop, fieldId, fields = []) {
  const base = normalizeProp(prop)
  const used = new Set(
    fields.filter((field) => field.id !== fieldId).map((field) => normalizeProp(field.prop)).filter(Boolean),
  )

  if (!used.has(base)) {
    return base
  }

  let index = 2
  while (used.has(`${base}_${index}`)) {
    index += 1
  }

  return `${base}_${index}`
}

export function tableColumnExporter(field) {
  if (['select', 'radio'].includes(field.type)) {
    return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}">
        <template #default="{ row }">{{ formatOptionValue(row.${field.prop}, ${JSON.stringify(normalizeOptions(field.options))}) }}</template>
      </el-table-column>`
  }

  if (field.type === 'switch') {
    return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}">
        <template #default="{ row }">{{ formatSwitchValue(row.${field.prop}, '${escapeScriptString(field.activeText || '是')}', '${escapeScriptString(field.inactiveText || '否')}') }}</template>
      </el-table-column>`
  }

  return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}" />`
}

function buildRequiredRules(field) {
  return field.required
    ? [
        {
          message: `${field.label}不能为空`,
          validator: (value) => value !== '' && value !== undefined && value !== null,
        },
      ]
    : []
}

function buildTextRules(field) {
  return [
    ...buildRequiredRules(field),
    {
      message: `${field.label}不能超过 ${field.maxLength} 个字符`,
      validator: (value) => !field.maxLength || String(value ?? '').length <= Number(field.maxLength),
    },
  ]
}

function buildNumberRules(field) {
  return [
    ...buildRequiredRules(field),
    {
      message: `${field.label}不能小于 ${field.min}`,
      validator: (value) => field.min === undefined || value === '' || value === null || Number(value) >= Number(field.min),
    },
    {
      message: `${field.label}不能大于 ${field.max}`,
      validator: (value) => field.max === undefined || value === '' || value === null || Number(value) <= Number(field.max),
    },
  ]
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return String(value).replaceAll("'", '&#39;')
}

function escapeScriptString(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")
}
