<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { DrawdownRange } from '@/util/chart'
import type { PerformancePoint } from '@/api/endpoints/portfolios'
import { useChartPalette } from '@/util/chart-theme'
import { formatDate, formatCurrency, formatPercent } from '@/util/format'

const props = defineProps<{
  visible: boolean
  drawdown: DrawdownRange | null
  points: PerformancePoint[]
  benchmarkLabel: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const palette = useChartPalette()

const DAY_MS = 86_400_000
const WINDOW_BUFFER_DAYS = 30

function parseDate(s: string): Date {
  return new Date(s + 'T12:00:00Z')
}

const startDate = computed<Date | null>(() =>
  props.drawdown ? parseDate(props.drawdown.start) : null
)
const troughDate = computed<Date | null>(() =>
  props.drawdown?.trough ? parseDate(props.drawdown.trough) : null
)
const recoveryDate = computed<Date | null>(() =>
  props.drawdown?.recovery ? parseDate(props.drawdown.recovery) : null
)
const recovered = computed(() => recoveryDate.value !== null)

const windowFrom = computed<Date | null>(() => {
  if (!startDate.value) return null
  return new Date(startDate.value.getTime() - WINDOW_BUFFER_DAYS * DAY_MS)
})

const windowTo = computed<Date | null>(() => {
  if (!startDate.value) return null
  const end = recoveryDate.value ?? new Date()
  return new Date(end.getTime() + WINDOW_BUFFER_DAYS * DAY_MS)
})

const windowPoints = computed<PerformancePoint[]>(() => {
  if (!windowFrom.value || !windowTo.value) return []
  const from = windowFrom.value.getTime()
  const to = windowTo.value.getTime()
  return props.points.filter((p) => {
    const t = parseDate(p.date).getTime()
    return t >= from && t <= to
  })
})

interface PortfolioBenchmarkValues {
  portfolio: number
  benchmark: number
}

function valueAt(date: string | null | undefined): PortfolioBenchmarkValues | null {
  if (!date) return null
  const p = props.points.find((pt) => pt.date === date)
  if (!p) return null
  return { portfolio: p.portfolioValue, benchmark: p.benchmarkValue }
}

const peakValues = computed(() => valueAt(props.drawdown?.start))
const troughValues = computed(() => valueAt(props.drawdown?.trough))
const recoveryValues = computed(() => valueAt(props.drawdown?.recovery))

const benchmarkDrawdown = computed<number | null>(() => {
  const peak = peakValues.value?.benchmark
  if (!peak || !startDate.value) return null
  const from = startDate.value.getTime()
  const to = (recoveryDate.value ?? new Date()).getTime()
  let min = peak
  for (const p of props.points) {
    const t = parseDate(p.date).getTime()
    if (t >= from && t <= to && p.benchmarkValue < min) min = p.benchmarkValue
  }
  if (peak === 0) return null
  return (min - peak) / peak
})

function diffDays(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / DAY_MS))
}

function compactCurrency(v: number): string {
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${Math.round(abs)}`
}

function pctFromBase(value: number, base: number | null | undefined): number | null {
  if (!base || base === 0) return null
  return ((value - base) / base) * 100
}

function fmtSignedPct(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

const daysToTrough = computed(() => diffDays(startDate.value, troughDate.value))
const daysToRecovery = computed(() => diffDays(troughDate.value, recoveryDate.value))
const totalUnderwater = computed(() =>
  diffDays(startDate.value, recoveryDate.value ?? new Date())
)

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const dd = props.drawdown
  const lastWindowDate =
    windowPoints.value.length > 0
      ? windowPoints.value[windowPoints.value.length - 1]?.date
      : undefined

  const peakP = peakValues.value?.portfolio
  const peakB = peakValues.value?.benchmark

  const portfolioSeries: Array<[string, number, number]> = []
  const benchmarkSeries: Array<[string, number, number]> = []
  for (const pt of windowPoints.value) {
    const pPct = pctFromBase(pt.portfolioValue, peakP)
    if (pPct !== null) portfolioSeries.push([pt.date, pPct, pt.portfolioValue])
    const bPct = pctFromBase(pt.benchmarkValue, peakB)
    if (bPct !== null) benchmarkSeries.push([pt.date, bPct, pt.benchmarkValue])
  }

  const troughPct =
    troughValues.value && peakP
      ? pctFromBase(troughValues.value.portfolio, peakP)
      : null

  const series: NonNullable<EChartsOption['series']> = [
    {
      name: 'Portfolio',
      type: 'line',
      showSymbol: false,
      data: portfolioSeries,
      lineStyle: { width: 1.6, color: p.primary },
      itemStyle: { color: p.primary },
      ...(dd && troughPct !== null && dd.trough
        ? {
            markPoint: {
              symbol: 'circle',
              symbolSize: 9,
              data: [
                {
                  name: 'Trough',
                  coord: [dd.trough, troughPct]
                }
              ],
              itemStyle: { color: p.loss, borderColor: p.bg, borderWidth: 2 },
              label: { show: false }
            }
          }
        : {}),
      ...(dd
        ? {
            markArea: {
              silent: true,
              itemStyle: { color: p.lossSoft15 },
              data: [
                [
                  { xAxis: dd.start },
                  { xAxis: dd.recovery ?? lastWindowDate ?? dd.start }
                ]
              ]
            },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: p.text4, type: 'solid', opacity: 0.5 },
              data: [{ yAxis: 0 }],
              label: { show: false }
            }
          }
        : {})
    },
    {
      name: props.benchmarkLabel || 'Benchmark',
      type: 'line',
      showSymbol: false,
      data: benchmarkSeries,
      lineStyle: { width: 1.2, color: p.secondary, type: [4, 4] },
      itemStyle: { color: p.secondary }
    }
  ]

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
          value: [string, number, number]
          color: string
        }>
        if (arr.length === 0) return ''
        const label = arr[0]!.axisValueLabel
        const lines = arr
          .filter((x) => x.value && x.value[1] != null)
          .map((x) => {
            const pct = fmtSignedPct(x.value[1])
            const dollars =
              x.value[2] != null ? ` <span style="opacity:0.65">${compactCurrency(x.value[2])}</span>` : ''
            return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${x.color};margin-right:6px"></span>${x.seriesName} <strong>${pct}</strong>${dollars}`
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
    grid: { left: 52, right: 16, top: 36, bottom: 32 },
    xAxis: {
      type: 'time',
      axisLabel: { color: p.text3 },
      axisLine: { lineStyle: { color: p.border } }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        color: p.text3,
        formatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } }
    },
    series
  }
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const dateRangeText = computed(() => {
  const dd = props.drawdown
  if (!dd) return ''
  const start = formatDate(dd.start, { month: 'short', year: 'numeric' })
  const end = dd.recovery
    ? formatDate(dd.recovery, { month: 'short', year: 'numeric' })
    : 'ongoing'
  return `${start} → ${end}`
})

const headerText = computed(() => {
  if (!props.drawdown) return ''
  return `${formatPercent(props.drawdown.depth)} drawdown · ${dateRangeText.value}`
})

const benchmarkComparison = computed<'worse' | 'better' | 'similar' | null>(() => {
  const dd = props.drawdown
  const bench = benchmarkDrawdown.value
  if (!dd || bench == null) return null
  const portfolioMag = Math.abs(dd.depth)
  const benchMag = Math.abs(bench)
  const delta = benchMag - portfolioMag
  if (delta > 0.005) return 'worse'
  if (delta < -0.005) return 'better'
  return 'similar'
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="headerText"
    :style="{ width: '90vw', maxWidth: '900px' }"
    :breakpoints="{ '960px': '95vw' }"
    :closable="true"
    class="dd-detail-dialog"
  >
    <div v-if="drawdown" class="ddd-body">
      <aside class="ddd-metrics">
        <h3 class="ddd-section-h">Window</h3>
        <dl>
          <div class="m-row">
            <dt>Peak</dt>
            <dd>
              {{ formatDate(drawdown.start, { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </dd>
          </div>
          <div v-if="drawdown.trough" class="m-row">
            <dt>Trough</dt>
            <dd>
              {{ formatDate(drawdown.trough, { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </dd>
          </div>
          <div v-if="drawdown.recovery" class="m-row">
            <dt>Recovered</dt>
            <dd>
              {{
                formatDate(drawdown.recovery, { month: 'short', day: 'numeric', year: 'numeric' })
              }}
            </dd>
          </div>
          <div v-else class="m-row">
            <dt>Status</dt>
            <dd class="warn">Ongoing</dd>
          </div>
        </dl>

        <h3 class="ddd-section-h">Duration</h3>
        <dl>
          <div v-if="daysToTrough != null" class="m-row">
            <dt>Peak → trough</dt>
            <dd class="num">{{ daysToTrough }} d</dd>
          </div>
          <div v-if="daysToRecovery != null" class="m-row">
            <dt>Trough → recovery</dt>
            <dd class="num">{{ daysToRecovery }} d</dd>
          </div>
          <div v-if="totalUnderwater != null" class="m-row">
            <dt>{{ recovered ? 'Total underwater' : 'Underwater so far' }}</dt>
            <dd class="num">{{ totalUnderwater }} d</dd>
          </div>
        </dl>

        <h3 class="ddd-section-h">Values</h3>
        <dl>
          <div v-if="peakValues" class="m-row">
            <dt>At peak</dt>
            <dd class="num">{{ formatCurrency(peakValues.portfolio) }}</dd>
          </div>
          <div v-if="troughValues" class="m-row">
            <dt>At trough</dt>
            <dd class="num">{{ formatCurrency(troughValues.portfolio) }}</dd>
          </div>
          <div v-if="recoveryValues" class="m-row">
            <dt>At recovery</dt>
            <dd class="num">{{ formatCurrency(recoveryValues.portfolio) }}</dd>
          </div>
        </dl>

        <h3 class="ddd-section-h">{{ benchmarkLabel || 'Benchmark' }}</h3>
        <dl>
          <div v-if="benchmarkDrawdown != null" class="m-row">
            <dt>Drawdown over window</dt>
            <dd class="num">{{ formatPercent(benchmarkDrawdown) }}</dd>
          </div>
          <div v-else class="m-row">
            <dt>Drawdown over window</dt>
            <dd class="muted">—</dd>
          </div>
        </dl>
      </aside>

      <div class="ddd-chart-wrap">
        <VChart v-if="visible" class="ddd-chart" :option="chartOption" autoresize />
        <p class="ddd-blurb">
          A drawdown is the peak-to-trough decline in portfolio value, measured against the
          highest value reached so far.
          <template v-if="benchmarkComparison === 'worse'">
            Over this window the {{ benchmarkLabel || 'benchmark' }} fell harder
            ({{ formatPercent(benchmarkDrawdown!) }}) than the portfolio.
          </template>
          <template v-else-if="benchmarkComparison === 'better'">
            Over this window the {{ benchmarkLabel || 'benchmark' }} held up better
            ({{ formatPercent(benchmarkDrawdown!) }}) than the portfolio.
          </template>
          <template v-else-if="benchmarkComparison === 'similar'">
            Over this window the {{ benchmarkLabel || 'benchmark' }} moved roughly in line with the
            portfolio.
          </template>
        </p>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.ddd-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}
.ddd-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ddd-section-h {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
  margin: 14px 0 6px;
}
.ddd-section-h:first-child {
  margin-top: 0;
}
.ddd-metrics dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.m-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  line-height: 1.4;
}
.m-row dt {
  color: var(--text-3);
}
.m-row dd {
  margin: 0;
  color: var(--text-1);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.m-row dd.num {
  font-family: 'IBM Plex Mono', monospace;
}
.m-row dd.warn {
  color: var(--secondary);
}
.m-row dd.muted {
  color: var(--text-5);
}
.ddd-chart-wrap {
  min-width: 0;
}
.ddd-chart {
  width: 100%;
  height: 280px;
}
.ddd-blurb {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.6;
  margin: 16px 0 0;
}

@media (max-width: 720px) {
  .ddd-body {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .ddd-chart {
    height: 220px;
  }
  .ddd-section-h {
    margin: 10px 0 4px;
  }
}
</style>
