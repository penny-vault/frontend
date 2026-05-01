// tests/unit/risk.spec.ts
import { describe, it, expect } from 'vitest'
import type { DailyPoint, MonthlyReturn } from '@/util/returns'
import { varQuantile, cvar, downsideDeviation, ulcerIndex, annualizedVol, calmar, pearson, regimeRegression, rollingVolatility, riskStats, percentileOf } from '@/util/risk'

const dp = (date: string, portfolio: number, benchmark: number): DailyPoint => ({
  date,
  portfolioValue: portfolio,
  benchmarkValue: benchmark
})

const mr = (year: number, month: number, portfolio: number, benchmark: number): MonthlyReturn => ({
  year,
  month,
  portfolio,
  benchmark
})

describe('util/risk', () => {
  it.skip('placeholder', () => {})

  describe('varQuantile', () => {
    it('returns 0 for an empty series', () => {
      expect(varQuantile([], 0.05)).toBe(0)
    })

    it('returns the single value when series has one element', () => {
      expect(varQuantile([-0.05], 0.05)).toBe(-0.05)
    })

    it('returns the 5th-percentile return using linear interpolation (NumPy default)', () => {
      // Sorted returns: -0.10, -0.08, -0.03, -0.01, 0.00, 0.02, 0.03, 0.05, 0.08, 0.10
      // 5th percentile at rank = 0.05 * (10 - 1) = 0.45
      // => -0.10 + 0.45 * (-0.08 - -0.10) = -0.091
      const returns = [-0.1, -0.08, -0.03, -0.01, 0.0, 0.02, 0.03, 0.05, 0.08, 0.1]
      expect(varQuantile(returns, 0.05)).toBeCloseTo(-0.091, 10)
    })

    it('returns the minimum at p=0 and the maximum at p=1', () => {
      const returns = [0.01, -0.05, 0.03, -0.02, 0.04]
      expect(varQuantile(returns, 0)).toBeCloseTo(-0.05, 10)
      expect(varQuantile(returns, 1)).toBeCloseTo(0.04, 10)
    })
  })

  describe('cvar', () => {
    it('returns 0 for an empty series', () => {
      expect(cvar([], 0.05)).toBe(0)
    })

    it('returns the average of returns at or below the VaR threshold', () => {
      // Sorted returns: -0.10, -0.08, -0.03, -0.01, 0.00, ...
      // VaR at 20% ≈ -0.076 (interp), tail = returns ≤ -0.076 = [-0.10, -0.08]
      // CVaR = mean([-0.10, -0.08]) = -0.09
      const returns = [-0.1, -0.08, -0.03, -0.01, 0.0, 0.02, 0.03, 0.05, 0.08, 0.1]
      expect(cvar(returns, 0.2)).toBeCloseTo(-0.09, 10)
    })

    it('returns the single minimum when p is small enough that only one observation qualifies', () => {
      const returns = [-0.1, -0.05, 0.0, 0.05, 0.1]
      // p=0.1 → VaR = -0.080 (interp). Tail = [-0.1]. CVaR = -0.1.
      expect(cvar(returns, 0.1)).toBeCloseTo(-0.1, 10)
    })

    it('equals the minimum when p=0 (only the worst value qualifies)', () => {
      const returns = [0.01, -0.05, 0.03, -0.02, 0.04]
      expect(cvar(returns, 0)).toBeCloseTo(-0.05, 10)
    })
  })

  describe('downsideDeviation', () => {
    it('returns 0 for an empty series', () => {
      expect(downsideDeviation([])).toBe(0)
    })

    it('returns 0 when all returns are non-negative', () => {
      expect(downsideDeviation([0.01, 0.02, 0.03, 0.0])).toBe(0)
    })

    it('annualizes the RMS of negative returns against a 0 threshold', () => {
      // Returns: [0.02, -0.05, 0.01, -0.03]
      // Downside deviations (clipped at 0): [0, -0.05, 0, -0.03]
      // Squared mean: (0 + 0.0025 + 0 + 0.0009) / 4 = 0.00085
      // Monthly downside stdev: sqrt(0.00085) ≈ 0.0291548
      // Annualized: 0.0291548 * sqrt(12) ≈ 0.1010024
      const returns = [0.02, -0.05, 0.01, -0.03]
      expect(downsideDeviation(returns)).toBeCloseTo(0.1010024, 4)
    })
  })

  describe('ulcerIndex', () => {
    it('returns 0 for an empty series', () => {
      expect(ulcerIndex([])).toBe(0)
    })

    it('returns 0 when every point is at a new peak', () => {
      const days: DailyPoint[] = [
        dp('2024-01-01', 100, 100),
        dp('2024-01-02', 110, 100),
        dp('2024-01-03', 120, 100)
      ]
      expect(ulcerIndex(days)).toBe(0)
    })

    it('is the RMS of portfolio drawdown across all daily points', () => {
      // Peak 100 → trough 80 → recover to 100.
      // Drawdowns (from peak 100): 0, -0.10, -0.20, -0.10, 0
      // Squared mean = (0 + 0.01 + 0.04 + 0.01 + 0) / 5 = 0.012
      // sqrt(0.012) ≈ 0.1095445
      const days: DailyPoint[] = [
        dp('2024-01-01', 100, 100),
        dp('2024-01-02', 90, 100),
        dp('2024-01-03', 80, 100),
        dp('2024-01-04', 90, 100),
        dp('2024-01-05', 100, 100)
      ]
      expect(ulcerIndex(days)).toBeCloseTo(0.1095445, 6)
    })
  })

  describe('annualizedVol', () => {
    it('returns 0 for fewer than two observations', () => {
      expect(annualizedVol([])).toBe(0)
      expect(annualizedVol([0.01])).toBe(0)
    })

    it('returns 0 when every return is identical (zero variance)', () => {
      expect(annualizedVol([0.01, 0.01, 0.01, 0.01])).toBe(0)
    })

    it('uses sample stdev (n-1) and annualizes by sqrt(12)', () => {
      // Returns: [0.02, -0.01, 0.03, -0.02, 0.01]
      // Mean = 0.006
      //   deviations: 0.014, -0.016, 0.024, -0.026, 0.004
      //   squared: 0.000196, 0.000256, 0.000576, 0.000676, 0.000016
      //   sum = 0.00172; /4 = 0.00043
      //   stdev ≈ 0.0207364
      //   annualized ≈ 0.0207364 * sqrt(12) ≈ 0.071833
      const returns = [0.02, -0.01, 0.03, -0.02, 0.01]
      expect(annualizedVol(returns)).toBeCloseTo(0.071833, 5)
    })
  })

  describe('calmar', () => {
    it('returns 0 when max drawdown is 0 (cannot divide)', () => {
      expect(calmar(0.1, 0)).toBe(0)
    })

    it('returns CAGR divided by the absolute value of max drawdown', () => {
      expect(calmar(0.12, -0.3)).toBeCloseTo(0.4, 10)
      expect(calmar(0.08, -0.2)).toBeCloseTo(0.4, 10)
    })

    it('handles negative CAGR (returns a negative Calmar)', () => {
      expect(calmar(-0.05, -0.1)).toBeCloseTo(-0.5, 10)
    })
  })

  describe('pearson', () => {
    it('returns null for fewer than two points', () => {
      expect(pearson([])).toBeNull()
      expect(pearson([{ x: 1, y: 1 }])).toBeNull()
    })

    it('returns null when either series has zero variance', () => {
      expect(pearson([{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }])).toBeNull()
      expect(pearson([{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }])).toBeNull()
    })

    it('returns 1.0 for perfectly correlated series', () => {
      const pts = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }, { x: 4, y: 8 }]
      expect(pearson(pts)).toBeCloseTo(1, 10)
    })

    it('returns -1.0 for perfectly anti-correlated series', () => {
      const pts = [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 1 }]
      expect(pearson(pts)).toBeCloseTo(-1, 10)
    })

    it('returns a value in (-1, 1) for imperfectly correlated series', () => {
      const pts = [{ x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 8 }]
      const r = pearson(pts)!
      expect(r).toBeGreaterThan(0.5)
      expect(r).toBeLessThan(1)
    })
  })

  describe('regimeRegression', () => {
    it('splits pairs by benchmark sign and fits each regime independently', () => {
      // Up pairs (benchmark ≥ 0): y = 1.5x + 0.01
      // Down pairs (benchmark < 0): y = 0.6x + 0.00
      const pairs = [
        { x: 0.04, y: 0.07 },    // up
        { x: 0.02, y: 0.04 },    // up
        { x: 0.00, y: 0.01 },    // up
        { x: -0.02, y: -0.012 }, // down
        { x: -0.05, y: -0.03 }   // down
      ]
      const { up, down, upFit, downFit } = regimeRegression(pairs)
      expect(up).toHaveLength(3)
      expect(down).toHaveLength(2)
      expect(upFit.beta).toBeCloseTo(1.5, 5)
      expect(downFit.beta).toBeCloseTo(0.6, 5)
    })

    it('returns empty regimes and zero fits when no points match', () => {
      const pairs = [
        { x: 0.01, y: 0.02 },
        { x: 0.02, y: 0.03 }
      ]
      const { up, down, downFit } = regimeRegression(pairs)
      expect(up).toHaveLength(2)
      expect(down).toHaveLength(0)
      expect(downFit.beta).toBe(0)
      expect(downFit.alpha).toBe(0)
    })
  })

  describe('rollingVolatility', () => {
    it('returns an empty array when fewer than windowMonths observations', () => {
      const monthly: MonthlyReturn[] = Array.from({ length: 11 }, (_, i) =>
        mr(2024, i + 1, 0.01, 0.005)
      )
      expect(rollingVolatility(monthly, 12)).toEqual([])
    })

    it('returns one point per month once the window is full', () => {
      const monthly: MonthlyReturn[] = Array.from({ length: 24 }, (_, i) =>
        mr(2023 + Math.floor(i / 12), (i % 12) + 1, 0.01, 0.005)
      )
      const result = rollingVolatility(monthly, 12)
      expect(result).toHaveLength(24 - 12 + 1) // 13 windows
      expect(result[0]!.date).toBe('2023-12-01')
    })

    it('annualizes sample stdev by sqrt(12) for each window', () => {
      // Alternating ±1% portfolio returns, zero benchmark returns.
      // Sample stdev of 12 alternating {+0.01, -0.01} ≈ 0.01044466.
      // Annualized ≈ 0.0361803.
      const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) =>
        mr(2024, i + 1, i % 2 === 0 ? 0.01 : -0.01, 0)
      )
      const result = rollingVolatility(monthly, 12)
      expect(result).toHaveLength(1)
      expect(result[0]!.portfolio).toBeCloseTo(0.0361803, 5)
      expect(result[0]!.benchmark).toBeCloseTo(0, 10)
    })
  })

  describe('riskStats', () => {
    it('returns zeroed stats when given empty inputs', () => {
      const stats = riskStats([], [], 0)
      expect(stats.maxDd).toBe(0)
      expect(stats.worstMonth).toBeNull()
      expect(stats.bestMonth).toBeNull()
      expect(stats.var5).toBe(0)
      expect(stats.cvar5).toBe(0)
      expect(stats.downsideDev).toBe(0)
      expect(stats.ulcer).toBe(0)
      expect(stats.vol).toBe(0)
      expect(stats.calmar).toBe(0)
      expect(stats.pctPositiveMonths).toBe(0)
      expect(stats.correlation).toBeNull()
      expect(stats.upBeta).toBeNull()
      expect(stats.downBeta).toBeNull()
      expect(stats.beta).toBe(0)
    })

    it('aggregates max DD, worst/best months, tail metrics, and regression', () => {
      const days: DailyPoint[] = [
        dp('2024-01-01', 100, 100),
        dp('2024-01-31', 110, 105), // Jan: +10% / +5%
        dp('2024-02-29', 99, 103),  // Feb: -10% / -1.9%
        dp('2024-03-29', 118.8, 108) // Mar: +20% / +4.85%
      ]
      const monthly: MonthlyReturn[] = [
        mr(2024, 1, 0.1, 0.05),
        mr(2024, 2, -0.1, -0.019),
        mr(2024, 3, 0.2, 0.0485)
      ]
      const stats = riskStats(days, monthly, 0.12)
      expect(stats.worstMonth?.month).toBe(2)
      expect(stats.bestMonth?.month).toBe(3)
      expect(stats.maxDd).toBeLessThan(0)
      expect(stats.pctPositiveMonths).toBeCloseTo(2 / 3, 10)
      expect(stats.correlation).not.toBeNull()
      // upBeta has both up-regime pairs (Jan, Mar), so it should be a finite number
      expect(stats.upBeta).not.toBeNull()
      // downBeta has only one pair (Feb) — with 1 point, linearRegression returns 0
      expect(stats.downBeta).toBe(0)
    })

    it('overall beta is the full-sample regression beta', () => {
      // Perfectly correlated with slope 2: y = 2x
      const monthly: MonthlyReturn[] = [
        mr(2024, 1, 0.02, 0.01),
        mr(2024, 2, -0.04, -0.02),
        mr(2024, 3, 0.06, 0.03),
        mr(2024, 4, 0.08, 0.04)
      ]
      const days: DailyPoint[] = [dp('2024-01-01', 100, 100), dp('2024-01-31', 100, 100)]
      const stats = riskStats(days, monthly, 0)
      expect(stats.beta).toBeCloseTo(2, 5)
    })
  })

  describe('percentileOf', () => {
    it('returns 0 for an empty population', () => {
      expect(percentileOf(0.1, [])).toBe(0)
    })

    it('returns 100 when value is at or above every observation', () => {
      expect(percentileOf(0.5, [0.1, 0.2, 0.3])).toBe(100)
    })

    it('returns 0 when value is below every observation', () => {
      expect(percentileOf(-1, [0.1, 0.2, 0.3])).toBe(0)
    })

    it('returns the fraction ≤ value × 100', () => {
      // 3 of 4 values are ≤ 0.2 → 75
      expect(percentileOf(0.2, [0.1, 0.15, 0.2, 0.3])).toBe(75)
    })
  })
})

export { dp, mr }
