<template>
  <aside class="material-panel">
    <section class="panel-section">
      <div class="panel-heading">
        <div>
          <span>组件库</span>
          <small>{{ areaHint }}</small>
        </div>
        <el-button v-if="showCollapseToggle" text circle title="收起组件库" :icon="Back" @click="emit('toggle-collapse')" />
      </div>

      <el-input v-model="keyword" class="material-search" clearable size="small" placeholder="搜索组件" />

      <div class="module-strip">
        <button
          v-for="module in pageModules"
          :key="module.key"
          class="module-pill"
          type="button"
          :class="{ active: selectedArea === module.key }"
          @click="emit('select-area', module.key)"
        >
          <el-icon><component :is="module.icon" /></el-icon>
          <span>{{ module.label }}</span>
        </button>
      </div>

      <template v-if="isFieldArea">
        <div v-for="group in filteredMaterialGroups" :key="group.name" class="material-group">
        <div class="group-title">{{ group.name }}</div>
        <Draggable
          :list="group.items"
          item-key="type"
          :group="materialDragGroup"
          :sort="false"
          :clone="cloneMaterialItem"
          handle=".material-drag-handle"
          class="material-grid"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          drag-class="drag-moving"
          @start="emit('material-drag-start')"
          @end="emit('material-drag-end')"
        >
          <template #item="{ element: fieldType }">
            <button class="material-card" type="button" :title="fieldType.label" @click.stop="emit('add-field', fieldType.type, selectedArea)">
              <el-icon><component :is="iconMap[fieldType.material.icon]" /></el-icon>
              <span>{{ fieldType.label }}</span>
              <span class="material-drag-handle" title="拖拽添加">⋮⋮</span>
            </button>
          </template>
        </Draggable>
      </div>
        <div v-if="filteredMaterialGroups.length === 0" class="material-empty">没有匹配的字段组件</div>
      </template>
      <div v-else class="analytics-material-grid">
        <button
          v-for="material in filteredAnalyticsMaterials"
          :key="material.type"
          class="analytics-material-card"
          type="button"
          :title="material.label"
          draggable="true"
          @click="emit('add-analytics', material.type)"
          @dragstart="startAnalyticsDrag($event, material.type)"
        >
          <el-icon><component :is="iconMap[material.icon]" /></el-icon>
          <span>{{ material.label }}</span>
          <small>{{ material.description }}</small>
        </button>
        <div v-if="filteredAnalyticsMaterials.length === 0" class="material-empty">没有匹配的数据分析组件</div>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { Back } from '@element-plus/icons-vue'
import { ElButton, ElIcon, ElInput } from 'element-plus'
import { computed, ref } from 'vue'
import Draggable from 'vuedraggable'

const props = defineProps({
  materialGroups: {
    type: Array,
    default: () => [],
  },
  pageModules: {
    type: Array,
    default: () => [],
  },
  selectedArea: {
    type: String,
    default: 'search',
  },
  materialDragGroup: {
    type: Object,
    required: true,
  },
  iconMap: {
    type: Object,
    required: true,
  },
  analyticsMaterials: {
    type: Array,
    default: () => [],
  },
  showCollapseToggle: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add-analytics', 'add-field', 'material-drag-end', 'material-drag-start', 'select-area', 'toggle-collapse'])
const isFieldArea = computed(() => ['search', 'table', 'form'].includes(props.selectedArea))
const keyword = ref('')

const areaHints = {
  search: '查询条件优先',
  table: '表格列优先',
  form: '表单项优先',
  metrics: '统计指标组件',
  charts: '图表组件',
}

const areaHint = computed(() => areaHints[props.selectedArea] || '点击或拖拽添加')

const selectedAreaGroupName = computed(() => {
  if (props.selectedArea === 'search') return '查询条件'
  if (props.selectedArea === 'table') return '表格列'
  if (props.selectedArea === 'form') return '表单项'
  return ''
})

const filteredMaterialGroups = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const groups = props.materialGroups.map((group) => {
    const items = group.items.filter((fieldType) => {
      if (!normalizedKeyword) return true
      return [fieldType.label, fieldType.type, group.name].some((value) => String(value || '').toLowerCase().includes(normalizedKeyword))
    })
    return {
      ...group,
      name: selectedAreaGroupName.value ? `${selectedAreaGroupName.value} · ${group.name}` : group.name,
      items,
    }
  })

  return groups.filter((group) => group.items.length > 0)
})

const filteredAnalyticsMaterials = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  if (!normalizedKeyword) return props.analyticsMaterials
  return props.analyticsMaterials.filter((material) => {
    return [material.label, material.type, material.description].some((value) => String(value || '').toLowerCase().includes(normalizedKeyword))
  })
})

function cloneMaterialItem(fieldType) {
  return {
    id: `material_${fieldType.type}_${Date.now()}`,
    type: fieldType.type,
    label: fieldType.label,
  }
}

function startAnalyticsDrag(event, type) {
  event.dataTransfer?.setData('application/x-lowcode-analytics', type)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<style scoped>
.material-panel {
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.panel-section {
  padding: 12px;
  border-bottom: 1px solid #eef2f7;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-heading span,
.panel-heading small {
  display: block;
}

.panel-heading span {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.panel-heading small {
  color: #6b7280;
  font-size: 12px;
}

.material-search {
  margin-bottom: 10px;
}

.module-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 12px;
}

.module-pill {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  color: #4b5563;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.module-pill span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-pill.active {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.material-group + .material-group {
  margin-top: 12px;
}

.group-title {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.material-grid,
.analytics-material-grid,
.module-list {
  display: grid;
  gap: 8px;
}

.material-card,
.module-card,
.analytics-material-card {
  width: 100%;
  padding: 10px;
  color: #111827;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.material-card:hover,
.module-card:hover,
.analytics-material-card:hover,
.module-pill:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.material-card {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.material-card span {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-drag-handle {
  cursor: grab;
  color: #9ca3af;
  user-select: none;
}

.analytics-material-card {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 4px 8px;
}

.analytics-material-card span {
  font-size: 13px;
  line-height: 1.35;
}

.analytics-material-card small {
  grid-column: 2;
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.module-card.active {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.material-empty {
  padding: 14px 8px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}
</style>
