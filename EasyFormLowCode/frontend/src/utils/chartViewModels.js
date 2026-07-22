import { buildDefaultCharts } from './chartAggregator'

// 把 schema.charts 与运行态聚合结果按 id 关联成可渲染视图模型。
// 设计器与运行态预览共用：若 schema.charts 为空则回退为按字段派生的默认图表，
// 并将 aggregate（服务端聚合结果）按 id 合并进去。融媒体化时同样在导出件与
// 单元测试中复用，避免两个 view 出现两份手抄实现。
export function buildChartViewModels(schema, aggregates = []) {
  const configured = schema.charts?.length ? schema.charts : buildDefaultCharts(schema.fields)
  const aggregateById = new Map((aggregates || []).map((chart) => [chart.id, chart]))
  return configured.map((chart) => ({
    ...chart,
    aggregate: aggregateById.get(chart.id) || null,
  }))
}