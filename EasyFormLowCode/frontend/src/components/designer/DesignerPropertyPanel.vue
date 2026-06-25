<template>
  <aside class="property-panel">
    <div class="property-header">
      <div>
        <strong>属性配置</strong>
        <span>{{ selectedField ? selectedField.label : selectedAreaLabel }}</span>
      </div>
    </div>

    <section v-if="selectedArea === 'metrics'" class="property-section">
      <div class="section-title">统计卡片配置</div>
      <el-select v-if="pageSchema.metrics?.length" class="analytics-picker" :model-value="selectedMetricId" placeholder="选择统计卡片" @change="emit('select-metric', $event)">
        <el-option v-for="metric in pageSchema.metrics" :key="metric.id" :label="metric.title || metric.id" :value="metric.id" />
      </el-select>
      <div v-if="pageSchema.metrics?.length" class="chart-setter">
        <div v-if="selectedMetric" class="chart-row">
          <el-input :model-value="selectedMetric.title" placeholder="卡片标题" @input="updateMetric(selectedMetricIndex, 'title', $event)" />
          <el-select :model-value="selectedMetric.type" @change="updateMetric(selectedMetricIndex, 'type', $event)">
            <el-option label="记录总数" value="total" />
            <el-option label="字段值计数" value="match" />
            <el-option label="近 30 天" value="recent" />
          </el-select>
          <el-select v-if="selectedMetric.type !== 'total'" :model-value="selectedMetric.field" clearable @change="updateMetric(selectedMetricIndex, 'field', $event)">
            <el-option v-for="field in pageSchema.fields" :key="field.id" :label="field.label" :value="field.prop" />
          </el-select>
          <el-input v-if="selectedMetric.type === 'match'" :model-value="selectedMetric.value" placeholder="匹配值" @input="updateMetric(selectedMetricIndex, 'value', $event)" />
          <el-button text type="danger" @click="emit('remove-metric', selectedMetricIndex)">删除</el-button>
        </div>
      </div>
      <el-empty v-else description="暂无统计卡片" :image-size="56" />
      <el-button plain size="small" :icon="Plus" @click="emit('add-metric')">添加统计卡片</el-button>
    </section>

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
      <div class="readonly-note">配置列表、写入地址与响应字段映射；REST 默认只读模式，开启写操作后才会在运行态出现新增、编辑和删除。</div>
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
        <el-form-item label="允许新增、编辑和删除"><el-switch :model-value="pageSchema.datasource?.restWriteEnabled" @change="updateDatasource('restWriteEnabled', $event)" /></el-form-item>
        <el-form-item label="写入格式"><el-select :model-value="pageSchema.datasource?.requestBodyMode || 'wrapped'" @change="updateDatasource('requestBodyMode', $event)"><el-option label="{ data: record }" value="wrapped" /><el-option label="直接提交 record" value="plain" /></el-select></el-form-item>
        <el-form-item label="列表字段"><el-input :model-value="pageSchema.datasource?.responseItemsKey || 'items'" @input="updateDatasource('responseItemsKey', $event)" /></el-form-item>
        <el-form-item label="总数字段"><el-input :model-value="pageSchema.datasource?.responseTotalKey || 'total'" @input="updateDatasource('responseTotalKey', $event)" /></el-form-item>
        <el-form-item label="记录 ID 字段"><el-input :model-value="pageSchema.datasource?.recordIdKey || 'id'" @input="updateDatasource('recordIdKey', $event)" /></el-form-item>
      </el-form>
    </section>

    <section class="property-section">
      <div class="section-title">动作开关</div>
      <el-form label-position="top" class="action-form">
        <el-form-item v-for="(enabled, actionKey) in pageSchema.actions" :key="actionKey" :label="actionLabels[actionKey] || actionKey">
          <el-switch :model-value="enabled" :disabled="isActionCapabilityLocked(actionKey)" @change="updatePageActionToggle(actionKey, $event)" />
        </el-form-item>
      </el-form>
    </section>

    <section class="property-section">
      <div class="section-title">查询项配置</div>
      <div class="query-list">
        <div v-for="(query, index) in pageSchema.queries || []" :key="query.id" class="action-card">
          <div class="action-card-header">
            <strong>{{ query.label || `查询 ${index + 1}` }}</strong>
            <el-button text type="danger" @click="removeQuery(index)">删除</el-button>
          </div>
          <el-input :model-value="query.label" placeholder="显示名称" @input="updateQuery(index, 'label', $event)" />
          <el-select :model-value="query.fieldProp" placeholder="绑定字段" @change="updateQuery(index, 'fieldProp', $event)">
            <el-option v-for="field in pageSchema.fields" :key="field.id" :label="field.label" :value="field.prop" />
          </el-select>
          <el-input :model-value="query.paramKey" placeholder="请求参数名" @input="updateQuery(index, 'paramKey', $event)" />
          <el-select :model-value="query.operator" @change="updateQuery(index, 'operator', $event)">
            <el-option label="contains" value="contains" />
            <el-option label="eq" value="eq" />
          </el-select>
          <el-input :model-value="query.defaultValue" placeholder="默认值" @input="updateQuery(index, 'defaultValue', $event)" />
        </div>
      </div>
      <el-button plain size="small" class="add-query-button" :icon="Plus" @click="addQuery">添加查询项</el-button>
    </section>

    <section class="property-section">
      <div class="section-title">行内动作</div>
      <div class="query-list">
        <div v-for="(action, index) in pageSchema.rowActions || []" :key="action.id" class="action-card">
          <div class="action-card-header">
            <strong>{{ action.label || `行内动作 ${index + 1}` }}</strong>
            <el-button text type="danger" @click="removeAction('rowActions', index)">删除</el-button>
          </div>
          <el-select :model-value="action.type" @change="updateActionItem('rowActions', index, 'type', $event)">
            <el-option label="编辑" value="edit" />
            <el-option label="删除" value="delete" />
            <el-option label="自定义请求" value="request" />
          </el-select>
          <el-input :model-value="action.label" placeholder="按钮文案" @input="updateActionItem('rowActions', index, 'label', $event)" />
          <template v-if="action.type === 'request'">
            <el-select :model-value="action.method || 'POST'" @change="updateActionItem('rowActions', index, 'method', $event)">
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="PATCH" value="PATCH" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="GET" value="GET" />
            </el-select>
            <el-input :model-value="action.url" placeholder="请求 URL，可使用 :id" @input="updateActionItem('rowActions', index, 'url', $event)" />
          </template>
          <el-input :model-value="action.confirmText" placeholder="确认提示（可选）" @input="updateActionItem('rowActions', index, 'confirmText', $event)" />
          <el-input :model-value="action.successText" placeholder="成功提示（可选）" @input="updateActionItem('rowActions', index, 'successText', $event)" />
          <el-input :model-value="action.errorText" placeholder="失败提示（可选）" @input="updateActionItem('rowActions', index, 'errorText', $event)" />
          <el-switch :model-value="action.refreshAfterSuccess !== false" @change="updateActionItem('rowActions', index, 'refreshAfterSuccess', $event)" />
        </div>
      </div>
      <div class="action-buttons">
        <el-button plain size="small" :icon="Plus" @click="addAction('rowActions', 'edit')">添加编辑</el-button>
        <el-button plain size="small" :icon="Plus" @click="addAction('rowActions', 'delete')">添加删除</el-button>
        <el-button plain size="small" class="add-row-request-button" :icon="Plus" @click="addAction('rowActions', 'request')">添加请求动作</el-button>
      </div>
    </section>

    <section class="property-section">
      <div class="section-title">批量动作</div>
      <div class="query-list">
        <div v-for="(action, index) in pageSchema.batchActions || []" :key="action.id" class="action-card">
          <div class="action-card-header">
            <strong>{{ action.label || `批量动作 ${index + 1}` }}</strong>
            <el-button text type="danger" @click="removeAction('batchActions', index)">删除</el-button>
          </div>
          <el-select :model-value="action.type" @change="updateActionItem('batchActions', index, 'type', $event)">
            <el-option label="批量删除" value="batchDelete" />
            <el-option label="自定义请求" value="request" />
          </el-select>
          <el-input :model-value="action.label" placeholder="按钮文案" @input="updateActionItem('batchActions', index, 'label', $event)" />
          <template v-if="action.type === 'request'">
            <el-select :model-value="action.method || 'POST'" @change="updateActionItem('batchActions', index, 'method', $event)">
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="PATCH" value="PATCH" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="GET" value="GET" />
            </el-select>
            <el-input :model-value="action.url" placeholder="请求 URL" @input="updateActionItem('batchActions', index, 'url', $event)" />
          </template>
          <el-input :model-value="action.confirmText" placeholder="确认提示（可选）" @input="updateActionItem('batchActions', index, 'confirmText', $event)" />
          <el-input :model-value="action.successText" placeholder="成功提示（可选）" @input="updateActionItem('batchActions', index, 'successText', $event)" />
          <el-input :model-value="action.errorText" placeholder="失败提示（可选）" @input="updateActionItem('batchActions', index, 'errorText', $event)" />
          <el-switch :model-value="action.refreshAfterSuccess !== false" @change="updateActionItem('batchActions', index, 'refreshAfterSuccess', $event)" />
        </div>
      </div>
      <div class="action-buttons">
        <el-button plain size="small" :icon="Plus" @click="addAction('batchActions', 'batchDelete')">添加批量删除</el-button>
        <el-button plain size="small" class="add-batch-request-button" :icon="Plus" @click="addAction('batchActions', 'request')">添加批量请求</el-button>
      </div>
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

    <section v-if="selectedArea === 'charts'" class="property-section">
      <div class="section-title">图表配置</div>
      <el-select v-if="pageSchema.charts?.length" class="analytics-picker" :model-value="selectedChartId" placeholder="选择图表" @change="emit('select-chart', $event)">
        <el-option v-for="chart in pageSchema.charts" :key="chart.id" :label="chart.title || chart.id" :value="chart.id" />
      </el-select>
      <div v-if="pageSchema.charts?.length" class="chart-setter">
        <div v-if="selectedChart" class="chart-row">
          <el-input :model-value="selectedChart.title" placeholder="图表标题" @input="updateChart(selectedChartIndex, 'title', $event)" />
          <el-select :model-value="selectedChart.type" @change="updateChart(selectedChartIndex, 'type', $event)">
            <el-option label="metric" value="metric" />
            <el-option label="pie" value="pie" />
            <el-option label="bar" value="bar" />
          </el-select>
          <el-select :model-value="selectedChart.dimension" clearable @change="updateChart(selectedChartIndex, 'dimension', $event)">
            <el-option v-for="field in pageSchema.fields" :key="field.id" :label="field.label" :value="field.prop" />
          </el-select>
          <el-button text type="danger" @click="emit('remove-chart', selectedChartIndex)">删除</el-button>
        </div>
      </div>
      <el-empty v-else description="暂无图表配置" :image-size="56" />
      <el-button plain size="small" :icon="Plus" @click="emit('add-chart')">添加图表</el-button>
    </section>

    <section v-if="!selectedField && !['metrics', 'charts'].includes(selectedArea)" class="empty-property">
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
  selectedChartId: {
    type: String,
    default: '',
  },
  selectedField: {
    type: Object,
    default: null,
  },
  selectedMetricId: {
    type: String,
    default: '',
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
  'add-metric',
  'add-option',
  'change-field-type',
  'delete-selected-field',
  'field-sort',
  'move-field',
  'patch-field',
  'patch-page',
  'remove-chart',
  'remove-metric',
  'remove-option',
  'select-chart',
  'select-field',
  'select-metric',
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
const selectedMetricIndex = computed(() => (props.pageSchema.metrics || []).findIndex((metric) => metric.id === props.selectedMetricId))
const selectedMetric = computed(() => (selectedMetricIndex.value >= 0 ? props.pageSchema.metrics[selectedMetricIndex.value] : null))
const selectedChartIndex = computed(() => (props.pageSchema.charts || []).findIndex((chart) => chart.id === props.selectedChartId))
const selectedChart = computed(() => (selectedChartIndex.value >= 0 ? props.pageSchema.charts[selectedChartIndex.value] : null))

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

function updatePageActionToggle(key, value) {
  emit('patch-page', {
    actions: {
      ...props.pageSchema.actions,
      [key]: Boolean(value),
    },
  })
}

function patchArrayField(key, items) {
  emit('patch-page', { [key]: items })
}

function addQuery() {
  const field = props.pageSchema.fields?.find((item) => item.searchable) || props.pageSchema.fields?.[0]
  patchArrayField('queries', [
    ...(props.pageSchema.queries || []),
    {
      id: `query_${Date.now()}`,
      label: field?.label || '新查询项',
      fieldProp: field?.prop || '',
      paramKey: field?.prop || '',
      operator: 'contains',
      defaultValue: '',
    },
  ])
}

function updateQuery(index, key, value) {
  patchArrayField(
    'queries',
    (props.pageSchema.queries || []).map((query, queryIndex) => {
      return queryIndex === index ? { ...query, [key]: value } : query
    }),
  )
}

function removeQuery(index) {
  patchArrayField('queries', (props.pageSchema.queries || []).filter((_, queryIndex) => queryIndex !== index))
}

function addAction(key, type) {
  const labels = {
    edit: '编辑',
    delete: '删除',
    request: '自定义动作',
    batchDelete: '批量删除',
  }
  const nextAction = {
    id: `${key}_${Date.now()}`,
    type,
    label: labels[type] || '新动作',
    confirmText: '',
    successText: '',
    errorText: '',
    refreshAfterSuccess: true,
  }
  if (type === 'request') {
    nextAction.method = 'POST'
    nextAction.url = ''
  }
  patchArrayField(key, [...(props.pageSchema[key] || []), nextAction])
}

function updateActionItem(key, index, field, value) {
  patchArrayField(
    key,
    (props.pageSchema[key] || []).map((action, actionIndex) => {
      if (actionIndex !== index) return action
      const nextAction = { ...action, [field]: value }
      if (field === 'type' && value !== 'request') {
        delete nextAction.method
        delete nextAction.url
      }
      if (field === 'type' && value === 'request' && !nextAction.method) {
        nextAction.method = 'POST'
        nextAction.url = ''
      }
      return nextAction
    }),
  )
}

function removeAction(key, index) {
  patchArrayField(key, (props.pageSchema[key] || []).filter((_, actionIndex) => actionIndex !== index))
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
  if (index < 0) return
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

function updateMetric(index, key, value) {
  if (index < 0) return
  const nextMetrics = (props.pageSchema.metrics || []).map((metric, metricIndex) => {
    return metricIndex === index ? { ...metric, [key]: value } : metric
  })
  emit('patch-page', { metrics: nextMetrics })
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

.analytics-picker {
  width: 100%;
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
.chart-setter,
.query-list {
  display: grid;
  gap: 10px;
}

.option-row,
.chart-row,
.action-card {
  display: grid;
  gap: 8px;
}

.action-card {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.action-card-header,
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.action-buttons {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 10px;
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
