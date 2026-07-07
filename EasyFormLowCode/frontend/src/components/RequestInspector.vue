<template>
  <section class="request-inspector">
    <div class="request-inspector__header">
      <strong>请求观察面板</strong>
      <span>{{ latestRequest ? `${latestRequest.method} ${latestRequest.status ?? '-'}` : '暂无请求' }}</span>
    </div>

    <el-empty v-if="!latestRequest" description="请求记录会显示在这里" :image-size="52" />

    <el-table v-else-if="normalizedRequests.length > 1" :data="normalizedRequests" size="small" max-height="260">
      <el-table-column prop="method" label="方法" width="76" />
      <el-table-column label="状态" width="68"><template #default="{ row }">{{ row.status ?? '-' }}</template></el-table-column>
      <el-table-column label="耗时" width="80"><template #default="{ row }">{{ row.durationMs }} ms</template></el-table-column>
      <el-table-column prop="url" label="请求地址" min-width="220" show-overflow-tooltip />
      <el-table-column label="失败原因" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.failureReason || '-' }}</template></el-table-column>
      <el-table-column label="响应摘要" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.responseSummary || 'OK' }}</template></el-table-column>
    </el-table>

    <dl v-else class="request-inspector__body">
      <div>
        <dt>URL</dt>
        <dd>{{ latestRequest.url }}</dd>
      </div>
      <div>
        <dt>请求类型</dt>
        <dd>{{ latestRequest.requestType || '-' }}</dd>
      </div>
      <div>
        <dt>耗时</dt>
        <dd>{{ latestRequest.durationMs }} ms</dd>
      </div>
      <div>
        <dt>Params</dt>
        <dd>{{ formatJson(latestRequest.params) }}</dd>
      </div>
      <div>
        <dt>Body</dt>
        <dd>{{ formatJson(latestRequest.body) }}</dd>
      </div>
      <div>
        <dt>响应摘要</dt>
        <dd>{{ latestRequest.responseSummary || 'OK' }}</dd>
      </div>
      <div>
        <dt>失败原因</dt>
        <dd>{{ latestRequest.failureReason || '-' }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup>
import { ElEmpty } from 'element-plus'
import { computed } from 'vue'

const props = defineProps({
  request: {
    type: Object,
    default: null,
  },
  requests: {
    type: Array,
    default: () => [],
  },
})

const normalizedRequests = computed(() => (props.requests.length ? props.requests : props.request ? [props.request] : []))
const latestRequest = computed(() => normalizedRequests.value[0] || null)

function formatJson(value) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  return JSON.stringify(value, null, 2)
}
</script>

<style scoped>
.request-inspector {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.request-inspector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.request-inspector__header strong,
.request-inspector__header span {
  display: block;
}

.request-inspector__header strong {
  color: #111827;
  font-size: 14px;
}

.request-inspector__header span,
.request-inspector__body dt {
  color: #6b7280;
  font-size: 12px;
}

.request-inspector__body {
  display: grid;
  gap: 10px;
  margin: 0;
}

.request-inspector__body div {
  min-width: 0;
}

.request-inspector__body dd {
  margin: 4px 0 0;
  padding: 10px;
  overflow: auto;
  color: #111827;
  font-size: 12px;
  white-space: pre-wrap;
  background: #f9fafb;
  border-radius: 4px;
}
</style>
