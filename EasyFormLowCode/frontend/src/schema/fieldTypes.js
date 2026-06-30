const BASE_FIELD_SCHEMA = {
  required: false,
  searchable: true,
  tableVisible: true,
  formVisible: true,
  placeholder: '',
  defaultValue: '',
  options: [],
}

const STATUS_OPTIONS = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]

const BOOLEAN_OPTIONS = [
  { label: '是', value: 'yes' },
  { label: '否', value: 'no' },
]

const SWITCH_OPTIONS = [
  { label: '开启', value: true },
  { label: '关闭', value: false },
]

const SETTERS = {
  label: { prop: 'label', label: '字段标题', setter: 'input', required: true, group: 'base' },
  prop: { prop: 'prop', label: 'Prop', setter: 'input', required: true, group: 'base' },
  type: { prop: 'type', label: '字段类型', setter: 'typeSelect', required: true, group: 'base' },
  required: { prop: 'required', label: '必填', setter: 'switch', group: 'validate' },
  searchable: { prop: 'searchable', label: '搜索区', setter: 'switch', structural: true, group: 'display' },
  tableVisible: { prop: 'tableVisible', label: '表格列', setter: 'switch', structural: true, group: 'display' },
  formVisible: { prop: 'formVisible', label: '表单项', setter: 'switch', structural: true, group: 'display' },
  placeholder: { prop: 'placeholder', label: '占位提示', setter: 'input', group: 'base' },
  defaultValue: { prop: 'defaultValue', label: '默认值', setter: 'input', group: 'default' },
  maxLength: { prop: 'maxLength', label: '最大长度', setter: 'number', min: 1, max: 500, group: 'validate' },
  min: { prop: 'min', label: '最小值', setter: 'number', group: 'validate' },
  max: { prop: 'max', label: '最大值', setter: 'number', group: 'validate' },
  step: { prop: 'step', label: '步长', setter: 'number', min: 0, group: 'validate' },
  rows: { prop: 'rows', label: '文本行数', setter: 'number', min: 2, max: 12, group: 'display' },
  multiple: { prop: 'multiple', label: '支持多选', setter: 'switch', group: 'options' },
  options: { prop: 'options', label: '选项列表', setter: 'options', group: 'options' },
  activeText: { prop: 'activeText', label: '开启文本', setter: 'input', group: 'options' },
  inactiveText: { prop: 'inactiveText', label: '关闭文本', setter: 'input', group: 'options' },
  prefixIcon: { prop: 'prefixIcon', label: '前缀图标', setter: 'input', group: 'display' },
  showPassword: { prop: 'showPassword', label: '显示切换', setter: 'switch', group: 'display' },
  allowHalf: { prop: 'allowHalf', label: '支持半星', setter: 'switch', group: 'display' },
  showScore: { prop: 'showScore', label: '显示分值', setter: 'switch', group: 'display' },
  showStops: { prop: 'showStops', label: '显示断点', setter: 'switch', group: 'display' },
  range: { prop: 'range', label: '范围模式', setter: 'switch', group: 'display' },
  dateType: {
    prop: 'dateType',
    label: '日期类型',
    setter: 'select',
    group: 'base',
    options: [
      { label: '日期', value: 'date' },
      { label: '日期时间', value: 'datetime' },
      { label: '日期范围', value: 'daterange' },
      { label: '日期时间范围', value: 'datetimerange' },
      { label: '月份', value: 'month' },
      { label: '月份范围', value: 'monthrange' },
    ],
  },
  timeFormat: {
    prop: 'timeFormat',
    label: '时间格式',
    setter: 'select',
    group: 'base',
    options: [
      { label: 'HH:mm:ss', value: 'HH:mm:ss' },
      { label: 'HH:mm', value: 'HH:mm' },
    ],
  },
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

function textExporter(field, modelName, extraAttrs = '') {
  const maxLengthAttr = field.maxLength ? ` :maxlength="${field.maxLength}"` : ''
  return `<el-input v-model="${modelName}.${field.prop}" placeholder="${escapeHtml(field.placeholder || '')}" clearable${maxLengthAttr}${extraAttrs} />`
}

function textareaExporter(field, modelName) {
  const maxLengthAttr = field.maxLength ? ` :maxlength="${field.maxLength}" show-word-limit` : ''
  return `<el-input v-model="${modelName}.${field.prop}" type="textarea" :rows="${field.rows || 3}" placeholder="${escapeHtml(field.placeholder || '')}"${maxLengthAttr} />`
}

function passwordExporter(field, modelName) {
  return textExporter(field, modelName, field.showPassword === false ? ' :show-password="false"' : ' show-password')
}

function numberExporter(field, modelName) {
  const min = field.min !== undefined && field.min !== '' ? ` :min="${field.min}"` : ''
  const max = field.max !== undefined && field.max !== '' ? ` :max="${field.max}"` : ''
  const step = field.step !== undefined && field.step !== '' ? ` :step="${field.step}"` : ''
  return `<el-input-number v-model="${modelName}.${field.prop}" controls-position="right"${min}${max}${step} />`
}

function optionNodes(field) {
  return normalizeOptions(field.options)
    .map((option) => `<el-option label="${escapeHtml(option.label)}" :value='${escapeAttr(JSON.stringify(option.value))}' />`)
    .join('\n')
}

function selectExporter(field, modelName, extraAttrs = '') {
  return `<el-select v-model="${modelName}.${field.prop}" placeholder="${escapeHtml(field.placeholder || '请选择')}" clearable${field.multiple ? ' multiple' : ''}${extraAttrs}>
            ${optionNodes(field)}
          </el-select>`
}

function radioExporter(field, modelName) {
  return `<el-radio-group v-model="${modelName}.${field.prop}">
            ${normalizeOptions(field.options)
              .map((option) => `<el-radio :value='${escapeAttr(JSON.stringify(option.value))}'>${escapeHtml(option.label)}</el-radio>`)
              .join('\n            ')}
          </el-radio-group>`
}

function checkboxExporter(field, modelName) {
  return `<el-checkbox-group v-model="${modelName}.${field.prop}">
            ${normalizeOptions(field.options)
              .map((option) => `<el-checkbox :value='${escapeAttr(JSON.stringify(option.value))}'>${escapeHtml(option.label)}</el-checkbox>`)
              .join('\n            ')}
          </el-checkbox-group>`
}

function cascaderExporter(field, modelName) {
  return `<el-cascader v-model="${modelName}.${field.prop}" :options='${escapeAttr(JSON.stringify(normalizeOptions(field.options)))}' clearable />`
}

function dateExporter(field, modelName) {
  return `<el-date-picker v-model="${modelName}.${field.prop}" type="${field.dateType || 'date'}" value-format="${escapeHtml(field.valueFormat || 'YYYY-MM-DD')}" placeholder="${escapeHtml(field.placeholder || '请选择日期')}" />`
}

function timeExporter(field, modelName) {
  const format = field.timeFormat || 'HH:mm:ss'
  return `<el-time-picker v-model="${modelName}.${field.prop}" value-format="${format}" format="${format}" placeholder="${escapeHtml(field.placeholder || '请选择时间')}" />`
}

function switchExporter(field, modelName) {
  return `<el-switch v-model="${modelName}.${field.prop}" active-text="${escapeHtml(field.activeText || '开启')}" inactive-text="${escapeHtml(field.inactiveText || '关闭')}" />`
}

function rateExporter(field, modelName) {
  return `<el-rate v-model="${modelName}.${field.prop}"${field.allowHalf ? ' allow-half' : ''}${field.showScore ? ' show-score' : ''} />`
}

function sliderExporter(field, modelName) {
  const min = field.min !== undefined && field.min !== '' ? ` :min="${field.min}"` : ''
  const max = field.max !== undefined && field.max !== '' ? ` :max="${field.max}"` : ''
  const step = field.step !== undefined && field.step !== '' ? ` :step="${field.step}"` : ''
  return `<el-slider v-model="${modelName}.${field.prop}"${min}${max}${step}${field.showStops ? ' show-stops' : ''}${field.range ? ' range' : ''} />`
}

function displayByOptions(field, value) {
  if (Array.isArray(value)) {
    return value.map((item) => displayByOptions(field, item)).join('、')
  }
  const option = normalizeOptions(field.options).find((item) => String(item.value) === String(value))
  return option?.label ?? value ?? ''
}

function displaySwitch(field, value) {
  if (value === true || value === 'true' || value === 'enabled' || value === 'yes') {
    return field.activeText || '开启'
  }
  if (value === false || value === 'false' || value === 'disabled' || value === 'no') {
    return field.inactiveText || '关闭'
  }
  return value ?? ''
}

function displayUrl(_field, value) {
  return value ? String(value) : ''
}

function displayTag(_field, value) {
  return Array.isArray(value) ? value.join('、') : value ?? ''
}

function tableColumnExporter(field) {
  if (['select', 'radio', 'checkbox', 'cascader', 'tag'].includes(field.type)) {
    return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}">
        <template #default="{ row }">{{ formatOptionValue(row.${field.prop}, ${JSON.stringify(normalizeOptions(field.options))}) }}</template>
      </el-table-column>`
  }

  if (field.type === 'switch') {
    return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}">
        <template #default="{ row }">{{ formatSwitchValue(row.${field.prop}, '${escapeScriptString(field.activeText || '开启')}', '${escapeScriptString(field.inactiveText || '关闭')}') }}</template>
      </el-table-column>`
  }

  return `<el-table-column prop="${field.prop}" label="${escapeHtml(field.label)}" min-width="${getFieldTypeConfig(field.type).table.minWidth}" />`
}

function buildRequiredRules(field) {
  return field.required
    ? [
        {
          message: `${field.label}不能为空`,
          validator: (value) => {
            if (Array.isArray(value)) return value.length > 0
            return value !== '' && value !== undefined && value !== null
          },
        },
      ]
    : []
}

function buildTextRules(field) {
  return [
    ...buildRequiredRules(field),
    {
      message: `${field.label}长度不能超过 ${field.maxLength} 个字符`,
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

function buildPatternRules(field, pattern, message) {
  return [
    ...buildTextRules(field),
    {
      message,
      validator: (value) => value === '' || value === undefined || value === null || pattern.test(String(value)),
    },
  ]
}

function buildSelectRules(field) {
  return buildRequiredRules(field)
}

export const FIELD_TYPE_REGISTRY = {
  input: {
    type: 'input',
    label: '单行文本',
    material: { group: '基础字段', icon: 'EditPen', order: 10, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'input', label: '单行文本', prop: 'text', placeholder: '请输入内容', maxLength: 50 },
    formControl: control('ElInput', { clearable: true, showWordLimit: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 140, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: textExporter, search: textExporter, table: tableColumnExporter },
    buildRules: buildTextRules,
  },
  password: {
    type: 'password',
    label: '密码',
    material: { group: '基础字段', icon: 'Lock', order: 15, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'password', label: '密码', prop: 'password', placeholder: '请输入密码', maxLength: 50, searchable: false, showPassword: true },
    formControl: control('ElInput', { clearable: true, showPassword: true }),
    searchControl: control('ElInput', { clearable: true, showPassword: true }),
    table: { minWidth: 140, formatter: () => '******' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength, SETTERS.showPassword],
    exporter: { form: passwordExporter, search: passwordExporter, table: tableColumnExporter },
    buildRules: buildTextRules,
  },
  textarea: {
    type: 'textarea',
    label: '多行文本',
    material: { group: '基础字段', icon: 'Document', order: 20, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'textarea', label: '多行文本', prop: 'textarea', placeholder: '请输入内容', searchable: false, maxLength: 200, rows: 3 },
    formControl: control('ElInput', { type: 'textarea', rows: 3, showWordLimit: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 180, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength, SETTERS.rows],
    exporter: { form: textareaExporter, search: textExporter, table: tableColumnExporter },
    buildRules: buildTextRules,
  },
  email: {
    type: 'email',
    label: '邮箱',
    material: { group: '基础字段', icon: 'Message', order: 25, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'email', label: '邮箱', prop: 'email', placeholder: '请输入邮箱地址', maxLength: 100 },
    formControl: control('ElInput', { clearable: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 180, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: textExporter, search: textExporter, table: tableColumnExporter },
    buildRules: (field) => buildPatternRules(field, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, `${field.label}格式不正确`),
  },
  phone: {
    type: 'phone',
    label: '手机号',
    material: { group: '基础字段', icon: 'Phone', order: 30, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'phone', label: '手机号', prop: 'phone', placeholder: '请输入手机号', maxLength: 20 },
    formControl: control('ElInput', { clearable: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 160, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: textExporter, search: textExporter, table: tableColumnExporter },
    buildRules: (field) => buildPatternRules(field, /^[+\d()\-\s]{6,20}$/, `${field.label}格式不正确`),
  },
  url: {
    type: 'url',
    label: '链接',
    material: { group: '基础字段', icon: 'Link', order: 35, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'url', label: '链接', prop: 'url', placeholder: 'https://example.com', maxLength: 200 },
    formControl: control('ElInput', { clearable: true }),
    searchControl: control('ElInput', { clearable: true }),
    table: { minWidth: 180, formatter: displayUrl },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.maxLength],
    exporter: { form: textExporter, search: textExporter, table: tableColumnExporter },
    buildRules: (field) => buildPatternRules(field, /^https?:\/\/.+/i, `${field.label}需以 http:// 或 https:// 开头`),
  },
  number: {
    type: 'number',
    label: '数字',
    material: { group: '数值字段', icon: 'Tickets', order: 40, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'number', label: '数字', prop: 'number', placeholder: '请输入数字', defaultValue: 0, min: 0, max: 999999, step: 1 },
    formControl: control('ElInputNumber', { controlsPosition: 'right' }),
    searchControl: control('ElInputNumber', { controlsPosition: 'right' }),
    table: { minWidth: 120, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.min, SETTERS.max, SETTERS.step],
    exporter: { form: numberExporter, search: numberExporter, table: tableColumnExporter },
    buildRules: buildNumberRules,
  },
  slider: {
    type: 'slider',
    label: '滑块',
    material: { group: '数值字段', icon: 'Operation', order: 45, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'slider', label: '滑块', prop: 'slider', searchable: false, min: 0, max: 100, step: 1, defaultValue: 0, showStops: false, range: false },
    formControl: control('ElSlider'),
    searchControl: control('ElSlider'),
    table: { minWidth: 140, formatter: (_field, value) => Array.isArray(value) ? value.join(' ~ ') : value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.min, SETTERS.max, SETTERS.step, SETTERS.showStops, SETTERS.range],
    exporter: { form: sliderExporter, search: sliderExporter, table: tableColumnExporter },
    buildRules: buildNumberRules,
  },
  rate: {
    type: 'rate',
    label: '评分',
    material: { group: '数值字段', icon: 'Star', order: 50, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'rate', label: '评分', prop: 'rate', searchable: false, defaultValue: 0, allowHalf: false, showScore: true, min: 0, max: 5 },
    formControl: control('ElRate', { showScore: true }),
    searchControl: control('ElRate', { showScore: true }),
    table: { minWidth: 120, formatter: (_field, value) => value ?? 0 },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.allowHalf, SETTERS.showScore],
    exporter: { form: rateExporter, search: rateExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  select: {
    type: 'select',
    label: '下拉选择',
    material: { group: '选择字段', icon: 'ArrowDown', order: 60, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'select', label: '下拉选择', prop: 'select', placeholder: '请选择', options: STATUS_OPTIONS },
    formControl: control('ElSelect', { clearable: true }),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 130, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.multiple, SETTERS.options],
    exporter: { form: selectExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildSelectRules,
  },
  radio: {
    type: 'radio',
    label: '单选框组',
    material: { group: '选择字段', icon: 'CircleCheck', order: 70, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'radio', label: '单选框组', prop: 'radio', placeholder: '请选择', options: BOOLEAN_OPTIONS },
    formControl: control('ElRadioGroup'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 120, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.options],
    exporter: { form: radioExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildSelectRules,
  },
  checkbox: {
    type: 'checkbox',
    label: '复选框组',
    material: { group: '选择字段', icon: 'CircleCheck', order: 80, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'checkbox', label: '复选框组', prop: 'checkbox', defaultValue: [], options: BOOLEAN_OPTIONS },
    formControl: control('ElCheckboxGroup'),
    searchControl: control('ElCheckboxGroup'),
    table: { minWidth: 140, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.options],
    exporter: { form: checkboxExporter, search: checkboxExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  cascader: {
    type: 'cascader',
    label: '级联选择',
    material: { group: '选择字段', icon: 'ArrowDown', order: 90, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'cascader', label: '级联选择', prop: 'cascader', defaultValue: [], options: STATUS_OPTIONS },
    formControl: control('ElCascader', { clearable: true }),
    searchControl: control('ElCascader', { clearable: true }),
    table: { minWidth: 140, formatter: displayByOptions },
    propertySetters: [...COMMON_SETTERS, SETTERS.options],
    exporter: { form: cascaderExporter, search: cascaderExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  switch: {
    type: 'switch',
    label: '开关',
    material: { group: '选择字段', icon: 'SwitchButton', order: 100, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'switch', label: '开关', prop: 'switch', searchable: false, defaultValue: false, activeText: '开启', inactiveText: '关闭', options: SWITCH_OPTIONS },
    formControl: control('ElSwitch'),
    searchControl: control('ElSelect', { clearable: true }),
    table: { minWidth: 110, formatter: displaySwitch },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.activeText, SETTERS.inactiveText],
    exporter: { form: switchExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  tag: {
    type: 'tag',
    label: '标签选择',
    material: { group: '展示字段', icon: 'PriceTag', order: 110, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'tag', label: '标签选择', prop: 'tags', defaultValue: [], searchable: false, options: STATUS_OPTIONS, multiple: true },
    formControl: control('ElSelect', { multiple: true, clearable: true, collapseTags: true, collapseTagsTooltip: true }),
    searchControl: control('ElSelect', { multiple: true, clearable: true, collapseTags: true }),
    table: { minWidth: 160, formatter: displayTag },
    propertySetters: [...COMMON_SETTERS, SETTERS.defaultValue, SETTERS.options, SETTERS.multiple],
    exporter: { form: selectExporter, search: selectExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  date: {
    type: 'date',
    label: '日期',
    material: { group: '展示字段', icon: 'Calendar', order: 120, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'date', label: '日期', prop: 'date', placeholder: '请选择日期', dateType: 'date', valueFormat: 'YYYY-MM-DD' },
    formControl: control('ElDatePicker', { valueFormat: 'YYYY-MM-DD' }),
    searchControl: control('ElDatePicker', { valueFormat: 'YYYY-MM-DD' }),
    table: { minWidth: 140, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.dateType],
    exporter: { form: dateExporter, search: dateExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  datetime: {
    type: 'datetime',
    label: '日期时间',
    material: { group: '展示字段', icon: 'Clock', order: 125, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'datetime', label: '日期时间', prop: 'datetime', placeholder: '请选择日期时间', dateType: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    formControl: control('ElDatePicker', { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' }),
    searchControl: control('ElDatePicker', { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' }),
    table: { minWidth: 180, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue],
    exporter: { form: dateExporter, search: dateExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  time: {
    type: 'time',
    label: '时间',
    material: { group: '展示字段', icon: 'Clock', order: 130, visible: true },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'time', label: '时间', prop: 'time', placeholder: '请选择时间', searchable: false, timeFormat: 'HH:mm:ss' },
    formControl: control('ElTimePicker', { format: 'HH:mm:ss', valueFormat: 'HH:mm:ss' }),
    searchControl: control('ElTimePicker', { format: 'HH:mm:ss', valueFormat: 'HH:mm:ss' }),
    table: { minWidth: 140, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS, SETTERS.placeholder, SETTERS.defaultValue, SETTERS.timeFormat],
    exporter: { form: timeExporter, search: timeExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
  upload: {
    type: 'upload',
    label: '上传',
    material: { group: '保留字段', icon: 'Upload', order: 999, visible: false },
    defaultSchema: { ...BASE_FIELD_SCHEMA, type: 'upload', label: '上传', prop: 'upload', searchable: false },
    formControl: control('ElInput', { disabled: true, placeholder: '上传能力预留' }),
    searchControl: control('ElInput', { disabled: true }),
    table: { minWidth: 160, formatter: (_field, value) => value ?? '' },
    propertySetters: [...COMMON_SETTERS],
    exporter: { form: textExporter, search: textExporter, table: tableColumnExporter },
    buildRules: buildRequiredRules,
  },
}

export const FIELD_TYPES = Object.values(FIELD_TYPE_REGISTRY)
export const MATERIAL_FIELD_TYPES = FIELD_TYPES.filter((item) => item.material.visible).sort((a, b) => a.material.order - b.material.order)

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

  if (['switch'].includes(normalized.type)) {
    return false
  }

  if (['checkbox', 'cascader', 'tag'].includes(normalized.type) || (normalized.type === 'select' && normalized.multiple)) {
    return []
  }

  if (['number', 'rate', 'slider'].includes(normalized.type)) {
    return 0
  }

  return ''
}

export function formatFieldValue(field, value) {
  const normalized = normalizeField(field)
  if (Array.isArray(field?.relationOptions) && field.relationOptions.length) {
    normalized.options = normalizeOptions(field.relationOptions)
  }
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
  const used = new Set(fields.filter((field) => field.id !== fieldId).map((field) => normalizeProp(field.prop)).filter(Boolean))

  if (!used.has(base)) {
    return base
  }

  let index = 2
  while (used.has(`${base}_${index}`)) {
    index += 1
  }

  return `${base}_${index}`
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

export { tableColumnExporter }
