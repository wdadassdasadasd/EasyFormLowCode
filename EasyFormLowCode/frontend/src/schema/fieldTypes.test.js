import { describe, expect, it } from 'vitest'

import {
  FIELD_TYPE_REGISTRY,
  MATERIAL_FIELD_TYPES,
  buildFieldRules,
  createFieldByType,
  getFieldInitialValue,
  getFieldTypeConfig,
  getFieldsByUsage,
  getPropertySetters,
  normalizeField,
} from './fieldTypes'

const OPEN_FIELD_TYPES = ['input', 'textarea', 'number', 'select', 'date', 'switch', 'radio']

describe('fieldTypes registry', () => {
  it('defines the required registry contract for every open field type', () => {
    OPEN_FIELD_TYPES.forEach((type) => {
      const config = FIELD_TYPE_REGISTRY[type]

      expect(config.type).toBe(type)
      expect(config.label).toBeTruthy()
      expect(config.material.visible).toBe(true)
      expect(config.defaultSchema.type).toBe(type)
      expect(config.formControl.component).toBeTruthy()
      expect(config.searchControl.component).toBeTruthy()
      expect(config.table).toHaveProperty('formatter')
      expect(config.propertySetters.length).toBeGreaterThan(0)
      expect(config.exporter.form).toBeTypeOf('function')
      expect(config.exporter.search).toBeTypeOf('function')
      expect(config.exporter.table).toBeTypeOf('function')
      expect(config.buildRules).toBeTypeOf('function')
    })
  })

  it('keeps upload as a reserved non-material type', () => {
    expect(FIELD_TYPE_REGISTRY.upload.material.visible).toBe(false)
    expect(MATERIAL_FIELD_TYPES.map((item) => item.type)).not.toContain('upload')
  })

  it('creates readable Chinese defaults and normalizes fields through the registry', () => {
    const field = createFieldByType('select', { label: '状态', prop: 'status' }, 2)

    expect(field.type).toBe('select')
    expect(field.label).toBe('状态')
    expect(field.options.map((option) => option.label)).toEqual(['启用', '停用'])
  })

  it('falls back unknown field types to input without dropping field data', () => {
    const field = normalizeField({ type: 'unknown', label: '旧字段', prop: 'legacy', customKey: 'kept' })

    expect(field.type).toBe('input')
    expect(field.label).toBe('旧字段')
    expect(field.prop).toBe('legacy')
    expect(field.customKey).toBe('kept')
  })

  it('filters fields by usage flags and preserves field order', () => {
    const fields = [
      createFieldByType('input', { prop: 'name', searchable: true, tableVisible: false }),
      createFieldByType('number', { prop: 'age', searchable: false, tableVisible: true }),
      createFieldByType('select', { prop: 'status', searchable: true, tableVisible: true }),
    ]

    expect(getFieldsByUsage(fields, 'search').map((field) => field.prop)).toEqual(['name', 'status'])
    expect(getFieldsByUsage(fields, 'table').map((field) => field.prop)).toEqual(['age', 'status'])
  })

  it('builds validation rules and initial values from field definitions', () => {
    const requiredInput = createFieldByType('input', { required: true, maxLength: 3 })
    const numberField = createFieldByType('number', { min: 1, max: 3 })

    expect(buildFieldRules(requiredInput).some((rule) => !rule.validator(''))).toBe(true)
    expect(buildFieldRules(requiredInput).some((rule) => !rule.validator('abcd'))).toBe(true)
    expect(buildFieldRules(numberField).some((rule) => !rule.validator(0))).toBe(true)
    expect(getFieldInitialValue(createFieldByType('switch'))).toBe(false)
  })

  it('exposes grouped property setters from the selected field type', () => {
    const setters = getPropertySetters(createFieldByType('radio'))

    expect(setters.map((setter) => setter.prop)).toContain('options')
    expect(setters.every((setter) => setter.group)).toBe(true)
    expect(getFieldTypeConfig('missing').type).toBe('input')
  })
})
