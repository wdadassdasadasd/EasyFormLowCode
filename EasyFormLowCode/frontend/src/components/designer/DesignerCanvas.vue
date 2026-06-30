<template>
  <section class="canvas-panel">
    <div class="canvas-header">
      <div>
        <span class="eyebrow">PageSchema / CRUD</span>
        <h1>{{ pageSchema.title }}</h1>
        <p>{{ statusText }}</p>
      </div>
    </div>

    <el-alert
      v-if="isOffline || runtimeError"
      class="runtime-alert"
      type="warning"
      show-icon
      :closable="false"
      title="后端不可用，当前显示演示数据"
      :description="runtimeError"
    />

    <section class="canvas-block search-block" :class="{ selected: selectedArea === 'search' }" @click="emit('select-area', 'search')">
      <div class="block-title">
        <strong>搜索表单</strong>
        <span>{{ searchableFields.length }} 个字段</span>
      </div>
      <el-empty v-if="searchableFields.length === 0" description="暂无搜索字段" :image-size="58" />
      <el-form v-else class="search-form" label-position="top" :model="searchModel">
        <el-form-item
          v-for="field in searchableFields"
          :key="field.id"
          :label="field.label"
          class="field-target"
          :class="{ active: selectedFieldId === field.id }"
          @click.stop="emit('select-field', field.id)"
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
          <div class="drop-catcher-label">拖到这里添加到搜索表单</div>
        </template>
      </Draggable>
    </section>

    <section class="canvas-block table-block" :class="{ selected: selectedArea === 'table' }" @click="emit('select-area', 'table')">
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
              @click.stop="emit('select-field', headerField.id)"
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

      <div class="pagination-row">
        <span>{{ pageSchema.datasource?.mode === 'rest' ? '按数据源返回结果展示' : '每次操作都来自当前 PageSchema' }}</span>
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
          <div class="drop-catcher-label">拖到这里添加到数据表格</div>
        </template>
      </Draggable>
    </section>

    <section class="canvas-block form-block" :class="{ selected: selectedArea === 'form' }" @click="emit('select-area', 'form')">
      <div class="block-title">
        <strong>弹窗表单</strong>
        <span>{{ formFields.length }} 个字段</span>
      </div>
      <el-empty v-if="formFields.length === 0" description="拖拽字段到这里生成弹窗表单项" :image-size="58" />
      <el-form v-else class="form-preview" label-position="top" :model="dialogForm">
        <el-form-item
          v-for="field in formFields"
          :key="field.id"
          :label="field.label"
          :required="field.required"
          class="field-target"
          :class="{ active: selectedFieldId === field.id }"
          @click.stop="emit('select-field', field.id)"
        >
          <FieldControl
            :model-value="dialogForm[field.prop]"
            :field="field"
            mode="form"
            @update:model-value="emit('update-dialog-field', { prop: field.prop, value: $event })"
          />
        </el-form-item>
      </el-form>
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
          <div class="drop-catcher-label">拖到这里添加到弹窗表单</div>
        </template>
      </Draggable>
    </section>

    <section class="metrics-grid" :class="{ selected: selectedArea === 'metrics' }" @click="emit('select-area', 'metrics')" @dragover.prevent @drop.prevent="emit('analytics-drop', 'metrics', $event)">
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
    </section>

    <section class="chart-grid" :class="{ selected: selectedArea === 'charts' }" @click="emit('select-area', 'charts')" @dragover.prevent @drop.prevent="emit('analytics-drop', 'charts', $event)">
      <div
        v-for="chart in normalizedCharts"
        :key="chart.id"
        class="chart-select-target"
        :class="{ active: selectedChartId === chart.id }"
        @click.stop="emit('select-chart', chart.id)"
      >
        <ChartRenderer :chart="chart" :aggregate="chart.aggregate" :records="statsRows" :fields="pageSchema.fields" />
      </div>
    </section>

    <RequestInspector :request="lastRequest" :requests="requestHistory" />
  </section>
</template>

<script setup>
import { Delete, EditPen, Plus } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElEmpty, ElForm, ElFormItem, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Draggable from 'vuedraggable'

import RequestInspector from '../RequestInspector.vue'
import ChartRenderer from '../../renderer/ChartRenderer.vue'
import FieldControl from '../../renderer/FieldControl.vue'
import TableFieldColumn from '../../renderer/TableFieldColumn.vue'

defineProps({
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
  lastRequest: {
    type: Object,
    default: null,
  },
  requestHistory: {
    type: Array,
    default: () => [],
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
</script>

<style scoped>
.canvas-panel {
  display: grid;
  gap: 12px;
  min-height: 0;
  padding: 14px;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.canvas-header,
.block-title,
.table-toolbar,
.pagination-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.canvas-header h1 {
  margin: 4px 0;
  color: #111827;
  font-size: 24px;
}

.canvas-header p,
.block-title span,
.table-toolbar span,
.pagination-row span {
  color: #6b7280;
  font-size: 12px;
}

.canvas-block {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.canvas-block.selected {
  border-color: #bfdbfe;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}

.search-form,
.form-preview {
  display: grid;
  gap: 10px 12px;
  margin-top: 12px;
}

.search-form {
  grid-template-columns: repeat(3, minmax(160px, 1fr)) 132px;
  align-items: end;
}

.search-actions,
.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-actions {
  justify-content: flex-end;
}

.pagination-row {
  align-items: center;
  margin-top: 12px;
}

.column-select-target {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}

.column-select-target.active,
.field-target.active {
  color: #2563eb;
}

.drop-catcher {
  margin-top: 12px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}

.drop-catcher.is-active,
.drop-catcher.is-selected {
  border-color: #60a5fa;
  background: #eff6ff;
}

.drop-catcher-label,
.drop-preview {
  padding: 12px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
}

.metrics-grid,
.chart-grid {
  display: grid;
  gap: 12px;
}

.metrics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metrics-grid.selected,
.chart-grid.selected {
  padding: 8px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-select-target {
  border: 1px solid transparent;
  border-radius: 6px;
}

.metric-card {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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
}

.metric-card span,
.metric-card small {
  color: #6b7280;
  font-size: 12px;
}

.metric-card strong {
  margin-top: 8px;
  color: #111827;
  font-size: 28px;
}

.metric-card.green strong {
  color: #16a34a;
}

.metric-card.orange strong {
  color: #f59e0b;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.schema-field-control) {
  width: 100%;
}
</style>
