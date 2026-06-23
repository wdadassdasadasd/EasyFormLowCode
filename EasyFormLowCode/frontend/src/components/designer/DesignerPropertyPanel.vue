<template>
  <aside class="property-panel">
    <div class="property-header">
      <div>
        <strong>属性配置</strong>
        <span>{{ selectedField ? selectedField.label : selectedAreaLabel }}</span>
      </div>
    </div>

    <section class="property-section">
      <div class="section-title">页面</div>
      <el-form label-position="top">
        <el-form-item label="页面标题" required>
          <el-input :model-value="pageSchema.title" @input="emit('patch-page', { title: $event })" />
        </el-form-item>
        <el-form-item label="页面 ID">
          <el-input :model-value="pageSchema.id" disabled />
        </el-form-item>
        <el-form-item label="数据源模式">
          <el-select :model-value="pageSchema.datasource?.mode" @change="updateDatasource('mode', $event)">
            <el-option label="runtime" value="runtime" />
            <el-option label="rest" value="rest" />
          </el-select>
        </el-form-item>
      </el-form>
    </section>

    <section v-if="pageSchema.datasource?.mode === 'rest'" class="property-section">
      <div class="section-title">REST 数据源</div>
      <div class="readonly-note">
        当前 REST 数据源按只读模式处理，运行态不会展示新增、编辑、删除和批量删除入口。
      </div>
      <el-form label-position="top">
        <el-form-item label="列表 URL">
          <el-input :model-value="pageSchema.datasource?.listUrl" @input="updateDatasource('listUrl', $event)" />
        </el-form-item>
        <el-form-item label="新增 URL">
          <el-input :model-value="pageSchema.datasource?.createUrl" @input="updateDatasource('createUrl', $event)" />
        </el-form-item>
        <el-form-item label="编辑 URL">
          <el-input :model-value="pageSchema.datasource?.updateUrl" @input="updateDatasource('updateUrl', $event)" />
        </el-form-item>
        <el-form-item label="删除 URL">
          <el-input :model-value="pageSchema.datasource?.deleteUrl" @input="updateDatasource('deleteUrl', $event)" />
        </el-form-item>
      </el-form>
    </section>

    <section class="property-section">
      <div class="section-title">动作开关</div>
      <el-form label-position="top" class="action-form">
        <el-form-item v-for="(enabled, actionKey) in pageSchema.actions" :key="actionKey" :label="actionLabels[actionKey] || actionKey">
          <el-switch :model-value="enabled" :disabled="isActionCapabilityLocked(actionKey)" @change="updateAction(actionKey, $event)" />
        </el-form-item>
      </el-form>
    </section>

    <template v-if="selectedField">
      <section v-for="group in setterGroups" :key="group.key" class="property-section">
        <div class="section-title">{{ group.label }}</div>
        <el-form label-position="top">
          <el-form-item v-for="setter in group.items" :key="setter.prop" :label="setter.label" :required="setter.required">
            <template v-if="setter.setter === 'input' && setter.prop !== 'defaultValue'">
              <el-input
                :model-value="selectedField[setter.prop]"
                @input="patchField({ [setter.prop]: $event }, setter.structural)"
                @change="handleSetterCommit(setter)"
              />
              <div v-if="setter.prop === 'prop' && fieldPropFeedback" class="field-feedback">{{ fieldPropFeedback }}</div>
            </template>

            <el-input
              v-else-if="setter.setter === 'input' && setter.prop === 'defaultValue' && !usesOptionDefaultValue"
              :model-value="selectedField.defaultValue"
              @input="patchField({ defaultValue: $event })"
            />

            <el-select
              v-else-if="setter.setter === 'input' && setter.prop === 'defaultValue' && usesOptionDefaultValue"
              :model-value="selectedField.defaultValue"
              clearable
              @change="patchField({ defaultValue: $event })"
            >
              <el-option
                v-for="option in selectedField.options"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <el-switch
              v-else-if="setter.setter === 'switch'"
              :model-value="selectedField[setter.prop]"
              @change="patchField({ [setter.prop]: $event }, setter.structural)"
            />

            <el-input-number
              v-else-if="setter.setter === 'number'"
              :model-value="selectedField[setter.prop]"
              :min="setter.min"
              :max="setter.max"
              controls-position="right"
              @change="patchField({ [setter.prop]: $event }, setter.structural)"
            />

            <el-select
              v-else-if="setter.setter === 'select'"
              :model-value="selectedField[setter.prop]"
              @change="patchField({ [setter.prop]: $event }, setter.structural)"
            >
              <el-option
                v-for="option in setter.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <el-select v-else-if="setter.setter === 'typeSelect'" :model-value="selectedField.type" @change="emit('change-field-type', $event)">
              <el-option
                v-for="fieldType in materialFieldTypes"
                :key="fieldType.type"
                :label="fieldType.label"
                :value="fieldType.type"
              />
            </el-select>

            <div v-else-if="setter.setter === 'options'" class="option-setter">
              <div v-for="(option, optionIndex) in selectedField.options" :key="optionIndex" class="option-row">
                <el-input :model-value="option.label" placeholder="选项名" @input="updateOption(optionIndex, 'label', $event)" />
                <el-input :model-value="option.value" placeholder="选项值" @input="updateOption(optionIndex, 'value', $event)" />
                <el-button text type="danger" @click="emit('remove-option', optionIndex)">删除</el-button>
              </div>
              <el-button plain size="small" :icon="Plus" @click="emit('add-option')">添加选项</el-button>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="property-section">
        <div class="section-title">字段顺序</div>
        <Draggable :list="pageSchema.fields" item-key="id" handle=".drag-handle" class="field-list" @end="emit('field-sort')">
          <template #item="{ element, index }">
            <div class="field-list-item" :class="{ active: element.id === selectedField.id }">
              <button class="drag-handle" type="button" title="拖拽排序">
                <el-icon><Rank /></el-icon>
              </button>
              <button class="field-pick" type="button" @click="emit('select-field', element.id)">
                <span>{{ element.label }}</span>
                <small>{{ element.prop }}</small>
              </button>
              <div class="field-order-actions">
                <el-button text size="small" :disabled="index === 0" @click="emit('move-field', index, -1)">上移</el-button>
                <el-button text size="small" :disabled="index === pageSchema.fields.length - 1" @click="emit('move-field', index, 1)">下移</el-button>
              </div>
            </div>
          </template>
        </Draggable>

        <el-button type="danger" plain class="delete-field-button" :icon="Delete" @click="emit('delete-selected-field')">
          删除当前字段
        </el-button>
      </section>
    </template>

    <section class="property-section">
      <div class="section-title">图表配置</div>
      <div v-if="pageSchema.charts?.length" class="chart-setter">
        <div v-for="(chart, chartIndex) in pageSchema.charts" :key="chart.id" class="chart-row">
          <el-input :model-value="chart.title" placeholder="图表标题" @input="updateChart(chartIndex, 'title', $event)" />
          <el-select :model-value="chart.type" @change="updateChart(chartIndex, 'type', $event)">
            <el-option label="metric" value="metric" />
            <el-option label="pie" value="pie" />
            <el-option label="bar" value="bar" />
          </el-select>
          <el-select :model-value="chart.dimension" clearable @change="updateChart(chartIndex, 'dimension', $event)">
            <el-option v-for="field in pageSchema.fields" :key="field.id" :label="field.label" :value="field.prop" />
          </el-select>
          <el-button text type="danger" @click="emit('remove-chart', chartIndex)">删除</el-button>
        </div>
      </div>
      <el-empty v-else description="暂无图表配置" :image-size="56" />
      <el-button plain size="small" :icon="Plus" @click="emit('add-chart')">添加图表</el-button>
    </section>

    <section v-if="!selectedField" class="empty-property">
      从左侧添加字段，或点击画布中的搜索项、表头、表单字段来编辑属性。
    </section>
  </aside>
</template>

<script setup>
import { Delete, Plus, Rank } from '@element-plus/icons-vue'
import { ElButton, ElEmpty, ElForm, ElFormItem, ElIcon, ElInput, ElInputNumber, ElOption, ElSelect, ElSwitch } from 'element-plus'
import { computed } from 'vue'
import Draggable from 'vuedraggable'

const props = defineProps({
  materialFieldTypes: {
    type: Array,
    default: () => [],
  },
  pageSchema: {
    type: Object,
    required: true,
  },
  datasourceCapabilities: {
    type: Object,
    default: () => ({}),
  },
  fieldPropFeedback: {
    type: String,
    default: '',
  },
  selectedArea: {
    type: String,
    default: 'search',
  },
  selectedField: {
    type: Object,
    default: null,
  },
  setterGroups: {
    type: Array,
    default: () => [],
  },
  usesOptionDefaultValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'add-chart',
  'add-option',
  'change-field-type',
  'delete-selected-field',
  'field-sort',
  'move-field',
  'patch-field',
  'patch-page',
  'remove-chart',
  'remove-option',
  'select-field',
  'normalize-field-prop',
])

const actionLabels = {
  search: '查询按钮',
  reset: '重置按钮',
  create: '新增按钮',
  edit: '编辑按钮',
  delete: '删除按钮',
  batchDelete: '批量删除',
}

const areaLabels = {
  search: '搜索表单',
  table: '数据表格',
  form: '弹窗表单',
  metrics: '统计卡片',
  charts: '图表区域',
}

const selectedAreaLabel = computed(() => areaLabels[props.selectedArea] || '页面设置')

const actionCapabilityMap = {
  create: 'create',
  edit: 'update',
  delete: 'delete',
  batchDelete: 'batchDelete',
}

function patchField(patch, structural = false) {
  if (!props.selectedField) {
    return
  }

  emit('patch-field', props.selectedField.id, patch, structural)
}

function handleSetterCommit(setter) {
  if (setter.prop === 'prop') {
    emit('normalize-field-prop')
  }
}

function updateDatasource(key, value) {
  emit('patch-page', {
    datasource: {
      ...props.pageSchema.datasource,
      [key]: value,
    },
  })
}

function updateAction(key, value) {
  emit('patch-page', {
    actions: {
      ...props.pageSchema.actions,
      [key]: Boolean(value),
    },
  })
}

function isActionCapabilityLocked(actionKey) {
  const capabilityKey = actionCapabilityMap[actionKey]
  return capabilityKey ? props.datasourceCapabilities?.[capabilityKey] === false : false
}

function updateOption(index, key, value) {
  const nextOptions = props.selectedField.options.map((option, optionIndex) => {
    if (optionIndex !== index) {
      return option
    }

    return {
      ...option,
      [key]: value,
    }
  })

  patchField({ options: nextOptions })
}

function updateChart(index, key, value) {
  const nextCharts = props.pageSchema.charts.map((chart, chartIndex) => {
    if (chartIndex !== index) {
      return chart
    }

    return {
      ...chart,
      [key]: value,
    }
  })

  emit('patch-page', { charts: nextCharts })
}
</script>

<style scoped>
.property-panel {
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.property-header,
.property-section {
  padding: 14px;
  border-bottom: 1px solid #eef2f7;
}

.property-header strong,
.property-header span {
  display: block;
}

.property-header strong {
  color: #111827;
  font-size: 14px;
}

.property-header span,
.section-title {
  color: #6b7280;
  font-size: 12px;
}

.section-title {
  margin-bottom: 10px;
}

.action-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10px;
}

.readonly-note,
.field-feedback {
  margin-top: 8px;
  color: #b45309;
  font-size: 12px;
  line-height: 1.5;
}

.option-setter,
.chart-setter {
  display: grid;
  gap: 10px;
}

.option-row,
.chart-row {
  display: grid;
  gap: 8px;
}

.field-list {
  display: grid;
  gap: 8px;
}

.field-list-item {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.field-list-item.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.drag-handle,
.field-pick {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}

.field-pick span,
.field-pick small {
  display: block;
  text-align: left;
}

.field-pick small {
  color: #6b7280;
  font-size: 12px;
}

.field-order-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delete-field-button {
  width: 100%;
  margin-top: 12px;
}

.empty-property {
  padding: 14px;
  color: #6b7280;
  font-size: 12px;
}
</style>
