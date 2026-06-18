<template>
  <aside class="material-panel">
    <section class="panel-section">
      <div class="panel-heading">
        <span>组件库</span>
        <small>点击添加</small>
      </div>

      <div v-for="group in materialGroups" :key="group.name" class="material-group">
        <div class="group-title">{{ group.name }}</div>
        <Draggable
          :list="group.items"
          item-key="type"
          :group="materialDragGroup"
          :sort="false"
          :clone="cloneMaterialItem"
          class="material-grid"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          drag-class="drag-moving"
          @start="emit('material-drag-start')"
          @end="emit('material-drag-end')"
        >
          <template #item="{ element: fieldType }">
            <button class="material-card" type="button" @click="emit('add-field', fieldType.type)">
              <el-icon><component :is="iconMap[fieldType.material.icon]" /></el-icon>
              <span>{{ fieldType.label }}</span>
            </button>
          </template>
        </Draggable>
      </div>
    </section>

    <section class="panel-section">
      <div class="panel-heading">
        <span>页面模块</span>
        <small>Schema 驱动</small>
      </div>
      <button
        v-for="module in pageModules"
        :key="module.key"
        class="module-card"
        type="button"
        :class="{ active: selectedArea === module.key }"
        @click="emit('select-area', module.key)"
      >
        <el-icon><component :is="module.icon" /></el-icon>
        <span>{{ module.label }}</span>
      </button>
    </section>
  </aside>
</template>

<script setup>
import { ElIcon } from 'element-plus'
import Draggable from 'vuedraggable'

defineProps({
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
})

const emit = defineEmits(['add-field', 'material-drag-end', 'material-drag-start', 'select-area'])

function cloneMaterialItem(fieldType) {
  return {
    id: `material_${fieldType.type}_${Date.now()}`,
    type: fieldType.type,
    label: fieldType.label,
  }
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
  padding: 14px;
  border-bottom: 1px solid #eef2f7;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
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

.material-group + .material-group {
  margin-top: 14px;
}

.group-title {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.material-card,
.module-card {
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  color: #111827;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.material-card span,
.module-card span {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-card + .module-card {
  margin-top: 8px;
}

.module-card.active {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}
</style>
