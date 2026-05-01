// tests/unit/returns.spec.ts
import { describe, it, expect } from 'vitest'
import {
  toMonthly,
  toAnnual,
  rollingCAGR,
  rollingExcess,
  linearRegression,
  returnStats,
  toDrawdownSeries
} from '@/util/returns'
import type { DailyPoint, MonthlyReturn } from '@/util/returns'

// Helper: build a daily point
const dp = (date: string, portfolio: number, benchmark: number): DailyPoint => ({
  date,
  portfolioValue: portfolio,
  benchmarkValue: benchmark
})

describe('util/returns', () => {
  it.skip('placeholder', () => {})
})

describe('toMonthly', () => {
  it('returns an empty array when given fewer than two months', () => {
    const days = [dp('2024-01-05', 100, 100), dp('2024-01-31', 110, 105)]
    expect(toMonthly(days)).toEqual([])
  })

  it('compounds between month-end anchors', () => {
    const days = [
      dp('2024-01-31', 100, 100),
      dp('2024-02-29', 110, 104), // Feb: +10% / +4%
      dp('2024-03-29', 121, 108.16) // Mar: +10% / +4%
    ]
    const result = toMonthly(days)
    expect(result).toHaveLength(2)
    expect(result[0]!.year).toBe(2024)
    expect(result[0]!.month).toBe(2)
    expect(result[0]!.portfolio).toBeCloseTo(0.1, 10)
    expect(result[0]!.benchmark).toBeCloseTo(0.04, 10)
    expect(result[1]!.portfolio).toBeCloseTo(0.1, 10)
    expect(result[1]!.benchmark).toBeCloseTo(0.04, 10)
  })

  it('uses the last daily value in each month as the month-end value', () => {
    const days = [
      dp('2024-01-31', 100, 100),
      dp('2024-02-05', 99, 101),
      dp('2024-02-28', 110, 104), // this is the Feb EOM value
      dp('2024-02-29', 110, 104)
    ]
    const result = toMonthly(days)
    expect(result).toHaveLength(1)
    expect(result[0]!.year).toBe(2024)
    expect(result[0]!.month).toBe(2)
    expect(result[0]!.portfolio).toBeCloseTo(0.1, 10)
    expect(result[0]!.benchmark).toBeCloseTo(0.04, 10)
  })
})

describe('toAnnual', () => {
  it('compounds monthly returns into full-year returns', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: 0.01, // (1.01)^12 - 1 ≈ 0.12682503
      benchmark: 0.005 // (1.005)^12 - 1 ≈ 0.06167781
    }))
    const result = toAnnual(monthly)
    expect(result).toHaveLength(1)
    expect(result[0]!.year).toBe(2024)
    expect(result[0]!.portfolio).toBeCloseTo(0.12682503, 6)
    expect(result[0]!.benchmark).toBeCloseTo(0.06167781, 6)
    expect(result[0]!.delta).toBeCloseTo(0.12682503 - 0.06167781, 6)
  })

  it('handles multi-year input, partial years included', () => {
    const monthly: MonthlyReturn[] = [
      { year: 2023, month: 12, portfolio: 0.1, benchmark: 0.05 },
      { year: 2024, month: 1, portfolio: 0.02, benchmark: 0.01 },
      { year: 2024, month: 2, portfolio: -0.03, benchmark: 0.01 }
    ]
    const result = toAnnual(monthly)
    expect(result).toHaveLength(2)
    expect(result[0]!.year).toBe(2023)
    expect(result[0]!.portfolio).toBeCloseTo(0.1, 10)
    expect(result[0]!.benchmark).toBeCloseTo(0.05, 10)
    expect(result[0]!.delta).toBeCloseTo(0.05, 10)

    expect(result[1]!.year).toBe(2024)
    expect(result[1]!.portfolio).toBeCloseTo((1.02 * 0.97) - 1, 8)
    expect(result[1]!.benchmark).toBeCloseTo((1.01 * 1.01) - 1, 8)
    expect(result[1]!.delta).toBeCloseTo(((1.02 * 0.97) - 1) - ((1.01 * 1.01) - 1), 8)
  })

  it('returns empty array for empty input', () => {
    expect(toAnnual([])).toEqual([])
  })
})

describe('rollingCAGR', () => {
  it('returns empty when history is shorter than the window', () => {
    const monthly: MonthlyReturn[] = [
      { year: 2024, month: 1, portfolio: 0.01, benchmark: 0.005 },
      { year: 2024, month: 2, portfolio: 0.01, benchmark: 0.005 }
    ]
    expect(rollingCAGR(monthly, 12)).toEqual([])
  })

  it('annualizes a 12-month window of 1% monthly returns to ~12.68%', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: 0.01,
      benchmark: 0.005
    }))
    const result = rollingCAGR(monthly, 12)
    expect(result).toHaveLength(1)
    expect(result[0]!.date).toBe('2024-12-01')
    expect(result[0]!.portfolio).toBeCloseTo(0.12682503, 6)
    expect(result[0]!.benchmark).toBeCloseTo(0.06167781, 6)
  })

  it('slides the window and produces one point per valid end month', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 14 }, (_, i) => ({
      year: 2024 + Math.floor(i / 12),
      month: (i % 12) + 1,
      portfolio: 0.01,
      benchmark: 0.005
    }))
    const result = rollingCAGR(monthly, 12)
    expect(result.map((r) => r.date)).toEqual(['2024-12-01', '2025-01-01', '2025-02-01'])
  })

  it('handles 36- and 60-month windows correctly', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 60 }, (_, i) => ({
      year: 2020 + Math.floor(i / 12),
      month: (i % 12) + 1,
      portfolio: 0.005,
      benchmark: 0.004
    }))
    const result36 = rollingCAGR(monthly, 36)
    const result60 = rollingCAGR(monthly, 60)
    expect(result36.length).toBe(25) // months 36..60
    expect(result60.length).toBe(1)
    expect(result60[0]!.portfolio).toBeCloseTo(1.005 ** 12 - 1, 6)
  })
})

describe('rollingExcess', () => {
  it('returns empty when history is shorter than the window', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 5 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: 0.01,
      benchmark: 0.005
    }))
    expect(rollingExcess(monthly, 12)).toEqual([])
  })

  it('computes compounded excess return in decimal', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: 0.01,
      benchmark: 0.005
    }))
    const result = rollingExcess(monthly, 12)
    expect(result).toHaveLength(1)
    expect(result[0]!.date).toBe('2024-12-01')
    const expected = 1.01 ** 12 - 1.005 ** 12
    expect(result[0]!.value).toBeCloseTo(expected, 8)
  })

  it('slides over longer histories', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 13 }, (_, i) => ({
      year: 2024 + Math.floor(i / 12),
      month: (i % 12) + 1,
      portfolio: 0.01,
      benchmark: 0.005
    }))
    const result = rollingExcess(monthly, 12)
    expect(result.map((r) => r.date)).toEqual(['2024-12-01', '2025-01-01'])
  })
})

describe('linearRegression', () => {
  it('returns zeros for insufficient data', () => {
    expect(linearRegression([])).toEqual({ beta: 0, alpha: 0, r2: 0 })
    expect(linearRegression([{ x: 0.01, y: 0.02 }])).toEqual({ beta: 0, alpha: 0, r2: 0 })
  })

  it('recovers known beta=1, alpha=1 from y = x + 1', () => {
    const pairs = [1, 2, 3, 4, 5].map((x) => ({ x, y: x + 1 }))
    const r = linearRegression(pairs)
    expect(r.beta).toBeCloseTo(1, 10)
    expect(r.alpha).toBeCloseTo(1, 10)
    expect(r.r2).toBeCloseTo(1, 10)
  })

  it('recovers beta=2, alpha=0 from y = 2x', () => {
    const pairs = [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 * x }))
    const r = linearRegression(pairs)
    expect(r.beta).toBeCloseTo(2, 10)
    expect(r.alpha).toBeCloseTo(0, 10)
    expect(r.r2).toBeCloseTo(1, 10)
  })

  it('reports r² < 1 when data is noisy', () => {
    const pairs = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1.5 },
      { x: 3, y: 2.5 },
      { x: 4, y: 5 }
    ]
    const r = linearRegression(pairs)
    expect(r.r2).toBeGreaterThan(0.5)
    expect(r.r2).toBeLessThan(1)
  })
})

describe('returnStats', () => {
  const sampleMonthly: MonthlyReturn[] = [
    { year: 2024, month: 1, portfolio: 0.02, benchmark: 0.01 },
    { year: 2024, month: 2, portfolio: 0.03, benchmark: 0.02 },
    { year: 2024, month: 3, portfolio: -0.01, benchmark: 0.005 },
    { year: 2024, month: 4, portfolio: 0.04, benchmark: 0.01 },
    { year: 2024, month: 5, portfolio: 0.01, benchmark: 0.02 }
  ]

  it('returns zeros and nulls for empty input', () => {
    const s = returnStats([], [])
    expect(s.pctPositiveMonths).toBe(0)
    expect(s.longestPositiveStreak).toBe(0)
    expect(s.bestYear).toBeNull()
    expect(s.worstYear).toBeNull()
    expect(s.bestMonth).toBeNull()
    expect(s.worstMonth).toBeNull()
    expect(s.trackingError).toBe(0)
    expect(s.informationRatio).toBe(0)
    expect(s.activeReturn).toBe(0)
    expect(s.winRate).toBe(0)
  })

  it('counts positive months correctly', () => {
    const annual = toAnnual(sampleMonthly)
    const s = returnStats(sampleMonthly, annual)
    expect(s.pctPositiveMonths).toBeCloseTo(0.8, 6) // 4 of 5
  })

  it('tracks longest positive streak', () => {
    const annual = toAnnual(sampleMonthly)
    const s = returnStats(sampleMonthly, annual)
    // streaks: [+, +], [-], [+, +] → longest = 2
    expect(s.longestPositiveStreak).toBe(2)
  })

  it('identifies best and worst month by portfolio return', () => {
    const annual = toAnnual(sampleMonthly)
    const s = returnStats(sampleMonthly, annual)
    expect(s.bestMonth).toEqual({ year: 2024, month: 4, return: 0.04 })
    expect(s.worstMonth).toEqual({ year: 2024, month: 3, return: -0.01 })
  })

  it('identifies best and worst year by portfolio return', () => {
    const monthly: MonthlyReturn[] = [
      { year: 2023, month: 1, portfolio: 0.1, benchmark: 0.05 },
      { year: 2024, month: 1, portfolio: -0.05, benchmark: 0.02 }
    ]
    const annual = toAnnual(monthly)
    const s = returnStats(monthly, annual)
    expect(s.bestYear!.year).toBe(2023)
    expect(s.bestYear!.return).toBeCloseTo(0.1, 10)
    expect(s.worstYear!.year).toBe(2024)
    expect(s.worstYear!.return).toBeCloseTo(-0.05, 10)
  })

  it('computes tracking error as annualized stdev of excess returns', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: i % 2 === 0 ? 0.02 : 0.0,
      benchmark: 0.01
    }))
    const annual = toAnnual(monthly)
    const s = returnStats(monthly, annual)
    // excess alternates +0.01, -0.01, mean = 0, popStdev = 0.01
    // annualized = 0.01 * sqrt(12)
    expect(s.trackingError).toBeCloseTo(0.01 * Math.sqrt(12), 6)
  })

  it('computes information ratio as active return / tracking error', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: i % 2 === 0 ? 0.02 : 0.0,
      benchmark: 0.01
    }))
    const annual = toAnnual(monthly)
    const s = returnStats(monthly, annual)
    expect(s.informationRatio).toBeCloseTo(s.activeReturn / s.trackingError, 6)
  })

  it('computes win rate as fraction of months portfolio beat benchmark', () => {
    // sampleMonthly: 5 months, excesses = [+0.01, +0.01, -0.015, +0.03, -0.01]
    // 3 wins out of 5 → 0.6
    const annual = toAnnual(sampleMonthly)
    const s = returnStats(sampleMonthly, annual)
    expect(s.winRate).toBeCloseTo(0.6, 10)
  })

  it('win rate ignores ties (portfolio == benchmark)', () => {
    const monthly: MonthlyReturn[] = [
      { year: 2024, month: 1, portfolio: 0.01, benchmark: 0.01 },
      { year: 2024, month: 2, portfolio: 0.02, benchmark: 0.01 }
    ]
    const annual = toAnnual(monthly)
    const s = returnStats(monthly, annual)
    expect(s.winRate).toBeCloseTo(0.5, 10)
  })
})

describe('toDrawdownSeries', () => {
  it('returns empty array for empty input', () => {
    expect(toDrawdownSeries([])).toEqual([])
  })

  it('emits zero at peaks and negative values during drawdowns', () => {
    const days = [
      dp('2024-01-01', 100, 100), // initial
      dp('2024-01-02', 110, 105), // new peak for both
      dp('2024-01-03', 99, 100), // drawdown: -10%, -4.76%
      dp('2024-01-04', 121, 110) // new peak again (>110, >105)
    ]
    const series = toDrawdownSeries(days)
    expect(series).toHaveLength(4)
    expect(series[0]!.portfolio).toBeCloseTo(0, 10)
    expect(series[0]!.benchmark).toBeCloseTo(0, 10)
    expect(series[1]!.portfolio).toBeCloseTo(0, 10)
    expect(series[1]!.benchmark).toBeCloseTo(0, 10)
    expect(series[2]!.portfolio).toBeCloseTo(99 / 110 - 1, 10)
    expect(series[2]!.benchmark).toBeCloseTo(100 / 105 - 1, 10)
    expect(series[3]!.portfolio).toBeCloseTo(0, 10)
    expect(series[3]!.benchmark).toBeCloseTo(0, 10)
  })

  it('never emits positive drawdown values', () => {
    const days = [
      dp('2024-01-01', 100, 100),
      dp('2024-01-02', 80, 90),
      dp('2024-01-03', 120, 95),
      dp('2024-01-04', 100, 80)
    ]
    const series = toDrawdownSeries(days)
    for (const p of series) {
      expect(p.portfolio).toBeLessThanOrEqual(0)
      expect(p.benchmark).toBeLessThanOrEqual(0)
    }
  })
})
