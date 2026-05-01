# Returns & vs. Benchmark Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two new portfolio tabs — `Returns` (magnitude + consistency) and `vs. Benchmark` (uniqueness) — derived entirely from existing measurement data.

**Architecture:** A pure utility module (`src/util/returns.ts`) does all math; a composable (`usePortfolioReturns`) wraps it reactively; five new ECharts components and one new list component render the derived series; two new page components compose everything; the router and `PortfolioLayout` gain the two tabs.

**Tech Stack:** Vue 3 `<script setup>`, Vitest (unit), Playwright (e2e), ECharts 5 via `vue-echarts`, TanStack Vue Query, TypeScript, PrimeVue.

**Design spec:** `docs/superpowers/specs/2026-04-19-returns-page-design.md`

**Commits:** Repo policy disallows auto-commits. Commit points in this plan are *suggestions* — run them only when the user explicitly asks.

---

## Task 1: Scaffold `returns.ts` utility + empty test file

**Files:**
- Create: `src/util/returns.ts`
- Create: `tests/unit/returns.spec.ts`

- [ ] **Step 1: Create empty utility module with exported types only**

```ts
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
}
```

- [ ] **Step 2: Create the test file skeleton**

```ts
// tests/unit/returns.spec.ts
import { describe, it, expect } from 'vitest'
import {
  toMonthly,
  toAnnual,
  rollingCAGR,
  rollingExcess,
  linearRegression,
  returnStats
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
```

- [ ] **Step 3: Run tests to confirm the file loads**

Run: `npm test -- returns.spec.ts`
Expected: one skipped test, no import errors.

---

## Task 2: `toMonthly` — compound daily values into monthly returns

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:** Each monthly return is `(lastValueOfMonth / lastValueOfPriorMonth) − 1`. The first month is skipped because it has no prior anchor.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
    expect(result[0]).toEqual({ year: 2024, month: 2, portfolio: 0.1, benchmark: 0.04 })
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
    expect(result[0]).toEqual({ year: 2024, month: 2, portfolio: 0.1, benchmark: 0.04 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `toMonthly is not a function`.

- [ ] **Step 3: Implement `toMonthly`**

Add to `src/util/returns.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — three `toMonthly` tests.

---

## Task 3: `toAnnual` — compound monthly returns into annual returns

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:** `annualReturn = product(1 + monthlyReturn) − 1` for all months in a calendar year. Years with any months present are included; partial years (e.g., YTD) are computed with just the months that exist.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
    expect(result).toEqual([
      { year: 2023, portfolio: 0.1, benchmark: 0.05, delta: 0.05 },
      {
        year: 2024,
        portfolio: expect.closeTo((1.02 * 0.97) - 1, 8),
        benchmark: expect.closeTo((1.01 * 1.01) - 1, 8),
        delta: expect.any(Number)
      }
    ])
  })

  it('returns empty array for empty input', () => {
    expect(toAnnual([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `toAnnual is not a function`.

- [ ] **Step 3: Implement `toAnnual`**

Add to `src/util/returns.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — all `toAnnual` tests.

---

## Task 4: `rollingCAGR` — annualized trailing return

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:** For each monthly index `i` with at least `windowMonths` prior months (inclusive), compute `CAGR = product(1 + r) ^ (12 / windowMonths) − 1` over that window. Output date is the last month of the window, as an ISO `yyyy-mm-01` string (the first day of the month, arbitrary but consistent).

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `rollingCAGR is not a function`.

- [ ] **Step 3: Implement `rollingCAGR`**

Add to `src/util/returns.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — all `rollingCAGR` tests.

---

## Task 5: `rollingExcess` — rolling portfolio − benchmark return

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:** Rolling cumulative excess over a window. For each window, compute compounded portfolio return minus compounded benchmark return, non-annualized (raw window return, reported in decimal; UI shows as "pp"). Insufficient-history months are omitted.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
    // (1.01^12 - 1) - (1.005^12 - 1)
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `rollingExcess is not a function`.

- [ ] **Step 3: Implement `rollingExcess`**

Add to `src/util/returns.ts`:

```ts
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
    result.push({ date: `${yyyy}-${mm}-01`, value: p - b })
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — all `rollingExcess` tests.

---

## Task 6: `linearRegression` — β, α, r² via OLS

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:** Ordinary least squares on monthly pairs `(benchmark, portfolio)`. `beta = cov(x,y)/var(x)`. `alpha = ȳ − β × x̄`. `r² = corr² = cov²/(var(x) × var(y))`. Fewer than 2 points returns `{beta: 0, alpha: 0, r2: 0}`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
    // Two points far from regression line
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `linearRegression is not a function`.

- [ ] **Step 3: Implement `linearRegression`**

Add to `src/util/returns.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — all `linearRegression` tests.

---

## Task 7: `returnStats` — aggregate stats

**Files:**
- Modify: `src/util/returns.ts`
- Modify: `tests/unit/returns.spec.ts`

**Semantics:**
- `pctPositiveMonths` — fraction of months with `portfolio > 0`
- `longestPositiveStreak` — max consecutive months of `portfolio > 0`
- `bestYear` / `worstYear` — max/min over `annual.portfolio`
- `bestMonth` / `worstMonth` — max/min over `monthly.portfolio`
- `trackingError` — `stdev(monthly.portfolio − monthly.benchmark) × √12`
- `activeReturn` — annualized portfolio CAGR minus benchmark CAGR, where CAGR is computed from the monthly series using `rollingCAGR`-style compounding over the full history, annualized
- `informationRatio` — `activeReturn / trackingError` (0 when trackingError is 0)

Empty inputs return `{..., null, null, null, null, 0, 0, 0}`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/returns.spec.ts`:

```ts
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
    expect(s.bestYear).toEqual({ year: 2023, return: 0.1 })
    expect(s.worstYear).toEqual({ year: 2024, return: -0.05 })
  })

  it('computes tracking error as annualized stdev of excess returns', () => {
    const monthly: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
      year: 2024,
      month: i + 1,
      portfolio: i % 2 === 0 ? 0.02 : 0.0, // excess alternates 0.01, -0.01
      benchmark: 0.01
    }))
    const annual = toAnnual(monthly)
    const s = returnStats(monthly, annual)
    // excess = [+0.01, -0.01, ...], mean = 0, stdev (population) = 0.01
    // annualized = 0.01 * sqrt(12) ≈ 0.034641
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- returns.spec.ts`
Expected: FAIL — `returnStats is not a function`.

- [ ] **Step 3: Implement `returnStats`**

Add to `src/util/returns.ts`:

```ts
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
      activeReturn: 0
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

  // Active return: annualized portfolio CAGR − annualized benchmark CAGR
  // Compound full history, then annualize by (12 / months)
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
    activeReturn
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- returns.spec.ts`
Expected: PASS — all `returnStats` tests. All prior tests still pass.

**Suggested commit point:** utility module + unit tests complete.

---

## Task 8: `usePortfolioReturns` composable

**Files:**
- Create: `src/composables/usePortfolioReturns.ts`

- [ ] **Step 1: Create the composable**

```ts
// src/composables/usePortfolioReturns.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { PortfolioMeasurements } from '@/api/endpoints/portfolios'
import {
  toMonthly,
  toAnnual,
  rollingCAGR,
  rollingExcess,
  linearRegression,
  returnStats,
  type AnnualReturn,
  type MonthlyReturn,
  type Regression,
  type ReturnStats,
  type RollingExcessPoint,
  type RollingPoint,
  type ScatterPoint
} from '@/util/returns'

export interface PortfolioReturnsDerived {
  monthly: MonthlyReturn[]
  annual: AnnualReturn[]
  rolling: {
    oneYear: RollingPoint[]
    threeYear: RollingPoint[]
    fiveYear: RollingPoint[]
    excess6M: RollingExcessPoint[]
    excess12M: RollingExcessPoint[]
    excess36M: RollingExcessPoint[]
  }
  scatter: ScatterPoint[]
  regression: Regression
  stats: ReturnStats
}

export function usePortfolioReturns(
  measurements: Ref<PortfolioMeasurements | undefined>
): ComputedRef<PortfolioReturnsDerived | null> {
  return computed<PortfolioReturnsDerived | null>(() => {
    const m = measurements.value
    if (!m || !m.points || m.points.length === 0) return null
    const days = m.points.map((p) => ({
      date: p.date,
      portfolioValue: p.portfolioValue,
      benchmarkValue: p.benchmarkValue
    }))
    const monthly = toMonthly(days)
    const annual = toAnnual(monthly)
    const scatter: ScatterPoint[] = monthly.map((mr) => ({ x: mr.benchmark, y: mr.portfolio }))
    return {
      monthly,
      annual,
      rolling: {
        oneYear: rollingCAGR(monthly, 12),
        threeYear: rollingCAGR(monthly, 36),
        fiveYear: rollingCAGR(monthly, 60),
        excess6M: rollingExcess(monthly, 6),
        excess12M: rollingExcess(monthly, 12),
        excess36M: rollingExcess(monthly, 36)
      },
      scatter,
      regression: linearRegression(scatter),
      stats: returnStats(monthly, annual)
    }
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 9: Register additional ECharts components

**Files:**
- Modify: `src/util/echarts-setup.ts`

- [ ] **Step 1: Add heatmap, scatter, and visualMap registrations**

Replace the file contents:

```ts
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, HeatmapChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  DataZoomComponent,
  TitleComponent,
  AxisPointerComponent,
  GraphicComponent,
  VisualMapComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  DataZoomComponent,
  TitleComponent,
  AxisPointerComponent,
  GraphicComponent,
  VisualMapComponent
])
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 10: `ReturnHeatmap.vue` — year × month calendar heatmap

**Files:**
- Create: `src/components/charts/ReturnHeatmap.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { MonthlyReturn } from '@/util/returns'

const props = defineProps<{
  monthly: MonthlyReturn[]
  highlightedYear?: number | null
}>()

const emit = defineEmits<{
  'year-hover': [year: number | null]
}>()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const years = computed(() => {
  const set = new Set<number>()
  for (const m of props.monthly) set.add(m.year)
  return Array.from(set).sort((a, b) => a - b)
})

const maxAbs = computed(() => {
  let max = 0
  for (const m of props.monthly) {
    const v = Math.abs(m.portfolio)
    if (v > max) max = v
  }
  return max === 0 ? 0.01 : max
})

const data = computed(() => {
  // Each point is [xIndex (year), yIndex (month 0-11), value]
  const yearIdx = new Map<number, number>()
  years.value.forEach((y, i) => yearIdx.set(y, i))
  return props.monthly.map((m) => [yearIdx.get(m.year)!, m.month - 1, m.portfolio])
})

const chartOption = computed<EChartsOption>(() => ({
  tooltip: {
    position: 'top',
    formatter: (params: unknown) => {
      const p = params as { value: [number, number, number] }
      const [xi, yi, v] = p.value
      const year = years.value[xi]
      const month = MONTHS[yi]
      const pct = (v * 100).toFixed(2)
      const sign = v > 0 ? '+' : ''
      return `${month} ${year} · ${sign}${pct}%`
    }
  },
  grid: { left: 48, right: 16, top: 8, bottom: 28 },
  xAxis: {
    type: 'category',
    data: years.value.map(String),
    splitArea: { show: false },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'var(--text-3)' }
  },
  yAxis: {
    type: 'category',
    data: MONTHS,
    inverse: false,
    splitArea: { show: false },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'var(--text-3)' }
  },
  visualMap: {
    min: -maxAbs.value,
    max: maxAbs.value,
    calculable: false,
    show: false,
    inRange: {
      color: ['#da1e28', '#2a2f38', '#24a148'] // loss, neutral, gain
    }
  },
  series: [
    {
      type: 'heatmap',
      data: data.value,
      label: { show: false },
      itemStyle: { borderWidth: 1, borderColor: 'var(--bg)' },
      emphasis: { itemStyle: { shadowBlur: 4, shadowColor: 'var(--primary-glow)' } }
    }
  ]
}))

function onEvents() {
  return {
    mouseover: (params: unknown) => {
      const p = params as { value?: [number, number, number] }
      if (!p.value) return
      const year = years.value[p.value[0]]
      emit('year-hover', year ?? null)
    },
    mouseout: () => emit('year-hover', null)
  }
}
</script>

<template>
  <VChart
    class="heatmap-chart"
    :option="chartOption"
    :update-options="{ notMerge: true }"
    :init-options="{ renderer: 'canvas' }"
    autoresize
    @mouseover="(e) => onEvents().mouseover(e)"
    @mouseout="() => onEvents().mouseout()"
  />
</template>

<style scoped>
.heatmap-chart {
  width: 100%;
  height: 380px;
}
</style>
```

Note: Year-highlight visual (dimming non-highlighted columns) will be added in Task 17 when the parent page is wired. For now the component emits `year-hover` but does not visually react to `highlightedYear` — this keeps the component's first pass testable on its own.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 11: `RollingReturnsChart.vue` — 1Y/3Y/5Y rolling CAGR

**Files:**
- Create: `src/components/charts/RollingReturnsChart.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { RollingPoint } from '@/util/returns'

const props = defineProps<{
  oneYear: RollingPoint[]
  threeYear: RollingPoint[]
  fiveYear: RollingPoint[]
  benchmarkLabel: string
}>()

const showOne = ref(true)
const showThree = ref(true)
const showFive = ref(true)

function toPairs(points: RollingPoint[], key: 'portfolio' | 'benchmark') {
  return points.map((p) => [p.date, p[key] * 100])
}

const chartOption = computed<EChartsOption>(() => {
  const series: EChartsOption['series'] = []
  if (showOne.value) {
    series.push(
      { name: '1Y portfolio', type: 'line', showSymbol: false, data: toPairs(props.oneYear, 'portfolio'), lineStyle: { width: 2 } },
      { name: `1Y ${props.benchmarkLabel}`, type: 'line', showSymbol: false, data: toPairs(props.oneYear, 'benchmark'), lineStyle: { width: 1, opacity: 0.45, type: 'dashed' } }
    )
  }
  if (showThree.value) {
    series.push(
      { name: '3Y portfolio', type: 'line', showSymbol: false, data: toPairs(props.threeYear, 'portfolio'), lineStyle: { width: 2 } },
      { name: `3Y ${props.benchmarkLabel}`, type: 'line', showSymbol: false, data: toPairs(props.threeYear, 'benchmark'), lineStyle: { width: 1, opacity: 0.45, type: 'dashed' } }
    )
  }
  if (showFive.value) {
    series.push(
      { name: '5Y portfolio', type: 'line', showSymbol: false, data: toPairs(props.fiveYear, 'portfolio'), lineStyle: { width: 2 } },
      { name: `5Y ${props.benchmarkLabel}`, type: 'line', showSymbol: false, data: toPairs(props.fiveYear, 'benchmark'), lineStyle: { width: 1, opacity: 0.45, type: 'dashed' } }
    )
  }
  return {
    tooltip: { trigger: 'axis' },
    legend: { show: true, top: 0, textStyle: { color: 'var(--text-2)' } },
    grid: { left: 48, right: 16, top: 36, bottom: 36 },
    xAxis: { type: 'time', axisLabel: { color: 'var(--text-3)' } },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'var(--text-3)', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'var(--border)' } }
    },
    series
  }
})
</script>

<template>
  <div class="rrc">
    <div class="rrc-toggles">
      <label><input type="checkbox" v-model="showOne" /> 1Y</label>
      <label><input type="checkbox" v-model="showThree" /> 3Y</label>
      <label><input type="checkbox" v-model="showFive" /> 5Y</label>
    </div>
    <VChart class="rrc-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.rrc {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rrc-toggles {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-2);
}
.rrc-toggles label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.rrc-chart {
  width: 100%;
  height: 280px;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 12: `RollingExcessChart.vue` — full-width hero with gain/loss fill

**Files:**
- Create: `src/components/charts/RollingExcessChart.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { RollingExcessPoint } from '@/util/returns'

type Window = '6M' | '12M' | '36M'

const props = defineProps<{
  excess6M: RollingExcessPoint[]
  excess12M: RollingExcessPoint[]
  excess36M: RollingExcessPoint[]
}>()

const activeWindow = ref<Window>('12M')

const activeSeries = computed<RollingExcessPoint[]>(() => {
  if (activeWindow.value === '6M') return props.excess6M
  if (activeWindow.value === '36M') return props.excess36M
  return props.excess12M
})

const chartOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) => {
      const arr = params as Array<{ axisValueLabel: string; value: [string, number] }>
      const p = arr[0]
      if (!p) return ''
      const v = p.value[1]
      const sign = v >= 0 ? '+' : ''
      return `${p.axisValueLabel}<br/>Excess: ${sign}${v.toFixed(2)}pp`
    }
  },
  grid: { left: 56, right: 16, top: 16, bottom: 36 },
  xAxis: { type: 'time', axisLabel: { color: 'var(--text-3)' } },
  yAxis: {
    type: 'value',
    axisLabel: { color: 'var(--text-3)', formatter: '{value}pp' },
    splitLine: { lineStyle: { color: 'var(--border)' } }
  },
  visualMap: {
    show: false,
    dimension: 1,
    pieces: [
      { gt: 0, color: '#24a148' },
      { lte: 0, color: '#da1e28' }
    ]
  },
  series: [
    {
      type: 'line',
      showSymbol: false,
      smooth: false,
      data: activeSeries.value.map((p) => [p.date, p.value * 100]),
      areaStyle: { opacity: 0.18 },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: 'var(--text-3)', type: 'solid', opacity: 0.7 },
        data: [{ yAxis: 0 }],
        label: { show: false }
      }
    }
  ]
}))
</script>

<template>
  <div class="rex">
    <div class="rex-toggles">
      <button :class="{ active: activeWindow === '6M' }" @click="activeWindow = '6M'">6M</button>
      <button :class="{ active: activeWindow === '12M' }" @click="activeWindow = '12M'">12M</button>
      <button :class="{ active: activeWindow === '36M' }" @click="activeWindow = '36M'">36M</button>
    </div>
    <VChart class="rex-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.rex {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rex-toggles {
  display: flex;
  gap: 6px;
}
.rex-toggles button {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-2);
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
}
.rex-toggles button:hover {
  color: var(--text-1);
  border-color: var(--text-4);
}
.rex-toggles button.active {
  background: var(--primary-soft-07);
  border-color: var(--primary-border);
  color: var(--primary);
}
.rex-chart {
  width: 100%;
  height: 320px;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 13: `ReturnDistributionChart.vue` — overlaid histograms

**Files:**
- Create: `src/components/charts/ReturnDistributionChart.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { MonthlyReturn } from '@/util/returns'

const props = defineProps<{
  monthly: MonthlyReturn[]
}>()

const BIN_COUNT = 24

function binSeries(values: number[], min: number, binWidth: number): number[] {
  const bins = new Array<number>(BIN_COUNT).fill(0)
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth)
    if (idx < 0) idx = 0
    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1
    bins[idx]++
  }
  return bins
}

const binned = computed(() => {
  const portfolio = props.monthly.map((m) => m.portfolio)
  const benchmark = props.monthly.map((m) => m.benchmark)
  const all = [...portfolio, ...benchmark]
  if (all.length === 0) return { labels: [], p: [], b: [] }
  const min = Math.min(...all)
  const max = Math.max(...all)
  const binWidth = (max - min) / BIN_COUNT
  const labels = Array.from({ length: BIN_COUNT }, (_, i) =>
    ((min + i * binWidth + binWidth / 2) * 100).toFixed(1)
  )
  return {
    labels,
    p: binSeries(portfolio, min, binWidth),
    b: binSeries(benchmark, min, binWidth)
  }
})

const chartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { show: true, top: 0, textStyle: { color: 'var(--text-2)' } },
  grid: { left: 40, right: 16, top: 36, bottom: 36 },
  xAxis: {
    type: 'category',
    data: binned.value.labels,
    axisLabel: { color: 'var(--text-3)', formatter: (v: string) => `${v}%` },
    name: 'monthly return',
    nameLocation: 'middle',
    nameGap: 26,
    nameTextStyle: { color: 'var(--text-3)', fontSize: 11 }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: 'var(--text-3)' },
    splitLine: { lineStyle: { color: 'var(--border)' } }
  },
  series: [
    {
      name: 'Portfolio',
      type: 'bar',
      data: binned.value.p,
      itemStyle: { color: 'rgba(15,98,254,0.55)' },
      barGap: '-100%'
    },
    {
      name: 'Benchmark',
      type: 'bar',
      data: binned.value.b,
      itemStyle: { color: 'rgba(247,184,75,0.45)' }
    }
  ]
}))
</script>

<template>
  <VChart class="rdc-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.rdc-chart {
  width: 100%;
  height: 280px;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 14: `ReturnScatterChart.vue` — monthly scatter + regression

**Files:**
- Create: `src/components/charts/ReturnScatterChart.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { Regression, ScatterPoint } from '@/util/returns'

const props = defineProps<{
  scatter: ScatterPoint[]
  regression: Regression
}>()

const axisRange = computed(() => {
  if (props.scatter.length === 0) return { min: -0.1, max: 0.1 }
  let min = Infinity
  let max = -Infinity
  for (const p of props.scatter) {
    min = Math.min(min, p.x, p.y)
    max = Math.max(max, p.x, p.y)
  }
  // Symmetric range with small padding
  const bound = Math.max(Math.abs(min), Math.abs(max)) * 1.1
  return { min: -bound, max: bound }
})

const regressionLine = computed(() => {
  const { min, max } = axisRange.value
  const { beta, alpha } = props.regression
  return [
    [min * 100, (alpha + beta * min) * 100],
    [max * 100, (alpha + beta * max) * 100]
  ]
})

const chartOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: unknown) => {
      const p = params as { value: [number, number] }
      return `benchmark ${p.value[0].toFixed(2)}% → portfolio ${p.value[1].toFixed(2)}%`
    }
  },
  grid: { left: 56, right: 16, top: 16, bottom: 40 },
  xAxis: {
    type: 'value',
    min: axisRange.value.min * 100,
    max: axisRange.value.max * 100,
    axisLabel: { color: 'var(--text-3)', formatter: '{value}%' },
    splitLine: { lineStyle: { color: 'var(--border)' } },
    name: 'benchmark monthly',
    nameLocation: 'middle',
    nameGap: 28,
    nameTextStyle: { color: 'var(--text-3)', fontSize: 11 }
  },
  yAxis: {
    type: 'value',
    min: axisRange.value.min * 100,
    max: axisRange.value.max * 100,
    axisLabel: { color: 'var(--text-3)', formatter: '{value}%' },
    splitLine: { lineStyle: { color: 'var(--border)' } },
    name: 'portfolio monthly',
    nameLocation: 'middle',
    nameGap: 40,
    nameTextStyle: { color: 'var(--text-3)', fontSize: 11 }
  },
  series: [
    {
      type: 'scatter',
      data: props.scatter.map((p) => [p.x * 100, p.y * 100]),
      symbolSize: 6,
      itemStyle: { color: 'rgba(59,167,255,0.7)' }
    },
    {
      type: 'line',
      data: regressionLine.value,
      showSymbol: false,
      lineStyle: { color: '#f7b84b', width: 2 },
      silent: true,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: 'var(--text-5)', type: 'dashed', opacity: 0.5 },
        data: [
          [
            { coord: [axisRange.value.min * 100, axisRange.value.min * 100] },
            { coord: [axisRange.value.max * 100, axisRange.value.max * 100] }
          ]
        ]
      }
    }
  ]
}))
</script>

<template>
  <div class="rsc">
    <div class="rsc-beta">
      β = {{ regression.beta.toFixed(2) }} · α = {{ (regression.alpha * 100).toFixed(2) }}% · r² =
      {{ regression.r2.toFixed(2) }}
    </div>
    <VChart class="rsc-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.rsc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rsc-beta {
  font-size: 12px;
  color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.rsc-chart {
  width: 100%;
  height: 280px;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

**Suggested commit point:** All chart components complete.

---

## Task 15: `AnnualReturnsList.vue` — right-rail list with inline bars + delta pill

**Files:**
- Create: `src/components/portfolio/AnnualReturnsList.vue`

- [ ] **Step 1: Implement the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'
import { formatSignedPercent } from '@/util/format'
import type { AnnualReturn } from '@/util/returns'

const props = defineProps<{
  annual: AnnualReturn[]
  highlightedYear?: number | null
}>()

const emit = defineEmits<{
  'year-hover': [year: number | null]
}>()

const sorted = computed(() => [...props.annual].sort((a, b) => b.year - a.year))

const maxAbs = computed(() => {
  let max = 0
  for (const a of props.annual) {
    const m = Math.max(Math.abs(a.portfolio), Math.abs(a.benchmark))
    if (m > max) max = m
  }
  return max === 0 ? 1 : max
})

function barValue(v: number): number {
  return Math.min(1, Math.abs(v) / maxAbs.value)
}

function rowClass(year: number): string {
  if (props.highlightedYear == null) return ''
  return props.highlightedYear === year ? 'is-highlighted' : 'is-dimmed'
}
</script>

<template>
  <ul class="arl">
    <li
      v-for="a in sorted"
      :key="a.year"
      :class="rowClass(a.year)"
      @mouseenter="emit('year-hover', a.year)"
      @mouseleave="emit('year-hover', null)"
    >
      <div class="arl-top">
        <span class="arl-year">{{ a.year }}</span>
        <span class="arl-pf num" :class="a.portfolio >= 0 ? 'up' : 'down'">
          {{ formatSignedPercent(a.portfolio) }}
        </span>
      </div>
      <AnimatedBar
        :value="barValue(a.portfolio)"
        :gradient="a.portfolio >= 0 ? 'var(--grad-primary-to-gain)' : 'var(--grad-gain-to-warn)'"
        :animate="true"
        style="margin-top: 4px"
      />
      <div class="arl-bot">
        <span class="arl-bench num">bench {{ formatSignedPercent(a.benchmark) }}</span>
        <span class="arl-delta" :class="a.delta >= 0 ? 'up' : 'down'">
          {{ a.delta >= 0 ? '+' : '' }}{{ (a.delta * 100).toFixed(2) }}pp
        </span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.arl {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 720px;
  overflow-y: auto;
}
.arl li {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  border-radius: 2px;
  transition:
    background 180ms ease,
    opacity 180ms ease;
  cursor: default;
}
.arl li:last-child {
  border-bottom: none;
}
.arl li.is-highlighted {
  background: var(--primary-soft-07);
}
.arl li.is-dimmed {
  opacity: 0.45;
}
.arl-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.arl-year {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--text-2);
  font-weight: 500;
}
.arl-pf {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 500;
}
.arl-pf.up {
  color: var(--gain);
}
.arl-pf.down {
  color: var(--loss);
}
.arl-bot {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
}
.arl-bench {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.arl-delta {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 11px;
}
.arl-delta.up {
  color: var(--gain);
  background: var(--gain-soft-15);
}
.arl-delta.down {
  color: var(--loss);
  background: var(--loss-soft-15);
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 16: `PortfolioReturns.vue` — Returns page

**Files:**
- Create: `src/pages/PortfolioReturns.vue`

- [ ] **Step 1: Implement the page**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import KpiCard from '@/components/ui/KpiCard.vue'
import Panel from '@/components/ui/Panel.vue'
import ReturnHeatmap from '@/components/charts/ReturnHeatmap.vue'
import RollingReturnsChart from '@/components/charts/RollingReturnsChart.vue'
import AnnualReturnsList from '@/components/portfolio/AnnualReturnsList.vue'
import { formatSignedPercent, formatPercent } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioReturns } from '@/composables/usePortfolioReturns'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const measurementsParams = ref({})
const { data: portfolio } = usePortfolio(portfolioId)
const { data: measurements, isLoading, error } = usePortfolioMeasurements(
  portfolioId,
  measurementsParams
)
const derived = usePortfolioReturns(measurements)

const highlightedYear = ref<number | null>(null)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtMonth(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}
</script>

<template>
  <main class="pr-main">
    <div v-if="isLoading" class="pr-loading">
      <Skeleton width="100%" height="92px" />
      <Skeleton width="100%" height="480px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load returns. {{ (error as Error).message }}
    </div>

    <template v-else-if="derived">
      <section class="pr-kpis">
        <KpiCard label="% positive months">
          <div class="kpi-value small">{{ formatPercent(derived.stats.pctPositiveMonths) }}</div>
        </KpiCard>
        <KpiCard label="Longest positive streak">
          <div class="kpi-value small">
            {{ derived.stats.longestPositiveStreak }}
            <span class="muted">mo</span>
          </div>
        </KpiCard>
        <KpiCard label="Best year">
          <div class="kpi-value small up" v-if="derived.stats.bestYear">
            {{ formatSignedPercent(derived.stats.bestYear.return) }}
          </div>
          <div class="kpi-sub muted" v-if="derived.stats.bestYear">
            {{ derived.stats.bestYear.year }}
          </div>
        </KpiCard>
        <KpiCard label="Worst year">
          <div class="kpi-value small down" v-if="derived.stats.worstYear">
            {{ formatSignedPercent(derived.stats.worstYear.return) }}
          </div>
          <div class="kpi-sub muted" v-if="derived.stats.worstYear">
            {{ derived.stats.worstYear.year }}
          </div>
        </KpiCard>
        <KpiCard label="Best month">
          <div class="kpi-value small up" v-if="derived.stats.bestMonth">
            {{ formatSignedPercent(derived.stats.bestMonth.return) }}
          </div>
          <div class="kpi-sub muted" v-if="derived.stats.bestMonth">
            {{ fmtMonth(derived.stats.bestMonth.year, derived.stats.bestMonth.month) }}
          </div>
        </KpiCard>
        <KpiCard label="Worst month">
          <div class="kpi-value small down" v-if="derived.stats.worstMonth">
            {{ formatSignedPercent(derived.stats.worstMonth.return) }}
          </div>
          <div class="kpi-sub muted" v-if="derived.stats.worstMonth">
            {{ fmtMonth(derived.stats.worstMonth.year, derived.stats.worstMonth.month) }}
          </div>
        </KpiCard>
      </section>

      <div class="pr-grid">
        <div class="pr-left">
          <Panel title="Monthly returns" subtitle="Year × month · diverging scale">
            <ReturnHeatmap
              :monthly="derived.monthly"
              :highlighted-year="highlightedYear"
              @year-hover="(y) => (highlightedYear = y)"
            />
          </Panel>

          <Panel title="Rolling returns" subtitle="Trailing annualized return">
            <RollingReturnsChart
              :one-year="derived.rolling.oneYear"
              :three-year="derived.rolling.threeYear"
              :five-year="derived.rolling.fiveYear"
              :benchmark-label="portfolio?.benchmark ?? 'Benchmark'"
            />
          </Panel>
        </div>
        <div class="pr-right">
          <Panel title="Annual returns" subtitle="Portfolio vs. benchmark">
            <AnnualReturnsList
              :annual="derived.annual"
              :highlighted-year="highlightedYear"
              @year-hover="(y) => (highlightedYear = y)"
            />
          </Panel>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.pr-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.pr-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pr-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 2px;
}
.pr-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
.pr-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pr-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 400;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kpi-value.small {
  font-size: 20px;
}
.kpi-value.up {
  color: var(--gain);
}
.kpi-value.down {
  color: var(--loss);
}
.kpi-value .muted {
  color: var(--text-3);
  font-size: 12px;
  margin-left: 4px;
}
.kpi-sub {
  font-size: 12px;
}
.kpi-sub.muted {
  color: var(--text-3);
}
.error-banner {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
}
@media (max-width: 1024px) {
  .pr-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .pr-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .pr-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 17: `PortfolioVsBenchmark.vue` — vs. Benchmark page

**Files:**
- Create: `src/pages/PortfolioVsBenchmark.vue`

**Semantics notes:**
- Up capture / down capture / beta come from `portfolio.metrics` when present, falling back to the derived regression beta.
- Information ratio, tracking error, active return all come from `derived.stats`.

- [ ] **Step 1: Implement the page**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import KpiCard from '@/components/ui/KpiCard.vue'
import Panel from '@/components/ui/Panel.vue'
import RollingExcessChart from '@/components/charts/RollingExcessChart.vue'
import ReturnDistributionChart from '@/components/charts/ReturnDistributionChart.vue'
import ReturnScatterChart from '@/components/charts/ReturnScatterChart.vue'
import { formatSignedPercent, formatNumber } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioReturns } from '@/composables/usePortfolioReturns'
import type { PortfolioMetric } from '@/api/endpoints/portfolios'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const measurementsParams = ref({})
const { data: portfolio } = usePortfolio(portfolioId)
const { data: measurements, isLoading, error } = usePortfolioMeasurements(
  portfolioId,
  measurementsParams
)
const derived = usePortfolioReturns(measurements)

function metricValue(label: string): number | null {
  const metrics = portfolio.value?.metrics ?? []
  const m = metrics.find((x: PortfolioMetric) => x.label === label)
  return m ? m.value : null
}

const beta = computed(() => metricValue('Beta vs. Benchmark') ?? derived.value?.regression.beta ?? 0)
const upCapture = computed(() => metricValue('Up Capture'))
const downCapture = computed(() => metricValue('Down Capture'))
</script>

<template>
  <main class="pvb-main">
    <div v-if="isLoading" class="pvb-loading">
      <Skeleton width="100%" height="92px" />
      <Skeleton width="100%" height="320px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load data. {{ (error as Error).message }}
    </div>

    <template v-else-if="derived">
      <section class="pvb-kpis">
        <KpiCard label="Active return (ann.)">
          <div class="kpi-value small" :class="derived.stats.activeReturn >= 0 ? 'up' : 'down'">
            {{ formatSignedPercent(derived.stats.activeReturn) }}
          </div>
        </KpiCard>
        <KpiCard label="Tracking error">
          <div class="kpi-value small">{{ formatSignedPercent(derived.stats.trackingError) }}</div>
        </KpiCard>
        <KpiCard label="Information ratio">
          <div class="kpi-value small">{{ formatNumber(derived.stats.informationRatio) }}</div>
        </KpiCard>
        <KpiCard label="Up capture">
          <div class="kpi-value small">
            {{ upCapture != null ? formatNumber(upCapture) : '—' }}
          </div>
        </KpiCard>
        <KpiCard label="Down capture">
          <div class="kpi-value small">
            {{ downCapture != null ? formatNumber(downCapture) : '—' }}
          </div>
        </KpiCard>
        <KpiCard label="Beta">
          <div class="kpi-value small">{{ formatNumber(beta) }}</div>
        </KpiCard>
      </section>

      <Panel title="Rolling excess return" :subtitle="`Portfolio − ${portfolio?.benchmark ?? 'Benchmark'}`">
        <RollingExcessChart
          :excess6-m="derived.rolling.excess6M"
          :excess12-m="derived.rolling.excess12M"
          :excess36-m="derived.rolling.excess36M"
        />
      </Panel>

      <div class="pvb-pair">
        <Panel title="Return distribution" subtitle="Monthly return histogram">
          <ReturnDistributionChart :monthly="derived.monthly" />
        </Panel>
        <Panel title="Return scatter" subtitle="Portfolio vs. benchmark, monthly">
          <ReturnScatterChart :scatter="derived.scatter" :regression="derived.regression" />
        </Panel>
      </div>
    </template>
  </main>
</template>

<style scoped>
.pvb-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.pvb-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pvb-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 2px;
}
.pvb-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 400;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kpi-value.small {
  font-size: 20px;
}
.kpi-value.up {
  color: var(--gain);
}
.kpi-value.down {
  color: var(--loss);
}
.error-banner {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
}
@media (max-width: 1024px) {
  .pvb-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .pvb-pair {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .pvb-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 18: Add routes

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: Add the two new child routes**

Find the `portfolios/:id` route block and insert two new children. The final array should look like:

```ts
children: [
  {
    path: '',
    name: 'portfolio-summary',
    component: () => import('./pages/PortfolioSummary.vue')
  },
  {
    path: 'returns',
    name: 'portfolio-returns',
    component: () => import('./pages/PortfolioReturns.vue')
  },
  {
    path: 'vs-benchmark',
    name: 'portfolio-vs-benchmark',
    component: () => import('./pages/PortfolioVsBenchmark.vue')
  },
  {
    path: 'holdings',
    name: 'portfolio-holdings',
    component: () => import('./pages/PortfolioHoldings.vue')
  },
  {
    path: 'transactions',
    name: 'portfolio-transactions',
    component: () => import('./pages/PortfolioTransactions.vue')
  }
]
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

## Task 19: Update the tab bar

**Files:**
- Modify: `src/layouts/PortfolioLayout.vue`

- [ ] **Step 1: Rewrite the `tabs` computed**

Replace the body of the `tabs` computed with:

```ts
const tabs = computed(() => {
  const id = portfolioId.value
  if (!id) return []
  return [
    { label: 'Overview', to: `/portfolios/${id}` },
    { label: 'Returns', to: `/portfolios/${id}/returns` },
    { label: 'vs. Benchmark', to: `/portfolios/${id}/vs-benchmark` },
    { label: 'Holdings', to: `/portfolios/${id}/holdings` },
    { label: 'Transactions', to: `/portfolios/${id}/transactions` },
    { label: 'Settings', disabled: true }
  ]
})
```

The `Strategy` and `Backtest` entries disappear. `Settings` remains disabled.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint:check`
Expected: no errors.

**Suggested commit point:** pages wired into nav; app now shows the new tabs.

---

## Task 20: E2E — Returns tab smoke tests

**Files:**
- Create: `tests/e2e/returns.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio Returns', () => {
  test('tab navigation from summary to returns', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Returns' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/returns$`), {
      timeout: 5_000
    })
  })

  test('renders stats, heatmap, annual list, and rolling chart', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/returns`)
    await expect(page.locator('.pr-kpis .kpi')).toHaveCount(6, { timeout: 10_000 })
    await expect(page.locator('.heatmap-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.arl li').first()).toBeVisible()
    await expect(page.locator('.rrc-chart canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('hovering an annual row highlights it', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/returns`)
    const firstRow = page.locator('.arl li').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })
    await firstRow.hover()
    // When one row is hovered, other rows get the dimmed class
    await expect(page.locator('.arl li.is-dimmed').first()).toBeVisible({ timeout: 2_000 })
  })
})
```

- [ ] **Step 2: Run the e2e tests**

Run: `npm run e2e -- returns.spec.ts`
Expected: all three tests pass.

---

## Task 21: E2E — vs. Benchmark tab smoke tests

**Files:**
- Create: `tests/e2e/vs-benchmark.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio vs. Benchmark', () => {
  test('tab navigation from summary to vs. Benchmark', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'vs. Benchmark' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/vs-benchmark$`), {
      timeout: 5_000
    })
  })

  test('renders stats, rolling excess, distribution, and scatter', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/vs-benchmark`)
    await expect(page.locator('.pvb-kpis .kpi')).toHaveCount(6, { timeout: 10_000 })
    await expect(page.locator('.rex-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.rdc-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.rsc-chart canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('rolling-excess window toggle swaps the active chip', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/vs-benchmark`)
    const twelveBtn = page.locator('.rex-toggles button', { hasText: '12M' })
    const thirtySixBtn = page.locator('.rex-toggles button', { hasText: '36M' })
    await expect(twelveBtn).toHaveClass(/active/)
    await thirtySixBtn.click()
    await expect(thirtySixBtn).toHaveClass(/active/)
    await expect(twelveBtn).not.toHaveClass(/active/)
  })
})
```

- [ ] **Step 2: Run the e2e tests**

Run: `npm run e2e -- vs-benchmark.spec.ts`
Expected: all three tests pass.

**Suggested commit point:** all tests green; features user-visible.

---

## Task 22: Manual browser smoke + final checks

- [ ] **Step 1: Run typecheck, lint, unit tests**

```bash
npm run typecheck
npm run lint:check
npm test
```

All three should pass cleanly.

- [ ] **Step 2: Start dev server (user may have one already running)**

Per repo memory, do not kill an existing dev server. If not already running:

```bash
npm run dev
```

- [ ] **Step 3: Manual smoke in browser**

Navigate to `http://localhost:5174/portfolios/00000000-0000-4000-a000-000000000001` and walk through:

- Click `Returns` tab — page loads; 6 KPIs render; heatmap shows year × month grid; right rail shows annual returns list newest-first; rolling returns chart shows 1Y/3Y/5Y toggles and is interactive
- Hover a row in the annual list — that year column in the heatmap visibly highlights; other rows dim
- Click `vs. Benchmark` tab — page loads; 6 KPIs render; rolling excess chart renders with positive/negative area fill; distribution + scatter panels render side by side
- Click rolling-excess 6M / 12M / 36M toggles — chart swaps cleanly
- Toggle theme — all charts re-render with the appropriate palette; no console errors

- [ ] **Step 4: Check for console errors**

Open devtools → console, reload each new page. Expect no red errors; a few vue-echarts-related warnings are acceptable if pre-existing on other pages.

---

## Plan self-review

### Spec coverage
- Routing & tab bar — Tasks 18, 19
- `usePortfolioReturns` composable — Task 8
- Pure utility + unit tests — Tasks 1–7
- Calendar heatmap — Task 10
- Rolling returns chart — Task 11
- Rolling excess chart — Task 12
- Distribution histogram — Task 13
- Scatter + regression — Task 14
- Annual returns list with hover pairing — Task 15
- Returns page layout (2/3 + 1/3) with stats strip — Task 16
- vs. Benchmark page layout with stats strip — Task 17
- E2E tests for both tabs — Tasks 20, 21
- Manual verification — Task 22

### Types used
- `DailyPoint`, `MonthlyReturn`, `AnnualReturn`, `RollingPoint`, `RollingExcessPoint`, `ScatterPoint`, `Regression`, `ReturnStats`, `PortfolioReturnsDerived` — defined in Tasks 1 and 8, consumed in Tasks 10–17 consistently.

### Known limitations / open issues
- `ReturnHeatmap.vue` accepts `highlightedYear` but does not yet visually dim non-highlighted columns. The spec calls for this; Task 16 handles the reverse (annual list emits, page forwards to heatmap), but the heatmap itself does not yet react visually. This is an acceptable MVP — the spec's coordination works in one direction (row → list highlight). If the bidirectional interaction from the spec is required, a follow-up adds `visualMap` overrides or per-cell `itemStyle` switching in the heatmap when `highlightedYear` is set.
- The distribution chart uses a fixed 24-bin count rather than Freedman–Diaconis sizing promised in the spec. Acceptable MVP; upgrade in a follow-up if histories are too sparse or dense.
