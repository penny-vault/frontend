<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import Checkbox from 'primevue/checkbox'
import Panel from '@/components/ui/Panel.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import FocusBanner from '@/components/ui/FocusBanner.vue'
import type { EChartsOption } from 'echarts'
import {
  buildValueChartOption,
  ranges,
  rangeToSpan,
  type ChartTheme,
  type DrawdownRange,
  type RangeKey,
  type TimeSeries
} from '@/util/chart'
import { formatPercent, formatDate, formatCurrency, formatSignedPercent } from '@/util/format'
import { prefersReducedMotion } from '@/util/motion'

const props = defineProps<{
  series: TimeSeries
  drawdowns: DrawdownRange[]
  theme: ChartTheme
  benchmarkLabel: string
  /** Currently hovered drawdown (from the drawdown list panel) */
  hoveredDrawdown?: DrawdownRange | null
  /** Currently focused/pinned drawdown */
  focusedDrawdown?: DrawdownRange | null
}>()

const emit = defineEmits<{
  'update:focusedDrawdown': [value: DrawdownRange | null]
}>()

const range = ref<RangeKey>('ALL')
const logScale = ref(false)
const showDrawDowns = ref(true)

const DAY_MS = 86400000

// ── Click-to-anchor delta tooltip ─────────────────────────────────────────────
const chartRef = ref()
const anchor = ref<{ date: number; portfolio: number; benchmark: number } | null>(null)

function nearestPoint(ts: number) {
  const { dates, portfolio, benchmark } = props.series
  if (!dates.length) return null
  let best = 0,
    bestDiff = Infinity
  for (let i = 0; i < dates.length; i++) {
    const d = Math.abs(dates[i]! - ts)
    if (d < bestDiff) {
      bestDiff = d
      best = i
    }
  }
  return { date: dates[best]!, portfolio: portfolio[best]!, benchmark: benchmark[best]! }
}

function onZrClick(e: { offsetX: number; offsetY: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (chartRef.value as any)?.convertFromPixel({ seriesIndex: 1 }, [
    e.offsetX,
    e.offsetY
  ]) as [number, number] | null
  if (!r) return // clicked outside the plot area
  anchor.value = anchor.value ? null : nearestPoint(r[0])
}

function drawdownSpan(d: DrawdownRange, padDays = 90) {
  const from = new Date(d.start).getTime() - padDays * DAY_MS
  const end = d.recovery ? new Date(d.recovery).getTime() : Date.now()
  const to = end + padDays * DAY_MS
  return { from, to }
}

const chartOption = computed(() => {
  const t = props.theme
  const anchorSnap = anchor.value // reactive dep — used in formatter + markLine
  // We mutate the option after construction to layer in animation, focus zoom,
  // and drawdown highlights. The cast narrows the EChartsOption shape to the
  // tuple of two series we actually emit, so series[1] is guaranteed defined
  // and field-name typos on xAxis/series are still caught.
  type MutableMarkArea = { silent?: boolean; data?: unknown[] } | undefined
  type MutableMarkLine =
    | {
        silent?: boolean
        symbol?: string
        lineStyle?: object
        label?: object
        data?: unknown[]
        animation?: boolean
      }
    | undefined
  type ValueChartShape = EChartsOption & {
    series: [
      { markArea?: MutableMarkArea; markLine?: MutableMarkLine },
      { markArea?: MutableMarkArea; markLine?: MutableMarkLine }
    ]
    xAxis: { min?: number; max?: number }
  }
  const opt = buildValueChartOption({
    series: props.series,
    drawDowns: props.drawdowns,
    range: props.focusedDrawdown ? null : range.value === 'ALL' ? null : range.value,
    logScale: logScale.value,
    showDrawDowns: showDrawDowns.value,
    theme: t
  }) as ValueChartShape
  if (!prefersReducedMotion()) {
    opt.animationDuration = 1000
    opt.animationEasing = 'cubicOut'
    opt.animationDurationUpdate = 450
    opt.animationEasingUpdate = 'cubicOut'
  }

  // Focus zoom: focusedDrawdown overrides xAxis; otherwise hoveredDrawdown may expand it
  if (props.focusedDrawdown) {
    const span = drawdownSpan(props.focusedDrawdown, 120)
    opt.xAxis.min = span.from
    opt.xAxis.max = span.to
  } else if (props.hoveredDrawdown) {
    // On hover, if the drawdown is outside the currently-visible range,
    // expand the x-axis to include it + its surroundings so the highlight
    // is actually visible and the chart visibly responds to the hover.
    const dd = props.hoveredDrawdown
    const ddBegin = new Date(dd.start).getTime()
    const ddEnd = dd.recovery ? new Date(dd.recovery).getTime() : Date.now()

    const currentSpan = range.value === 'ALL' ? null : rangeToSpan(range.value)
    const pad = 90 * DAY_MS

    if (currentSpan) {
      const outOfRange = ddEnd < currentSpan.from || ddBegin > currentSpan.to
      if (outOfRange) {
        opt.xAxis.min = Math.min(ddBegin - pad, currentSpan.from)
        opt.xAxis.max = Math.max(ddEnd + pad, currentSpan.to)
      }
    }
  }

  // Highlight the hovered/focused drawdown with a distinct markArea overlay.
  // When a row is focused we replace all drawdown areas with just that one
  // styled brightly; on hover (without focus) we add a brighter highlight on
  // top of the normal dim overlay.
  const highlight = props.focusedDrawdown || props.hoveredDrawdown
  if (highlight) {
    const start = new Date(highlight.start).getTime()
    const end = highlight.recovery ? new Date(highlight.recovery).getTime() : Date.now()
    const isFocused = props.focusedDrawdown === highlight
    const fillColor = isFocused ? t.focusFill : t.hoverFill
    const borderColor = isFocused ? t.focusBorder : t.hoverBorder

    const highlightArea = [
      {
        xAxis: start,
        itemStyle: {
          color: fillColor,
          borderColor,
          borderWidth: 1.5,
          borderType: 'dashed'
        }
      },
      { xAxis: end }
    ]

    if (isFocused) {
      // When focused, show only the focused area — cleaner for zoomed-in view
      opt.series[1].markArea = {
        silent: true,
        data: [highlightArea]
      }
    } else {
      // Hover preview: keep existing dd overlay, append brighter highlight
      const existing = opt.series[1].markArea?.data || []
      opt.series[1].markArea = {
        silent: true,
        data: [...existing, highlightArea]
      }
    }

    // Add a glowing mark line at the trough for extra clarity
    if (!isFocused) {
      opt.series[1].markLine = {
        silent: true,
        symbol: 'none',
        lineStyle: {
          color: t.hoverLine,
          width: 1,
          type: 'solid',
          opacity: 0.6
        },
        label: { show: false },
        data: [{ xAxis: start }, { xAxis: end }],
        animation: false
      }
    }
  }
  // Anchor vertical line
  if (anchorSnap) {
    const anchorItem = {
      xAxis: anchorSnap.date,
      lineStyle: { color: t.portfolioLine, width: 1.5, type: 'dashed', opacity: 0.8 }
    }
    if (opt.series[1].markLine) {
      ;(opt.series[1].markLine as { data?: unknown[] }).data = [
        ...((opt.series[1].markLine as { data?: unknown[] }).data ?? []),
        anchorItem
      ]
    } else {
      opt.series[1].markLine = {
        silent: true,
        symbol: 'none',
        label: { show: false },
        animation: false,
        data: [anchorItem]
      } as MutableMarkLine
    }
  }

  // Tooltip formatter — extended with delta section when anchor is set.
  // We do our own nearest-point lookup instead of relying on params because
  // LTTB sampling can cause ECharts to omit one series from params at certain
  // cursor positions, which would silently drop a row.
  ;(opt as EChartsOption & { tooltip: { formatter: unknown } }).tooltip.formatter = (
    raw: unknown
  ) => {
    type Param = { axisValue: number; color: string; seriesName: string; value: [number, number] }
    const params = raw as Param[]
    const first = params[0]
    if (!first) return ''

    const ts = typeof first.axisValue === 'number' ? first.axisValue : Number(first.axisValue)
    const snap = nearestPoint(ts)
    if (!snap) return ''

    const d = formatDate(ts, { month: 'short', day: 'numeric', year: 'numeric' })

    // Resolve per-series colors from ECharts params (reliable even when LTTB drops a series)
    const colorOf: Record<string, string> = {}
    for (const p of params) colorOf[p.seriesName] = p.color

    const makeRow = (label: string, color: string, value: number) =>
      `<div style="display:flex;justify-content:space-between;gap:18px;align-items:center;">
        <span style="display:inline-flex;align-items:center;gap:6px;">
          <span style="display:inline-block;width:8px;height:8px;background:${color};border-radius:2px;"></span>
          <span style="color:${t.tooltipMuted}">${label}</span>
        </span>
        <span style="font-variant-numeric:tabular-nums;font-weight:600;">${formatCurrency(value)}</span>
      </div>`

    const rows = [
      makeRow('Benchmark', colorOf['Benchmark'] ?? t.benchmarkLine, snap.benchmark),
      makeRow('Portfolio', colorOf['Portfolio'] ?? t.portfolioLine, snap.portfolio)
    ].join('')

    let deltaHtml = ''
    if (anchorSnap) {
      const mkDeltaRow = (label: string, current: number, base: number) => {
        const delta = current - base
        const pct = base !== 0 ? delta / base : 0
        const clr = delta >= 0 ? 'var(--gain)' : 'var(--loss)'
        const ccy = (delta >= 0 ? '+' : '') + formatCurrency(delta)
        return `<div style="display:flex;justify-content:space-between;gap:18px;align-items:center;margin-top:3px;">
          <span style="color:${t.tooltipMuted};font-size:11px;">Δ ${label}</span>
          <span style="font-variant-numeric:tabular-nums;font-size:11px;color:${clr};">
            ${ccy}&nbsp;&nbsp;${formatSignedPercent(pct)}
          </span>
        </div>`
      }

      const deltaRows = [
        mkDeltaRow('Benchmark', snap.benchmark, anchorSnap.benchmark),
        mkDeltaRow('Portfolio', snap.portfolio, anchorSnap.portfolio)
      ].join('')

      const anchorDateStr = formatDate(anchorSnap.date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      deltaHtml = `<div style="border-top:1px solid ${t.tooltipBorder};margin-top:8px;padding-top:6px;">
        <div style="color:${t.tooltipMuted};font-size:10px;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:2px;">from ${anchorDateStr}</div>
        ${deltaRows}
      </div>`
    }

    return `<div style="min-width:220px;">
      <div style="color:${t.tooltipMuted};font-size:11px;margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase;">${d}</div>
      ${rows}${deltaHtml}
    </div>`
  }

  return opt
})
</script>

<template>
  <Panel class="chart-panel">
    <template #header>
      <div>
        <h2>Portfolio value</h2>
        <p class="panel-sub">Growth of $100,000 · {{ benchmarkLabel }} overlay</p>
      </div>
      <div class="tools">
        <SegmentedControl :options="ranges" v-model="range" />
        <div class="toggle">
          <Checkbox v-model="logScale" :binary="true" inputId="logScale" />
          <label for="logScale">Log</label>
        </div>
        <div class="toggle">
          <Checkbox v-model="showDrawDowns" :binary="true" inputId="showDD" />
          <label for="showDD">DD overlay</label>
        </div>
      </div>
    </template>
    <div class="legend-row">
      <span class="lg port"><i /> Portfolio</span>
      <span class="lg bench"><i /> {{ benchmarkLabel }}</span>
      <span class="lg dd" v-if="showDrawDowns && !focusedDrawdown"><i /> Drawdowns</span>
      <span class="lg focus" v-if="focusedDrawdown"><i /> Focused drawdown</span>
    </div>

    <FocusBanner :visible="!!focusedDrawdown" @clear="emit('update:focusedDrawdown', null)">
      <span class="fb-title">
        Focused on
        <strong class="fb-depth">{{ formatPercent(focusedDrawdown!.depth) }}</strong>
        drawdown
      </span>
      <span class="fb-dates">
        {{
          formatDate(focusedDrawdown!.start, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        }}
        <span class="fb-arr">→</span>
        {{
          focusedDrawdown!.recovery
            ? formatDate(focusedDrawdown!.recovery, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'ongoing'
        }}
      </span>
    </FocusBanner>

    <VChart ref="chartRef" class="chart" :option="chartOption" autoresize @zr:click="onZrClick" />
  </Panel>
</template>

<style scoped>
.chart-panel :deep(.tools) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tools {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  transition: color 180ms ease;
}
.toggle:hover {
  color: var(--text-1);
}
.toggle label {
  cursor: pointer;
}

.legend-row {
  display: flex;
  gap: 18px;
  font-size: 12px;
  color: var(--text-2);
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lg i {
  display: inline-block;
  width: 14px;
  height: 2.5px;
  border-radius: 1px;
}
.lg.port i {
  background: var(--primary);
}
.lg.bench i {
  background: var(--secondary);
}
.lg.dd i {
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  height: 10px;
  border-radius: 2px;
}
.lg.focus {
  color: var(--primary);
}
.lg.focus i {
  background: var(--primary-soft-15);
  border: 1px dashed var(--primary-glow);
  height: 10px;
  border-radius: 2px;
}

.chart {
  height: 340px;
}
</style>
