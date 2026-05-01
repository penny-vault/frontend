import type { EChartsOption } from 'echarts'
import { formatCurrency, formatDate } from './format'

export interface ChartTheme {
  fontFamily: string
  axisLabel: string
  axisLine: string
  gridLine: string
  portfolioLine: string
  portfolioArea1: string
  portfolioArea2: string
  benchmarkLine: string
  benchmarkArea?: string
  benchmarkDash?: boolean
  ddFill: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  tooltipMuted: string
  tooltipShadow?: string
  smooth?: boolean
  legend?: boolean
  gridLeft?: number
  gridRight?: number
  hoverFill?: string
  hoverBorder?: string
  hoverLine?: string
  focusFill?: string
  focusBorder?: string
  lineGlow?: boolean
  lineGlowColor?: string
}

export interface TimeSeries {
  dates: number[]
  portfolio: number[]
  benchmark: number[]
}

export interface DrawdownRange {
  start: string
  trough?: string
  recovery?: string | null
  depth: number
  days?: number
}

export const ranges = [
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1y' },
  { key: '3Y', label: '3y' },
  { key: '5Y', label: '5y' },
  { key: '10Y', label: '10y' },
  { key: 'ALL', label: 'All' }
] as const

export type RangeKey = (typeof ranges)[number]['key']

export function rangeToSpan(key: string): { from: number; to: number } | null {
  const now = new Date()
  const from = new Date(now)
  switch (key) {
    case 'YTD':
      from.setMonth(0, 1)
      break
    case '1Y':
      from.setFullYear(now.getFullYear() - 1)
      break
    case '3Y':
      from.setFullYear(now.getFullYear() - 3)
      break
    case '5Y':
      from.setFullYear(now.getFullYear() - 5)
      break
    case '10Y':
      from.setFullYear(now.getFullYear() - 10)
      break
    default:
      return null
  }
  return { from: from.getTime(), to: now.getTime() }
}

interface BuildValueChartOptionArgs {
  series: TimeSeries
  drawDowns?: DrawdownRange[]
  range?: RangeKey | string | null
  logScale?: boolean
  showDrawDowns?: boolean
  theme: ChartTheme
}

export function buildValueChartOption({
  series,
  drawDowns = [],
  range,
  logScale = false,
  showDrawDowns = false,
  theme
}: BuildValueChartOptionArgs): EChartsOption {
  const span = range ? rangeToSpan(range) : null
  const dates = series.dates
  const portfolio = series.portfolio
  const benchmark = series.benchmark
  const lastDate = dates.length > 0 ? dates[dates.length - 1] : undefined

  const ddAreas =
    showDrawDowns && lastDate !== undefined
      ? drawDowns
          .slice(0, 10)
          .map((d) => [
            { xAxis: new Date(d.start).getTime(), itemStyle: { color: theme.ddFill } },
            { xAxis: d.recovery ? new Date(d.recovery).getTime() : lastDate }
          ])
      : []

  return {
    animation: true,
    animationDuration: 500,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: theme.fontFamily },
    dataZoom: [{ type: 'inside', filterMode: 'none' }],
    grid: { left: theme.gridLeft ?? 56, right: theme.gridRight ?? 16, top: 28, bottom: 44 },
    legend: theme.legend
      ? {
          data: ['Portfolio', 'Benchmark'],
          left: 0,
          top: 0,
          textStyle: { color: theme.axisLabel, fontFamily: theme.fontFamily, fontSize: 12 },
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 4
        }
      : { show: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily, fontSize: 12 },
      extraCssText: `box-shadow: ${theme.tooltipShadow ?? '0 6px 24px rgba(0,0,0,0.12)'};`,
      formatter: (raw: unknown) => {
        // ECharts tooltip formatter param is a wide union (single | array). For an axis-trigger
        // line chart it's always an array of CallbackDataParams. Narrow once and trust at runtime.
        const params = raw as {
          axisValue: string | number
          color: string
          seriesName: string
          value: [number, number]
        }[]
        const first = params[0]
        if (!first) return ''
        const d = formatDate(first.axisValue, { month: 'short', day: 'numeric', year: 'numeric' })
        const rows = params
          .map(
            (p) =>
              `<div style="display:flex;justify-content:space-between;gap:18px;align-items:center;">
                <span style="display:inline-flex;align-items:center;gap:6px;">
                  <span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>
                  <span style="color:${theme.tooltipMuted}">${p.seriesName}</span>
                </span>
                <span style="font-variant-numeric:tabular-nums;font-weight:600;">${formatCurrency(p.value[1])}</span>
              </div>`
          )
          .join('')
        return `<div style="min-width:220px;">
          <div style="color:${theme.tooltipMuted};font-size:11px;margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase;">${d}</div>
          ${rows}
        </div>`
      }
    },
    xAxis: {
      type: 'time',
      min: span ? span.from : undefined,
      max: span ? span.to : undefined,
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: theme.axisLabel, fontSize: 11, hideOverlap: true },
      splitLine: { show: false }
    },
    yAxis: {
      type: logScale ? 'log' : 'value',
      scale: true,
      position: 'left',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.axisLabel,
        fontSize: 11,
        formatter: (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)
      },
      splitLine: { lineStyle: { color: theme.gridLine, type: 'solid' } }
    },
    series: [
      {
        name: 'Benchmark',
        type: 'line',
        showSymbol: false,
        smooth: theme.smooth ?? true,
        sampling: 'lttb',
        lineStyle: {
          color: theme.benchmarkLine,
          width: 1.5,
          type: theme.benchmarkDash ? 'dashed' : 'solid'
        },
        itemStyle: { color: theme.benchmarkLine },
        areaStyle: theme.benchmarkArea
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: theme.benchmarkArea },
                  { offset: 1, color: 'transparent' }
                ]
              }
            }
          : undefined,
        data: dates.map((d, i) => [d, benchmark[i]]),
        z: 1
      },
      {
        name: 'Portfolio',
        type: 'line',
        showSymbol: false,
        smooth: theme.smooth ?? true,
        sampling: 'lttb',
        lineStyle: {
          color: theme.portfolioLine,
          width: 2.2,
          shadowBlur: theme.lineGlow ? 14 : 0,
          shadowColor: theme.lineGlowColor
        },
        itemStyle: { color: theme.portfolioLine },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: theme.portfolioArea1 },
              { offset: 1, color: theme.portfolioArea2 }
            ]
          }
        },
        markArea: ddAreas.length
          ? {
              silent: true,
              itemStyle: { color: theme.ddFill, opacity: 1 },
              data: ddAreas
            }
          : undefined,
        data: dates.map((d, i) => [d, portfolio[i]]),
        z: 2
      }
    ]
  } as EChartsOption
}

export function buildSparkOption({
  series,
  color,
  bg
}: {
  series: TimeSeries
  color: string
  bg: string
}): EChartsOption {
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: { show: false },
    series: [
      {
        type: 'line',
        showSymbol: false,
        smooth: true,
        sampling: 'lttb',
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: bg },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        data: series.dates.map((d, i) => [d, series.portfolio[i]])
      }
    ]
  } as EChartsOption
}
