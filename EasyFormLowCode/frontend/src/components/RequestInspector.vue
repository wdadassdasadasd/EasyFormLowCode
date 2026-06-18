<template>
  <section class="request-inspector">
    <div class="request-inspector__header">
      <strong>请求观察面板</strong>
      <span>{{ request ? `${request.method} ${request.status ?? '-'}` : '暂无请求' }}</span>
    </div>

    <el-empty v-if="!request" description="最近一次请求会显示在这里" :image-size="52" />

    <dl v-else class="request-inspector__body">
      <div>
        <dt>URL</dt>
        <dd>{{ request.url }}</dd>
      </div>
      <div>
        <dt>耗时</dt>
        <dd>{{ request.durationMs }} ms</dd>
      </div>
      <div>
        <dt>Params</dt>
        <dd>{{ formatJson(request.params) }}</dd>
      </div>
      <div>
        <dt>Body</dt>
        <dd>{{ formatJson(request.body) }}</dd>
      </div>
      <div>
        <dt>结果</dt>
        <dd>{{ request.error || 'OK' }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup>
import { ElEmpty } from 'element-plus'

defineProps({
  request: {
    type: Object,
    default: null,
  },
})

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
