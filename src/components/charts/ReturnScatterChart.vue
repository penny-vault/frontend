<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { Regression, ScatterPoint } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  scatter: ScatterPoint[]
  regression: Regression
}>()

// Axis range in percentage space (e.g. 8 means 8%), rounded up to the next
// whole percent so axis labels read "8%" instead of "7.060188%".
const axisRange = computed(() => {
  if (props.scatter.length === 0) return { min: -10, max: 10 }
  let maxAbs = 0
  for (const p of props.scatter) {
    maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y))
  }
  const bound = Math.max(1, Math.ceil(maxAbs * 100 * 1.1))
  return { min: -bound, max: bound }
})

const regressionLine = computed(() => {
  const { min, max } = axisRange.value
  const { beta, alpha } = props.regression
  // alpha is a decimal monthly return, beta is dimensionless.
  // Axis is in percent, so: y_pct = (alpha + beta * x_pct/100) * 100
  //                              = alpha * 100 + beta * x_pct
  const aPct = alpha * 100
  return [
    [min, aPct + beta * min],
    [max, aPct + beta * max]
  ]
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const pt = params as { value: [number, number] }
        return `benchmark ${pt.value[0].toFixed(2)}% → portfolio ${pt.value[1].toFixed(2)}%`
      }
    },
    grid: { left: 56, right: 16, top: 16, bottom: 44 },
    xAxis: {
      type: 'value',
      min: axisRange.value.min,
      max: axisRange.value.max,
      axisLabel: { color: p.text3, formatter: '{value}%' },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } },
      name: 'benchmark monthly',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: axisRange.value.min,
      max: axisRange.value.max,
      axisLabel: { color: p.text3, formatter: '{value}%' },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } },
      name: 'portfolio monthly',
      nameLocation: 'middle',
      nameGap: 42,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    series: [
      {
        type: 'scatter',
        data: props.scatter.map((pt) => [pt.x * 100, pt.y * 100]),
        symbolSize: 7,
        itemStyle: { color: p.primary }
      },
      {
        type: 'line',
        data: regressionLine.value,
        showSymbol: false,
        lineStyle: { color: p.secondary, width: 2 },
        silent: true,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: p.text4, type: 'dashed', opacity: 0.55 },
          data: [
            [
              { coord: [axisRange.value.min, axisRange.value.min] },
              { coord: [axisRange.value.max, axisRange.value.max] }
            ]
          ]
        }
      }
    ]
  }
})
</script>

<template>
  <div class="rsc">
    <div class="rsc-beta">
      β = {{ regression.beta.toFixed(2) }} · α = {{ (regression.alpha * 100).toFixed(2) }}% · r² =
      {{ regression.r2.toFixed(2) }}
    </div>
    <VChart class="rsc-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.rsc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rsc-beta {
  font-size: 12px;
  color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.rsc-chart {
  width: 100%;
  height: 280px;
}
</style>
