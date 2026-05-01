// src/util/risk.ts
import type { DailyPoint, MonthlyReturn, ScatterPoint, Regression } from '@/util/returns'
import { toDrawdownSeries, linearRegression } from '@/util/returns'

export interface RollingVolPoint {
  date: string
  portfolio: number
  benchmark: number
}

export interface RegimeScatter {
  up: ScatterPoint[]
  down: ScatterPoint[]
  upFit: Regression
  downFit: Regression
}

export interface RiskStats {
  maxDd: number // non-positive decimal
  worstMonth: { year: number; month: number; return: number } | null
  bestMonth: { year: number; month: number; return: number } | null
  var5: number // decimal, typically negative
  cvar5: number // decimal, ≤ var5
  downsideDev: number // annualized decimal
  ulcer: number // dimensionless (decimal space, e.g. 0.0634)
  vol: number // annualized decimal
  calmar: number
  pctPositiveMonths: number
  correlation: number | null // null when either series has zero variance
  upBeta: number | null
  downBeta: number | null
  beta: number // full-sample regression beta (page may override from API metrics)
}

/**
 * Returns the p-quantile of a numeric series using linear interpolation
 * between adjacent ranks (NumPy `quantile` method='linear'). Used here as
 * the historical VaR at level p — e.g. p=0.05 for VaR 5%.
 */
export function varQuantile(values: number[], p: number): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]!
  const sorted = [...values].sort((a, b) => a - b)
  const rank = p * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return sorted[lo]!
  const t = rank - lo
  return sorted[lo]! * (1 - t) + sorted[hi]! * t
}

/**
 * Conditional VaR (expected shortfall): the mean of values at or below
 * the p-quantile. Captures the average of the tail, not just its edge.
 */
export function cvar(values: number[], p: number): number {
  if (values.length === 0) return 0
  const threshold = varQuantile(values, p)
  const tail = values.filter((v) => v <= threshold)
  if (tail.length === 0) return threshold
  return tail.reduce((s, v) => s + v, 0) / tail.length
}

/**
 * Annualized downside deviation with a 0% minimum acceptable return
 * (MAR). Assumes inputs are monthly returns; multiplies by sqrt(12).
 */
export function downsideDeviation(monthlyReturns: number[]): number {
  if (monthlyReturns.length === 0) return 0
  const negatives = monthlyReturns.map((r) => Math.min(r, 0))
  const meanSq = negatives.reduce((s, v) => s + v * v, 0) / negatives.length
  return Math.sqrt(meanSq) * Math.sqrt(12)
}

/**
 * Ulcer Index: RMS of portfolio drawdown over time. Stays in decimal
 * space (e.g. 0.0634); the UI multiplies by 100 for display.
 */
export function ulcerIndex(days: DailyPoint[]): number {
  if (days.length === 0) return 0
  const series = toDrawdownSeries(days)
  const meanSq = series.reduce((s, p) => s + p.portfolio * p.portfolio, 0) / series.length
  return Math.sqrt(meanSq)
}

/**
 * Sample standard deviation (n-1) of monthly returns, annualized by
 * sqrt(12).
 */
export function annualizedVol(monthlyReturns: number[]): number {
  const n = monthlyReturns.length
  if (n < 2) return 0
  const mean = monthlyReturns.reduce((s, v) => s + v, 0) / n
  const variance = monthlyReturns.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1)
  return Math.sqrt(variance) * Math.sqrt(12)
}

/**
 * Calmar ratio: CAGR / |max drawdown|. Returns 0 when max drawdown is 0
 * (no pain → no meaningful ratio).
 */
export function calmar(cagr: number, maxDd: number): number {
  if (maxDd === 0) return 0
  return cagr / Math.abs(maxDd)
}

/**
 * Pearson correlation coefficient. Returns null if either series has
 * fewer than two points or zero variance (correlation undefined).
 */
export function pearson(pairs: ScatterPoint[]): number | null {
  const n = pairs.length
  if (n < 2) return null
  let sumX = 0
  let sumY = 0
  for (const p of pairs) {
    sumX += p.x
    sumY += p.y
  }
  const meanX = sumX / n
  const meanY = sumY / n
  let covXY = 0
  let varX = 0
  let varY = 0
  for (const p of pairs) {
    const dx = p.x - meanX
    const dy = p.y - meanY
    covXY += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return null
  return covXY / Math.sqrt(varX * varY)
}

/**
 * Splits scatter pairs by benchmark sign (x ≥ 0 → up regime, x < 0 → down
 * regime) and fits an OLS line to each independently. Returns the two
 * point sets and the two fits.
 */
export function regimeRegression(pairs: ScatterPoint[]): RegimeScatter {
  const up: ScatterPoint[] = []
  const down: ScatterPoint[] = []
  for (const p of pairs) {
    if (p.x >= 0) up.push(p)
    else down.push(p)
  }
  return {
    up,
    down,
    upFit: linearRegression(up),
    downFit: linearRegression(down)
  }
}

/**
 * Rolling annualized volatility over a trailing window of months.
 * Computes sample stdev (n-1) × sqrt(12) for each window, for both
 * portfolio and benchmark series.
 */
export function rollingVolatility(
  monthly: MonthlyReturn[],
  windowMonths: number
): RollingVolPoint[] {
  if (monthly.length < windowMonths) return []
  const result: RollingVolPoint[] = []
  for (let i = windowMonths - 1; i < monthly.length; i++) {
    const window = monthly.slice(i - windowMonths + 1, i + 1)
    const pVol = annualizedVol(window.map((w) => w.portfolio))
    const bVol = annualizedVol(window.map((w) => w.benchmark))
    const end = monthly[i]!
    const yyyy = String(end.year).padStart(4, '0')
    const mm = String(end.month).padStart(2, '0')
    result.push({ date: `${yyyy}-${mm}-01`, portfolio: pVol, benchmark: bVol })
  }
  return result
}

/**
 * Returns the empirical percentile rank of `value` within `population`:
 * the fraction of observations at or below `value`, expressed as 0–100.
 */
export function percentileOf(value: number, population: number[]): number {
  if (population.length === 0) return 0
  let count = 0
  for (const v of population) if (v <= value) count++
  return (count / population.length) * 100
}

/**
 * One-shot aggregator: everything the UI needs for its KPI strips.
 * `cagr` is the annualized return over the measurement window — the
 * caller supplies it from `portfolio.summary.cagrSinceInception` or a
 * locally-computed fallback.
 */
export function riskStats(days: DailyPoint[], monthly: MonthlyReturn[], cagr: number): RiskStats {
  if (monthly.length === 0) {
    return {
      maxDd: 0,
      worstMonth: null,
      bestMonth: null,
      var5: 0,
      cvar5: 0,
      downsideDev: 0,
      ulcer: 0,
      vol: 0,
      calmar: 0,
      pctPositiveMonths: 0,
      correlation: null,
      upBeta: null,
      downBeta: null,
      beta: 0
    }
  }

  const portfolioReturns = monthly.map((m) => m.portfolio)

  let best = monthly[0]!
  let worst = monthly[0]!
  let positives = 0
  for (const m of monthly) {
    if (m.portfolio > best.portfolio) best = m
    if (m.portfolio < worst.portfolio) worst = m
    if (m.portfolio > 0) positives++
  }

  const ddSeries = toDrawdownSeries(days)
  const maxDd = ddSeries.reduce((lo, p) => (p.portfolio < lo ? p.portfolio : lo), 0)

  const pairs: ScatterPoint[] = monthly.map((m) => ({ x: m.benchmark, y: m.portfolio }))
  const { upFit, downFit, up, down } = regimeRegression(pairs)

  return {
    maxDd,
    worstMonth: { year: worst.year, month: worst.month, return: worst.portfolio },
    bestMonth: { year: best.year, month: best.month, return: best.portfolio },
    var5: varQuantile(portfolioReturns, 0.05),
    cvar5: cvar(portfolioReturns, 0.05),
    downsideDev: downsideDeviation(portfolioReturns),
    ulcer: ulcerIndex(days),
    vol: annualizedVol(portfolioReturns),
    calmar: calmar(cagr, maxDd),
    pctPositiveMonths: positives / monthly.length,
    correlation: pearson(pairs),
    upBeta: up.length < 2 ? null : upFit.beta,
    downBeta: down.length === 0 ? null : downFit.beta,
    beta: linearRegression(pairs).beta
  }
}
