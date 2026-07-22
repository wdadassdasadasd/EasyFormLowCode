<template>
  <div class="not-found">
    <ElResult icon="warning" title="404" sub-title="页面不存在或已被移除">
      <template #extra>
        <ElButton type="primary" @click="goHome">返回工作台</ElButton>
      </template>
    </ElResult>
  </div>
</template>

<script setup>
import { ElButton, ElResult } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push({ name: 'WorkBench' })
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 32px 16px;
}
</style>