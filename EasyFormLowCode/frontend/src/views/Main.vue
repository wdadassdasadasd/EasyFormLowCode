<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">L</div>
        <span>LowCode Admin Builder</span>
      </div>

      <nav class="menu-list">
        <router-link
          v-for="item in menus"
          :key="item.path"
          class="menu-item"
          :to="item.path"
        >
          <span class="menu-icon">{{ item.icon }}</span>
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
            <el-tag :type="designerStatus.type" size="large">{{ designerStatus.text }}</el-tag>
            <el-button type="primary" plain @click="callDesigner('saveSchema')">保存</el-button>
            <el-button type="primary" @click="callDesigner('publishSchema')">发布</el-button>
            <el-button @click="callDesigner('previewPage')">预览</el-button>
            <el-button @click="callDesigner('showVersion')">版本</el-button>
            <el-button @click="callDesigner('exportSchema')">导出</el-button>
          </template>

          <template v-else-if="isPreviewRoute">
            <el-tag type="success" size="large">运行态预览</el-tag>
            <el-button type="primary" plain @click="goDesigner">返回设计器</el-button>
          </template>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <component
            :is="Component"
            ref="componentRef"
            @editor-status-change="handleEditorStatusChange"
          />
        </router-view>
      </main>
    </section>
  </div>
</template>

<script setup>
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
  { label: '工作台', path: '/workbench', icon: '⌂' },
  { label: '项目管理', path: '/appmanage', icon: '▣' },
  { label: '页面设计', path: '/pagedesigner', icon: '✎' },
  { label: '运行预览', path: '/preview', icon: '▷' },
  { label: '系统设置', path: '/setting', icon: '⚙' },
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
  color: #172033;
  background: #f5f7fb;
}

.sidebar {
  width: 264px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e8edf5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 66px;
  padding: 0 22px;
  color: #1267f8;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
  border-bottom: 1px solid #edf1f7;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  background: linear-gradient(135deg, #1b72ff, #0cb7ff);
  border-radius: 8px;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  padding: 0 16px;
  color: #172033;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 7px;
}

.menu-item.router-link-active {
  color: #1267f8;
  background: #eaf2ff;
}

.menu-icon {
  width: 22px;
  color: inherit;
  font-size: 20px;
  text-align: center;
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
  height: 66px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e6ebf2;
}

.selectors,
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector {
  width: 200px;
}

.content {
  min-height: 0;
  flex: 1;
  padding: 12px;
}

@media (max-width: 1200px) {
  .main-shell {
    min-width: 1000px;
  }

  .sidebar {
    width: 220px;
  }

  .brand {
    font-size: 15px;
  }

  .selector {
    width: 170px;
  }
}
</style>
