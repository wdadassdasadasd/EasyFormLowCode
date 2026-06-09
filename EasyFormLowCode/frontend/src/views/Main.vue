<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">LC</div>
        <div>
          <strong>LowCode</strong>
          <span>Admin Builder</span>
        </div>
      </div>

      <nav class="menu-list">
        <router-link v-for="item in menus" :key="item.path" class="menu-item" :to="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="selectors">
          <el-select model-value="demo" class="selector" size="large">
            <el-option label="演示项目" value="demo" />
          </el-select>
          <el-select model-value="user_manage" class="selector" size="large">
            <el-option label="用户管理" value="user_manage" />
          </el-select>
        </div>

        <div class="actions">
          <template v-if="isDesignerRoute">
            <el-tag :type="designerStatus.type" size="large" effect="plain">{{ designerStatus.text }}</el-tag>
            <el-button :icon="DocumentChecked" type="primary" plain @click="callDesigner('saveSchema')">保存</el-button>
            <el-button :icon="Promotion" type="primary" @click="callDesigner('publishSchema')">发布</el-button>
            <el-button :icon="View" @click="callDesigner('previewPage')">预览</el-button>
            <el-button :icon="RefreshLeft" @click="callDesigner('showVersion')">版本</el-button>
            <el-button :icon="Upload" @click="callDesigner('exportSchema')">导出</el-button>
          </template>

          <template v-else-if="isPreviewRoute">
            <el-tag type="success" size="large" effect="plain">运行态预览</el-tag>
            <el-button :icon="EditPen" type="primary" plain @click="goDesigner">返回设计器</el-button>
          </template>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <component :is="Component" ref="componentRef" @editor-status-change="handleEditorStatusChange" />
        </router-view>
      </main>
    </section>
  </div>
</template>

<script setup>
import {
  DataBoard,
  DocumentChecked,
  EditPen,
  Folder,
  House,
  Promotion,
  RefreshLeft,
  Setting,
  Upload,
  View,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const componentRef = ref(null)
const route = useRoute()
const router = useRouter()
const designerStatus = ref({
  text: '正在加载',
  type: 'info',
})

const isDesignerRoute = computed(() => route.path === '/pagedesigner')
const isPreviewRoute = computed(() => route.path === '/preview')

const menus = [
  { label: '工作台', path: '/workbench', icon: House },
  { label: '项目管理', path: '/appmanage', icon: Folder },
  { label: '页面设计', path: '/pagedesigner', icon: EditPen },
  { label: '运行预览', path: '/preview', icon: DataBoard },
  { label: '系统设置', path: '/setting', icon: Setting },
]

function callDesigner(methodName) {
  const method = componentRef.value?.[methodName]

  if (typeof method === 'function') {
    method()
    return
  }

  ElMessage.info('请在页面设计中使用该操作')
}

function handleEditorStatusChange(status) {
  designerStatus.value = {
    text: status?.text || '未保存修改',
    type: status?.type || 'warning',
  }
}

function goDesigner() {
  router.push('/pagedesigner')
}
</script>

<style lang="scss" scoped>
.main-shell {
  display: flex;
  width: 100%;
  min-width: 1180px;
  min-height: 100vh;
  color: #111827;
  background: #f3f4f6;
}

.sidebar {
  width: 236px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
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
  color: #111827;
  font-size: 16px;
  line-height: 1.2;
}

.brand span {
  color: #6b7280;
  font-size: 12px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  background: #2563eb;
  border-radius: 8px;
}

.menu-list {
  display: grid;
  gap: 6px;
  padding: 14px 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 42px;
  padding: 0 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 6px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.menu-item:hover,
.menu-item.router-link-active {
  color: #1d4ed8;
  background: #eff6ff;
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
  height: 64px;
  padding: 0 18px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.selectors,
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selector {
  width: 190px;
}

.content {
  min-height: 0;
  flex: 1;
  padding: 12px;
}

@media (max-width: 1280px) {
  .main-shell {
    min-width: 1120px;
  }

  .sidebar {
    width: 216px;
  }
}
</style>
