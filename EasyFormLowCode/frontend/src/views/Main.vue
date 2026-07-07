<template>
  <div class="main-shell" :class="{ 'shell-sidebar-collapsed': isSidebarCollapsed && !isMobileShell }">
    <aside v-if="!isMobileShell" class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="brand">
        <div class="brand-mark">LC</div>
        <div v-if="!isSidebarCollapsed" class="brand-copy">
          <strong>LowCode</strong>
          <span>Admin Builder</span>
        </div>
      </div>

      <nav class="menu-list">
        <router-link
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :class="{ collapsed: isSidebarCollapsed }"
          :to="menuTarget(item.path)"
          :title="item.label"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-if="!isSidebarCollapsed">{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <el-drawer v-else v-model="mobileSidebarVisible" direction="ltr" size="232px" :with-header="false">
      <aside class="sidebar sidebar-mobile">
        <div class="brand">
          <div class="brand-mark">LC</div>
          <div class="brand-copy">
            <strong>LowCode</strong>
            <span>Admin Builder</span>
          </div>
        </div>

        <nav class="menu-list">
          <router-link
            v-for="item in menus"
            :key="item.path"
            class="menu-item"
            :to="menuTarget(item.path)"
            :title="item.label"
            @click="mobileSidebarVisible = false"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
      </aside>
    </el-drawer>

    <section class="workspace">
      <header class="topbar" :class="{ 'topbar-workspace': isWorkspaceRoute }">
        <div class="topbar-leading">
          <el-button
            class="sidebar-toggle"
            plain
            circle
            :icon="isMobileShell ? Expand : (isSidebarCollapsed ? Expand : Fold)"
            :title="isMobileShell ? 'Open navigation' : (isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation')"
            @click="toggleSidebar"
          />

          <div class="topbar-title">
            <span>后台搭建工作台</span>
            <strong>{{ currentMenuLabel }}</strong>
          </div>

          <div class="selectors">
            <el-select
              :model-value="selectedProjectId"
              class="selector"
              :loading="catalogLoading"
              placeholder="选择项目"
              @change="changeProject"
            >
              <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
            </el-select>
            <el-select
              :model-value="selectedPageId"
              class="selector"
              :disabled="pages.length === 0"
              placeholder="选择页面"
              @change="changePage"
            >
              <el-option v-for="page in pages" :key="page.page_id" :label="page.name" :value="page.page_id" />
            </el-select>
          </div>
        </div>

        <div class="actions" :class="{ 'actions-workspace': isWorkspaceRoute }">
          <template v-if="isDesignerRoute">
            <el-tag :type="designerStatus.type" effect="plain">{{ designerStatus.text }}</el-tag>
            <div class="action-group">
              <el-button plain @click="callDesigner('undoSchema')">撤销</el-button>
              <el-button plain @click="callDesigner('redoSchema')">重做</el-button>
            </div>
            <div class="action-group action-group-primary">
              <el-button :icon="DocumentChecked" type="primary" plain @click="callDesigner('saveSchema')">保存</el-button>
              <el-button :icon="Promotion" type="primary" @click="callDesigner('publishSchema')">发布</el-button>
              <el-button :icon="View" @click="callDesigner('previewPage')">预览</el-button>
            </div>
            <div class="action-group">
              <el-button :icon="RefreshLeft" @click="callDesigner('showVersion')">版本</el-button>
              <el-button :icon="Upload" @click="callDesigner('exportSchema')">导出</el-button>
              <el-button plain @click="callDesigner('syncEntityPage')">同步实体</el-button>
            </div>
          </template>
          <template v-else-if="isPreviewRoute">
            <el-tag type="success" effect="plain">运行预览</el-tag>
            <el-button :icon="EditPen" type="primary" plain @click="goDesigner">返回设计器</el-button>
          </template>
        </div>
      </header>

      <el-alert v-if="catalogError" class="catalog-alert" type="warning" :title="catalogError" show-icon :closable="false" />
      <main class="content" :class="contentClassName">
        <router-view v-slot="{ Component }">
          <component :is="Component" ref="componentRef" @editor-status-change="handleEditorStatusChange" />
        </router-view>
      </main>
    </section>
  </div>
</template>

<script setup>
import {
  DataAnalysis,
  DataBoard,
  DocumentChecked,
  EditPen,
  Expand,
  Fold,
  Folder,
  House,
  Promotion,
  RefreshLeft,
  Setting,
  Upload,
  View,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { buildProjectRouteQuery, resolveSelectedPageId } from '../composables/projectRouteState'
import { useProjectCatalog } from '../composables/useProjectCatalog'

defineOptions({ name: 'MainView' })

const SIDEBAR_COLLAPSED_KEY = 'lowcode_sidebar_collapsed'

const componentRef = ref(null)
const route = useRoute()
const router = useRouter()
const catalog = useProjectCatalog()
const { activeProjectId, catalogError, catalogLoading, pages, projects } = catalog
const designerStatus = ref({ text: '正在加载', type: 'info' })
const isSidebarCollapsed = ref(false)
const isMobileShell = ref(false)
const mobileSidebarVisible = ref(false)

provide('projectCatalog', catalog)

const isDesignerRoute = computed(() => route.path === '/pagedesigner')
const isPreviewRoute = computed(() => route.path === '/preview')
const isWorkspaceRoute = computed(() => isDesignerRoute.value || isPreviewRoute.value)
const contentClassName = computed(() => (isWorkspaceRoute.value ? 'content-workspace' : 'content-default'))
const selectedProjectId = computed(() => Number(route.query.projectId) || activeProjectId.value || undefined)
const selectedPageId = computed(() => resolveSelectedPageId(route.query.pageId, pages.value))
const menus = [
  { label: '工作台', path: '/workbench', icon: House },
  { label: '项目管理', path: '/appmanage', icon: Folder },
  { label: '数据模型', path: '/entities', icon: DataAnalysis },
  { label: '页面设计', path: '/pagedesigner', icon: EditPen },
  { label: '运行预览', path: '/preview', icon: DataBoard },
  { label: '系统设置', path: '/setting', icon: Setting },
]
const currentMenuLabel = computed(() => menus.find((item) => item.path === route.path)?.label || '后台管理')

onMounted(async () => {
  restoreSidebarPreference()
  syncShellLayout()
  const projectId = await catalog.loadProjects(route.query.projectId)
  syncRoute(projectId)
  window.addEventListener('resize', syncShellLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncShellLayout)
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

function restoreSidebarPreference() {
  if (typeof window === 'undefined') return
  isSidebarCollapsed.value = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

function syncShellLayout() {
  if (typeof window === 'undefined') return
  isMobileShell.value = window.innerWidth <= 900
  if (!isMobileShell.value) {
    mobileSidebarVisible.value = false
  }
}

function toggleSidebar() {
  if (isMobileShell.value) {
    mobileSidebarVisible.value = !mobileSidebarVisible.value
    return
  }
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed.value ? '1' : '0')
  }
}

function menuTarget(path) {
  return { path, query: { projectId: selectedProjectId.value, pageId: selectedPageId.value || undefined } }
}

function changeProject(projectId) {
  mobileSidebarVisible.value = false
  router.push({ path: route.path, query: { ...route.query, projectId, pageId: undefined } })
}

function changePage(pageId) {
  mobileSidebarVisible.value = false
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
.main-shell {
  display: flex;
  width: 100%;
  min-height: 100vh;
  color: #111827;
  background: #f4f6f8;
}

.sidebar {
  width: 224px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-mobile {
  width: auto;
  border-right: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 18px;
  border-bottom: 1px solid #edf0f3;
}

.brand strong,
.brand span {
  display: block;
}

.brand strong {
  font-size: 16px;
  line-height: 1.2;
}

.brand span {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.brand-copy {
  min-width: 0;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  background: #1f4fd8;
  border-radius: 8px;
}

.menu-list {
  display: grid;
  gap: 4px;
  padding: 14px 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.2s ease, color 0.2s ease, justify-content 0.2s ease;
}

.menu-item.collapsed {
  justify-content: center;
  padding: 0;
}

.menu-item:hover,
.menu-item.router-link-active {
  color: #1d4ed8;
  background: #eef4ff;
}

.workspace {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 64px;
  padding: 10px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar-workspace {
  padding-right: 14px;
  padding-left: 14px;
}

.topbar-leading,
.selectors,
.actions,
.action-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar-leading {
  flex: 1;
}

.sidebar-toggle {
  flex-shrink: 0;
}

.topbar-title {
  display: grid;
  min-width: 132px;
  gap: 2px;
}

.topbar-title span {
  color: #6b7280;
  font-size: 12px;
}

.topbar-title strong {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selectors {
  flex: 1;
  justify-content: flex-start;
}

.selector {
  width: 180px;
}

.actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.actions-workspace {
  gap: 8px;
}

.action-group {
  gap: 6px;
  padding-left: 8px;
  border-left: 1px solid #e5e7eb;
}

.action-group:first-of-type {
  border-left: 0;
}

.catalog-alert {
  margin: 12px 16px 0;
}

.content {
  min-width: 0;
  min-height: 0;
  flex: 1;
}

.content-default {
  padding: 16px;
}

.content-workspace {
  padding: 10px;
}

@media (max-width: 1200px) {
  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-leading,
  .actions {
    width: 100%;
  }

  .actions {
    justify-content: flex-start;
  }

  .selector {
    width: 172px;
  }
}

@media (max-width: 900px) {
  .topbar-leading,
  .selectors {
    width: 100%;
  }

  .topbar-leading {
    flex-wrap: wrap;
  }

  .selectors {
    flex: 1 1 100%;
  }

  .selector {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 560px) {
  .topbar,
  .content-default,
  .content-workspace {
    padding-right: 10px;
    padding-left: 10px;
  }

  .topbar-title {
    min-width: 0;
  }

  .selectors,
  .actions,
  .action-group {
    flex-direction: column;
    align-items: stretch;
  }

  .selector {
    width: 100%;
  }

  .action-group {
    width: 100%;
    padding-left: 0;
    border-left: 0;
  }

  .actions :deep(.el-button) {
    margin-left: 0;
  }
}
</style>
