<template>
  <section class="workbench-page">
    <header><span>Workspace</span><h1>{{ activeProject?.name || '工作台' }}</h1><p>从项目选择一个页面，继续配置、发布或查看运行态效果。</p></header>
    <el-skeleton v-if="catalogLoading" :rows="4" animated />
    <el-empty v-else-if="pages.length === 0" description="当前项目还没有页面"><el-button type="primary" @click="goManage">去创建页面</el-button></el-empty>
    <div v-else class="page-grid">
      <article v-for="page in pages" :key="page.page_id" class="page-card">
        <div><el-tag :type="page.has_published ? 'success' : 'warning'">{{ page.has_published ? '已发布' : '草稿' }}</el-tag><h2>{{ page.name }}</h2><p>{{ page.page_id }}</p></div>
        <div class="card-actions"><el-button plain @click="goDesigner(page)">配置页面</el-button><el-button type="primary" @click="goPreview(page)">运行预览</el-button></div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { activeProject, catalogLoading, pages } = inject('projectCatalog')
const route = useRoute()
const router = useRouter()
const projectId = computed(() => Number(route.query.projectId) || activeProject.value?.id)

function goManage() { router.push({ path: '/appmanage', query: { projectId: projectId.value } }) }
function goDesigner(page) { router.push({ path: '/pagedesigner', query: { projectId: projectId.value, pageId: page.page_id } }) }
function goPreview(page) { router.push({ path: '/preview', query: { projectId: projectId.value, pageId: page.page_id } }) }
</script>

<style lang="scss" scoped>
.workbench-page { display: grid; gap: 20px; }.workbench-page header { padding: 12px 4px; }.workbench-page span { color: #2563eb; font-size: 12px; font-weight: 700; }.workbench-page h1 { margin: 6px 0; }.workbench-page p { margin: 0; color: #6b7280; }.page-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }.page-card { display: grid; min-height: 170px; grid-template-rows: 1fr auto; gap: 16px; padding: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }.page-card h2 { margin: 12px 0 4px; font-size: 17px; }.page-card p { font-size: 13px; }.card-actions { display: flex; gap: 8px; }
</style>
