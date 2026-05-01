# Risk Page — Rework Plan (creative charts)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Each task is TDD where applicable; commit at the end of each task.

**Goal:** Replace the current KPI-heavy Risk tab with a narrative page whose visual language doesn't exist anywhere else in the app. Five distinctive visuals + a hero verdict.

**Design (locked in by chat):**

```
HERO
  Computed 2-3 sentence verdict (derived from portfolio + benchmark stats)
  [ Vol percentile gauge ]  [ Win-loss waffle ]

Loss shape
  [ Drawdown episodes bubble chart ]   (x = depth, y = recovery months, size = total duration)

Asymmetry
  [ Capture quadrant ]                 (single dot on up-capture × down-capture grid)

Crisis behavior
  [ Crisis small-multiples ]           (top N deepest drawdowns, each as a mini portfolio+benchmark chart)
```

**Key changes vs. v1:**
- Delete: `DrawdownCurveChart`, `DrawdownOverlayChart`, `RollingVolChart`, `UpDownScatterChart`, `WorstMonthsList` (and their tests)
- Keep & extend: `src/util/risk.ts`, `src/composables/usePortfolioRisk.ts`, router/tab wiring
- Add: `VolPercentileGauge`, `WinLossWaffle`, `DrawdownEpisodesChart`, `CaptureQuadrantChart`, `CrisisSmallMultiples`, plus an inline verdict generator in the page
- Rewrite: `src/pages/PortfolioRisk.vue`, `tests/e2e/risk.spec.ts`

**Math reused from v1:** all existing `util/risk.ts` functions stay — they're tested primitives even though the new UI doesn't call all of them directly. Don't delete. The new page uses: `rollingVolatility`, `annualizedVol`, plus a new `percentileOf` helper.

---

## Task 1: Add `percentileOf` helper to `util/risk.ts`

**Files:** modify `src/util/risk.ts`, `tests/unit/risk.spec.ts`

- [ ] **Step 1: Failing tests**

Append to `tests/unit/risk.spec.ts` (update the `@/util/risk` import to include `percentileOf`):

```ts
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
```

- [ ] **Step 2: Verify failing**

Run: `npx vitest run tests/unit/risk.spec.ts -t percentileOf` — FAIL.

- [ ] **Step 3: Implement**

Append to `src/util/risk.ts`:

```ts
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
```

- [ ] **Step 4: Verify passing + typecheck**

Run: `npx vitest run tests/unit/risk.spec.ts` and `npx vue-tsc --noEmit` — both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/util/risk.ts tests/unit/risk.spec.ts
git commit -m "feat(risk): add percentileOf helper"
```

---

## Task 2: Rework `usePortfolioRisk` composable for the new page

**Files:** rewrite `src/composables/usePortfolioRisk.ts`, rewrite `tests/unit/usePortfolioRisk.spec.ts`

- [ ] **Step 1: Rewrite the test**

Replace the entire contents of `tests/unit/usePortfolioRisk.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { usePortfolioRisk } from '@/composables/usePortfolioRisk'
import type { Portfolio, PortfolioMeasurements } from '@/api/endpoints/portfolios'

function fakePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'p1',
    name: 'Test',
    benchmark: 'Bench',
    inceptionDate: '2023-01-01',
    currentAssets: [],
    lastUpdated: '2024-06-01T00:00:00Z',
    summary: {
      currentValue: 1000,
      ytdReturn: 0,
      oneYearReturn: 0,
      cagrSinceInception: 0.1,
      maxDrawDown: -0.1,
      sharpe: 1,
      sortino: 1,
      beta: 1,
      alpha: 0,
      stdDev: 0.15,
      taxCostRatio: 0
    },
    drawdowns: [
      { start: '2023-03-01', trough: '2023-04-01', recovery: '2023-06-01', depth: -0.05, days: 92 },
      { start: '2024-01-01', trough: '2024-02-15', recovery: '2024-04-30', depth: -0.08, days: 120 }
    ],
    metrics: [
      { label: 'Up Capture', value: 1.05, format: 'number' },
      { label: 'Down Capture', value: 0.8, format: 'number' }
    ],
    trailingReturns: [],
    allocation: [],
    ...overrides
  } as Portfolio
}

describe('usePortfolioRisk', () => {
  it('returns null when inputs are missing', () => {
    const p = ref<Portfolio | undefined>(undefined)
    const m = ref<PortfolioMeasurements | undefined>(undefined)
    expect(usePortfolioRisk(p, m).value).toBeNull()
  })

  it('derives winLoss, capture, episodes, crisisEpisodes, volGauge, verdict', () => {
    const p = ref<Portfolio | undefined>(fakePortfolio())
    // 18 monthly anchors to get a rolling-vol series of 7 points (18 - 12 + 1 = 7)
    const points = Array.from({ length: 18 }, (_, i) => {
      const y = 2023 + Math.floor(i / 12)
      const mo = (i % 12) + 1
      const date = `${y}-${String(mo).padStart(2, '0')}-28`
      return {
        date,
        portfolioValue: 100 * (1 + (i % 2 === 0 ? 0.02 : -0.01)) ** i,
        benchmarkValue: 100 * (1 + (i % 2 === 0 ? 0.015 : -0.005)) ** i
      }
    })
    const m = ref<PortfolioMeasurements | undefined>({ points })
    const d = usePortfolioRisk(p, m).value
    expect(d).not.toBeNull()
    expect(d!.winLoss.total).toBeGreaterThan(0)
    expect(d!.capture.up).toBeCloseTo(1.05, 10)
    expect(d!.capture.down).toBeCloseTo(0.8, 10)
    expect(d!.episodes).toHaveLength(2)
    expect(d!.episodes[0]!.recoveryDays).toBeGreaterThan(0)
    expect(d!.crisisEpisodes.length).toBeGreaterThan(0)
    expect(d!.crisisEpisodes[0]!.days.length).toBeGreaterThan(0)
    expect(d!.volGauge.history.length).toBeGreaterThan(0)
    expect(d!.volGauge.percentile).toBeGreaterThanOrEqual(0)
    expect(d!.volGauge.percentile).toBeLessThanOrEqual(100)
    expect(d!.verdict.benchmarkVol).toBeGreaterThan(0)
    expect(d!.verdict.pctLosingMonths).toBeGreaterThanOrEqual(0)
  })

  it('skips drawdowns that have not yet recovered', () => {
    const p = ref<Portfolio | undefined>(
      fakePortfolio({
        drawdowns: [
          { start: '2024-01-01', trough: '2024-03-01', recovery: null, depth: -0.2, days: 120 }
        ]
      })
    )
    const m = ref<PortfolioMeasurements | undefined>({
      points: [
        { date: '2024-01-01', portfolioValue: 100, benchmarkValue: 100 },
        { date: '2024-04-01', portfolioValue: 80, benchmarkValue: 90 }
      ]
    })
    const d = usePortfolioRisk(p, m).value
    expect(d!.episodes).toHaveLength(0)
    expect(d!.crisisEpisodes).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verify failing**

Run: `npx vitest run tests/unit/usePortfolioRisk.spec.ts` — FAIL (types don't match new shape).

- [ ] **Step 3: Rewrite the composable**

Replace `src/composables/usePortfolioRisk.ts` with:

```ts
// src/composables/usePortfolioRisk.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { Portfolio, PortfolioMeasurements, PortfolioMetric } from '@/api/endpoints/portfolios'
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
  days: CrisisPoint[]
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
  up: number // 1.0 = 100% capture
  down: number
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

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function metricValue(metrics: PortfolioMetric[] | undefined, label: string): number | null {
  if (!metrics) return null
  const m = metrics.find((x) => x.label === label)
  return m ? m.value : null
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
  measurements: Ref<PortfolioMeasurements | undefined>
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

    // Capture: read from API metrics (decimals already, e.g. 1.05)
    const capture: CaptureData = {
      up: metricValue(p.metrics, 'Up Capture') ?? 1,
      down: metricValue(p.metrics, 'Down Capture') ?? 1
    }

    // Drawdown episodes — only the ones that recovered
    const episodes: DrawdownEpisode[] = (p.drawdowns ?? [])
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

    // Crisis small-multiples — top N=3 deepest episodes (already ordered deepest-first by API
    // contract, but re-sort defensively)
    const crisisEpisodes: CrisisEpisode[] = [...episodes]
      .sort((a, b) => a.depth - b.depth)
      .slice(0, 3)
      .map((e) => ({
        label: e.label,
        start: e.start,
        recovery: e.recovery,
        depth: e.depth,
        days: toCrisisPoints(sliceByDate(days, e.start, e.recovery))
      }))

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
      episodes.length === 0
        ? 0
        : Math.max(...episodes.map((e) => e.recoveryDays)) / 30
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
```

- [ ] **Step 4: Verify passing + typecheck**

Run: `npx vitest run tests/unit/usePortfolioRisk.spec.ts` — PASS.
Run: `npx vue-tsc --noEmit` — will likely fail because `src/pages/PortfolioRisk.vue` still uses the old shape. That's expected for this task; Task 8 rewrites the page. For now, confirm the composable test passes and move on.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePortfolioRisk.ts tests/unit/usePortfolioRisk.spec.ts
git commit -m "feat(risk): rework usePortfolioRisk for new derived shape"
```

---

## Task 3: `VolPercentileGauge.vue` component

**Files:** create `src/components/charts/VolPercentileGauge.vue`, create `tests/unit/components/VolPercentileGauge.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VolPercentileGauge from '@/components/charts/VolPercentileGauge.vue'

describe('VolPercentileGauge', () => {
  it('mounts and renders the current vol label', () => {
    setActivePinia(createPinia())
    const wrapper = mount(VolPercentileGauge, {
      props: { current: 0.142, percentile: 72 }
    })
    expect(wrapper.find('.vpg').exists()).toBe(true)
    expect(wrapper.text()).toContain('14.2%')
    expect(wrapper.text()).toContain('72')
  })
})
```

Mirror the vue-echarts mocking pattern used elsewhere (`vi.mock('vue-echarts', ...)` with a stub component) so jsdom can mount.

- [ ] **Step 2: Verify failing**

Run: `npx vitest run tests/unit/components/VolPercentileGauge.spec.ts`.

- [ ] **Step 3: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  current: number // decimal, e.g. 0.142
  percentile: number // 0-100
}>()

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const pct = Math.max(0, Math.min(100, props.percentile))
  return {
    series: [
      {
        type: 'gauge',
        radius: '100%',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.33, p.gain],
              [0.66, p.secondary],
              [1, p.loss]
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { length: 6, lineStyle: { color: p.border, width: 1 } },
        axisLabel: { show: false },
        pointer: { width: 4, length: '70%', itemStyle: { color: p.text1 } },
        anchor: { show: true, size: 8, itemStyle: { color: p.text1 } },
        detail: { show: false },
        title: { show: false },
        data: [{ value: pct }]
      }
    ]
  }
})

const currentLabel = computed(() => `${(props.current * 100).toFixed(1)}%`)
const percentileLabel = computed(() => `${Math.round(props.percentile)}th percentile`)
</script>

<template>
  <div class="vpg">
    <VChart class="vpg-chart" :option="chartOption" autoresize />
    <div class="vpg-center">
      <div class="vpg-value">{{ currentLabel }}</div>
      <div class="vpg-sub">{{ percentileLabel }}</div>
    </div>
  </div>
</template>

<style scoped>
.vpg {
  position: relative;
  width: 100%;
  height: 180px;
}
.vpg-chart {
  width: 100%;
  height: 100%;
}
.vpg-center {
  position: absolute;
  inset: auto 0 10px 0;
  text-align: center;
  pointer-events: none;
}
.vpg-value {
  font-size: 26px;
  font-weight: 300;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.vpg-sub {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 2px;
}
</style>
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/components/VolPercentileGauge.spec.ts` — PASS.
Run: `npx vue-tsc --noEmit` — may still fail due to the page referencing old components; that's fine.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/VolPercentileGauge.vue tests/unit/components/VolPercentileGauge.spec.ts
git commit -m "feat(risk): add VolPercentileGauge component"
```

---

## Task 4: `WinLossWaffle.vue` component

**Files:** create `src/components/charts/WinLossWaffle.vue`, create `tests/unit/components/WinLossWaffle.spec.ts`

No ECharts — pure hand-built CSS grid.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WinLossWaffle from '@/components/charts/WinLossWaffle.vue'

describe('WinLossWaffle', () => {
  it('renders 100 squares, colouring the winning fraction green', () => {
    const wrapper = mount(WinLossWaffle, { props: { positive: 70, total: 100 } })
    expect(wrapper.findAll('.wlw-cell')).toHaveLength(100)
    expect(wrapper.findAll('.wlw-cell.wlw-win')).toHaveLength(70)
    expect(wrapper.findAll('.wlw-cell.wlw-loss')).toHaveLength(30)
  })

  it('handles fractional inputs by rounding the win count', () => {
    // 83/120 ≈ 69.17 → round to 69 winning squares, 31 losing
    const wrapper = mount(WinLossWaffle, { props: { positive: 83, total: 120 } })
    expect(wrapper.findAll('.wlw-cell.wlw-win')).toHaveLength(69)
    expect(wrapper.findAll('.wlw-cell.wlw-loss')).toHaveLength(31)
  })

  it('renders a legend stating the exact fraction', () => {
    const wrapper = mount(WinLossWaffle, { props: { positive: 72, total: 120 } })
    expect(wrapper.text()).toContain('72 of 120 months positive')
  })
})
```

- [ ] **Step 2: Verify failing**

Run: `npx vitest run tests/unit/components/WinLossWaffle.spec.ts` — FAIL.

- [ ] **Step 3: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  positive: number
  total: number
}>()

const CELLS = 100

const winCount = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.positive / props.total) * CELLS)
})

const cells = computed(() =>
  Array.from({ length: CELLS }, (_, i) => (i < winCount.value ? 'win' : 'loss'))
)

const legendText = computed(() => `${props.positive} of ${props.total} months positive`)
const pct = computed(() => {
  if (props.total === 0) return '0%'
  return `${((props.positive / props.total) * 100).toFixed(0)}%`
})
</script>

<template>
  <div class="wlw">
    <div class="wlw-grid">
      <span
        v-for="(kind, i) in cells"
        :key="i"
        class="wlw-cell"
        :class="`wlw-${kind}`"
      />
    </div>
    <div class="wlw-legend">
      <span class="wlw-pct">{{ pct }}</span>
      <span class="wlw-text">{{ legendText }}</span>
    </div>
  </div>
</template>

<style scoped>
.wlw {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
.wlw-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-auto-rows: 1fr;
  gap: 3px;
  aspect-ratio: 1 / 1;
  max-width: 220px;
}
.wlw-cell {
  display: block;
  border-radius: 1px;
  aspect-ratio: 1 / 1;
}
.wlw-win {
  background: var(--gain);
  opacity: 0.85;
}
.wlw-loss {
  background: var(--loss);
  opacity: 0.8;
}
.wlw-legend {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.wlw-pct {
  font-size: 26px;
  font-weight: 300;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.wlw-text {
  font-size: 12px;
  color: var(--text-3);
}
</style>
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/components/WinLossWaffle.spec.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/WinLossWaffle.vue tests/unit/components/WinLossWaffle.spec.ts
git commit -m "feat(risk): add WinLossWaffle component"
```

---

## Task 5: `DrawdownEpisodesChart.vue` component (bubble chart)

**Files:** create `src/components/charts/DrawdownEpisodesChart.vue`, create `tests/unit/components/DrawdownEpisodesChart.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DrawdownEpisodesChart from '@/components/charts/DrawdownEpisodesChart.vue'

describe('DrawdownEpisodesChart', () => {
  it('mounts with an episodes array', () => {
    setActivePinia(createPinia())
    const wrapper = mount(DrawdownEpisodesChart, {
      props: {
        episodes: [
          {
            start: '2020-02-01',
            trough: '2020-03-15',
            recovery: '2020-08-01',
            depth: -0.25,
            totalDays: 182,
            recoveryDays: 139,
            label: 'Feb 2020'
          },
          {
            start: '2022-01-01',
            trough: '2022-06-01',
            recovery: '2023-03-01',
            depth: -0.15,
            totalDays: 424,
            recoveryDays: 273,
            label: 'Jan 2022'
          }
        ]
      }
    })
    expect(wrapper.find('.dec-chart').exists()).toBe(true)
  })

  it('renders an empty-state message when no episodes', () => {
    setActivePinia(createPinia())
    const wrapper = mount(DrawdownEpisodesChart, { props: { episodes: [] } })
    expect(wrapper.find('.dec-empty').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Verify failing**

- [ ] **Step 3: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { DrawdownEpisode } from '@/composables/usePortfolioRisk'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  episodes: DrawdownEpisode[]
}>()

const minSymbol = 14
const maxSymbol = 50

const maxTotalDays = computed(() => {
  let m = 1
  for (const e of props.episodes) if (e.totalDays > m) m = e.totalDays
  return m
})

function symbolSize(totalDays: number): number {
  const t = totalDays / maxTotalDays.value
  return minSymbol + t * (maxSymbol - minSymbol)
}

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const data = props.episodes.map((e) => ({
    value: [e.depth * 100, e.recoveryDays / 30],
    episode: e
  }))
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const pt = params as { data: { episode: DrawdownEpisode } }
        const e = pt.data.episode
        const depthPct = (e.depth * 100).toFixed(2)
        const recoveryMo = (e.recoveryDays / 30).toFixed(1)
        const totalMo = (e.totalDays / 30).toFixed(1)
        return `${e.label}<br/>depth ${depthPct}% · recovered in ${recoveryMo} mo<br/><span style="color:${p.text3}">total episode ${totalMo} mo</span>`
      }
    },
    grid: { left: 64, right: 24, top: 16, bottom: 48 },
    xAxis: {
      type: 'value',
      max: 0,
      axisLabel: { color: p.text3, formatter: '{value}%' },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } },
      name: 'depth',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: p.text3, formatter: '{value} mo' },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.5 } },
      name: 'recovery time',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    series: [
      {
        type: 'scatter',
        data,
        symbolSize: (_: unknown, params: unknown) => {
          const d = (params as { data: { episode: DrawdownEpisode } }).data.episode
          return symbolSize(d.totalDays)
        },
        itemStyle: { color: p.loss, opacity: 0.75 },
        label: {
          show: true,
          position: 'right',
          color: p.text2,
          fontSize: 11,
          formatter: (params: unknown) =>
            (params as { data: { episode: DrawdownEpisode } }).data.episode.label
        }
      }
    ]
  }
})
</script>

<template>
  <div v-if="episodes.length === 0" class="dec-empty">No completed drawdown episodes yet</div>
  <VChart v-else class="dec-chart" :option="chartOption" autoresize />
</template>

<style scoped>
.dec-chart {
  width: 100%;
  height: 360px;
}
.dec-empty {
  padding: 60px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}
</style>
```

- [ ] **Step 4: Verify**

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/DrawdownEpisodesChart.vue tests/unit/components/DrawdownEpisodesChart.spec.ts
git commit -m "feat(risk): add DrawdownEpisodesChart bubble component"
```

---

## Task 6: `CaptureQuadrantChart.vue` component

**Files:** create `src/components/charts/CaptureQuadrantChart.vue`, create `tests/unit/components/CaptureQuadrantChart.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CaptureQuadrantChart from '@/components/charts/CaptureQuadrantChart.vue'

describe('CaptureQuadrantChart', () => {
  it('mounts with up/down captures', () => {
    setActivePinia(createPinia())
    const wrapper = mount(CaptureQuadrantChart, {
      props: { up: 1.08, down: 0.81, benchmarkLabel: 'S&P 500' }
    })
    expect(wrapper.find('.cqc-chart').exists()).toBe(true)
    expect(wrapper.text()).toContain('up 108%')
    expect(wrapper.text()).toContain('down 81%')
  })
})
```

- [ ] **Step 2: Verify failing**

- [ ] **Step 3: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  up: number // decimal, 1.0 = 100%
  down: number
  benchmarkLabel: string
}>()

const AXIS_MAX = 1.5
const AXIS_MIN = 0

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      formatter: (params: unknown) => {
        const pt = params as { value: [number, number]; seriesName: string }
        return `${pt.seriesName}<br/>up ${(pt.value[0] * 100).toFixed(0)}% · down ${(pt.value[1] * 100).toFixed(0)}%`
      }
    },
    grid: { left: 72, right: 24, top: 24, bottom: 48 },
    xAxis: {
      type: 'value',
      min: AXIS_MIN,
      max: AXIS_MAX,
      axisLabel: {
        color: p.text3,
        formatter: (v: number) => `${Math.round(v * 100)}%`
      },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.3 } },
      name: 'up-market capture',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: AXIS_MIN,
      max: AXIS_MAX,
      axisLabel: {
        color: p.text3,
        formatter: (v: number) => `${Math.round(v * 100)}%`
      },
      axisLine: { lineStyle: { color: p.border } },
      splitLine: { lineStyle: { color: p.border, opacity: 0.3 } },
      name: 'down-market capture',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { color: p.text3, fontSize: 11 }
    },
    series: [
      {
        name: 'Portfolio',
        type: 'scatter',
        data: [[props.up, props.down]],
        symbolSize: 22,
        itemStyle: {
          color: p.primary,
          shadowColor: p.primary,
          shadowBlur: 12
        },
        label: {
          show: true,
          position: 'right',
          color: p.text1,
          fontSize: 12,
          formatter: 'portfolio'
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: p.text3, opacity: 0.5 },
          data: [
            {
              name: props.benchmarkLabel,
              coord: [1, 1],
              label: {
                show: true,
                position: 'right',
                color: p.text3,
                fontSize: 11,
                formatter: props.benchmarkLabel
              }
            }
          ]
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: p.border, type: 'dashed', opacity: 0.8 },
          data: [
            { xAxis: 1 },
            { yAxis: 1 }
          ],
          label: { show: false }
        },
        markArea: {
          silent: true,
          itemStyle: { opacity: 0.07 },
          data: [
            [
              { coord: [1, AXIS_MIN], itemStyle: { color: p.gain } },
              { coord: [AXIS_MAX, 1] }
            ],
            [
              { coord: [AXIS_MIN, 1], itemStyle: { color: p.loss } },
              { coord: [1, AXIS_MAX] }
            ]
          ]
        }
      }
    ]
  }
})

const upLabel = computed(() => `up ${(props.up * 100).toFixed(0)}%`)
const downLabel = computed(() => `down ${(props.down * 100).toFixed(0)}%`)

const verdict = computed(() => {
  if (props.up >= 1 && props.down <= 1) return 'Defensive winner'
  if (props.up >= 1 && props.down > 1) return 'Leveraged beta'
  if (props.up < 1 && props.down <= 1) return 'Cash-like'
  return 'Asymmetric loser'
})
</script>

<template>
  <div class="cqc">
    <div class="cqc-header">
      <span class="cqc-verdict">{{ verdict }}</span>
      <span class="cqc-stats">{{ upLabel }} · {{ downLabel }}</span>
    </div>
    <VChart class="cqc-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.cqc {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cqc-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 4px;
}
.cqc-verdict {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-1);
}
.cqc-stats {
  font-size: 12px;
  color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.cqc-chart {
  width: 100%;
  height: 360px;
}
</style>
```

- [ ] **Step 4: Verify**

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/CaptureQuadrantChart.vue tests/unit/components/CaptureQuadrantChart.spec.ts
git commit -m "feat(risk): add CaptureQuadrantChart component"
```

---

## Task 7: `CrisisSmallMultiples.vue` component

**Files:** create `src/components/charts/CrisisSmallMultiples.vue`, create `tests/unit/components/CrisisSmallMultiples.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CrisisSmallMultiples from '@/components/charts/CrisisSmallMultiples.vue'

describe('CrisisSmallMultiples', () => {
  it('renders one mini chart per episode', () => {
    setActivePinia(createPinia())
    const wrapper = mount(CrisisSmallMultiples, {
      props: {
        episodes: [
          {
            label: 'Feb 2020',
            start: '2020-02-01',
            recovery: '2020-08-01',
            depth: -0.25,
            days: [
              { date: '2020-02-01', portfolio: 0, benchmark: 0 },
              { date: '2020-03-15', portfolio: -0.25, benchmark: -0.32 },
              { date: '2020-08-01', portfolio: 0, benchmark: -0.05 }
            ]
          },
          {
            label: 'Jan 2022',
            start: '2022-01-01',
            recovery: '2023-03-01',
            depth: -0.15,
            days: [
              { date: '2022-01-01', portfolio: 0, benchmark: 0 },
              { date: '2022-06-01', portfolio: -0.15, benchmark: -0.2 },
              { date: '2023-03-01', portfolio: 0, benchmark: -0.05 }
            ]
          }
        ],
        benchmarkLabel: 'Bench'
      }
    })
    expect(wrapper.findAll('.csm-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Feb 2020')
    expect(wrapper.text()).toContain('Jan 2022')
  })

  it('renders an empty-state when there are no episodes', () => {
    setActivePinia(createPinia())
    const wrapper = mount(CrisisSmallMultiples, {
      props: { episodes: [], benchmarkLabel: 'Bench' }
    })
    expect(wrapper.find('.csm-empty').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Verify failing**

- [ ] **Step 3: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { CrisisEpisode } from '@/composables/usePortfolioRisk'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  episodes: CrisisEpisode[]
  benchmarkLabel: string
}>()

const globalYMin = computed(() => {
  let m = 0
  for (const ep of props.episodes) {
    for (const pt of ep.days) {
      if (pt.portfolio < m) m = pt.portfolio
      if (pt.benchmark < m) m = pt.benchmark
    }
  }
  return Math.floor(m * 100) - 2 // percent, a little padding below
})

function optionFor(episode: CrisisEpisode): EChartsOption {
  const p = palette.value
  const pf: [string, number][] = episode.days.map((d) => [d.date, d.portfolio * 100])
  const bn: [string, number][] = episode.days.map((d) => [d.date, d.benchmark * 100])
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      valueFormatter: (v: unknown) =>
        typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)
    },
    grid: { left: 44, right: 10, top: 10, bottom: 22 },
    xAxis: {
      type: 'time',
      axisLabel: { color: p.text3, fontSize: 10 },
      axisLine: { lineStyle: { color: p.border } }
    },
    yAxis: {
      type: 'value',
      max: 0,
      min: globalYMin.value,
      axisLabel: { color: p.text3, fontSize: 10, formatter: '{value}%' },
      splitLine: { show: false }
    },
    series: [
      {
        type: 'line',
        data: pf,
        showSymbol: false,
        lineStyle: { width: 1.5, color: p.primary },
        areaStyle: { color: p.primarySoft15, origin: 0 },
        itemStyle: { color: p.primary }
      },
      {
        type: 'line',
        data: bn,
        showSymbol: false,
        lineStyle: { width: 1, color: p.secondary },
        itemStyle: { color: p.secondary }
      }
    ]
  }
}
</script>

<template>
  <div v-if="episodes.length === 0" class="csm-empty">No major drawdown episodes</div>
  <div v-else class="csm">
    <article v-for="ep in episodes" :key="ep.start" class="csm-item">
      <header class="csm-head">
        <h3 class="csm-label">{{ ep.label }}</h3>
        <span class="csm-depth num">{{ (ep.depth * 100).toFixed(1) }}%</span>
      </header>
      <VChart class="csm-chart" :option="optionFor(ep)" autoresize />
      <footer class="csm-foot">
        portfolio vs. {{ benchmarkLabel }} during episode
      </footer>
    </article>
  </div>
</template>

<style scoped>
.csm {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.csm-item {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.csm-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.csm-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
}
.csm-depth {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--loss);
  font-variant-numeric: tabular-nums;
}
.csm-chart {
  width: 100%;
  height: 140px;
}
.csm-foot {
  font-size: 11px;
  color: var(--text-3);
}
.csm-empty {
  padding: 40px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}
</style>
```

- [ ] **Step 4: Verify**

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/CrisisSmallMultiples.vue tests/unit/components/CrisisSmallMultiples.spec.ts
git commit -m "feat(risk): add CrisisSmallMultiples component"
```

---

## Task 8: Rebuild `PortfolioRisk.vue`

**Files:** rewrite `src/pages/PortfolioRisk.vue`

- [ ] **Step 1: Replace the entire file**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import Panel from '@/components/ui/Panel.vue'
import VolPercentileGauge from '@/components/charts/VolPercentileGauge.vue'
import WinLossWaffle from '@/components/charts/WinLossWaffle.vue'
import DrawdownEpisodesChart from '@/components/charts/DrawdownEpisodesChart.vue'
import CaptureQuadrantChart from '@/components/charts/CaptureQuadrantChart.vue'
import CrisisSmallMultiples from '@/components/charts/CrisisSmallMultiples.vue'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioRisk } from '@/composables/usePortfolioRisk'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: portfolio } = usePortfolio(portfolioId)
const { data: measurements, isLoading, error } = usePortfolioMeasurements(portfolioId, computed(() => ({})))
const derived = usePortfolioRisk(portfolio, measurements)

const verdictParagraph = computed(() => {
  const d = derived.value
  if (!d) return ''
  const v = d.verdict
  const pfVol = (v.portfolioVol * 100).toFixed(1)
  const bnVol = (v.benchmarkVol * 100).toFixed(1)
  const pctLoss = Math.round(v.pctLosingMonths * 100)
  const maxDd = (v.maxDd * 100).toFixed(1)
  const bench = portfolio.value?.benchmark ?? 'the benchmark'
  const recoveryPhrase =
    v.longestRecoveryMonths > 0
      ? `recovered from every past drawdown in under ${Math.ceil(v.longestRecoveryMonths)} months`
      : 'has not yet recovered from its current drawdown'
  return `This portfolio runs ${pfVol}% annualized volatility vs. ${bench}'s ${bnVol}%. Roughly ${pctLoss}% of months were losses, and the deepest drawdown was ${maxDd}%. It has ${recoveryPhrase}.`
})
</script>

<template>
  <main class="prr-main">
    <div v-if="isLoading" class="prr-loading">
      <Skeleton width="100%" height="120px" />
      <Skeleton width="100%" height="360px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load risk data. {{ (error as Error).message }}
    </div>

    <template v-else-if="derived">
      <section class="prr-hero">
        <p class="prr-verdict">{{ verdictParagraph }}</p>
        <div class="prr-hero-row">
          <Panel class="prr-tile">
            <template #header>
              <div>
                <h2>Current volatility</h2>
                <p class="panel-sub">Where the last 12 months of vol sits vs. history</p>
              </div>
            </template>
            <VolPercentileGauge
              :current="derived.volGauge.current"
              :percentile="derived.volGauge.percentile"
            />
          </Panel>
          <Panel class="prr-tile">
            <template #header>
              <div>
                <h2>Winning vs. losing months</h2>
                <p class="panel-sub">Each square is one month, scaled to 100</p>
              </div>
            </template>
            <WinLossWaffle
              :positive="derived.winLoss.positive"
              :total="derived.winLoss.total"
            />
          </Panel>
        </div>
      </section>

      <section class="prr-section">
        <header class="prr-section-head">
          <h2>Loss shape</h2>
          <p class="prr-section-sub">
            Every recovered drawdown — deeper left, slower up. Bubble size = total episode duration.
          </p>
        </header>
        <Panel class="prr-panel">
          <DrawdownEpisodesChart :episodes="derived.episodes" />
        </Panel>
      </section>

      <section class="prr-section">
        <header class="prr-section-head">
          <h2>Asymmetry</h2>
          <p class="prr-section-sub">
            Portfolio's up-market vs. down-market capture. Benchmark is (100%, 100%).
          </p>
        </header>
        <Panel class="prr-panel">
          <CaptureQuadrantChart
            :up="derived.capture.up"
            :down="derived.capture.down"
            :benchmark-label="portfolio?.benchmark ?? 'Benchmark'"
          />
        </Panel>
      </section>

      <section class="prr-section">
        <header class="prr-section-head">
          <h2>Crisis behavior</h2>
          <p class="prr-section-sub">The three deepest drawdown episodes, portfolio vs. benchmark.</p>
        </header>
        <CrisisSmallMultiples
          :episodes="derived.crisisEpisodes"
          :benchmark-label="portfolio?.benchmark ?? 'Benchmark'"
        />
      </section>
    </template>
  </main>
</template>

<style scoped>
.prr-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.prr-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.prr-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.prr-verdict {
  font-size: 18px;
  line-height: 1.5;
  color: var(--text-1);
  max-width: 820px;
  letter-spacing: -0.005em;
}
.prr-hero-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.prr-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prr-section-head h2 {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.prr-section-sub {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  max-width: 680px;
}
.prr-panel :deep(header),
.prr-tile :deep(header) {
  align-items: center;
}
.error-banner {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
}

@media (max-width: 900px) {
  .prr-hero-row {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit` — should PASS now that the page, composable, and new components all agree on types.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PortfolioRisk.vue
git commit -m "feat(risk): rebuild PortfolioRisk page with narrative layout"
```

---

## Task 9: Delete obsolete components + update e2e

**Files:** delete 5 files, update 1

- [ ] **Step 1: Delete old components and their unit tests**

```bash
rm src/components/charts/DrawdownCurveChart.vue \
   src/components/charts/DrawdownOverlayChart.vue \
   src/components/charts/RollingVolChart.vue \
   src/components/charts/UpDownScatterChart.vue \
   src/components/portfolio/WorstMonthsList.vue \
   tests/unit/components/DrawdownCurveChart.spec.ts \
   tests/unit/components/DrawdownOverlayChart.spec.ts \
   tests/unit/components/RollingVolChart.spec.ts \
   tests/unit/components/UpDownScatterChart.spec.ts \
   tests/unit/components/WorstMonthsList.spec.ts
```

Also: if `src/components/portfolio/` is now empty (it contains `AnnualReturnsList.vue` from an earlier feature, so it likely still has content), leave the directory alone.

- [ ] **Step 2: Replace `tests/e2e/risk.spec.ts`**

```ts
// tests/e2e/risk.spec.ts
import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio Risk', () => {
  test('tab navigation from summary to risk', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Risk' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/risk$`), {
      timeout: 5_000
    })
  })

  test('renders hero verdict + all five creative visuals', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/risk`)
    await expect(page.locator('.prr-verdict')).toBeVisible({ timeout: 10_000 })
    // Vol gauge
    await expect(page.locator('.vpg-chart canvas')).toBeVisible({ timeout: 10_000 })
    // Win/loss waffle — hand-built cells
    await expect(page.locator('.wlw-cell')).toHaveCount(100, { timeout: 5_000 })
    // Drawdown episodes bubble chart
    await expect(page.locator('.dec-chart canvas')).toBeVisible({ timeout: 10_000 })
    // Capture quadrant
    await expect(page.locator('.cqc-chart canvas')).toBeVisible({ timeout: 10_000 })
    // Crisis small-multiples — at least one item
    await expect(page.locator('.csm-item').first()).toBeVisible({ timeout: 10_000 })
  })
})
```

- [ ] **Step 3: Full verification**

Run: `npx vue-tsc --noEmit` — PASS.
Run: `npx vitest run` — entire unit suite PASS.
Run: `npx playwright test tests/e2e/risk.spec.ts` — 2/2 PASS.

If any chart selector fails in e2e, investigate — don't weaken the assertion. Possible causes: mock fixture doesn't have enough drawdown data for the bubble chart to render, capture metrics missing, etc. Fix root cause.

- [ ] **Step 4: Commit**

```bash
git add -u src/components/charts src/components/portfolio tests/unit/components tests/e2e/risk.spec.ts
git commit -m "chore(risk): remove obsolete chart components; update e2e for new layout"
```

---

## Self-review checklist

- Spec coverage: all 5 charts implemented (Tasks 3, 4, 5, 6, 7); hero verdict inlined (Task 8); page composes everything (Task 8); obsolete components removed (Task 9).
- Type consistency: `DrawdownEpisode`, `CrisisEpisode`, `CrisisPoint`, `WinLoss`, `VolGauge`, `CaptureData`, `Verdict`, `PortfolioRiskDerived` all defined in the composable (Task 2), consumed by components and page.
- No placeholders. All code complete.
- Old `util/risk.ts` functions (varQuantile, cvar, downsideDeviation, ulcerIndex, calmar, pearson, regimeRegression, riskStats) stay put — they're tested and harmless. `percentileOf` is additive.
- Verdict is inline in the page (not its own component) because it's a one-shot text block, not reusable.
