<template>
  <section class="manage-page">
    <header class="page-header">
      <div><span>Projects</span><h1>项目与页面</h1><p>每个页面从可运行的后台 CRUD 模板开始，再进入设计器配置。</p></div>
      <el-button type="primary" @click="openProjectDialog">新建项目</el-button>
    </header>

    <el-alert v-if="catalogError" type="warning" :title="catalogError" show-icon :closable="false" />
    <div class="manage-grid">
      <section class="panel project-panel">
        <div class="panel-title"><strong>项目</strong><span>{{ projects.length }}</span></div>
        <el-empty v-if="!catalogLoading && projects.length === 0" description="暂无项目" :image-size="64" />
        <el-skeleton v-else-if="catalogLoading" :rows="4" animated />
        <button v-for="project in projects" v-else :key="project.id" class="project-item" :class="{ active: project.id === selectedProjectId }" @click="selectProject(project.id)">
          <span class="project-name">{{ project.name }}</span><small>{{ project.page_count }} 个页面</small>
          <el-button link type="primary" @click.stop="openProjectDialog(project)">重命名</el-button>
        </button>
      </section>

      <section class="panel page-panel">
        <div class="panel-title">
          <div><strong>{{ activeProject?.name || '选择项目' }}</strong><span>页面</span></div>
          <el-button :disabled="!activeProject" type="primary" plain @click="openPageDialog">新建页面</el-button>
        </div>
        <el-empty v-if="activeProject && pages.length === 0" description="新建一个页面，开始配置后台 CRUD" />
        <el-table v-else :data="pages" size="default">
          <el-table-column prop="name" label="页面名称" min-width="180" />
          <el-table-column prop="page_id" label="页面标识" min-width="150" />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.has_published ? 'success' : 'warning'">{{ row.has_published ? '已发布' : '草稿' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="210"><template #default="{ row }"><el-button link type="primary" @click="designPage(row)">设计</el-button><el-button link @click="openPageDialog(row)">重命名</el-button><el-button link type="danger" @click="removePage(row)">删除</el-button></template></el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="projectDialogVisible" :title="editingProject ? '重命名项目' : '新建项目'" width="420px">
      <el-form label-position="top" @submit.prevent="submitProject"><el-form-item label="项目名称" required><el-input v-model="projectForm.name" maxlength="120" show-word-limit /></el-form-item></el-form>
      <template #footer><el-button @click="projectDialogVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitProject">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="pageDialogVisible" :title="editingPage ? '重命名页面' : '新建后台 CRUD 页面'" width="460px">
      <el-form label-position="top" @submit.prevent="submitPage"><el-form-item label="页面名称" required><el-input v-model="pageForm.name" maxlength="120" /></el-form-item><el-form-item v-if="!editingPage" label="页面标识" required><el-input v-model="pageForm.pageId" placeholder="例如 user_manage" /><small>仅支持英文字母开头、数字、下划线和连字符。</small></el-form-item></el-form>
      <template #footer><el-button @click="pageDialogVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitPage">创建并配置</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, inject, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const catalog = inject('projectCatalog')
const route = useRoute()
const router = useRouter()
const { activeProject, catalogError, catalogLoading, pages, projects } = catalog
const selectedProjectId = computed(() => Number(route.query.projectId) || activeProject.value?.id)
const projectDialogVisible = ref(false)
const pageDialogVisible = ref(false)
const editingProject = ref(null)
const editingPage = ref(null)
const submitting = ref(false)
const projectForm = reactive({ name: '' })
const pageForm = reactive({ name: '', pageId: '' })

function selectProject(projectId) {
  router.push({ path: route.path, query: { projectId } })
}

function openProjectDialog(project = null) {
  editingProject.value = project
  projectForm.name = project?.name || ''
  projectDialogVisible.value = true
}

function openPageDialog(page = null) {
  editingPage.value = page
  pageForm.name = page?.name || ''
  pageForm.pageId = page?.page_id || ''
  pageDialogVisible.value = true
}

async function submitProject() {
  if (!projectForm.name.trim()) return ElMessage.warning('请输入项目名称')
  submitting.value = true
  try {
    const project = editingProject.value
      ? await catalog.renameProject(editingProject.value.id, projectForm.name)
      : await catalog.addProject(projectForm.name)
    projectDialogVisible.value = false
    selectProject(project.id)
    ElMessage.success(editingProject.value ? '项目已重命名' : '项目已创建')
  } catch (error) { ElMessage.error(error?.message || '项目保存失败') } finally { submitting.value = false }
}

async function submitPage() {
  if (!pageForm.name.trim()) return ElMessage.warning('请输入页面名称')
  if (!editingPage.value && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(pageForm.pageId)) return ElMessage.warning('请输入有效的页面标识')
  submitting.value = true
  try {
    const page = editingPage.value
      ? await catalog.renamePage(editingPage.value.page_id, pageForm.name)
      : await catalog.addPage(selectedProjectId.value, { name: pageForm.name, page_id: pageForm.pageId })
    pageDialogVisible.value = false
    ElMessage.success(editingPage.value ? '页面已重命名' : '页面已创建')
    if (!editingPage.value) designPage(page)
  } catch (error) { ElMessage.error(error?.message || '页面保存失败') } finally { submitting.value = false }
}

async function removePage(page) {
  await ElMessageBox.confirm(`删除“${page.name}”会同时删除其版本和运行数据，是否继续？`, '删除页面', { type: 'warning' })
  try { await catalog.removePage(page.page_id); ElMessage.success('页面已删除') } catch (error) { ElMessage.error(error?.message || '页面删除失败') }
}

function designPage(page) {
  router.push({ path: '/pagedesigner', query: { projectId: selectedProjectId.value, pageId: page.page_id } })
}
</script>

<style lang="scss" scoped>
.manage-page { display: grid; gap: 16px; }.page-header, .panel-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.page-header { padding: 12px 4px; }.page-header span, .panel-title span { color: #2563eb; font-size: 12px; font-weight: 700; }.page-header h1 { margin: 6px 0; }.page-header p { margin: 0; color: #6b7280; }.manage-grid { display: grid; grid-template-columns: minmax(220px, .8fr) minmax(0, 2fr); gap: 16px; }.panel { min-width: 0; padding: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }.project-panel { display: grid; align-content: start; gap: 8px; }.project-item { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; width: 100%; padding: 12px; text-align: left; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; }.project-item:hover, .project-item.active { background: #eff6ff; border-color: #bfdbfe; }.project-name { font-weight: 700; }.project-item small { color: #6b7280; }.project-item .el-button { grid-column: 2; grid-row: 1 / span 2; }.panel-title { margin-bottom: 14px; }.panel-title > div { display: grid; gap: 3px; } small { color: #6b7280; } @media (max-width: 760px) { .page-header { align-items: flex-start; flex-direction: column; }.manage-grid { grid-template-columns: 1fr; }.page-panel :deep(.el-table) { overflow-x: auto; } }
</style>
