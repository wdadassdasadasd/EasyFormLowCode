<template>
  <div class="chart-panel">
    <div class="chart-panel__header">
      <div>
        <strong>{{ chartData.title }}</strong>
        <span>{{ chartData.metric === 'count' ? '按数量统计' : chartData.metric }}</span>
      </div>
      <el-tag size="small" effect="plain">{{ chartData.type }}</el-tag>
    </div>

    <div v-if="chartData.type === 'metric'" class="metric-chart">
      <span>{{ chartData.value }}</span>
      <small>当前记录</small>
    </div>

    <el-empty v-else-if="chartData.empty" description="暂无可统计数据" :image-size="64" />

    <v-chart v-else class="echart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ElEmpty, ElTag } from 'element-plus'
import { computed } from 'vue'
import VChart from 'vue-echarts'

import { aggregateChart } from '../utils/chartAggregator'

use([CanvasRenderer, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps({
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

const chartData = computed(() => aggregateChart(props.chart, props.records, props.fields))
const chartOption = computed(() => {
  if (chartData.value.type === 'bar') {
    return {
      color: ['#2563eb'],
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 8, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: chartData.value.labels, axisTick: { show: false } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{ type: 'bar', data: chartData.value.values, barWidth: 24, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    }
  }

  return {
    color: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        data: chartData.value.labels.map((label, index) => ({
          name: label,
          value: chartData.value.values[index],
        })),
      },
    ],
  }
})
</script>

<style scoped>
.chart-panel {
  min-width: 0;
  height: 260px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.chart-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.chart-panel__header strong,
.chart-panel__header span {
  display: block;
}

.chart-panel__header strong {
  color: #111827;
  font-size: 14px;
}

.chart-panel__header span {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}

.echart {
  width: 100%;
  height: 198px;
}

.metric-chart {
  display: grid;
  height: 188px;
  place-content: center;
  text-align: center;
}

.metric-chart span {
  color: #111827;
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
}

.metric-chart small {
  margin-top: 8px;
  color: #6b7280;
}
</style>
