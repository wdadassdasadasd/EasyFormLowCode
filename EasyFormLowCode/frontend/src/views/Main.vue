<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">LC</div>
        <div><strong>LowCode</strong><span>Admin Builder</span></div>
      </div>

      <nav class="menu-list">
        <router-link v-for="item in menus" :key="item.path" class="menu-item" :to="menuTarget(item.path)">
          <el-icon><component :is="item.icon" /></el-icon><span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="selectors">
          <el-select :model-value="selectedProjectId" class="selector" :loading="catalogLoading" @change="changeProject">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
          <el-select :model-value="selectedPageId" class="selector" :disabled="pages.length === 0" @change="changePage">
            <el-option v-for="page in pages" :key="page.page_id" :label="page.name" :value="page.page_id" />
          </el-select>
        </div>

        <div class="actions">
          <template v-if="isDesignerRoute">
            <el-tag :type="designerStatus.type" effect="plain">{{ designerStatus.text }}</el-tag>
            <el-button plain @click="callDesigner('undoSchema')">Undo</el-button>
            <el-button plain @click="callDesigner('redoSchema')">Redo</el-button>
            <el-button :icon="DocumentChecked" type="primary" plain @click="callDesigner('saveSchema')">保存</el-button>
            <el-button :icon="Promotion" type="primary" @click="callDesigner('publishSchema')">发布</el-button>
            <el-button :icon="View" @click="callDesigner('previewPage')">预览</el-button>
            <el-button :icon="RefreshLeft" @click="callDesigner('showVersion')">版本</el-button>
            <el-button :icon="Upload" @click="callDesigner('exportSchema')">导出</el-button>
          </template>
          <template v-else-if="isPreviewRoute">
            <el-tag type="success" effect="plain">运行态预览</el-tag>
            <el-button :icon="EditPen" type="primary" plain @click="goDesigner">返回设计器</el-button>
          </template>
        </div>
      </header>

      <el-alert v-if="catalogError" class="catalog-alert" type="warning" :title="catalogError" show-icon :closable="false" />
      <main class="content">
        <router-view v-slot="{ Component }">
          <component :is="Component" ref="componentRef" @editor-status-change="handleEditorStatusChange" />
        </router-view>
      </main>
    </section>
  </div>
</template>

<script setup>
import { DataBoard, DocumentChecked, EditPen, Folder, House, Promotion, RefreshLeft, Setting, Upload, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { buildProjectRouteQuery, resolveSelectedPageId } from '../composables/projectRouteState'
import { useProjectCatalog } from '../composables/useProjectCatalog'

defineOptions({ name: 'MainView' })

const componentRef = ref(null)
const route = useRoute()
const router = useRouter()
const catalog = useProjectCatalog()
const { activeProjectId, catalogError, catalogLoading, pages, projects } = catalog
const designerStatus = ref({ text: '正在加载', type: 'info' })
provide('projectCatalog', catalog)

const isDesignerRoute = computed(() => route.path === '/pagedesigner')
const isPreviewRoute = computed(() => route.path === '/preview')
const selectedProjectId = computed(() => Number(route.query.projectId) || activeProjectId.value || undefined)
const selectedPageId = computed(() => resolveSelectedPageId(route.query.pageId, pages.value))
const menus = [
  { label: '工作台', path: '/workbench', icon: House },
  { label: '项目管理', path: '/appmanage', icon: Folder },
  { label: '页面设计', path: '/pagedesigner', icon: EditPen },
  { label: '运行预览', path: '/preview', icon: DataBoard },
  { label: '系统设置', path: '/setting', icon: Setting },
]

onMounted(async () => {
  const projectId = await catalog.loadProjects(route.query.projectId)
  syncRoute(projectId)
})

watch(
  () => route.query.projectId,
  async (projectId) => {
    if (projectId && Number(projectId) !== activeProjectId.value) {
      await catalog.loadPages(projectId)
    }
    syncRoute(Number(projectId) || activeProjectId.value)
  },
)

watch(
  () => [activeProjectId.value, route.query.pageId, pages.value.map((page) => page.page_id).join('|')],
  () => {
    syncRoute()
  },
)

function syncRoute(projectId = activeProjectId.value) {
  const nextQuery = buildProjectRouteQuery(route.query, projectId, pages.value)
  if (!nextQuery) return
  router.replace({ path: route.path, query: nextQuery })
}

function menuTarget(path) {
  return { path, query: { projectId: selectedProjectId.value, pageId: selectedPageId.value || undefined } }
}

function changeProject(projectId) {
  router.push({ path: route.path, query: { ...route.query, projectId, pageId: undefined } })
}

function changePage(pageId) {
  router.push({ path: route.path, query: { ...route.query, projectId: selectedProjectId.value, pageId } })
}

function callDesigner(methodName) {
  const method = componentRef.value?.[methodName]
  if (typeof method === 'function') return method()
  ElMessage.info('请在页面设计器中使用该操作')
}

function handleEditorStatusChange(status) {
  designerStatus.value = { text: status?.text || '未保存修改', type: status?.type || 'warning' }
}

function goDesigner() {
  router.push(menuTarget('/pagedesigner'))
}
</script>

<style lang="scss" scoped>
.main-shell { display: flex; width: 100%; min-height: 100vh; color: #111827; background: #f3f4f6; }
.sidebar { width: 236px; flex-shrink: 0; background: #fff; border-right: 1px solid #e5e7eb; }
.brand { display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 18px; border-bottom: 1px solid #edf0f3; }
.brand strong, .brand span { display: block; }
.brand strong { font-size: 16px; }.brand span { color: #6b7280; font-size: 12px; }
.brand-mark { display: grid; width: 34px; height: 34px; place-items: center; color: #fff; font-size: 12px; font-weight: 800; background: #2563eb; border-radius: 8px; }
.menu-list { display: grid; gap: 6px; padding: 14px 10px; }
.menu-item { display: flex; align-items: center; gap: 12px; height: 42px; padding: 0 12px; color: #374151; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; }
.menu-item:hover, .menu-item.router-link-active { color: #1d4ed8; background: #eff6ff; }
.workspace { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 10px 18px; background: #fff; border-bottom: 1px solid #e5e7eb; }
.selectors, .actions { display: flex; align-items: center; gap: 10px; min-width: 0; }.selector { width: 180px; }.actions { flex-wrap: wrap; justify-content: flex-end; }
.catalog-alert { margin: 12px 12px 0; }.content { min-width: 0; min-height: 0; flex: 1; padding: 12px; }
@media (max-width: 900px) { .sidebar { width: 64px; }.brand { justify-content: center; padding: 0; }.brand > div:last-child, .menu-item span { display: none; }.menu-item { justify-content: center; padding: 0; }.topbar { align-items: flex-start; flex-direction: column; }.selectors, .actions { width: 100%; }.actions { justify-content: flex-start; }.selector { flex: 1; width: auto; } }
@media (max-width: 560px) { .topbar, .content { padding-right: 8px; padding-left: 8px; }.selectors { flex-direction: column; }.selector { width: 100%; }.actions :deep(.el-button) { margin-left: 0; } }
</style>
