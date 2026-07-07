<template>
  <section class="workbench-page">
    <header class="page-header">
      <div>
        <span>Workspace</span>
        <h1>{{ activeProject?.name || '工作台' }}</h1>
        <p>按项目聚合后台页面，快速继续配置、发布或查看运行态效果。</p>
      </div>
      <el-button type="primary" @click="goManage">管理项目与页面</el-button>
    </header>

    <section class="overview-panel">
      <div class="overview-item">
        <span>当前项目</span>
        <strong>{{ activeProject?.name || '-' }}</strong>
      </div>
      <div class="overview-item">
        <span>页面数量</span>
        <strong>{{ pages.length }}</strong>
      </div>
      <div class="overview-item">
        <span>已发布</span>
        <strong>{{ publishedCount }}</strong>
      </div>
    </section>

    <section class="content-panel">
      <div class="panel-title">
        <div>
          <strong>后台页面</strong>
          <span>{{ pages.length }} 个页面</span>
        </div>
      </div>

      <el-skeleton v-if="catalogLoading" :rows="4" animated />
      <el-empty v-else-if="pages.length === 0" description="当前项目还没有页面">
        <el-button type="primary" @click="goManage">去创建页面</el-button>
      </el-empty>
      <div v-else class="page-grid">
        <article v-for="page in pages" :key="page.page_id" class="page-card">
          <div class="card-main">
            <el-tag :type="page.has_published ? 'success' : 'warning'" effect="plain">
              {{ page.has_published ? '已发布' : '草稿' }}
            </el-tag>
            <h2>{{ page.name }}</h2>
            <p>{{ page.page_id }}</p>
          </div>
          <div class="card-actions">
            <el-button plain @click="goDesigner(page)">配置页面</el-button>
            <el-button type="primary" @click="goPreview(page)">运行预览</el-button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { activeProject, catalogLoading, pages } = inject('projectCatalog')
const route = useRoute()
const router = useRouter()
const projectId = computed(() => Number(route.query.projectId) || activeProject.value?.id)
const publishedCount = computed(() => pages.value.filter((page) => page.has_published).length)

function goManage() { router.push({ path: '/appmanage', query: { projectId: projectId.value } }) }
function goDesigner(page) { router.push({ path: '/pagedesigner', query: { projectId: projectId.value, pageId: page.page_id } }) }
function goPreview(page) { router.push({ path: '/preview', query: { projectId: projectId.value, pageId: page.page_id } }) }
</script>

<style lang="scss" scoped>
.workbench-page {
  display: grid;
  gap: 16px;
}

.page-header,
.panel-title,
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  padding: 4px 2px;
}

.page-header span,
.panel-title span,
.overview-item span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.page-header h1 {
  margin: 6px 0;
  font-size: 24px;
}

.page-header p,
.page-card p,
.overview-item span,
.panel-title span {
  margin: 0;
  color: #6b7280;
}

.overview-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.overview-item,
.content-panel,
.page-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.overview-item {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.overview-item strong {
  overflow: hidden;
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.panel-title > div {
  display: grid;
  gap: 4px;
}

.page-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.page-card {
  display: grid;
  min-height: 168px;
  grid-template-rows: 1fr auto;
  gap: 18px;
  padding: 18px;
}

.page-card h2 {
  margin: 14px 0 4px;
  font-size: 17px;
}

.page-card p {
  font-size: 13px;
}

.card-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-panel {
    grid-template-columns: 1fr;
  }

  .card-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .card-actions :deep(.el-button) {
    margin-left: 0;
  }
}
</style>
