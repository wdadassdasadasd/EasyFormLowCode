<template>
  <section class="entity-page">
    <header class="page-header">
      <div>
        <span>Data Models</span>
        <h1>数据模型</h1>
        <p>先定义业务实体与关联，再一键生成可运行的后台管理页面。</p>
      </div>
      <el-button type="primary" @click="entityDialogVisible = true">新建实体</el-button>
    </header>

    <el-alert v-if="errorMessage" type="warning" :title="errorMessage" show-icon :closable="false" />

    <section class="overview-panel">
      <div class="overview-item">
        <span>实体数量</span>
        <strong>{{ entities.length }}</strong>
      </div>
      <div class="overview-item">
        <span>当前实体</span>
        <strong>{{ selectedEntity?.name || '-' }}</strong>
      </div>
      <div class="overview-item">
        <span>字段数量</span>
        <strong>{{ selectedFieldCount }}</strong>
      </div>
    </section>

    <div class="entity-layout">
      <section class="panel entity-list">
        <div class="panel-title">
          <div>
            <strong>实体</strong>
            <span>{{ entities.length }} 个实体</span>
          </div>
        </div>

        <el-empty v-if="!loading && !entities.length" description="还没有数据实体" :image-size="64" />
        <el-skeleton v-else-if="loading" :rows="4" animated />

        <button
          v-for="entity in entities"
          :key="entity.id"
          class="entity-item"
          :class="{ active: entity.id === selectedEntityId }"
          @click="selectEntity(entity.id)"
        >
          <strong>{{ entity.name }}</strong>
          <small>{{ entity.entity_key }}</small>
        </button>
      </section>

      <section class="panel entity-detail">
        <el-empty v-if="!selectedEntity" description="选择一个实体查看字段和关系" :image-size="72" />

        <template v-else>
          <div class="detail-header">
            <div>
              <span>Entity</span>
              <h2>{{ selectedEntity.name }}</h2>
              <p>{{ selectedEntity.description || selectedEntity.entity_key }}</p>
            </div>

            <div class="detail-actions">
              <el-button plain @click="fieldDialogVisible = true">新增字段</el-button>
              <el-button type="primary" @click="pageDialogVisible = true">生成后台页面</el-button>
            </div>
          </div>

          <el-table :data="selectedEntity.fields" empty-text="尚未定义字段" border>
            <el-table-column prop="label" label="字段名称" min-width="150" />
            <el-table-column prop="field_key" label="字段标识" min-width="140" />
            <el-table-column prop="field_type" label="类型" width="110" />
            <el-table-column label="约束" width="180">
              <template #default="{ row }">
                <el-tag v-if="row.required" size="small" type="danger">必填</el-tag>
                <el-tag v-if="row.relation" size="small" class="relation-tag">关联</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关联目标" min-width="160">
              <template #default="{ row }">{{ relationLabel(row) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="danger" @click="removeField(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </section>
    </div>

    <el-dialog v-model="entityDialogVisible" title="新建实体" width="440px">
      <el-form label-position="top">
        <el-form-item label="实体名称" required>
          <el-input v-model="entityForm.name" placeholder="例如：供应商" />
        </el-form-item>
        <el-form-item label="实体标识" required>
          <el-input v-model="entityForm.entity_key" placeholder="例如：supplier" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="entityForm.description" type="textarea" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="entityDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEntity">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="fieldDialogVisible" title="新增字段" width="520px">
      <el-form label-position="top">
        <el-form-item label="字段名称" required>
          <el-input v-model="fieldForm.label" placeholder="例如：供应商名称" />
        </el-form-item>
        <el-form-item label="字段标识" required>
          <el-input v-model="fieldForm.field_key" placeholder="例如：supplier_name" />
        </el-form-item>
        <el-form-item label="字段类型">
          <el-select v-model="fieldForm.field_type">
            <el-option v-for="item in fieldTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="fieldForm.required">必填</el-checkbox>
        </el-form-item>

        <template v-if="fieldForm.field_type === 'relation'">
          <el-form-item label="关联实体" required>
            <el-select v-model="relationForm.target_entity_id" @change="loadTargetFields">
              <el-option v-for="entity in selectableTargets" :key="entity.id" :label="entity.name" :value="entity.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联展示字段" required>
            <el-select v-model="relationForm.target_display_field_key">
              <el-option v-for="field in targetFields" :key="field.id" :label="field.label" :value="field.field_key" />
            </el-select>
          </el-form-item>
        </template>

        <el-form-item v-if="fieldForm.field_type === 'enum'" label="枚举选项">
          <el-input v-model="fieldForm.optionText" placeholder="例如：enabled:启用,disabled:停用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="fieldDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitField">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pageDialogVisible" title="从实体生成后台页面" width="480px">
      <el-form label-position="top">
        <el-form-item label="页面名称" required>
          <el-input v-model="pageForm.name" />
        </el-form-item>
        <el-form-item label="页面标识" required>
          <el-input v-model="pageForm.page_id" />
        </el-form-item>
        <el-form-item label="页面模板">
          <el-select v-model="pageForm.template_key">
            <el-option label="标准 CRUD" value="standard_crud" />
            <el-option label="主数据管理" value="master_data" />
            <el-option label="运营看板 + CRUD" value="operations_dashboard" />
          </el-select>
        </el-form-item>
        <el-form-item label="本地 template JSON（可选）">
          <div class="template-upload">
            <el-button plain @click="pageTemplateInput?.click()">选择文件</el-button>
            <span>{{ pageTemplateFileName || '未选择文件' }}</span>
            <input ref="pageTemplateInput" type="file" accept=".json,application/json" class="hidden-input" @change="handleTemplateFileChange" />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="pageDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="generatePage">生成并设计</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { createEntity, createEntityField, createEntityRelation, deleteEntityField, getEntity, listProjectEntities } from '../api/entities'
import { getPage, savePageSchema } from '../api/pages'
import { parseImportedSchema } from '../utils/codeExporter'

const catalog = inject('projectCatalog')
const route = useRoute()
const router = useRouter()
const entities = ref([])
const selectedEntity = ref(null)
const selectedEntityId = ref(null)
const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const entityDialogVisible = ref(false)
const fieldDialogVisible = ref(false)
const pageDialogVisible = ref(false)
const entityForm = reactive({ name: '', entity_key: '', description: '' })
const fieldForm = reactive({ label: '', field_key: '', field_type: 'text', required: false, optionText: '' })
const relationForm = reactive({ target_entity_id: null, target_display_field_key: '' })
const pageForm = reactive({ name: '', page_id: '', template_key: 'standard_crud' })
const targetFields = ref([])
const pageTemplateInput = ref(null)
const pageTemplateFileName = ref('')
const importedTemplateText = ref('')

const fieldTypes = [
  { label: '文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '整数', value: 'integer' },
  { label: '数字', value: 'number' },
  { label: '布尔开关', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'datetime' },
  { label: '枚举', value: 'enum' },
  { label: '多对一关联', value: 'relation' },
]

const projectId = computed(() => Number(route.query.projectId) || catalog.activeProjectId.value)
const selectableTargets = computed(() => entities.value.filter((entity) => entity.id !== selectedEntityId.value))
const selectedFieldCount = computed(() => selectedEntity.value?.fields?.length || 0)

onMounted(loadEntities)
watch(projectId, loadEntities)
watch(
  () => fieldForm.field_type,
  (type) => {
    if (type !== 'relation') {
      relationForm.target_entity_id = null
      relationForm.target_display_field_key = ''
      targetFields.value = []
    }
  },
)

async function loadEntities() {
  if (!projectId.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    entities.value = await listProjectEntities(projectId.value)
    const nextId = entities.value.some((entity) => entity.id === selectedEntityId.value) ? selectedEntityId.value : entities.value[0]?.id
    if (nextId) {
      await selectEntity(nextId)
    } else {
      selectedEntityId.value = null
      selectedEntity.value = null
    }
  } catch (error) {
    errorMessage.value = error?.message || '数据模型加载失败'
  } finally {
    loading.value = false
  }
}

async function selectEntity(entityId) {
  selectedEntityId.value = entityId
  try {
    selectedEntity.value = await getEntity(entityId)
  } catch (error) {
    errorMessage.value = error?.message || '实体详情加载失败'
  }
}

function resetEntityForm() {
  Object.assign(entityForm, { name: '', entity_key: '', description: '' })
}

function resetFieldForm() {
  Object.assign(fieldForm, { label: '', field_key: '', field_type: 'text', required: false, optionText: '' })
  Object.assign(relationForm, { target_entity_id: null, target_display_field_key: '' })
  targetFields.value = []
}

async function submitEntity() {
  submitting.value = true
  try {
    const entity = await createEntity(projectId.value, entityForm)
    entityDialogVisible.value = false
    resetEntityForm()
    await loadEntities()
    await selectEntity(entity.id)
    ElMessage.success('实体已创建')
  } catch (error) {
    ElMessage.error(error?.message || '实体创建失败')
  } finally {
    submitting.value = false
  }
}

async function loadTargetFields() {
  relationForm.target_display_field_key = ''
  const entity = await getEntity(relationForm.target_entity_id)
  targetFields.value = entity.fields.filter((field) => field.field_type !== 'relation')
}

function parseOptions() {
  return fieldForm.optionText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [value, label] = item.split(':')
      return {
        value: value?.trim(),
        label: (label || value)?.trim(),
      }
    })
}

async function submitField() {
  if (!selectedEntity.value) return
  submitting.value = true
  try {
    const field = await createEntityField(selectedEntity.value.id, {
      ...fieldForm,
      options: fieldForm.field_type === 'enum' ? parseOptions() : [],
    })
    if (fieldForm.field_type === 'relation') {
      await createEntityRelation(selectedEntity.value.id, {
        source_field_id: field.id,
        ...relationForm,
      })
    }
    fieldDialogVisible.value = false
    resetFieldForm()
    await selectEntity(selectedEntity.value.id)
    ElMessage.success('字段已添加')
  } catch (error) {
    ElMessage.error(error?.message || '字段创建失败')
  } finally {
    submitting.value = false
  }
}

async function removeField(field) {
  try {
    await ElMessageBox.confirm(`删除字段“${field.label}”后不可恢复，是否继续？`, '删除字段', { type: 'warning' })
    await deleteEntityField(selectedEntity.value.id, field.id)
    await selectEntity(selectedEntity.value.id)
    ElMessage.success('字段已删除')
  } catch (error) {
    if (!['cancel', 'close'].includes(error)) {
      ElMessage.error(error?.message || '字段删除失败')
    }
  }
}

function relationLabel(field) {
  const target = entities.value.find((entity) => entity.id === field.relation?.target_entity_id)
  return target ? `${target.name} / ${field.relation.target_display_field_key}` : '-'
}

function handleTemplateFileChange(event) {
  const [file] = event?.target?.files || []
  if (!file) {
    return
  }
  pageTemplateFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    importedTemplateText.value = String(reader.result || '')
  }
  reader.onerror = () => {
    importedTemplateText.value = ''
    pageTemplateFileName.value = ''
    ElMessage.error('Template 文件读取失败')
  }
  reader.readAsText(file, 'utf-8')
  event.target.value = ''
}

async function applyImportedTemplate(page) {
  if (!importedTemplateText.value) {
    return
  }
  const pageDetail = await getPage(page.page_id)
  const currentSchema = pageDetail.schema_json
  const importedTemplate = parseImportedSchema(importedTemplateText.value, page.page_id)
  const mergedSchema = {
    ...currentSchema,
    actions: importedTemplate.actions || currentSchema.actions,
    metrics: importedTemplate.metrics || currentSchema.metrics,
    charts: importedTemplate.charts || currentSchema.charts,
    queries: importedTemplate.queries || [],
    rowActions: importedTemplate.rowActions || [],
    batchActions: importedTemplate.batchActions || [],
    templateKey: importedTemplate.templateKey || currentSchema.templateKey,
    fields: currentSchema.fields.map((field) => {
      const matched = (importedTemplate.fields || []).find((templateField) => {
        if (field.entityFieldId && templateField.entityFieldId) {
          return field.entityFieldId === templateField.entityFieldId
        }
        return templateField.prop === field.prop
      })
      return matched
        ? {
            ...field,
            ...matched,
            id: field.id,
            prop: field.prop,
            entityFieldId: field.entityFieldId,
          }
        : field
    }),
    datasource: currentSchema.datasource,
    api: currentSchema.datasource,
    entity: currentSchema.entity,
    id: currentSchema.id,
    title: currentSchema.title,
  }
  await savePageSchema(page.page_id, {
    name: page.name,
    schema_json: mergedSchema,
  })
}

async function generatePage() {
  if (!selectedEntity.value) return
  submitting.value = true
  try {
    const page = await catalog.addPage(projectId.value, {
      ...pageForm,
      entity_id: selectedEntity.value.id,
    })
    await applyImportedTemplate(page)
    pageDialogVisible.value = false
    router.push({ path: '/pagedesigner', query: { projectId: projectId.value, pageId: page.page_id } })
    ElMessage.success('后台页面已生成')
  } catch (error) {
    ElMessage.error(error?.message || '页面生成失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.entity-page {
  display: grid;
  gap: 16px;
}

.page-header,
.detail-header,
.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  padding: 4px 2px;
}

.page-header span,
.detail-header span,
.panel-title span {
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.page-header h1,
.detail-header h2 {
  margin: 6px 0;
}

.page-header h1 {
  font-size: 24px;
}

.page-header p,
.detail-header p {
  margin: 0;
  color: #6b7280;
}

.overview-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.overview-item span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.overview-item strong {
  overflow: hidden;
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 2fr);
  gap: 16px;
}

.panel {
  min-width: 0;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.entity-list {
  display: grid;
  align-content: start;
  gap: 8px;
}

.entity-item {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 12px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.entity-item:hover,
.entity-item.active {
  color: #1d4ed8;
  background: #eef4ff;
  border-color: #bfdbfe;
}

.entity-item small {
  color: #8c8c8c;
}

.detail-header {
  margin-bottom: 18px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relation-tag {
  margin-left: 5px;
}

.template-upload {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.template-upload span {
  color: #6b7280;
  font-size: 12px;
}

.hidden-input {
  display: none;
}

@media (max-width: 760px) {
  .page-header,
  .detail-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-panel,
  .entity-layout {
    grid-template-columns: 1fr;
  }

  .entity-detail {
    overflow-x: auto;
  }
}
</style>
