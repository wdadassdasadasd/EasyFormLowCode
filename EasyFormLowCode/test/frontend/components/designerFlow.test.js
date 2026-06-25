import ElementPlus from 'element-plus'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, reactive, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import DesignerCanvas from '../../../frontend/src/components/designer/DesignerCanvas.vue'
import DesignerMaterialPanel from '../../../frontend/src/components/designer/DesignerMaterialPanel.vue'
import DesignerPropertyPanel from '../../../frontend/src/components/designer/DesignerPropertyPanel.vue'
import { useSchemaModels } from '../../../frontend/src/composables/useSchemaModels'
import { buildDemoRows } from '../../../frontend/src/schema/defaultSchema'
import { createDroppedField } from '../../../frontend/src/schema/dropField'
import { MATERIAL_FIELD_TYPES, getPropertySetters, normalizeOptions } from '../../../frontend/src/schema/fieldTypes'
import { normalizePageSchema } from '../../../frontend/src/schema/pageSchema'
import { buildDefaultCharts, buildMetricCards } from '../../../frontend/src/utils/chartAggregator'

const DesignerHarness = defineComponent({
  components: {
    DesignerCanvas,
    DesignerMaterialPanel,
    DesignerPropertyPanel,
  },
  setup() {
    const pageSchema = reactive(normalizePageSchema('designer_demo'))
    const selectedFieldId = ref(pageSchema.fields[0]?.id || '')
    const selectedArea = ref('table')
    const { searchModel, dialogForm, formErrors, searchableFields, tableFields, formFields, syncModels } = useSchemaModels(pageSchema)
    const selectedField = computed(() => pageSchema.fields.find((field) => field.id === selectedFieldId.value) || null)
    const setterGroups = computed(() => {
      const groups = [
        { key: 'base', label: '基础' },
        { key: 'display', label: '显示位置' },
        { key: 'validate', label: '校验' },
        { key: 'options', label: '选项' },
        { key: 'default', label: '默认值' },
      ]
      const setters = selectedField.value ? getPropertySetters(selectedField.value) : []
      return groups
        .map((group) => ({
          ...group,
          items: setters.filter((setter) => (setter.group || 'base') === group.key),
        }))
        .filter((group) => group.items.length > 0)
    })
    const materialGroups = computed(() => {
      return MATERIAL_FIELD_TYPES.reduce((groups, item) => {
        const target = groups.find((group) => group.name === item.material.group)
        if (target) {
          target.items.push(item)
          return groups
        }

        groups.push({ name: item.material.group, items: [item] })
        return groups
      }, [])
    })
    const pageModules = [
      { key: 'search', label: '搜索表单', icon: 'Search' },
      { key: 'table', label: '数据表格', icon: 'Grid' },
      { key: 'form', label: '弹窗表单', icon: 'Tickets' },
      { key: 'metrics', label: '统计卡片', icon: 'DataAnalysis' },
      { key: 'charts', label: '图表区域', icon: 'Histogram' },
    ]
    const dropTargets = reactive({ search: [], table: [], form: [] })
    const fieldDropGroup = { name: 'page-fields', pull: false, put: true }
    const materialDragGroup = { name: 'page-fields', pull: 'clone', put: false }
    const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
    const selectedRows = ref([])
    const recordRows = ref(buildDemoRows())
    const statsRows = ref(buildDemoRows())
    const normalizedCharts = computed(() => (pageSchema.charts?.length ? pageSchema.charts : buildDefaultCharts(pageSchema.fields)))
    const metricCards = computed(() => buildMetricCards(statsRows.value, pageSchema.fields))

    function addField(type) {
      const field = createDroppedField(type, 'table', pageSchema.fields)
      pageSchema.fields.push(field)
      selectedFieldId.value = field.id
      syncModels()
    }

    function applyFieldPatch(fieldId, patch) {
      const field = pageSchema.fields.find((item) => item.id === fieldId)
      Object.assign(field, patch)
      if (Array.isArray(field.options)) {
        field.options = normalizeOptions(field.options)
      }
      syncModels()
    }

    function normalizeSelectedFieldProp() {
      const field = selectedField.value
      if (!field) {
        return
      }
      field.prop = String(field.prop || '').trim()
      syncModels()
    }

    return {
      dialogForm,
      dropTargets,
      fieldDropGroup,
      formErrors,
      formFields,
      materialDragGroup,
      materialGroups,
      metricCards,
      normalizedCharts,
      pageModules,
      pageSchema,
      pagination,
      recordRows,
      searchModel,
      searchableFields,
      selectedArea,
      selectedField,
      selectedFieldId,
      selectedRows,
      setterGroups,
      statsRows,
      tableFields,
      addField,
      applyFieldPatch,
      normalizeSelectedFieldProp,
    }
  },
  template: `
    <div>
      <DesignerMaterialPanel
        :icon-map="{ Search: 'div', Grid: 'div', Tickets: 'div', DataAnalysis: 'div', Histogram: 'div', EditPen: 'div', Document: 'div', ArrowDown: 'div', Calendar: 'div', SwitchButton: 'div', CircleCheck: 'div' }"
        :material-drag-group="materialDragGroup"
        :material-groups="materialGroups"
        :page-modules="pageModules"
        :selected-area="selectedArea"
        @add-field="addField"
      />
      <DesignerCanvas
        :dialog-form="dialogForm"
        :drop-targets="dropTargets"
        :field-drop-group="fieldDropGroup"
        :form-fields="formFields"
        :metric-cards="metricCards"
        :normalized-charts="normalizedCharts"
        :page-actions="pageSchema.actions"
        :page-schema="pageSchema"
        :pagination="pagination"
        :record-rows="recordRows"
        :search-model="searchModel"
        :searchable-fields="searchableFields"
        :selected-area="selectedArea"
        :selected-field-id="selectedFieldId"
        :selected-rows="selectedRows"
        :stats-rows="statsRows"
        :status-text="'testing'"
        :table-fields="tableFields"
      />
      <DesignerPropertyPanel
        :material-field-types="[]"
        :page-schema="pageSchema"
        :selected-area="selectedArea"
        :selected-field="selectedField"
        :setter-groups="setterGroups"
        @normalize-field-prop="normalizeSelectedFieldProp"
        @patch-field="applyFieldPatch"
      />
    </div>
  `,
})

describe('designer flow integration', () => {
  it('adds a field and refreshes the canvas after property changes', async () => {
    const wrapper = mount(DesignerHarness, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          Draggable: {
            template: '<div><slot /><slot name="footer" /></div>',
          },
          ChartRenderer: {
            template: '<div class="chart-renderer-stub" />',
          },
          RequestInspector: {
            template: '<div class="request-inspector-stub" />',
          },
          TableFieldColumn: {
            props: ['field'],
            template: '<div class="table-field-column">{{ field.label }}</div>',
          },
          FieldControl: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
        },
      },
    })

    const beforeCount = wrapper.vm.pageSchema.fields.length

    wrapper.findComponent(DesignerMaterialPanel).vm.$emit('add-field', 'input')
    await nextTick()

    expect(wrapper.vm.pageSchema.fields.length).toBe(beforeCount + 1)

    const newFieldId = wrapper.vm.selectedFieldId
    wrapper.findComponent(DesignerPropertyPanel).vm.$emit(
      'patch-field',
      newFieldId,
      {
        label: '姓名',
        prop: 'fullName',
        searchable: true,
        tableVisible: true,
        formVisible: true,
      },
      true,
    )
    wrapper.findComponent(DesignerPropertyPanel).vm.$emit('normalize-field-prop')
    await nextTick()

    expect(wrapper.vm.searchableFields.some((field) => field.prop === 'fullName')).toBe(true)
    expect(wrapper.vm.tableFields.some((field) => field.label === '姓名')).toBe(true)
    expect(wrapper.text()).toContain('姓名')
  })

  it('adds a material with one card click', async () => {
    const wrapper = mount(DesignerHarness, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          Draggable: { template: '<div><slot name="item" v-for="item in list" :element="item" /></div>', props: ['list'] },
          ChartRenderer: { template: '<div />' },
          RequestInspector: { template: '<div />' },
          TableFieldColumn: { props: ['field'], template: '<div />' },
          FieldControl: { template: '<input />' },
        },
      },
    })
    const beforeCount = wrapper.vm.pageSchema.fields.length

    await wrapper.find('.material-card').trigger('click')

    expect(wrapper.vm.pageSchema.fields).toHaveLength(beforeCount + 1)
  })
})
