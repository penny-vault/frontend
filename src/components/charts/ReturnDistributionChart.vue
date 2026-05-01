<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { MonthlyReturn } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  monthly: MonthlyReturn[]
}>()

const BIN_COUNT = 24

function binSeries(values: number[], min: number, binWidth: number): number[] {
  const bins = new Array<number>(BIN_COUNT).fill(0)
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth)
    if (idx < 0) idx = 0
    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1
    bins[idx] = (bins[idx] ?? 0) + 1
  }
  return bins
}

const binned = computed(() => {
  const portfolio = props.monthly.map((m) => m.portfolio)
  const benchmark = props.monthly.map((m) => m.benchmark)
  const all = [...portfolio, ...benchmark]
  if (all.length === 0) return { labels: [], p: [], b: [] }
  const min = Math.min(...all)
  const max = Math.max(...all)
  const binWidth = (max - min) / BIN_COUNT
  const labels = Array.from({ length: BIN_COUNT }, (_, i) =>
    ((min + i * binWidth + binWidth / 2) * 100).toFixed(1)
  )
  return {
    labels,
    p: binSeries(portfolio, min, binWidth),
    b: binSeries(benchmark, min, binWidth)
  }
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 }
    },
    legend: { show: true, top: 0, textStyle: { color: p.text2 } },
    grid: { left: 44, right: 16, top: 36, bottom: 40 },
    xAxis: {
      type: 'category',
      data: binned.value.labels,
      axisLabel: { color: p.text3, formatter: (v: string) => `${v}%` },
      axisLine: { lineStyle: { color: p.border } },
      name: 'monthly return',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: p.text3 },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } }
    },
    series: [
      {
        name: 'Portfolio',
        type: 'bar',
        data: binned.value.p,
        itemStyle: { color: p.primary },
        barGap: '-100%'
      },
      {
        name: 'Benchmark',
        type: 'bar',
        data: binned.value.b,
        itemStyle: { color: p.secondary }
      }
    ]
  }
})
</script>

<template>
  <VChart class="rdc-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.rdc-chart {
  width: 100%;
  height: 280px;
}
</style>
