<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { MonthlyReturn } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = withDefaults(
  defineProps<{
    monthly: MonthlyReturn[]
    highlightedYear?: number | null
    logScale?: boolean
  }>(),
  { logScale: false }
)

const emit = defineEmits<{
  'year-hover': [year: number | null]
}>()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Signed log: stretches small returns toward visibility while preserving sign
// and keeping zero at zero. Tuned so a 1% month registers ~15% color intensity
// against a 100% reference.
const SYMLOG_SCALE = 100
const SYMLOG_DENOM = Math.log10(1 + SYMLOG_SCALE)
function symlog(v: number): number {
  return (Math.sign(v) * Math.log10(1 + Math.abs(v) * SYMLOG_SCALE)) / SYMLOG_DENOM
}

const years = computed(() => {
  const set = new Set<number>()
  for (const m of props.monthly) set.add(m.year)
  return Array.from(set).sort((a, b) => a - b)
})

const maxAbs = computed(() => {
  let max = 0
  for (const m of props.monthly) {
    const raw = Math.abs(m.portfolio)
    const v = props.logScale ? Math.abs(symlog(m.portfolio)) : raw
    if (v > max) max = v
  }
  return max === 0 ? 0.01 : max
})

const data = computed(() => {
  const yearIdx = new Map<number, number>()
  years.value.forEach((y, i) => yearIdx.set(y, i))
  return props.monthly.map((m) => {
    const display = props.logScale ? symlog(m.portfolio) : m.portfolio
    // 4th slot stores the raw value so tooltips always show the real return.
    return [yearIdx.get(m.year)!, m.month - 1, display, m.portfolio]
  })
})

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

// Build a visualMap color stop array using rgba variants of the palette tokens.
// Key property: every stop is either PURE loss or PURE gain (in RGB). Only the
// alpha varies. ECharts interpolation between adjacent stops therefore keeps
// the hue constant — no muddy green→red blend through a gray midpoint.
const visualMapColors = computed(() => {
  const l = parseColor(palette.value.loss)
  const g = parseColor(palette.value.gain)
  const rgba = (c: { r: number; g: number; b: number }, a: number) =>
    `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`
  return [
    rgba(l, 1.0), // −maxAbs
    rgba(l, 0.7),
    rgba(l, 0.35),
    rgba(l, 0.1), // approaches zero from below
    rgba(g, 0.1), // approaches zero from above
    rgba(g, 0.35),
    rgba(g, 0.7),
    rgba(g, 1.0) // +maxAbs
  ]
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    tooltip: {
      position: 'top',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const pr = params as { value: [number, number, number, number?] }
        const [xi, yi, v, raw] = pr.value
        const year = years.value[xi]
        const month = MONTHS[yi]
        const display = raw ?? v
        const pct = (display * 100).toFixed(2)
        const sign = display > 0 ? '+' : ''
        return `${month} ${year} · ${sign}${pct}%`
      }
    },
    grid: { left: 48, right: 16, top: 8, bottom: 28 },
    xAxis: {
      type: 'category',
      data: years.value.map(String),
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.text3 }
    },
    yAxis: {
      type: 'category',
      data: MONTHS,
      inverse: false,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.text3 }
    },
    visualMap: {
      min: -maxAbs.value,
      max: maxAbs.value,
      calculable: false,
      show: false,
      inRange: {
        color: visualMapColors.value
      }
    },
    series: [
      {
        type: 'heatmap',
        data: data.value,
        label: { show: false },
        itemStyle: { borderWidth: 1, borderColor: p.bg },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: p.primary } }
      }
    ]
  }
})

function onEvents() {
  return {
    mouseover: (params: unknown) => {
      const p = params as { value?: [number, number, number] }
      if (!p.value) return
      const year = years.value[p.value[0]]
      emit('year-hover', year ?? null)
    },
    mouseout: () => emit('year-hover', null)
  }
}
</script>

<template>
  <VChart
    class="heatmap-chart"
    :option="chartOption"
    :update-options="{ notMerge: true }"
    :init-options="{ renderer: 'canvas' }"
    autoresize
    @mouseover="(e) => onEvents().mouseover(e)"
    @mouseout="() => onEvents().mouseout()"
  />
</template>

<style scoped>
.heatmap-chart {
  width: 100%;
  height: 380px;
}
</style>
