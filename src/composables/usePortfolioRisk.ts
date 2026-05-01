// src/composables/usePortfolioRisk.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { Portfolio, PortfolioPerformance, Drawdown } from '@/api/endpoints/portfolios'
import { toMonthly, toDrawdownSeries, type DailyPoint } from '@/util/returns'
import { annualizedVol, rollingVolatility, percentileOf } from '@/util/risk'

export interface DrawdownEpisode {
  start: string
  trough: string
  recovery: string // only include recovered episodes
  depth: number // non-positive decimal
  totalDays: number // start → recovery
  recoveryDays: number // trough → recovery
  label: string // "Mar 2020" style anchor of `start`
}

export interface CrisisPoint {
  date: string
  portfolio: number // drawdown, ≤ 0
  benchmark: number // benchmark drawdown during the same window, computed from its own peak
}

export interface CrisisEpisode {
  label: string
  start: string
  recovery: string
  depth: number
  benchmarkDepth: number
  days: CrisisPoint[]
  description: string
  reveals: string
}

export interface WinLoss {
  positive: number
  total: number
}

export interface VolGauge {
  current: number // annualized decimal
  history: number[] // all rolling-12M vol values (annualized decimals)
  percentile: number // 0-100, where `current` falls in `history`
}

export interface CaptureData {
  up: number | null // 1.0 = 100% capture; null if no data
  down: number | null
}

export interface Verdict {
  portfolioVol: number
  benchmarkVol: number
  pctLosingMonths: number
  maxDd: number
  longestRecoveryMonths: number
}

export interface PortfolioRiskDerived {
  winLoss: WinLoss
  capture: CaptureData
  episodes: DrawdownEpisode[]
  crisisEpisodes: CrisisEpisode[]
  volGauge: VolGauge
  verdict: Verdict
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}`
}

interface KnownCrisis {
  name: string
  start: string
  end: string
  description: string
  reveals: string
}

// Named market crises with windows wide enough to show both the drop and the bulk of recovery.
const KNOWN_CRISES: KnownCrisis[] = [
  {
    name: 'Black Monday',
    start: '1987-09-01',
    end: '1988-06-30',
    description:
      'The largest single-day stock-market drop in history — the Dow fell 22.6% on Oct 19, 1987, driven by programmatic selling and panic.',
    reveals: 'Behavior under a sudden liquidity shock, without an underlying recession.'
  },
  {
    name: 'Dot-com bust',
    start: '2000-03-01',
    end: '2002-12-31',
    description:
      'A prolonged tech-led bear market as speculative internet-era valuations collapsed; the S&P 500 fell ~49% over roughly 2½ years.',
    reveals: 'How growth-stock concentration unwinds across a multi-year grind.'
  },
  {
    name: 'Global financial crisis',
    start: '2007-10-01',
    end: '2009-12-31',
    description:
      'The worst broad bear market since the 1930s, sparked by US housing and credit collapse; the S&P 500 fell ~57% peak-to-trough.',
    reveals: 'Behavior when every risk premium blows out at the same time.'
  },
  {
    name: 'Eurozone debt crisis',
    start: '2011-04-01',
    end: '2012-02-28',
    description:
      'Sovereign debt fears in Greece, Italy and Spain roiled global markets through 2011; US equity fell ~19% from April peak.',
    reveals: 'Sensitivity to a credit and contagion scare without a deep US recession.'
  },
  {
    name: 'Oil rout',
    start: '2015-07-01',
    end: '2016-09-30',
    description:
      'Crude oil collapsed from ~$100 to under $30 alongside a China growth scare; equity and credit sold off in waves.',
    reveals: 'Sensitivity to commodity cycles and emerging-market contagion.'
  },
  {
    name: 'Brexit vote',
    start: '2016-06-20',
    end: '2016-09-30',
    description:
      'The surprise UK referendum result on June 23, 2016 caused sharp FX and equity moves overnight before markets recovered.',
    reveals: 'Behavior around short, sharp political and FX shocks.'
  },
  {
    name: 'Volmageddon',
    start: '2018-02-01',
    end: '2018-05-31',
    description:
      'A sudden spike in the VIX on Feb 5, 2018 triggered the collapse of the short-volatility complex and a ~10% equity correction in days.',
    reveals: 'Exposure to vol-targeting, derivative-linked, or leveraged-risk strategies.'
  },
  {
    name: 'Q4 2018 selloff',
    start: '2018-09-01',
    end: '2019-04-30',
    description:
      'Fed rate hikes and trade-war fears drove US stocks down ~19% from peak into Christmas Eve 2018 before a sharp rebound.',
    reveals: 'Sensitivity to central-bank tightening and policy fear.'
  },
  {
    name: 'COVID crash',
    start: '2020-02-01',
    end: '2020-09-30',
    description:
      'A pandemic-driven crash saw the S&P 500 fall 34% in just 23 trading days before a sharp V-shaped recovery on stimulus.',
    reveals: 'Behavior under a fast crisis followed by aggressive monetary and fiscal response.'
  },
  {
    name: '2022 bear market',
    start: '2022-01-01',
    end: '2024-01-31',
    description:
      'Stocks and bonds fell together as the Fed raised rates to fight 40-year-high inflation; the S&P 500 fell ~25% and bonds had their worst year on record.',
    reveals: 'Exposure when the stock-bond correlation flips and classic diversifiers fail.'
  },
  {
    name: 'Banking stress',
    start: '2023-03-01',
    end: '2023-05-31',
    description:
      'The March 2023 collapse of Silicon Valley Bank triggered a regional-banking panic and sharp financial-sector selloff.',
    reveals: 'Sensitivity to idiosyncratic financial-sector stress.'
  },
  {
    name: 'Yield spike',
    start: '2023-07-01',
    end: '2024-01-31',
    description:
      '10-year Treasury yields surged toward 5% through October 2023, battering long-duration assets before retracing into year-end.',
    reveals: 'Duration exposure and rate sensitivity.'
  }
]

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function sliceByDate(days: DailyPoint[], startISO: string, endISO: string): DailyPoint[] {
  return days.filter((d) => d.date >= startISO && d.date <= endISO)
}

function toCrisisPoints(window: DailyPoint[]): CrisisPoint[] {
  if (window.length === 0) return []
  let pPeak = window[0]!.portfolioValue
  let bPeak = window[0]!.benchmarkValue
  const out: CrisisPoint[] = []
  for (const d of window) {
    if (d.portfolioValue > pPeak) pPeak = d.portfolioValue
    if (d.benchmarkValue > bPeak) bPeak = d.benchmarkValue
    out.push({
      date: d.date,
      portfolio: pPeak === 0 ? 0 : d.portfolioValue / pPeak - 1,
      benchmark: bPeak === 0 ? 0 : d.benchmarkValue / bPeak - 1
    })
  }
  return out
}

export function usePortfolioRisk(
  portfolio: Ref<Portfolio | undefined>,
  measurements: Ref<PortfolioPerformance | undefined>,
  drawdowns: Ref<Drawdown[] | undefined>
): ComputedRef<PortfolioRiskDerived | null> {
  return computed<PortfolioRiskDerived | null>(() => {
    const p = portfolio.value
    const m = measurements.value
    if (!p || !m || !m.points || m.points.length === 0) return null

    const days: DailyPoint[] = m.points.map((pt) => ({
      date: pt.date,
      portfolioValue: pt.portfolioValue,
      benchmarkValue: pt.benchmarkValue
    }))
    const monthly = toMonthly(days)

    // Win/loss
    const positive = monthly.reduce((n, mr) => (mr.portfolio > 0 ? n + 1 : n), 0)
    const winLoss: WinLoss = { positive, total: monthly.length }

    // Capture: computed from monthly returns
    let upPortSum = 0,
      upBenchSum = 0,
      downPortSum = 0,
      downBenchSum = 0
    for (const mr of monthly) {
      if (mr.benchmark > 0) {
        upPortSum += mr.portfolio
        upBenchSum += mr.benchmark
      } else if (mr.benchmark < 0) {
        downPortSum += mr.portfolio
        downBenchSum += mr.benchmark
      }
    }
    const capture: CaptureData = {
      up: upBenchSum !== 0 ? upPortSum / upBenchSum : null,
      down: downBenchSum !== 0 ? downPortSum / downBenchSum : null
    }

    // Drawdown episodes — only the ones that recovered
    const episodes: DrawdownEpisode[] = (drawdowns.value ?? [])
      .filter((d): d is typeof d & { recovery: string } => typeof d.recovery === 'string')
      .map((d) => ({
        start: d.start,
        trough: d.trough,
        recovery: d.recovery,
        depth: d.depth,
        totalDays: daysBetween(d.start, d.recovery),
        recoveryDays: daysBetween(d.trough, d.recovery),
        label: monthLabel(d.start)
      }))

    // Crisis small-multiples — one card per known market crisis overlapping the measurement range
    const dataStart = days[0]!.date
    const dataEnd = days[days.length - 1]!.date
    const crisisEpisodes: CrisisEpisode[] = []
    for (const crisis of KNOWN_CRISES) {
      const winStart = crisis.start > dataStart ? crisis.start : dataStart
      const winEnd = crisis.end < dataEnd ? crisis.end : dataEnd
      if (winStart >= winEnd) continue
      const window = toCrisisPoints(sliceByDate(days, winStart, winEnd))
      if (window.length < 2) continue
      let portfolioDepth = 0
      let benchmarkDepth = 0
      for (const pt of window) {
        if (pt.portfolio < portfolioDepth) portfolioDepth = pt.portfolio
        if (pt.benchmark < benchmarkDepth) benchmarkDepth = pt.benchmark
      }
      crisisEpisodes.push({
        label: crisis.name,
        start: winStart,
        recovery: winEnd,
        depth: portfolioDepth,
        benchmarkDepth,
        days: window,
        description: crisis.description,
        reveals: crisis.reveals
      })
    }

    // Vol gauge
    const rv = rollingVolatility(monthly, 12)
    const history = rv.map((pt) => pt.portfolio)
    const current = history.length > 0 ? history[history.length - 1]! : 0
    const volGauge: VolGauge = {
      current,
      history,
      percentile: history.length === 0 ? 0 : percentileOf(current, history)
    }

    // Verdict inputs
    const dd = toDrawdownSeries(days)
    const maxDd = dd.reduce((lo, pt) => (pt.portfolio < lo ? pt.portfolio : lo), 0)
    const longestRecoveryMonths =
      episodes.length === 0 ? 0 : Math.max(...episodes.map((e) => e.recoveryDays)) / 30
    const portfolioVol = annualizedVol(monthly.map((mr) => mr.portfolio))
    const benchmarkVol = annualizedVol(monthly.map((mr) => mr.benchmark))
    const pctLosingMonths = monthly.length === 0 ? 0 : 1 - positive / monthly.length

    const verdict: Verdict = {
      portfolioVol,
      benchmarkVol,
      pctLosingMonths,
      maxDd,
      longestRecoveryMonths
    }

    return { winLoss, capture, episodes, crisisEpisodes, volGauge, verdict }
  })
}
