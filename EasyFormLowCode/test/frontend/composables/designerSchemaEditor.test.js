import { reactive, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useDesignerSchemaEditor } from '../../../frontend/src/composables/useDesignerSchemaEditor'
import { normalizePageSchema } from '../../../frontend/src/schema/pageSchema'

function createEditorHarness() {
  const pageId = ref('designer_editor')
  const pageSchema = reactive(normalizePageSchema(pageId.value, { fields: [] }))
  const editorStatus = ref('saved')
  const syncCount = ref(0)

  function replaceSchema(nextSchema) {
    const normalized = normalizePageSchema(pageId.value, nextSchema)
    Object.keys(pageSchema).forEach((key) => {
      delete pageSchema[key]
    })
    Object.assign(pageSchema, normalized)
  }

  function toPlainSchema() {
    return normalizePageSchema(pageId.value, JSON.parse(JSON.stringify(pageSchema)))
  }

  const editor = useDesignerSchemaEditor({
    pageId,
    pageSchema,
    replaceSchema,
    toPlainSchema,
    syncModels: () => {
      syncCount.value += 1
    },
    setEditorStatus: (status) => {
      editorStatus.value = status
    },
    syncAnalyticsSelection: () => {},
    isCompactLayout: ref(false),
    getNormalizedCharts: () => pageSchema.charts || [],
  })

  editor.resetHistory(toPlainSchema(), 'initial')
  return { editor, editorStatus, pageSchema, syncCount }
}

describe('designer schema editor', () => {
  it('adds dropped fields with area-specific visibility and selection', () => {
    const { editor, editorStatus, pageSchema, syncCount } = createEditorHarness()
    const beforeCount = pageSchema.fields.length

    const field = editor.addField('input', 'search')

    expect(pageSchema.fields).toHaveLength(beforeCount + 1)
    expect(field.searchable).toBe(true)
    expect(field.tableVisible).toBe(false)
    expect(field.formVisible).toBe(false)
    expect(editor.selectedFieldId.value).toBe(field.id)
    expect(editor.selectedArea.value).toBe('search')
    expect(editorStatus.value).toBe('dirty')
    expect(syncCount.value).toBeGreaterThan(0)
  })

  it('undoes and redoes schema edits without dangling selection', () => {
    const { editor, pageSchema } = createEditorHarness()

    const field = editor.addField('input', 'table')
    editor.applyFieldPatch(field.id, { label: 'Customer name', prop: 'customerName' }, true)

    expect(pageSchema.fields.find((item) => item.id === field.id)?.prop).toBe('customerName')

    editor.undoSchema()
    expect(pageSchema.fields.find((item) => item.id === field.id)?.prop).not.toBe('customerName')
    expect(pageSchema.fields.some((item) => item.id === editor.selectedFieldId.value)).toBe(true)

    editor.redoSchema()
    expect(pageSchema.fields.find((item) => item.id === field.id)?.prop).toBe('customerName')
    expect(pageSchema.fields.some((item) => item.id === editor.selectedFieldId.value)).toBe(true)
  })

  it('normalizes duplicate props from property edits', () => {
    const { editor, pageSchema } = createEditorHarness()
    const first = editor.addField('input', 'table')
    const second = editor.addField('input', 'table')

    editor.applyFieldPatch(second.id, { prop: first.prop }, true)

    expect(pageSchema.fields.slice(-2).map((field) => field.prop)).toEqual([first.prop, `${first.prop}_2`])
    expect(editor.fieldPropFeedback.value).toContain(`${first.prop}_2`)
  })
})
