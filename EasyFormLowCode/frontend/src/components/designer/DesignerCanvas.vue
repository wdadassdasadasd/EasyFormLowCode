<template>
  <section class="canvas-panel">
    <div class="admin-page-shell">
      <header class="canvas-header">
        <div class="page-heading">
          <span class="eyebrow">后台 CRUD 页面</span>
          <h1>{{ pageSchema.title }}</h1>
          <p>{{ statusText }}</p>
        </div>
        <div class="page-meta">
          <span>{{ datasourceLabel }}</span>
          <strong>{{ tableFields.length }} 列</strong>
          <span>{{ pagination.total }} 条记录</span>
        </div>
      </header>

      <el-alert
        v-if="isOffline || runtimeError"
        class="runtime-alert"
        type="warning"
        show-icon
        :closable="false"
        title="后端不可用，当前显示演示数据"
        :description="runtimeError"
      />

      <main class="workbench-main">
        <section
          class="canvas-card search-card canvas-zone"
          :class="{ selected: selectedArea === 'search', 'drag-target': isDraggingMaterial }"
          @click="emit('select-area', 'search')"
        >
          <div class="block-title">
            <div>
              <strong>查询筛选</strong>
              <span>{{ searchableFields.length }} 个条件</span>
            </div>
            <small>搭建后台页时优先配置高频查询项</small>
          </div>

          <el-empty v-if="searchableFields.length === 0" description="从组件库添加查询字段" :image-size="48" />
          <el-form v-else class="search-form" label-position="top" :model="searchModel">
            <el-form-item
              v-for="field in searchableFields"
              :key="field.id"
              :label="field.label"
              class="field-target"
              :class="{ active: selectedFieldId === field.id }"
              @click.stop="emit('select-field', { fieldId: field.id, area: 'search' })"
            >
              <FieldControl
                :model-value="searchModel[field.prop]"
                :field="field"
                mode="search"
                @enter="emit('apply-search')"
                @update:model-value="emit('update-search-field', { prop: field.prop, value: $event })"
              />
            </el-form-item>
            <div class="search-actions">
              <el-button v-if="pageActions.reset" @click.stop="emit('reset-search')">重置</el-button>
              <el-button v-if="pageActions.search" type="primary" :loading="recordsLoading" @click.stop="emit('apply-search')">查询</el-button>
            </div>
          </el-form>

          <Draggable
            :list="dropTargets.search"
            item-key="id"
            :group="fieldDropGroup"
            :sort="false"
            class="drop-catcher"
            :class="{ 'is-active': isDraggingMaterial, 'is-selected': selectedArea === 'search' }"
            ghost-class="drop-ghost"
            @change="emit('drop-change', 'search', $event)"
          >
            <template #item="{ element }">
              <div class="drop-preview">{{ element.label }}</div>
            </template>
            <template #footer>
              <div class="drop-catcher-label">拖到这里添加查询条件</div>
            </template>
          </Draggable>
        </section>

        <section
          class="canvas-card table-card canvas-zone"
          :class="{ selected: selectedArea === 'table', 'drag-target': isDraggingMaterial }"
          @click="emit('select-area', 'table')"
        >
          <div class="table-toolbar">
            <div>
              <strong>数据表格</strong>
              <span>{{ tableFields.length }} 列 · 共 {{ pagination.total }} 条</span>
            </div>
            <div class="toolbar-actions">
              <el-button v-if="pageActions.create" type="primary" :icon="Plus" :disabled="readonlyRuntime" @click.stop="emit('open-create')">新增</el-button>
              <el-button v-if="pageActions.edit" :icon="EditPen" :disabled="readonlyRuntime || selectedRows.length !== 1" @click.stop="emit('open-selected-edit')">编辑</el-button>
              <el-button
                v-if="pageActions.batchDelete"
                type="danger"
                plain
                :icon="Delete"
                :disabled="readonlyRuntime || selectedRows.length === 0"
                @click.stop="emit('delete-selected')"
              >
                删除
              </el-button>
              <el-button
                v-for="action in batchActions"
                :key="action.id"
                plain
                :disabled="selectedRows.length === 0"
                @click.stop="emit('run-batch-action', action)"
              >
                {{ action.label }}
              </el-button>
            </div>
          </div>

          <div class="table-shell">
            <el-table
              v-loading="recordsLoading"
              :data="recordRows"
              border
              class="data-table"
              row-key="id"
              @selection-change="emit('update-selected-rows', $event)"
            >
              <el-table-column v-if="pageActions.batchDelete" type="selection" width="44" />
              <TableFieldColumn v-for="field in tableFields" :key="field.id" :field="field">
                <template #header="{ field: headerField }">
                  <button
                    class="column-select-target"
                    :class="{ active: selectedFieldId === headerField.id }"
                    type="button"
                    @click.stop="emit('select-field', { fieldId: headerField.id, area: 'table' })"
                  >
                    {{ headerField.label }}
                  </button>
                </template>
              </TableFieldColumn>
              <el-table-column v-if="pageActions.edit || pageActions.delete || rowActions.length" label="操作" width="220" fixed="right">
                <template #default="{ row }">
                  <el-button v-if="pageActions.edit" link type="primary" :disabled="readonlyRuntime" @click.stop="emit('open-edit', row)">编辑</el-button>
                  <el-button v-if="pageActions.delete" link type="danger" :disabled="readonlyRuntime" @click.stop="emit('delete-record', row)">删除</el-button>
                  <el-button
                    v-for="action in rowActions"
                    :key="action.id"
                    link
                    type="primary"
                    @click.stop="emit('run-row-action', action, row)"
                  >
                    {{ action.label }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="pagination-row">
            <span>{{ tableHint }}</span>
            <el-pagination
              :current-page="pagination.currentPage"
              :page-size="pagination.pageSize"
              background
              layout="prev, pager, next, sizes"
              :page-sizes="[5, 10, 20, 50]"
              :total="pagination.total"
              @update:current-page="emit('update-pagination', { currentPage: $event })"
              @update:page-size="emit('update-pagination', { pageSize: $event })"
            />
          </div>

          <Draggable
            :list="dropTargets.table"
            item-key="id"
            :group="fieldDropGroup"
            :sort="false"
            class="drop-catcher"
            :class="{ 'is-active': isDraggingMaterial, 'is-selected': selectedArea === 'table' }"
            ghost-class="drop-ghost"
            @change="emit('drop-change', 'table', $event)"
          >
            <template #item="{ element }">
              <div class="drop-preview">{{ element.label }}</div>
            </template>
            <template #footer>
              <div class="drop-catcher-label">拖到这里添加表格列</div>
            </template>
          </Draggable>
        </section>
      </main>

      <section class="workbench-lower">
        <section
          class="canvas-card form-card canvas-zone"
          :class="{ selected: selectedArea === 'form', 'drag-target': isDraggingMaterial }"
          @click="emit('select-area', 'form')"
        >
          <div class="block-title">
            <div>
              <strong>弹窗表单</strong>
              <span>{{ formFields.length }} 个字段</span>
            </div>
            <small>新增 / 编辑共用</small>
          </div>
          <el-empty v-if="formFields.length === 0" description="从组件库添加表单字段" :image-size="48" />
          <el-form v-else class="form-preview" label-position="top" :model="dialogForm">
            <el-form-item
              v-for="field in formFields.slice(0, 6)"
              :key="field.id"
              :label="field.label"
              :required="field.required"
              class="field-target"
              :class="{ active: selectedFieldId === field.id }"
              @click.stop="emit('select-field', { fieldId: field.id, area: 'form' })"
            >
              <FieldControl
                :model-value="dialogForm[field.prop]"
                :field="field"
                mode="form"
                @update:model-value="emit('update-dialog-field', { prop: field.prop, value: $event })"
              />
            </el-form-item>
          </el-form>
          <div v-if="formFields.length > 6" class="more-fields">还有 {{ formFields.length - 6 }} 个字段会在弹窗中展示</div>
          <Draggable
            :list="dropTargets.form"
            item-key="id"
            :group="fieldDropGroup"
            :sort="false"
            class="drop-catcher"
            :class="{ 'is-active': isDraggingMaterial, 'is-selected': selectedArea === 'form' }"
            ghost-class="drop-ghost"
            @change="emit('drop-change', 'form', $event)"
          >
            <template #item="{ element }">
              <div class="drop-preview">{{ element.label }}</div>
            </template>
            <template #footer>
              <div class="drop-catcher-label">拖到这里添加表单项</div>
            </template>
          </Draggable>
        </section>

        <section class="analytics-stack">
          <section
            class="metrics-grid analytics-section canvas-zone"
            :class="{ selected: selectedArea === 'metrics' }"
            @click="emit('select-area', 'metrics')"
            @dragover.prevent
            @drop.prevent="emit('analytics-drop', 'metrics', $event)"
          >
            <div class="section-heading">
              <strong>统计卡片</strong>
              <span>{{ metricCards.length }} 项</span>
            </div>
            <div
              v-for="metric in metricCards"
              :key="metric.id"
              class="metric-card"
              :class="[metric.tone, { active: selectedMetricId === metric.id }]"
              @click.stop="emit('select-metric', metric.id)"
            >
              <span>{{ metric.title }}</span>
              <strong>{{ metric.displayValue || metric.value }}</strong>
              <small>{{ metric.trend }}</small>
            </div>
            <div v-if="metricCards.length === 0" class="analytics-empty">从组件库添加统计卡片</div>
          </section>

          <section
            class="chart-grid canvas-card canvas-zone"
            :class="{ selected: selectedArea === 'charts' }"
            @click="emit('select-area', 'charts')"
            @dragover.prevent
            @drop.prevent="emit('analytics-drop', 'charts', $event)"
          >
            <div class="block-title chart-heading">
              <div>
                <strong>数据分析</strong>
                <span>{{ normalizedCharts.length }} 个图表</span>
              </div>
              <small>趋势 / 分布 / 排行</small>
            </div>
            <div
              v-for="chart in normalizedCharts"
              :key="chart.id"
              class="chart-select-target"
              :class="{ active: selectedChartId === chart.id }"
              @click.stop="emit('select-chart', chart.id)"
            >
              <ChartRenderer :chart="chart" :aggregate="chart.aggregate" :records="statsRows" :fields="pageSchema.fields" />
            </div>
            <div v-if="normalizedCharts.length === 0" class="analytics-empty">从组件库添加图表</div>
          </section>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup>
import { Delete, EditPen, Plus } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElEmpty, ElForm, ElFormItem, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import { computed } from 'vue'
import Draggable from 'vuedraggable'

import ChartRenderer from '../../renderer/ChartRenderer.vue'
import FieldControl from '../../renderer/FieldControl.vue'
import TableFieldColumn from '../../renderer/TableFieldColumn.vue'

const props = defineProps({
  dialogForm: {
    type: Object,
    required: true,
  },
  dropTargets: {
    type: Object,
    required: true,
  },
  fieldDropGroup: {
    type: Object,
    required: true,
  },
  formFields: {
    type: Array,
    default: () => [],
  },
  isDraggingMaterial: {
    type: Boolean,
    default: false,
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
  metricCards: {
    type: Array,
    default: () => [],
  },
  normalizedCharts: {
    type: Array,
    default: () => [],
  },
  rowActions: {
    type: Array,
    default: () => [],
  },
  pageActions: {
    type: Object,
    default: () => ({}),
  },
  pageSchema: {
    type: Object,
    required: true,
  },
  pagination: {
    type: Object,
    required: true,
  },
  recordRows: {
    type: Array,
    default: () => [],
  },
  recordsLoading: {
    type: Boolean,
    default: false,
  },
  readonlyRuntime: {
    type: Boolean,
    default: false,
  },
  runtimeError: {
    type: String,
    default: '',
  },
  searchModel: {
    type: Object,
    required: true,
  },
  batchActions: {
    type: Array,
    default: () => [],
  },
  searchableFields: {
    type: Array,
    default: () => [],
  },
  selectedArea: {
    type: String,
    default: 'search',
  },
  selectedChartId: {
    type: String,
    default: '',
  },
  selectedFieldId: {
    type: String,
    default: '',
  },
  selectedMetricId: {
    type: String,
    default: '',
  },
  selectedRows: {
    type: Array,
    default: () => [],
  },
  statsRows: {
    type: Array,
    default: () => [],
  },
  statusText: {
    type: String,
    default: '',
  },
  tableFields: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'apply-search',
  'analytics-drop',
  'delete-record',
  'delete-selected',
  'drop-change',
  'open-create',
  'open-edit',
  'open-selected-edit',
  'run-batch-action',
  'run-row-action',
  'reset-search',
  'select-area',
  'select-chart',
  'select-field',
  'select-metric',
  'update-dialog-field',
  'update-pagination',
  'update-search-field',
  'update-selected-rows',
])

const datasourceLabel = computed(() => (props.pageSchema.datasource?.mode === 'rest' ? 'REST 数据源' : '运行时数据源'))
const tableHint = computed(() => (props.pageSchema.datasource?.mode === 'rest' ? '按数据源返回结果展示' : '当前使用 PageSchema 演示数据'))
</script>

<style scoped>
.canvas-panel {
  min-height: 0;
  overflow: auto;
  background: #f6f8fb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.admin-page-shell {
  display: grid;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 10px;
}

.canvas-header,
.block-title,
.table-toolbar,
.pagination-row,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.canvas-header {
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.page-heading {
  min-width: 0;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.canvas-header h1 {
  margin: 3px 0;
  overflow: hidden;
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-header p,
.block-title span,
.table-toolbar span,
.pagination-row span,
.block-title small,
.page-meta span,
.section-heading span {
  color: #6b7280;
  font-size: 12px;
}

.page-meta {
  display: grid;
  min-width: 112px;
  justify-items: end;
  gap: 2px;
  color: #111827;
  font-size: 12px;
}

.runtime-alert {
  border-radius: 6px;
}

.workbench-main,
.workbench-lower,
.analytics-stack {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.canvas-card,
.analytics-section {
  min-width: 0;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.canvas-zone:hover {
  border-color: #cbd5e1;
}

.canvas-card.selected,
.analytics-section.selected {
  border-color: #2563eb;
  box-shadow: inset 3px 0 0 #2563eb;
}

.canvas-zone.drag-target {
  border-color: #60a5fa;
  background: #f8fbff;
}

.search-form,
.form-preview {
  display: grid;
  gap: 10px 12px;
  margin-top: 10px;
}

.search-form {
  grid-template-columns: repeat(4, minmax(136px, 1fr)) auto;
  align-items: end;
}

.search-actions,
.toolbar-actions {
  display: flex;
  gap: 8px;
}

.search-actions {
  justify-content: flex-end;
  min-width: 128px;
}

.toolbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.table-toolbar {
  align-items: center;
  margin-bottom: 10px;
}

.table-shell {
  min-width: 0;
  overflow-x: auto;
}

.data-table {
  min-width: 680px;
}

.pagination-row {
  align-items: center;
  margin-top: 10px;
}

.column-select-target {
  padding: 0;
  color: inherit;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.column-select-target:hover,
.column-select-target.active,
.field-target.active {
  color: #2563eb;
}

.field-target {
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
}

.field-target:hover {
  border-color: #dbeafe;
  background: #f8fbff;
}

.field-target.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.drop-catcher {
  max-height: 0;
  margin-top: 0;
  overflow: hidden;
  border: 1px dashed transparent;
  border-radius: 6px;
  opacity: 0;
  transition: all 0.16s ease;
}

.drop-catcher.is-active,
.drop-catcher.is-selected {
  max-height: 52px;
  margin-top: 10px;
  border-color: #60a5fa;
  background: #eff6ff;
  opacity: 1;
}

.drop-catcher-label,
.drop-preview {
  padding: 12px;
  color: #2563eb;
  font-size: 12px;
  text-align: center;
}

.workbench-lower {
  grid-template-columns: minmax(280px, 0.76fr) minmax(420px, 1fr);
}

.form-preview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metrics-grid,
.chart-grid {
  display: grid;
  gap: 10px;
}

.metrics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.section-heading {
  grid-column: 1 / -1;
  align-items: center;
  padding-bottom: 2px;
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-heading {
  grid-column: 1 / -1;
}

.chart-select-target {
  min-width: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 6px;
}

.metric-card {
  min-width: 0;
  padding: 11px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
}

.metric-card:hover,
.chart-select-target:hover {
  border-color: #cbd5e1;
}

.metric-card.active,
.chart-select-target.active {
  border-color: #2563eb;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}

.metric-card span,
.metric-card strong,
.metric-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card span,
.metric-card small {
  color: #6b7280;
  font-size: 12px;
}

.metric-card strong {
  margin-top: 6px;
  color: #111827;
  font-size: 22px;
  line-height: 1.2;
}

.metric-card.green strong {
  color: #16a34a;
}

.metric-card.orange strong {
  color: #f59e0b;
}

.metric-card.red strong {
  color: #dc2626;
}

.metric-card.teal strong {
  color: #0f766e;
}

.more-fields,
.analytics-empty {
  padding: 10px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}

.more-fields {
  margin-top: 10px;
}

.analytics-empty {
  grid-column: 1 / -1;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  margin-bottom: 4px;
  color: #4b5563;
  font-size: 12px;
}

:deep(.schema-field-control) {
  width: 100%;
}

@media (max-width: 1500px) {
  .search-form {
    grid-template-columns: repeat(3, minmax(136px, 1fr)) auto;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .search-form,
  .workbench-lower,
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .search-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .canvas-header,
  .table-toolbar,
  .pagination-row {
    align-items: stretch;
    flex-direction: column;
  }

  .page-meta {
    justify-items: start;
  }

  .toolbar-actions,
  .search-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.el-button),
  .search-actions :deep(.el-button) {
    margin-left: 0;
  }

  .metrics-grid,
  .form-preview {
    grid-template-columns: 1fr;
  }
}
</style>
