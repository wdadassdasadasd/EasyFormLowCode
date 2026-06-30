<template>
  <div class="chart-panel">
    <div class="chart-panel__header">
      <div>
        <strong>{{ chartData.title }}</strong>
        <span>{{ headerText }}</span>
      </div>
      <el-tag size="small" effect="plain">{{ chartData.type }}</el-tag>
    </div>

    <div v-if="chartData.type === 'metric'" class="metric-chart">
      <span>{{ metricDisplay }}</span>
      <small>当前统计结果</small>
    </div>

    <el-empty v-else-if="chartData.empty" description="暂无可统计数据" :image-size="64" />

    <v-chart v-else class="echart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ElEmpty, ElTag } from 'element-plus'
import { computed } from 'vue'
import VChart from 'vue-echarts'

import { aggregateChart, formatMetricValue } from '../utils/chartAggregator'

use([CanvasRenderer, PieChart, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps({
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

const chartData = computed(() => props.aggregate || aggregateChart(props.chart, props.records, props.fields))
const headerText = computed(() => {
  if (chartData.value.metric === 'count') {
    return '按记录数统计'
  }
  if (chartData.value.measureField) {
    return `${chartData.value.metric} / ${chartData.value.measureField}`
  }
  return chartData.value.metric || chartData.value.type
})
const metricDisplay = computed(() => formatMetricValue(chartData.value.value ?? 0, { precision: 0 }))
const chartOption = computed(() => {
  if (chartData.value.type === 'bar' || chartData.value.type === 'rankBar') {
    const horizontal = chartData.value.type === 'rankBar'
    return {
      color: ['#2563eb'],
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 24, bottom: 12, containLabel: true },
      xAxis: horizontal ? { type: 'value', minInterval: 1 } : { type: 'category', data: chartData.value.labels, axisTick: { show: false } },
      yAxis: horizontal ? { type: 'category', data: chartData.value.labels, axisTick: { show: false } } : { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'bar',
          data: chartData.value.values,
          barWidth: 22,
          itemStyle: { borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        },
      ],
    }
  }

  if (chartData.value.type === 'line' || chartData.value.type === 'area') {
    return {
      color: ['#0891b2'],
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 12, top: 24, bottom: 12, containLabel: true },
      xAxis: { type: 'category', data: chartData.value.labels, axisTick: { show: false } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'line',
          data: chartData.value.values,
          smooth: true,
          areaStyle: chartData.value.type === 'area' ? { opacity: 0.18 } : undefined,
          lineStyle: { width: 3 },
          symbolSize: 8,
        },
      ],
    }
  }

  return {
    color: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#0f766e', '#7c3aed'],
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
