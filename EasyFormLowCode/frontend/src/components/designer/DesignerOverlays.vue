<template>
  <div>
    <el-dialog :model-value="dialogVisible" :title="dialogTitle" width="560px" @update:model-value="emit('update:dialogVisible', $event)">
      <el-empty v-if="formFields.length === 0" description="暂无表单字段" :image-size="70" />
      <el-form v-else label-position="top" :model="dialogForm">
        <el-form-item
          v-for="field in formFields"
          :key="field.id"
          :label="field.label"
          :required="field.required"
          :error="formErrors[field.prop]"
          class="dialog-field-target"
          :class="{ active: selectedFieldId === field.id }"
          @click.stop="emit('select-field', field.id)"
        >
          <FieldControl
            :model-value="dialogForm[field.prop]"
            :field="field"
            mode="form"
            @update:model-value="emit('update-dialog-field', { prop: field.prop, value: $event })"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="emit('update:dialogVisible', false)">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="emit('submit-dialog')">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer :model-value="versionDrawerVisible" title="版本管理" size="420px" @open="emit('load-versions')" @update:model-value="emit('update:versionDrawerVisible', $event)">
      <div class="version-drawer">
        <el-empty v-if="versions.length === 0" description="暂无版本记录" />
        <div v-for="version in versions" v-else :key="version.id" class="version-item">
          <div>
            <strong>版本 {{ version.version_no }}</strong>
            <span>{{ version.message }}</span>
            <small>{{ formatDateTime(version.created_at) }}</small>
          </div>
          <div class="version-actions">
            <el-button size="small" @click="emit('select-version', version)">查看</el-button>
            <el-button :data-testid="`restore-version-${version.version_no}`" size="small" type="primary" plain @click="emit('restore-version', version)">回滚</el-button>
          </div>
        </div>

        <div v-if="selectedVersion" class="version-detail">
          <h3>{{ selectedVersion.schema_json.title }}</h3>
          <p>字段数：{{ selectedVersion.schema_json.fields?.length || 0 }}</p>
          <pre>{{ buildVersionSummary(selectedVersion.schema_json) }}</pre>
        </div>
      </div>
    </el-drawer>

    <el-dialog :model-value="exportDialogVisible" title="导出代码" width="520px" @update:model-value="emit('update:exportDialogVisible', $event)">
      <div class="export-dialog">
        <p>导出当前 PageSchema，以及基于统一字段注册表生成的 Vue 单文件组件。</p>
        <el-button type="primary" plain :icon="Document" @click="emit('download-schema')">下载 schema JSON</el-button>
        <el-button type="primary" plain :icon="Collection" @click="emit('download-template')">下载 template JSON</el-button>
        <el-button type="primary" :icon="Upload" @click="emit('download-vue-sfc')">下载 Vue SFC</el-button>
        <el-divider />
        <el-button plain :icon="FolderOpened" @click="triggerImport('schema')">导入 schema JSON</el-button>
        <el-button plain :icon="FolderOpened" @click="triggerImport('template')">导入 template JSON</el-button>
        <input ref="schemaInputRef" type="file" accept=".json,application/json" class="hidden-input" @change="handleFileChange('schema', $event)" />
        <input ref="templateInputRef" type="file" accept=".json,application/json" class="hidden-input" @change="handleFileChange('template', $event)" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { Collection, Document, FolderOpened, Upload } from '@element-plus/icons-vue'
import { ElButton, ElDialog, ElDivider, ElDrawer, ElEmpty, ElForm, ElFormItem } from 'element-plus'
import { ref } from 'vue'

import FieldControl from '../../renderer/FieldControl.vue'

defineProps({
  dialogForm: {
    type: Object,
    required: true,
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  dialogVisible: {
    type: Boolean,
    default: false,
  },
  exportDialogVisible: {
    type: Boolean,
    default: false,
  },
  formErrors: {
    type: Object,
    required: true,
  },
  formFields: {
    type: Array,
    default: () => [],
  },
  selectedFieldId: {
    type: String,
    default: '',
  },
  selectedVersion: {
    type: Object,
    default: null,
  },
  submitLoading: {
    type: Boolean,
    default: false,
  },
  versionDrawerVisible: {
    type: Boolean,
    default: false,
  },
  versions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'download-schema',
  'download-template',
  'download-vue-sfc',
  'import-schema',
  'import-template',
  'load-versions',
  'restore-version',
  'select-field',
  'select-version',
  'submit-dialog',
  'update-dialog-field',
  'update:dialogVisible',
  'update:exportDialogVisible',
  'update:versionDrawerVisible',
])

const schemaInputRef = ref(null)
const templateInputRef = ref(null)

function triggerImport(type) {
  if (type === 'template') {
    templateInputRef.value?.click()
    return
  }
  schemaInputRef.value?.click()
}

function handleFileChange(type, event) {
  const [file] = event?.target?.files || []
  if (!file) {
    return
  }
  emit(type === 'template' ? 'import-template' : 'import-schema', file)
  event.target.value = ''
}

function buildVersionSummary(schema) {
  return JSON.stringify(
    {
      title: schema.title,
      fields: schema.fields?.map((field) => ({
        label: field.label,
        prop: field.prop,
        type: field.type,
      })),
      charts: schema.charts || [],
      metrics: schema.metrics || [],
    },
    null,
    2,
  )
}

function formatDateTime(value) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}
</script>

<style scoped>
.dialog-field-target.active {
  color: #2563eb;
}

.version-drawer {
  display: grid;
  gap: 12px;
}

.version-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.version-item strong,
.version-item span,
.version-item small {
  display: block;
}

.version-item span,
.version-item small {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-detail pre {
  padding: 12px;
  overflow: auto;
  background: #f9fafb;
  border-radius: 6px;
}

.export-dialog {
  display: grid;
  gap: 12px;
}

.export-dialog p {
  margin: 0;
  color: #6b7280;
}

.hidden-input {
  display: none;
}
</style>
