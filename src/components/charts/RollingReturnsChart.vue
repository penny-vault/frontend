<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { RollingPoint } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  oneYear: RollingPoint[]
  threeYear: RollingPoint[]
  fiveYear: RollingPoint[]
  benchmarkLabel?: string
}>()

type Pair = [string, number]

const series1y = computed<Pair[]>(() => props.oneYear.map((p) => [p.date, p.portfolio * 100]))
const series3y = computed<Pair[]>(() => props.threeYear.map((p) => [p.date, p.portfolio * 100]))
const series5y = computed<Pair[]>(() => props.fiveYear.map((p) => [p.date, p.portfolio * 100]))

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const arr = params as Array<{
          axisValueLabel: string
          seriesName: string
          value: [string, number]
          color: string
        }>
        if (arr.length === 0) return ''
        const label = arr[0]!.axisValueLabel
        const lines = arr
          .filter((x) => x.value && x.value[1] != null)
          .map((x) => {
            const v = x.value[1]
            const sign = v >= 0 ? '+' : ''
            return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${x.color};margin-right:6px"></span>${x.seriesName} <strong>${sign}${v.toFixed(2)}%</strong>`
          })
          .join('<br/>')
        return `${label}<br/>${lines}`
      }
    },
    legend: {
      top: 0,
      right: 8,
      textStyle: { color: p.text2, fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16
    },
    grid: { left: 56, right: 16, top: 36, bottom: 36 },
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
    series: [
      {
        name: '1-year',
        type: 'line',
        showSymbol: false,
        smooth: false,
        data: series1y.value,
        lineStyle: { width: 1, color: p.secondary, opacity: 0.85 },
        itemStyle: { color: p.secondary }
      },
      {
        name: '3-year',
        type: 'line',
        showSymbol: false,
        smooth: false,
        data: series3y.value,
        lineStyle: { width: 1.5, color: p.primary },
        itemStyle: { color: p.primary }
      },
      {
        name: '5-year',
        type: 'line',
        showSymbol: false,
        smooth: false,
        data: series5y.value,
        lineStyle: { width: 2, color: p.gain },
        itemStyle: { color: p.gain },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: p.text3, type: 'solid', opacity: 0.6 },
          data: [{ yAxis: 0 }],
          label: { show: false }
        }
      }
    ]
  }
})
</script>

<template>
  <VChart class="rr-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.rr-chart {
  width: 100%;
  height: 300px;
}
</style>
