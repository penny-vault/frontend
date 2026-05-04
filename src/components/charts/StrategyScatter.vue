<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useChartPalette } from '@/util/chart-theme'
import type { Strategy } from '@/api/endpoints/strategies'
import {
  METRICS,
  PAIRS,
  DEFAULT_PAIR_ID,
  type MetricDef,
  type MetricKey,
  type PairDef,
  type SizeKey
} from './strategyScatterMetrics'

const props = defineProps<{
  strategies: Strategy[]
  highlightShortCode?: string | null
  pairId: string
  sizeKey: SizeKey
}>()

const emit = defineEmits<{
  (e: 'select', shortCode: string): void
  (e: 'hover', shortCode: string | null): void
}>()

const palette = useChartPalette()

const DEFAULT_PAIR = PAIRS.find((p) => p.id === DEFAULT_PAIR_ID)!
const pair = computed<PairDef>(() => PAIRS.find((p) => p.id === props.pairId) ?? DEFAULT_PAIR)
const xMetric = computed<MetricDef>(() => METRICS[pair.value.x])
const yMetric = computed<MetricDef>(() => METRICS[pair.value.y])
const sizeMetric = computed<MetricDef | null>(() =>
  props.sizeKey === 'uniform' ? null : METRICS[props.sizeKey as MetricKey]
)

interface PlotPoint {
  x: number
  y: number
  shortCode: string
  name: string
  isOfficial: boolean
  rawX: number
  rawY: number
  rawSize: number | null
  size: number
}

const SIZE_MIN = 8
const SIZE_MAX = 26
const SIZE_UNIFORM = 12

function rawMetric(s: Strategy, key: MetricKey): number | null {
  const v = s[key]
  return v == null ? null : (v as number)
}

function axisLabelFormatter(metric: MetricDef): (val: number) => string {
  if (metric.format === 'percent') {
    return (val) => `${Math.round(val * 10) / 10}%`
  }
  return (val) => (Math.round(val * 100) / 100).toString()
}

function pointValue(metric: MetricDef, raw: number): number {
  const v = metric.magnitude ? Math.abs(raw) : raw
  return metric.format === 'percent' ? v * 100 : v
}

function formatValue(metric: MetricDef, raw: number): string {
  const v = metric.magnitude ? Math.abs(raw) : raw
  if (metric.format === 'percent') return `${(v * 100).toFixed(metric.precision)}%`
  return v.toFixed(metric.precision)
}

const points = computed<PlotPoint[]>(() => {
  const xKey = xMetric.value.key
  const yKey = yMetric.value.key
  const ready = props.strategies.filter(
    (s) => rawMetric(s, xKey) != null && rawMetric(s, yKey) != null
  )

  const sizeIsUniform = props.sizeKey === 'uniform'
  let szLo = Infinity
  let szHi = 0
  if (!sizeIsUniform) {
    for (const s of ready) {
      const r = rawMetric(s, props.sizeKey as MetricKey)
      if (r == null) continue
      const v = Math.abs(r)
      if (v < szLo) szLo = v
      if (v > szHi) szHi = v
    }
  }
  if (!Number.isFinite(szLo)) szLo = 0
  const szSpan = Math.max(1e-9, szHi - szLo)

  return ready.map((s) => {
    const xRaw = rawMetric(s, xKey) as number
    const yRaw = rawMetric(s, yKey) as number
    const sRaw = sizeIsUniform ? null : rawMetric(s, props.sizeKey as MetricKey)
    const sMag = sRaw == null ? null : Math.abs(sRaw)
    const t = sMag == null ? 0 : (sMag - szLo) / szSpan
    return {
      x: pointValue(xMetric.value, xRaw),
      y: pointValue(yMetric.value, yRaw),
      shortCode: s.shortCode,
      name: s.describe?.name ?? s.repoName ?? s.shortCode,
      isOfficial: s.isOfficial,
      rawX: xRaw,
      rawY: yRaw,
      rawSize: sRaw,
      size: sizeIsUniform ? SIZE_UNIFORM : SIZE_MIN + t * (SIZE_MAX - SIZE_MIN)
    }
  })
})

function rangeFor(metric: MetricDef, vals: number[], emptyDefault: { min: number; max: number }) {
  if (!vals.length) return emptyDefault
  let lo = Infinity
  let hi = -Infinity
  for (const v of vals) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const span = hi - lo
  const pad = Math.max(span * 0.15, metric.format === 'percent' ? 1 : 0.05)
  let min = lo - pad
  let max = hi + pad
  if (metric.nonNegative && min < 0) min = 0
  // Round to clean values so axis tick labels don't show fractional cruft.
  if (metric.format === 'percent') {
    min = Math.floor(min)
    max = Math.ceil(max)
  } else {
    min = Math.floor(min * 10) / 10
    max = Math.ceil(max * 10) / 10
  }
  return { min, max }
}

const xRange = computed(() =>
  rangeFor(
    xMetric.value,
    points.value.map((p) => p.x),
    { min: 0, max: 5 }
  )
)
const yRange = computed(() =>
  rangeFor(
    yMetric.value,
    points.value.map((p) => p.y),
    { min: 0, max: 20 }
  )
)

const sizeLegendLabel = computed(() => (sizeMetric.value ? `size = ${sizeMetric.value.label}` : ''))

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const hi = props.highlightShortCode ?? null
  const yLabel = yMetric.value.label
  const xLabel = xMetric.value.label
  const sm = sizeMetric.value
  const sizeKeyVal = props.sizeKey
  const xKeyVal = xMetric.value.key
  const yKeyVal = yMetric.value.key

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
        const yVal = formatValue(yMetric.value, d.rawY)
        const xVal = formatValue(xMetric.value, d.rawX)
        const showSize =
          sm != null && sizeKeyVal !== xKeyVal && sizeKeyVal !== yKeyVal && d.rawSize != null
        const sizeRow = showSize
          ? `<div style="font-variant-numeric:tabular-nums;font-size:12px">
               <span style="color:${p.text3}">${sm.label}</span>
               <span style="color:${p.text1};margin-left:6px">${formatValue(sm, d.rawSize as number)}</span>
             </div>`
          : ''
        return `
          <div style="font-weight:500;color:${p.text1};margin-bottom:2px">${d.name}</div>
          <div style="color:${p.text3};font-size:11px;margin-bottom:6px">${d.shortCode}${
            d.isOfficial ? ' · official' : ''
          }</div>
          <div style="font-variant-numeric:tabular-nums;font-size:12px">
            <span style="color:${p.text3}">${yLabel}</span>
            <span style="color:${p.text1};margin-left:6px">${yVal}</span>
          </div>
          <div style="font-variant-numeric:tabular-nums;font-size:12px">
            <span style="color:${p.text3}">${xLabel}</span>
            <span style="color:${p.text1};margin-left:6px">${xVal}</span>
          </div>
          ${sizeRow}
        `
      }
    },
    grid: { left: 52, right: 14, top: 14, bottom: 40 },
    xAxis: {
      type: 'value',
      min: xRange.value.min,
      max: xRange.value.max,
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: p.text3, fontSize: 11 },
      axisLabel: {
        color: p.text3,
        fontSize: 10,
        formatter: axisLabelFormatter(xMetric.value)
      },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.4 } }
    },
    yAxis: {
      type: 'value',
      min: yRange.value.min,
      max: yRange.value.max,
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 42,
      nameTextStyle: { color: p.text3, fontSize: 11 },
      axisLabel: {
        color: p.text3,
        fontSize: 10,
        formatter: axisLabelFormatter(yMetric.value)
      },
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
      <template v-if="sizeMetric">
        <span class="ss-legend-sep" aria-hidden="true">·</span>
        <span class="ss-legend-size">
          <span class="ss-size ss-size--sm" />
          <span class="ss-size ss-size--md" />
          <span class="ss-size ss-size--lg" />
        </span>
        <span class="ss-legend-label">{{ sizeLegendLabel }}</span>
      </template>
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
