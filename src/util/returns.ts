// src/util/returns.ts

export interface DailyPoint {
  date: string // ISO yyyy-mm-dd
  portfolioValue: number
  benchmarkValue: number
}

export interface MonthlyReturn {
  year: number
  month: number // 1–12
  portfolio: number
  benchmark: number
}

export interface AnnualReturn {
  year: number
  portfolio: number
  benchmark: number
  delta: number // portfolio − benchmark
}

export interface RollingPoint {
  date: string
  portfolio: number
  benchmark: number
}

export interface RollingExcessPoint {
  date: string
  value: number
}

export interface ScatterPoint {
  x: number // benchmark monthly return
  y: number // portfolio monthly return
}

export interface DrawdownPoint {
  date: string
  // Drawdown from running peak, expressed as a non-positive decimal
  // (0 at peaks, -0.25 means 25% below the prior peak).
  portfolio: number
  benchmark: number
}

export interface Regression {
  beta: number
  alpha: number
  r2: number
}

export interface ReturnStats {
  pctPositiveMonths: number
  longestPositiveStreak: number
  bestYear: { year: number; return: number } | null
  worstYear: { year: number; return: number } | null
  bestMonth: { year: number; month: number; return: number } | null
  worstMonth: { year: number; month: number; return: number } | null
  trackingError: number
  informationRatio: number
  activeReturn: number
  // Fraction of months where portfolio return > benchmark return
  winRate: number
}

export function toMonthly(days: DailyPoint[]): MonthlyReturn[] {
  if (days.length < 2) return []
  // Group by (year, month) — keep the last point seen for each group
  const eom = new Map<string, DailyPoint>()
  for (const d of days) {
    const key = d.date.slice(0, 7) // 'yyyy-mm'
    eom.set(key, d) // later days overwrite earlier ones
  }
  const keys = Array.from(eom.keys()).sort()
  const result: MonthlyReturn[] = []
  for (let i = 1; i < keys.length; i++) {
    const prior = eom.get(keys[i - 1]!)!
    const curr = eom.get(keys[i]!)!
    const [y, m] = keys[i]!.split('-').map(Number) as [number, number]
    result.push({
      year: y,
      month: m,
      portfolio: curr.portfolioValue / prior.portfolioValue - 1,
      benchmark: curr.benchmarkValue / prior.benchmarkValue - 1
    })
  }
  return result
}

export function toAnnual(monthly: MonthlyReturn[]): AnnualReturn[] {
  const byYear = new Map<number, { p: number; b: number }>()
  for (const m of monthly) {
    const prev = byYear.get(m.year) ?? { p: 1, b: 1 }
    byYear.set(m.year, {
      p: prev.p * (1 + m.portfolio),
      b: prev.b * (1 + m.benchmark)
    })
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b)
  return years.map((year) => {
    const v = byYear.get(year)!
    const portfolio = v.p - 1
    const benchmark = v.b - 1
    return { year, portfolio, benchmark, delta: portfolio - benchmark }
  })
}

export function rollingCAGR(monthly: MonthlyReturn[], windowMonths: number): RollingPoint[] {
  if (monthly.length < windowMonths) return []
  const result: RollingPoint[] = []
  for (let i = windowMonths - 1; i < monthly.length; i++) {
    let p = 1
    let b = 1
    for (let j = i - windowMonths + 1; j <= i; j++) {
      p *= 1 + monthly[j]!.portfolio
      b *= 1 + monthly[j]!.benchmark
    }
    const end = monthly[i]!
    const yyyy = String(end.year).padStart(4, '0')
    const mm = String(end.month).padStart(2, '0')
    result.push({
      date: `${yyyy}-${mm}-01`,
      portfolio: p ** (12 / windowMonths) - 1,
      benchmark: b ** (12 / windowMonths) - 1
    })
  }
  return result
}

export function rollingExcess(
  monthly: MonthlyReturn[],
  windowMonths: number
): RollingExcessPoint[] {
  if (monthly.length < windowMonths) return []
  const result: RollingExcessPoint[] = []
  for (let i = windowMonths - 1; i < monthly.length; i++) {
    let p = 1
    let b = 1
    for (let j = i - windowMonths + 1; j <= i; j++) {
      p *= 1 + monthly[j]!.portfolio
      b *= 1 + monthly[j]!.benchmark
    }
    const end = monthly[i]!
    const yyyy = String(end.year).padStart(4, '0')
    const mm = String(end.month).padStart(2, '0')
    result.push({ date: `${yyyy}-${mm}-01`, value: p ** (12 / windowMonths) - b ** (12 / windowMonths) })
  }
  return result
}

export function toDrawdownSeries(days: DailyPoint[]): DrawdownPoint[] {
  if (days.length === 0) return []
  let pPeak = days[0]!.portfolioValue
  let bPeak = days[0]!.benchmarkValue
  const result: DrawdownPoint[] = []
  for (const d of days) {
    if (d.portfolioValue > pPeak) pPeak = d.portfolioValue
    if (d.benchmarkValue > bPeak) bPeak = d.benchmarkValue
    result.push({
      date: d.date,
      portfolio: pPeak === 0 ? 0 : d.portfolioValue / pPeak - 1,
      benchmark: bPeak === 0 ? 0 : d.benchmarkValue / bPeak - 1
    })
  }
  return result
}

export function returnStats(monthly: MonthlyReturn[], annual: AnnualReturn[]): ReturnStats {
  if (monthly.length === 0) {
    return {
      pctPositiveMonths: 0,
      longestPositiveStreak: 0,
      bestYear: null,
      worstYear: null,
      bestMonth: null,
      worstMonth: null,
      trackingError: 0,
      informationRatio: 0,
      activeReturn: 0,
      winRate: 0
    }
  }

  let positive = 0
  let currentStreak = 0
  let longestStreak = 0
  let bestMonth = monthly[0]!
  let worstMonth = monthly[0]!
  for (const m of monthly) {
    if (m.portfolio > 0) {
      positive++
      currentStreak++
      if (currentStreak > longestStreak) longestStreak = currentStreak
    } else {
      currentStreak = 0
    }
    if (m.portfolio > bestMonth.portfolio) bestMonth = m
    if (m.portfolio < worstMonth.portfolio) worstMonth = m
  }

  let bestYear: AnnualReturn | null = null
  let worstYear: AnnualReturn | null = null
  for (const a of annual) {
    if (!bestYear || a.portfolio > bestYear.portfolio) bestYear = a
    if (!worstYear || a.portfolio < worstYear.portfolio) worstYear = a
  }

  // Tracking error: annualized population stdev of monthly excess
  const excess = monthly.map((m) => m.portfolio - m.benchmark)
  const meanExcess = excess.reduce((s, v) => s + v, 0) / excess.length
  const variance =
    excess.reduce((s, v) => s + (v - meanExcess) * (v - meanExcess), 0) / excess.length
  const trackingError = Math.sqrt(variance) * Math.sqrt(12)

  // Win rate: fraction of months where portfolio beat benchmark
  const wins = excess.reduce((n, v) => (v > 0 ? n + 1 : n), 0)
  const winRate = wins / excess.length

  // Active return: annualized portfolio CAGR − annualized benchmark CAGR
  let pCum = 1
  let bCum = 1
  for (const m of monthly) {
    pCum *= 1 + m.portfolio
    bCum *= 1 + m.benchmark
  }
  const years = monthly.length / 12
  const pCAGR = pCum ** (1 / years) - 1
  const bCAGR = bCum ** (1 / years) - 1
  const activeReturn = pCAGR - bCAGR

  const informationRatio = trackingError === 0 ? 0 : activeReturn / trackingError

  return {
    pctPositiveMonths: positive / monthly.length,
    longestPositiveStreak: longestStreak,
    bestYear: bestYear ? { year: bestYear.year, return: bestYear.portfolio } : null,
    worstYear: worstYear ? { year: worstYear.year, return: worstYear.portfolio } : null,
    bestMonth: { year: bestMonth.year, month: bestMonth.month, return: bestMonth.portfolio },
    worstMonth: {
      year: worstMonth.year,
      month: worstMonth.month,
      return: worstMonth.portfolio
    },
    trackingError,
    informationRatio,
    activeReturn,
    winRate
  }
}

export function linearRegression(pairs: ScatterPoint[]): Regression {
  const n = pairs.length
  if (n < 2) return { beta: 0, alpha: 0, r2: 0 }
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
  if (varX === 0) return { beta: 0, alpha: meanY, r2: 0 }
  const beta = covXY / varX
  const alpha = meanY - beta * meanX
  const r2 = varY === 0 ? 0 : (covXY * covXY) / (varX * varY)
  return { beta, alpha, r2 }
}
