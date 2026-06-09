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

const SETTERS = {
  label: { prop: 'label', label: '标签名', setter: 'input', required: true },
  prop: { prop: 'prop', label: 'Prop', setter: 'input', required: true },
  type: { prop: 'type', label: '类型', setter: 'typeSelect', required: true },
  required: { prop: 'required', label: '必填', setter: 'switch' },
  searchable: { prop: 'searchable', label: '可搜索', setter: 'switch', structural: true },
  tableVisible: { prop: 'tableVisible', label: '表格显示', setter: 'switch' },
  formVisible: { prop: 'formVisible', label: '表单显示', setter: 'switch', structural: true },
  placeholder: { prop: 'placeholder', label: '占位提示', setter: 'input' },
  defaultValue: { prop: 'defaultValue', label: '默认值', setter: 'input' },
  maxLength: { prop: 'maxLength', label: '最大长度', setter: 'number', min: 1, max: 500 },
  min: { prop: 'min', label: '最小值', setter: 'number' },
  max: { prop: 'max', label: '最大值', setter: 'number' },
  dateType: {
    prop: 'dateType',
    label: '日期类型',
    setter: 'select',
    options: [
      { label: '日期', value: 'date' },
      { label: '日期时间', value: 'datetime' },
    ],
  },
  options: { prop: 'options', label: '选项', setter: 'options' },
  activeText: { prop: 'activeText', label: '开启文案', setter: 'input' },
  inactiveText: { prop: 'inactiveText', label: '关闭文案', setter: 'input' },
}

const COMMON_SETTERS = [
  SETTERS.label,
  SETTERS.prop,
  SETTERS.type,
  SETTERS.required,
  SETTERS.searchable,
  SETTERS.tableVisible,
  SETTERS.formVisible,
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
  const options = normalizeOptions(field.options)
  return options
    .map((option) => {
      return `<el-option label="${escapeHtml(option.label)}" value="${escapeHtml(option.value)}" />`
    })
    .join('\n')
}

function selectExporter(field, modelName) {
  return `<el-select v-model="${modelName}.${field.prop}" placeholder="${escapeHtml(field.placeholder || '')}" clearable>
            ${optionExporter(field)}
          </el-select>`
}

function radioExporter(field, modelName) {
  const options = normalizeOptions(field.options)
  return `<el-radio-group v-model="${modelName}.${field.prop}">
            ${options
              .map((option) => `<el-radio value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</el-radio>`)
              .join('\n            ')}
          </el-radio-group>`
}

function dateExporter(field, modelName) {
  return `<el-date-picker v-model="${modelName}.${field.prop}" type="${field.dateType || 'date'}" value-format="YYYY-MM-DD" placeholder="${escapeHtml(field.placeholder || '')}" />`
}

function switchExporter(field, modelName) {
  return `<el-switch v-model="${modelName}.${field.prop}" active-value="true" inactive-value="false" active-text="${escapeHtml(field.activeText || '是')}" inactive-text="${escapeHtml(field.inactiveText || '否')}" />`
}

function displayByOptions(field, value) {
  const option = normalizeOptions(field.options).find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

export const FIELD_TYPE_REGISTRY = {
  input: {
    type: 'input',
    label: '单行文本',
    material: { group: '基础字段', icon: 'T', order: 10, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'input',
      label: '单行文本',
      prop: 'text',
      placeholder: '请输入单行文本',
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
    material: { group: '基础字段', icon: '¶', order: 20, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'textarea',
      label: '多行文本',
      prop: 'textarea',
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
    label: '数字',
    material: { group: '基础字段', icon: '#', order: 30, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'number',
      label: '数字',
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
    material: { group: '选项字段', icon: '▾', order: 40, visible: true },
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
    label: '日期',
    material: { group: '基础字段', icon: 'D', order: 50, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'date',
      label: '日期',
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
    material: { group: '选项字段', icon: 'S', order: 60, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'switch',
      label: '开关',
      prop: 'switch',
      searchable: false,
      defaultValue: false,
      activeText: '是',
      inactiveText: '否',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    formControl: control('ElSwitch'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 110, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.activeText, SETTERS.inactiveText],
    exporter: { form: switchExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  radio: {
    type: 'radio',
    label: '单选',
    material: { group: '选项字段', icon: '●', order: 70, visible: true },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'radio',
      label: '单选',
      prop: 'radio',
      options: OPTION_DEFAULTS,
    },
    formControl: control('ElRadioGroup'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 130, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.options],
    exporter: { form: radioExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  upload: {
    type: 'upload',
    label: '上传',
    material: { group: '预留字段', icon: 'U', order: 999, visible: false },
    defaultSchema: {
      ...BASE_FIELD_SCHEMA,
      type: 'upload',
      label: '上传',
      prop: 'upload',
      searchable: false,
      placeholder: '第一阶段暂不启用上传',
    },
    formControl: control('UnsupportedField'),
    searchControl: control('UnsupportedField'),
    table: { minWidth: 160, formatter: (_field, value) => value ?? '' },
    propertySetters: COMMON_SETTERS,
    exporter: { form: unsupportedExporter, search: unsupportedExporter, table: tableColumnExporter },
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
  const base = cloneValue(config.defaultSchema)
  const label = overrides.label || `${config.label}${index}`
  const propBase = overrides.prop || `${config.type}_${index}`

  return normalizeField(
    {
      ...base,
      id: overrides.id || `field_${Date.now()}_${index}`,
      label,
      prop: propBase,
      ...overrides,
      type: config.type,
    },
    index,
  )
}

export function normalizeField(field = {}, index = 1, siblings = []) {
  const requestedType = field.type || 'input'
  const config = getFieldTypeConfig(requestedType)
  const defaultSchema = cloneValue(config.defaultSchema)
  const normalized = {
    ...defaultSchema,
    ...field,
    type: config.type,
    id: field.id || `field_${Date.now()}_${index}`,
    label: field.label || `${config.label}${index}`,
    prop: normalizeProp(field.prop || defaultSchema.prop || `${config.type}_${index}`, `${config.type}_${index}`),
    options: normalizeOptions(field.options || defaultSchema.options),
  }

  if (siblings.length > 0) {
    normalized.prop = ensureUniqueProp(normalized.prop, normalized.id, siblings)
  }

  return normalized
}

export function getFieldsByUsage(fields = [], usage) {
  const flagMap = {
    search: 'searchable',
    table: 'tableVisible',
    form: 'formVisible',
  }
  const flag = flagMap[usage]

  return Array.isArray(fields) && flag ? fields.filter((field) => field?.[flag]).map(normalizeField) : []
}

export function buildFieldRules(field) {
  return getFieldTypeConfig(field?.type).buildRules(normalizeField(field))
}

export function getFieldInitialValue(field) {
  const normalized = normalizeField(field)

  if (normalized.defaultValue !== undefined && normalized.defaultValue !== null) {
    return cloneValue(normalized.defaultValue)
  }

  if (normalized.type === 'number') {
    return undefined
  }

  if (normalized.type === 'switch') {
    return false
  }

  return ''
}

export function formatFieldValue(field, value) {
  const config = getFieldTypeConfig(field?.type)
  return config.table.formatter(normalizeField(field), value)
}

export function getPropertySetters(field) {
  return getFieldTypeConfig(field?.type).propertySetters
}

export function normalizeOptions(options = []) {
  if (!Array.isArray(options)) {
    return []
  }

  return options
    .filter((option) => option !== null && option !== undefined)
    .map((option) => {
      if (typeof option === 'object') {
        const value = option.value ?? option.label ?? ''
        return {
          label: String(option.label ?? value),
          value,
        }
      }

      return {
        label: String(option),
        value: option,
      }
    })
}

export function normalizeProp(value, fallback = 'field') {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')

  return normalized || fallback
}

export function ensureUniqueProp(prop, fieldId, fields = []) {
  const normalizedProp = normalizeProp(prop)
  const duplicated = fields.some((field) => field.id !== fieldId && field.prop === normalizedProp)

  return duplicated ? `${normalizedProp}_${Date.now().toString().slice(-4)}` : normalizedProp
}

export function tableColumnExporter(field) {
  const minWidth = getFieldTypeConfig(field.type).table.minWidth || 140
  const options = normalizeOptions(field.options)

  if (options.length > 0) {
    return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${minWidth}">
        <template #default="{ row }">{{ formatOptionValue(row.${field.prop}, ${JSON.stringify(options)}) }}</template>
      </el-table-column>`
  }

  return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${minWidth}" />`
}

function buildTextRules(field) {
  const rules = buildRequiredRules(field)

  if (field.maxLength) {
    rules.push({
      validator: (value) => !value || String(value).length <= Number(field.maxLength),
      message: `最多输入 ${field.maxLength} 个字符`,
    })
  }

  return rules
}

function buildNumberRules(field) {
  const rules = buildRequiredRules(field)

  if (field.min !== undefined && field.min !== '') {
    rules.push({
      validator: (value) => value === '' || value === undefined || Number(value) >= Number(field.min),
      message: `不能小于 ${field.min}`,
    })
  }

  if (field.max !== undefined && field.max !== '') {
    rules.push({
      validator: (value) => value === '' || value === undefined || Number(value) <= Number(field.max),
      message: `不能大于 ${field.max}`,
    })
  }

  return rules
}

function buildRequiredRules(field) {
  if (!field.required) {
    return []
  }

  return [
    {
      validator: (value) => {
        if (typeof value === 'boolean' || typeof value === 'number') {
          return true
        }

        return String(value ?? '').trim().length > 0
      },
      message: '请输入必填项',
    },
  ]
}

function unsupportedExporter(field) {
  return `<span class="unsupported-field">${escapeHtml(field.label)} 暂不支持导出控件</span>`
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
