<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { RollingExcessPoint } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  excess12M: RollingExcessPoint[]
  excess36M: RollingExcessPoint[]
  excess60M: RollingExcessPoint[]
}>()

function toPairs(points: RollingExcessPoint[]): [string, number][] {
  return points.map((p) => [p.date, p.value * 100])
}

const chartOption = computed(() => {
  const p = palette.value
  const windows = [
    { label: '1Y', color: p.primary, points: props.excess12M },
    { label: '3Y', color: p.gain, points: props.excess36M },
    { label: '5Y', color: p.secondary, points: props.excess60M }
  ]
  const series: NonNullable<EChartsOption['series']> = windows.map((w) => ({
    name: w.label,
    type: 'line',
    showSymbol: false,
    smooth: false,
    data: toPairs(w.points),
    lineStyle: { width: 1.5, color: w.color },
    itemStyle: { color: w.color }
  }))
  // Zero reference line attached to the first series — always rendered; legend
  // can toggle series visibility independently.
  const first = series[0] as { markLine?: unknown }
  first.markLine = {
    silent: true,
    symbol: 'none',
    lineStyle: { color: p.text3, type: 'solid', opacity: 0.9 },
    data: [{ yAxis: 0 }],
    label: { show: false }
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      valueFormatter: (v: unknown) =>
        typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : String(v)
    },
    legend: {
      show: true,
      top: 0,
      textStyle: { color: p.text2 },
      icon: 'roundRect',
      selectedMode: true
    },
    grid: { left: 56, right: 16, top: 32, bottom: 36 },
    xAxis: {
      type: 'time',
      axisLabel: { color: p.text3 },
      axisLine: { lineStyle: { color: p.border } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: p.text3, formatter: '{value}%' },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } }
    },
    series
  }
  return option
})
</script>

<template>
  <VChart class="rex-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.rex-chart {
  width: 100%;
  height: 340px;
}
</style>
