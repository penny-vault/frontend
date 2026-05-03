<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useChartPalette } from '@/util/chart-theme'
import type { Strategy } from '@/api/endpoints/strategies'

const props = defineProps<{
  strategies: Strategy[]
  highlightShortCode?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', shortCode: string): void
  (e: 'hover', shortCode: string | null): void
}>()

const palette = useChartPalette()

interface PlotPoint {
  x: number // ulcer index (unitless)
  y: number // cagr (%)
  shortCode: string
  name: string
  isOfficial: boolean
  maxDD: number | null
  size: number // resolved symbol size in px
}

const SIZE_MIN = 8
const SIZE_MAX = 26

const points = computed<PlotPoint[]>(() => {
  const ready = props.strategies.filter((s) => s.ulcerIndex != null && s.cagr != null)

  let ddLo = Infinity
  let ddHi = 0
  for (const s of ready) {
    const dd = s.maxDrawDown == null ? null : Math.abs(s.maxDrawDown)
    if (dd == null) continue
    if (dd < ddLo) ddLo = dd
    if (dd > ddHi) ddHi = dd
  }
  if (!Number.isFinite(ddLo)) ddLo = 0
  const ddSpan = Math.max(1e-9, ddHi - ddLo)

  return ready.map((s) => {
    const ddAbs = s.maxDrawDown == null ? null : Math.abs(s.maxDrawDown)
    const t = ddAbs == null ? 0 : (ddAbs - ddLo) / ddSpan
    return {
      x: s.ulcerIndex as number,
      y: (s.cagr as number) * 100,
      shortCode: s.shortCode,
      name: s.describe?.name ?? s.repoName ?? s.shortCode,
      isOfficial: s.isOfficial,
      maxDD: s.maxDrawDown ?? null,
      size: SIZE_MIN + t * (SIZE_MAX - SIZE_MIN)
    }
  })
})

const xRange = computed(() => {
  if (!points.value.length) return { min: 0, max: 5 }
  let lo = Infinity
  let hi = -Infinity
  for (const p of points.value) {
    if (p.x < lo) lo = p.x
    if (p.x > hi) hi = p.x
  }
  const pad = Math.max(0.05, (hi - lo) * 0.15)
  return {
    min: Math.max(0, Math.floor((lo - pad) * 10) / 10),
    max: Math.ceil((hi + pad) * 10) / 10
  }
})

const yRange = computed(() => {
  if (!points.value.length) return { min: 0, max: 20 }
  let lo = Infinity
  let hi = -Infinity
  for (const p of points.value) {
    if (p.y < lo) lo = p.y
    if (p.y > hi) hi = p.y
  }
  const pad = Math.max(1, (hi - lo) * 0.15)
  return { min: Math.floor(lo - pad), max: Math.ceil(hi + pad) }
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const hi = props.highlightShortCode ?? null
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1, fontSize: 12 },
      padding: [8, 10],
      formatter: (params: unknown) => {
        const v = params as { data: PlotPoint }
        const d = v.data
        const ddRow =
          d.maxDD == null
            ? ''
            : `<div style="color:${p.text3};font-size:11px">max DD ${(d.maxDD * 100).toFixed(1)}%</div>`
        return `
          <div style="font-weight:500;color:${p.text1};margin-bottom:2px">${d.name}</div>
          <div style="color:${p.text3};font-size:11px;margin-bottom:6px">${d.shortCode}${
            d.isOfficial ? ' · official' : ''
          }</div>
          <div style="font-variant-numeric:tabular-nums;font-size:12px">
            <span style="color:${p.text3}">CAGR</span>
            <span style="color:${p.text1};margin-left:6px">${d.y.toFixed(2)}%</span>
          </div>
          <div style="font-variant-numeric:tabular-nums;font-size:12px">
            <span style="color:${p.text3}">Ulcer</span>
            <span style="color:${p.text1};margin-left:6px">${d.x.toFixed(2)}</span>
          </div>
          ${ddRow}
        `
      }
    },
    grid: { left: 48, right: 14, top: 14, bottom: 40 },
    xAxis: {
      type: 'value',
      min: xRange.value.min,
      max: xRange.value.max,
      name: 'Ulcer Index',
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: p.text3, fontSize: 11 },
      axisLabel: { color: p.text3, fontSize: 10 },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.4 } }
    },
    yAxis: {
      type: 'value',
      min: yRange.value.min,
      max: yRange.value.max,
      name: 'CAGR',
      nameLocation: 'middle',
      nameGap: 38,
      nameTextStyle: { color: p.text3, fontSize: 11 },
      axisLabel: { color: p.text3, fontSize: 10, formatter: '{value}%' },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.4 } }
    },
    series: [
      {
        type: 'scatter',
        data: points.value.map((pt) => {
          const isHi = hi != null && pt.shortCode === hi
          return {
            value: [pt.x, pt.y],
            ...pt,
            itemStyle: {
              color: pt.isOfficial ? p.primary : p.secondary,
              borderColor: isHi ? p.text1 : p.bgAlt,
              borderWidth: isHi ? 2.5 : 1.5,
              opacity: 0.95
            }
          }
        }),
        symbolSize: (_v, params) => {
          const data = (params as unknown as { data?: PlotPoint }).data
          return data?.size ?? SIZE_MIN
        },
        itemStyle: {
          opacity: 0.95
        },
        emphasis: {
          scale: false,
          itemStyle: {
            borderColor: p.text1,
            borderWidth: 2.5
          }
        },
        z: 3
      }
    ]
  }
})

function onClick(params: unknown) {
  const v = params as { data?: PlotPoint }
  if (v.data?.shortCode) emit('select', v.data.shortCode)
}

function onMouseOver(params: unknown) {
  const v = params as { data?: PlotPoint }
  if (v.data?.shortCode) emit('hover', v.data.shortCode)
}

function onMouseOut() {
  emit('hover', null)
}
</script>

<template>
  <div class="ss">
    <div class="ss-legend">
      <span class="ss-dot ss-dot--official" />
      <span class="ss-legend-label">official</span>
      <span class="ss-dot ss-dot--community" />
      <span class="ss-legend-label">community</span>
      <span class="ss-legend-sep" aria-hidden="true">·</span>
      <span class="ss-legend-size">
        <span class="ss-size ss-size--sm" />
        <span class="ss-size ss-size--md" />
        <span class="ss-size ss-size--lg" />
      </span>
      <span class="ss-legend-label">size = |max DD|</span>
    </div>
    <VChart
      class="ss-chart"
      :option="chartOption"
      autoresize
      @click="onClick"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    />
  </div>
</template>

<style scoped>
.ss {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.ss-legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.ss-legend-label {
  margin-right: 10px;
}
.ss-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.ss-dot--official {
  background: var(--primary);
}
.ss-dot--community {
  background: var(--secondary);
}
.ss-legend-sep {
  color: var(--text-5);
  margin: 0 4px;
}
.ss-legend-size {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ss-size {
  border-radius: 50%;
  background: var(--text-4);
  display: inline-block;
}
.ss-size--sm {
  width: 5px;
  height: 5px;
}
.ss-size--md {
  width: 8px;
  height: 8px;
}
.ss-size--lg {
  width: 12px;
  height: 12px;
}
.ss-chart {
  flex: 1;
  width: 100%;
  min-height: 280px;
}
</style>
