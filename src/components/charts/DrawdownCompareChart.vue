<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { DrawdownPoint } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  drawdowns: DrawdownPoint[]
  benchmarkLabel: string
}>()

function parseColor(input: string): { r: number; g: number; b: number } {
  const s = input.trim()
  if (s.startsWith('#')) {
    if (s.length === 4) {
      return {
        r: parseInt(s[1]! + s[1]!, 16),
        g: parseInt(s[2]! + s[2]!, 16),
        b: parseInt(s[3]! + s[3]!, 16)
      }
    }
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16)
    }
  }
  const m = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
  return { r: 127, g: 127, b: 127 }
}

// Split the delta (portfolio_dd − benchmark_dd) into two series:
// one containing only non-negative points (NaN/null elsewhere), one
// containing only non-positive points. ECharts renders each series as
// its own filled area so we get clean green-above / red-below shading
// without overlap or color interpolation.
const splitSeries = computed(() => {
  const pos: [string, number | null][] = []
  const neg: [string, number | null][] = []
  for (const d of props.drawdowns) {
    const delta = (d.portfolio - d.benchmark) * 100
    if (delta >= 0) {
      pos.push([d.date, delta])
      neg.push([d.date, null])
    } else {
      pos.push([d.date, null])
      neg.push([d.date, delta])
    }
  }
  return { pos, neg }
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const gain = parseColor(p.gain)
  const loss = parseColor(p.loss)
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const arr = params as Array<{ axisValueLabel: string; value: [string, number | null] }>
        const label = arr[0]?.axisValueLabel ?? ''
        const first = arr.find((x) => x.value[1] != null)
        if (!first) return label
        const v = first.value[1] as number
        const sign = v >= 0 ? '+' : ''
        const verdict = v >= 0 ? 'shallower than' : 'deeper than'
        return `${label}<br/>${sign}${v.toFixed(2)}% — portfolio ${verdict} ${props.benchmarkLabel}`
      }
    },
    grid: { left: 56, right: 16, top: 24, bottom: 36 },
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
        name: `Portfolio outperforming ${props.benchmarkLabel}`,
        type: 'line',
        showSymbol: false,
        smooth: false,
        connectNulls: false,
        data: splitSeries.value.pos,
        lineStyle: { width: 1, color: p.gain },
        itemStyle: { color: p.gain },
        areaStyle: {
          origin: 0,
          color: `rgba(${gain.r}, ${gain.g}, ${gain.b}, 0.55)`
        }
      },
      {
        name: `Portfolio underperforming ${props.benchmarkLabel}`,
        type: 'line',
        showSymbol: false,
        smooth: false,
        connectNulls: false,
        data: splitSeries.value.neg,
        lineStyle: { width: 1, color: p.loss },
        itemStyle: { color: p.loss },
        areaStyle: {
          origin: 0,
          color: `rgba(${loss.r}, ${loss.g}, ${loss.b}, 0.55)`
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: p.text3, type: 'solid', opacity: 0.9 },
          data: [{ yAxis: 0 }],
          label: { show: false }
        }
      }
    ]
  }
})
</script>

<template>
  <VChart class="ddc-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.ddc-chart {
  width: 100%;
  height: 300px;
}
</style>
