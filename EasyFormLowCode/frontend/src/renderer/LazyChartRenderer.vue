<template>
  <div ref="root" class="lazy-chart-renderer">
    <Suspense v-if="visible">
      <AsyncChartRenderer :chart="chart" :aggregate="aggregate" :records="records" :fields="fields" />
      <template #fallback>
        <div class="chart-skeleton" aria-label="Loading chart" />
      </template>
    </Suspense>
    <div v-else class="chart-skeleton" aria-label="Chart loads when visible" />
  </div>
</template>

<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'

const AsyncChartRenderer = defineAsyncComponent(() => import('./ChartRenderer.vue'))

defineProps({
  aggregate: {
    type: Object,
    default: null,
  },
  chart: {
    type: Object,
    required: true,
  },
  records: {
    type: Array,
    default: () => [],
  },
  fields: {
    type: Array,
    default: () => [],
  },
})

const root = ref(null)
const visible = ref(false)
let observer = null

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    visible.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    visible.value = true
    observer?.disconnect()
    observer = null
  }, { rootMargin: '240px 0px' })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.lazy-chart-renderer,
.chart-skeleton {
  min-height: 210px;
}

.chart-skeleton {
  border-radius: 12px;
  background: linear-gradient(100deg, #f2f5f9 25%, #fafbfd 37%, #f2f5f9 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
