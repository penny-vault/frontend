<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { PerformancePoint } from '@/api/endpoints/portfolios'
import type { AnnualReturn, MonthlyReturn } from '@/util/returns'
import { useChartPalette } from '@/util/chart-theme'
import { formatCurrency, formatSignedPercent } from '@/util/format'

const props = defineProps<{
  visible: boolean
  annual: AnnualReturn | null
  points: PerformancePoint[]
  monthly: MonthlyReturn[]
  benchmarkLabel: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const palette = useChartPalette()

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

function parseDate(s: string): Date {
  return new Date(s + 'T12:00:00Z')
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

function fmtSignedPctFromPct(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

const yearPoints = computed<PerformancePoint[]>(() => {
  if (!props.annual) return []
  const year = props.annual.year
  return props.points.filter((pt) => parseDate(pt.date).getUTCFullYear() === year)
})

const basePortfolio = computed<number | null>(() => yearPoints.value[0]?.portfolioValue ?? null)
const baseBenchmark = computed<number | null>(() => yearPoints.value[0]?.benchmarkValue ?? null)
const lastPoint = computed<PerformancePoint | null>(
  () => yearPoints.value[yearPoints.value.length - 1] ?? null
)

const yearMonthly = computed<MonthlyReturn[]>(() => {
  if (!props.annual) return []
  const year = props.annual.year
  return props.monthly.filter((m) => m.year === year)
})

const bestMonth = computed<MonthlyReturn | null>(() => {
  let best: MonthlyReturn | null = null
  for (const m of yearMonthly.value) {
    if (!best || m.portfolio > best.portfolio) best = m
  }
  return best
})

const worstMonth = computed<MonthlyReturn | null>(() => {
  let worst: MonthlyReturn | null = null
  for (const m of yearMonthly.value) {
    if (!worst || m.portfolio < worst.portfolio) worst = m
  }
  return worst
})

const positiveMonths = computed(() => yearMonthly.value.filter((m) => m.portfolio > 0).length)

const intraYearMaxDrawdown = computed<number | null>(() => {
  const pts = yearPoints.value
  if (pts.length === 0) return null
  let peak = pts[0]!.portfolioValue
  let maxDD = 0
  for (const p of pts) {
    if (p.portfolioValue > peak) peak = p.portfolioValue
    if (peak > 0) {
      const dd = (p.portfolioValue - peak) / peak
      if (dd < maxDD) maxDD = dd
    }
  }
  return maxDD
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const baseP = basePortfolio.value
  const baseB = baseBenchmark.value

  const portfolioSeries: Array<[string, number, number]> = []
  const benchmarkSeries: Array<[string, number, number]> = []
  for (const pt of yearPoints.value) {
    const pPct = pctFromBase(pt.portfolioValue, baseP)
    if (pPct !== null) portfolioSeries.push([pt.date, pPct, pt.portfolioValue])
    const bPct = pctFromBase(pt.benchmarkValue, baseB)
    if (bPct !== null) benchmarkSeries.push([pt.date, bPct, pt.benchmarkValue])
  }

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
            const pct = fmtSignedPctFromPct(x.value[1])
            const dollars =
              x.value[2] != null
                ? ` <span style="opacity:0.65">${compactCurrency(x.value[2])}</span>`
                : ''
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
    series: [
      {
        name: 'Portfolio',
        type: 'line',
        showSymbol: false,
        data: portfolioSeries,
        lineStyle: { width: 1.6, color: p.primary },
        itemStyle: { color: p.primary },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: p.text4, type: 'solid', opacity: 0.5 },
          data: [{ yAxis: 0 }],
          label: { show: false }
        }
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
  }
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const headerText = computed(() => {
  if (!props.annual) return ''
  return `${props.annual.year} · ${formatSignedPercent(props.annual.portfolio)}`
})

const winnerLabel = computed<'portfolio' | 'benchmark' | 'tie' | null>(() => {
  if (!props.annual) return null
  const delta = props.annual.delta
  if (delta > 0.0005) return 'portfolio'
  if (delta < -0.0005) return 'benchmark'
  return 'tie'
})

function fmtMonthLabel(m: MonthlyReturn): string {
  return `${MONTH_NAMES[m.month - 1] ?? ''} ${m.year}`
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="headerText"
    :style="{ width: '90vw', maxWidth: '900px' }"
    :breakpoints="{ '960px': '95vw' }"
    :closable="true"
    class="ar-detail-dialog"
  >
    <div v-if="annual" class="ard-body">
      <aside class="ard-metrics">
        <h3 class="ard-section-h">Performance</h3>
        <dl>
          <div class="m-row">
            <dt>Portfolio</dt>
            <dd class="num" :class="annual.portfolio >= 0 ? 'up' : 'down'">
              {{ formatSignedPercent(annual.portfolio) }}
            </dd>
          </div>
          <div class="m-row">
            <dt>{{ benchmarkLabel || 'Benchmark' }}</dt>
            <dd class="num" :class="annual.benchmark >= 0 ? 'up' : 'down'">
              {{ formatSignedPercent(annual.benchmark) }}
            </dd>
          </div>
          <div class="m-row">
            <dt>Delta</dt>
            <dd class="num" :class="annual.delta >= 0 ? 'up' : 'down'">
              {{ annual.delta >= 0 ? '+' : '' }}{{ (annual.delta * 100).toFixed(2) }} pp
            </dd>
          </div>
        </dl>

        <h3 class="ard-section-h">Window</h3>
        <dl>
          <div v-if="basePortfolio != null" class="m-row">
            <dt>Year start</dt>
            <dd class="num">{{ formatCurrency(basePortfolio) }}</dd>
          </div>
          <div v-if="lastPoint" class="m-row">
            <dt>Year end</dt>
            <dd class="num">{{ formatCurrency(lastPoint.portfolioValue) }}</dd>
          </div>
          <div v-if="intraYearMaxDrawdown != null" class="m-row">
            <dt>Intra-year max DD</dt>
            <dd class="num down">{{ (intraYearMaxDrawdown * 100).toFixed(2) }}%</dd>
          </div>
        </dl>

        <h3 class="ard-section-h">Months</h3>
        <dl>
          <div v-if="bestMonth" class="m-row">
            <dt>Best</dt>
            <dd class="num up">
              {{ fmtMonthLabel(bestMonth) }} ·
              {{ formatSignedPercent(bestMonth.portfolio) }}
            </dd>
          </div>
          <div v-if="worstMonth" class="m-row">
            <dt>Worst</dt>
            <dd class="num down">
              {{ fmtMonthLabel(worstMonth) }} ·
              {{ formatSignedPercent(worstMonth.portfolio) }}
            </dd>
          </div>
          <div v-if="yearMonthly.length > 0" class="m-row">
            <dt>Positive</dt>
            <dd class="num">{{ positiveMonths }} of {{ yearMonthly.length }}</dd>
          </div>
        </dl>
      </aside>

      <div class="ard-chart-wrap">
        <VChart v-if="visible" class="ard-chart" :option="chartOption" autoresize />
        <p class="ard-blurb">
          Both lines start at 0% on the first day of the year, so the chart shows cumulative growth
          from year-open.
          <template v-if="winnerLabel === 'portfolio'">
            The portfolio outperformed the {{ benchmarkLabel || 'benchmark' }} by
            {{ (annual.delta * 100).toFixed(2) }} pp.
          </template>
          <template v-else-if="winnerLabel === 'benchmark'">
            The {{ benchmarkLabel || 'benchmark' }} outperformed the portfolio by
            {{ (Math.abs(annual.delta) * 100).toFixed(2) }} pp.
          </template>
          <template v-else-if="winnerLabel === 'tie'">
            The portfolio and the {{ benchmarkLabel || 'benchmark' }} returned roughly the same this
            year.
          </template>
        </p>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.ard-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}
.ard-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ard-section-h {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
  margin: 14px 0 6px;
}
.ard-section-h:first-child {
  margin-top: 0;
}
.ard-metrics dl {
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
.m-row dd.up {
  color: var(--gain);
}
.m-row dd.down {
  color: var(--loss);
}
.ard-chart-wrap {
  min-width: 0;
}
.ard-chart {
  width: 100%;
  height: 280px;
}
.ard-blurb {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.6;
  margin: 16px 0 0;
}

@media (max-width: 720px) {
  .ard-body {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .ard-chart {
    height: 220px;
  }
  .ard-section-h {
    margin: 10px 0 4px;
  }
}
</style>
