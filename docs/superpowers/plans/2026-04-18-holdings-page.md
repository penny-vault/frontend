# Holdings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/portfolios/:id/holdings` page at full parity with the old Quasar `PortfolioHoldings.vue` — monthly history grid, selected-month detail panel, frequency donut, calculator dialog, CSV export — in the Midnight Carbon design language established on the Summary page.

**Architecture:** Introduce a shared `PortfolioLayout.vue` that owns the breadcrumb + title + router-linked tabs and nests `PortfolioSummary` and `PortfolioHoldings` as child routes. Data loads via a new `usePortfolioHoldings` composable against a new `/portfolios/{id}/holdings` endpoint (mocked server-side with MSW; backend contract addition tracked as cross-repo work). The history grid uses RevoGrid (`@revolist/vue3-datagrid`) with themed CSS overrides; detail / donut / calculator are hand-built components composed on the page.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), Vue Router 4 nested routes, TanStack Vue Query, MSW 2, PrimeVue (Dialog, Tag, Skeleton, Breadcrumb), RevoGrid, ECharts via vue-echarts, Vitest unit tests, Playwright e2e.

---

## File Structure

**Created:**
- `src/layouts/PortfolioLayout.vue` — shared chrome for portfolio subpages
- `src/pages/PortfolioHoldings.vue` — the new page
- `src/components/holdings/HoldingsHistoryGrid.vue` — RevoGrid wrapper + dynamic columns
- `src/components/holdings/HoldingsDetailPanel.vue` — per-month table
- `src/components/holdings/HoldingsFrequencyChart.vue` — ECharts donut
- `src/components/holdings/HoldingsCalculatorDialog.vue` — PrimeVue Dialog + recompute table
- `src/composables/usePortfolioHoldings.ts` — TanStack Query wrapper
- `src/util/holdings.ts` — pure helpers: justification-col builder, frequency, calculator recompute, CSV serializer
- `src/styles/revogrid-theme.css` — RevoGrid dark/light theme overrides
- `tests/unit/holdings.spec.ts` — unit tests for `src/util/holdings.ts`
- `tests/e2e/holdings.spec.ts` — Playwright flow test

**Modified:**
- `api/openapi.yaml` — add `PortfolioHoldings`, `HoldingsSnapshot`, `HoldingPosition`, `JustificationEntry` + the `GET /portfolios/{id}/holdings` path
- `src/api/types.ts` — regenerated from OpenAPI (`npm run types:generate`)
- `src/api/endpoints/portfolios.ts` — add `getPortfolioHoldings` + exported types
- `src/mocks/fixtures.ts` — export `holdingsMap: Record<string, PortfolioHoldings>`
- `src/mocks/handlers.ts` — add handler for `/portfolios/:id/holdings`
- `src/router.ts` — nest `portfolio-summary` + `portfolio-holdings` under `PortfolioLayout`
- `src/pages/PortfolioSummary.vue` — strip breadcrumb / title / meta / `TabBar` (moved to layout)
- `src/components/ui/TabBar.vue` — accept `tabs: { label, to }[]` and render `<router-link>` instead of plain `<a>`
- `package.json` — add `@revolist/vue3-datagrid` dep
- `src/main.ts` — import `src/styles/revogrid-theme.css`

---

## Phase 1 — API contract + mock data

### Task 1: Extend local OpenAPI spec with holdings schemas

**Files:**
- Modify: `api/openapi.yaml`
- Modify: `src/api/types.ts` (regenerated)

- [ ] **Step 1: Add the path + schemas to `api/openapi.yaml`**

Insert the new path block under the existing `/portfolios/{id}/measurements` path:

```yaml
  /portfolios/{id}/holdings:
    get:
      tags: [Portfolios]
      operationId: getPortfolioHoldings
      summary: Monthly holdings history for a portfolio
      description: |
        Returns the full list of monthly holdings snapshots from inception
        to the most recent close, plus (optionally) one predicted row for
        the next rebalance date.
      parameters:
        - $ref: '#/components/parameters/PortfolioId'
      responses:
        '200':
          description: Holdings history
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PortfolioHoldings'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/ServerError'
```

Insert the new schemas under `components.schemas` (alongside `AllocationRow`):

```yaml
    PortfolioHoldings:
      type: object
      required: [portfolioId, snapshots]
      properties:
        portfolioId:
          type: string
          format: uuid
        snapshots:
          type: array
          items:
            $ref: '#/components/schemas/HoldingsSnapshot'

    HoldingsSnapshot:
      type: object
      required: [date, positions]
      properties:
        date:
          type: string
          format: date
          description: End-of-period date for this snapshot (monthly).
        predicted:
          type: boolean
          default: false
          description: True for a projected allocation that has not been executed yet.
        periodReturn:
          type: number
          format: double
          nullable: true
          description: Decimal return for the month. Null for the first snapshot and for predicted rows.
        value:
          type: number
          format: double
          nullable: true
          description: Portfolio value at end of period. Null for predicted rows.
        positions:
          type: array
          items:
            $ref: '#/components/schemas/HoldingPosition'
        justification:
          type: array
          description: Strategy-specific reasoning. Keys are not fixed; the UI builds columns from the union of keys across snapshots.
          items:
            $ref: '#/components/schemas/JustificationEntry'

    HoldingPosition:
      type: object
      required: [ticker, shares, value, weight]
      properties:
        ticker:
          type: string
        shares:
          type: number
          format: double
        value:
          type: number
          format: double
        weight:
          type: number
          format: double
          description: Fraction of portfolio (0.12 = 12%).

    JustificationEntry:
      type: object
      required: [key, value]
      properties:
        key:
          type: string
        value:
          oneOf:
            - type: string
            - type: number
```

- [ ] **Step 2: Regenerate TypeScript types**

```bash
npm run types:generate
```

Expected: `src/api/types.ts` updated with new schema types. No errors.

- [ ] **Step 3: Verify types compile**

```bash
npm run typecheck
```

Expected: PASS with no new errors.

- [ ] **Step 4: Commit**

```bash
git add api/openapi.yaml src/api/types.ts
git commit -m "feat(api): add portfolio holdings schema to local openapi spec"
```

---

### Task 2: Add pure helpers with unit tests

**Files:**
- Create: `src/util/holdings.ts`
- Create: `tests/unit/holdings.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/holdings.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildJustificationColumns,
  computeTickerFrequency,
  recomputeCalculatorRows,
  snapshotsToCsv
} from '@/util/holdings'
import type { HoldingsSnapshot } from '@/api/endpoints/portfolios'

const snap = (date: string, positions: Array<[string, number, number, number]>, jk?: Array<[string, string | number]>, predicted = false): HoldingsSnapshot => ({
  date,
  predicted,
  periodReturn: predicted ? null : 0.012,
  value: predicted ? null : 100_000,
  positions: positions.map(([ticker, shares, value, weight]) => ({ ticker, shares, value, weight })),
  justification: jk ? jk.map(([key, value]) => ({ key, value })) : undefined
})

describe('buildJustificationColumns', () => {
  it('returns the union of justification keys in first-seen order', () => {
    const snaps = [
      snap('2025-01-31', [['VTI', 10, 1000, 1]], [['Momentum', 0.82], ['Vol', 0.11]]),
      snap('2025-02-28', [['VTI', 10, 1000, 1]], [['Vol', 0.09], ['Sector', 'Tech']])
    ]
    expect(buildJustificationColumns(snaps)).toEqual(['Momentum', 'Vol', 'Sector'])
  })

  it('returns empty array when no snapshots carry justification', () => {
    const snaps = [snap('2025-01-31', [['VTI', 10, 1000, 1]])]
    expect(buildJustificationColumns(snaps)).toEqual([])
  })
})

describe('computeTickerFrequency', () => {
  it('counts months per ticker excluding $CASH and ignores predicted rows', () => {
    const snaps = [
      snap('2025-01-31', [['VTI', 10, 1000, 0.5], ['BND', 20, 1000, 0.5]]),
      snap('2025-02-28', [['VTI', 10, 1000, 0.5], ['$CASH', 0, 1000, 0.5]]),
      snap('2025-03-31', [['VTI', 10, 1000, 1]], undefined, true)
    ]
    const freq = computeTickerFrequency(snaps)
    expect(freq).toEqual([
      { ticker: 'VTI', monthCount: 2, percentOfMonths: 1 },
      { ticker: 'BND', monthCount: 1, percentOfMonths: 0.5 }
    ])
  })
})

describe('recomputeCalculatorRows', () => {
  it('scales value proportionally by weight and recomputes shares', () => {
    const s = snap('2025-01-31', [['VTI', 10, 1000, 0.6], ['BND', 20, 500, 0.4]])
    const rows = recomputeCalculatorRows(s, 5000)
    expect(rows[0]).toMatchObject({ ticker: 'VTI', value: 3000, shares: 30 })
    expect(rows[1]).toMatchObject({ ticker: 'BND', value: 2000, shares: 80 })
  })

  it('returns empty array for invalid investAmount', () => {
    const s = snap('2025-01-31', [['VTI', 10, 1000, 1]])
    expect(recomputeCalculatorRows(s, 0)).toEqual([])
    expect(recomputeCalculatorRows(s, -10)).toEqual([])
  })
})

describe('snapshotsToCsv', () => {
  it('emits header plus one row per snapshot with tickers joined and predicted flag', () => {
    const snaps = [
      snap('2025-01-31', [['VTI', 10, 1000, 0.6], ['BND', 20, 500, 0.4]]),
      snap('2025-02-28', [['VTI', 10, 1000, 1]], undefined, true)
    ]
    const csv = snapshotsToCsv(snaps, ['Momentum'])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('Date,Tickers,Return,Value,Predicted,Momentum')
    expect(lines[1]).toBe('2025-01-31,BND VTI,0.012,100000,false,')
    expect(lines[2]).toBe('2025-02-28,VTI,,,true,')
  })

  it('escapes commas and quotes in justification values', () => {
    const snaps = [
      snap('2025-01-31', [['VTI', 10, 1000, 1]], [['Reason', 'risk-off, "bear"']])
    ]
    const csv = snapshotsToCsv(snaps, ['Reason'])
    expect(csv.trim().split('\n')[1]).toBe('2025-01-31,VTI,0.012,100000,false,"risk-off, ""bear"""')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/holdings.spec.ts
```

Expected: FAIL — `buildJustificationColumns`, `computeTickerFrequency`, `recomputeCalculatorRows`, `snapshotsToCsv` are not defined.

- [ ] **Step 3: Implement `src/util/holdings.ts`**

```ts
import type { HoldingsSnapshot, HoldingPosition } from '@/api/endpoints/portfolios'

export function buildJustificationColumns(snapshots: HoldingsSnapshot[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const s of snapshots) {
    if (!s.justification) continue
    for (const j of s.justification) {
      if (!seen.has(j.key)) {
        seen.add(j.key)
        order.push(j.key)
      }
    }
  }
  return order
}

export interface TickerFrequency {
  ticker: string
  monthCount: number
  percentOfMonths: number
}

export function computeTickerFrequency(snapshots: HoldingsSnapshot[]): TickerFrequency[] {
  const real = snapshots.filter((s) => !s.predicted)
  const total = real.length
  const counts = new Map<string, number>()
  for (const s of real) {
    for (const p of s.positions) {
      if (p.ticker === '$CASH') continue
      counts.set(p.ticker, (counts.get(p.ticker) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([ticker, monthCount]) => ({
      ticker,
      monthCount,
      percentOfMonths: total === 0 ? 0 : monthCount / total
    }))
    .sort((a, b) => b.monthCount - a.monthCount || a.ticker.localeCompare(b.ticker))
}

export interface CalculatorRow {
  ticker: string
  weight: number
  shares: number
  value: number
}

export function recomputeCalculatorRows(
  snapshot: HoldingsSnapshot,
  investAmount: number
): CalculatorRow[] {
  if (!Number.isFinite(investAmount) || investAmount <= 0) return []
  return snapshot.positions.map((p: HoldingPosition) => {
    const pricePerShare = p.shares > 0 ? p.value / p.shares : 0
    const value = investAmount * p.weight
    const shares = pricePerShare > 0 ? value / pricePerShare : 0
    return { ticker: p.ticker, weight: p.weight, value, shares }
  })
}

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function snapshotsToCsv(snapshots: HoldingsSnapshot[], justificationKeys: string[]): string {
  const header = ['Date', 'Tickers', 'Return', 'Value', 'Predicted', ...justificationKeys]
  const lines = [header.join(',')]
  for (const s of snapshots) {
    const tickers = s.positions
      .map((p) => p.ticker)
      .filter((t) => t !== '$CASH')
      .sort()
      .join(' ')
    const jmap = new Map((s.justification ?? []).map((j) => [j.key, j.value]))
    const row = [
      csvCell(s.date),
      csvCell(tickers),
      csvCell(s.periodReturn ?? ''),
      csvCell(s.value ?? ''),
      csvCell(s.predicted ?? false),
      ...justificationKeys.map((k) => csvCell(jmap.get(k) ?? ''))
    ]
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/unit/holdings.spec.ts
```

Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/util/holdings.ts tests/unit/holdings.spec.ts
git commit -m "feat(holdings): add pure helpers with unit tests"
```

---

### Task 3: Add API endpoint function + composable

**Files:**
- Modify: `src/api/endpoints/portfolios.ts`
- Create: `src/composables/usePortfolioHoldings.ts`

- [ ] **Step 1: Extend `src/api/endpoints/portfolios.ts`**

Append after the existing `getPortfolioMeasurements` function:

```ts
export type PortfolioHoldings = components['schemas']['PortfolioHoldings']
export type HoldingsSnapshot = components['schemas']['HoldingsSnapshot']
export type HoldingPosition = components['schemas']['HoldingPosition']
export type JustificationEntry = components['schemas']['JustificationEntry']

export function getPortfolioHoldings(id: string): Promise<PortfolioHoldings> {
  return apiClient<PortfolioHoldings>(`/portfolios/${id}/holdings`)
}
```

- [ ] **Step 2: Create `src/composables/usePortfolioHoldings.ts`**

```ts
import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPortfolioHoldings, type PortfolioHoldings } from '@/api/endpoints/portfolios'

export function usePortfolioHoldings(portfolioId: Ref<string | null>) {
  return useQuery<PortfolioHoldings>({
    queryKey: computed(() => ['portfolio-holdings', portfolioId.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioHoldings(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/api/endpoints/portfolios.ts src/composables/usePortfolioHoldings.ts
git commit -m "feat(api): add getPortfolioHoldings endpoint + usePortfolioHoldings composable"
```

---

### Task 4: Add holdings fixtures + MSW handler

**Files:**
- Modify: `src/mocks/fixtures.ts`
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: Add a `buildHoldings` helper and export `holdingsMap` in `src/mocks/fixtures.ts`**

Add these imports at the top (merge with the existing import):

```ts
import type {
  Portfolio,
  PortfolioListItem,
  PortfolioMeasurements,
  PortfolioHoldings,
  HoldingsSnapshot
} from '@/api/endpoints/portfolios'
```

Add this helper before the existing `portfolioFixture` declaration:

```ts
interface HoldingsConfig {
  portfolioId: string
  startDate: string
  tickers: { ticker: string; name?: string; baseWeight: number }[]
  // Optional pool of extra tickers the strategy can rotate into
  rotationPool?: string[]
  seed: number
  withJustification?: string[]
  startValue?: number
}

function buildHoldings(cfg: HoldingsConfig): PortfolioHoldings {
  const rand = mulberry32(cfg.seed)
  const snapshots: HoldingsSnapshot[] = []
  const start = new Date(cfg.startDate + 'T00:00:00Z')
  const end = new Date('2026-04-30T00:00:00Z')
  let value = cfg.startValue ?? 100_000

  // Walk month-end dates from start through end
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
  while (d <= end) {
    const eomIso = d.toISOString().slice(0, 10)
    const monthReturn = snapshots.length === 0 ? null : (rand() - 0.45) * 0.06
    if (monthReturn != null) value = Math.round(value * (1 + monthReturn) * 100) / 100

    // Rotate: with 20% probability swap in one rotation ticker for one base ticker
    const selected = [...cfg.tickers]
    if (cfg.rotationPool && cfg.rotationPool.length && rand() < 0.2) {
      const swapIn = cfg.rotationPool[Math.floor(rand() * cfg.rotationPool.length)]!
      const swapIdx = Math.floor(rand() * selected.length)
      selected[swapIdx] = { ticker: swapIn, baseWeight: selected[swapIdx]!.baseWeight }
    }

    // Build positions (price per share drifts over time)
    const positions = selected.map((t, i) => {
      const pricePerShare = 100 + (snapshots.length * (1 + i * 0.3)) / 2
      const weight = t.baseWeight
      const pval = value * weight
      return {
        ticker: t.ticker,
        weight,
        value: Math.round(pval * 100) / 100,
        shares: Math.round((pval / pricePerShare) * 100) / 100
      }
    })

    const justification =
      cfg.withJustification?.map((key) => ({
        key,
        value: Math.round(rand() * 100) / 100
      })) ?? undefined

    snapshots.push({
      date: eomIso,
      predicted: false,
      periodReturn: monthReturn,
      value: monthReturn == null ? null : value,
      positions,
      justification
    })

    d.setUTCMonth(d.getUTCMonth() + 1)
    d.setUTCDate(0) // last day of the new "previous" month = month-end of target month
    d.setUTCMonth(d.getUTCMonth() + 1)
    d.setUTCDate(0)
  }

  // Append one predicted row — next month
  const last = snapshots[snapshots.length - 1]!
  const next = new Date(last.date + 'T00:00:00Z')
  next.setUTCMonth(next.getUTCMonth() + 2)
  next.setUTCDate(0)
  snapshots.push({
    date: next.toISOString().slice(0, 10),
    predicted: true,
    periodReturn: null,
    value: null,
    positions: last.positions.map((p) => ({ ...p, shares: 0, value: 0 })),
    justification: last.justification
      ? last.justification.map((j) => ({ ...j }))
      : undefined
  })

  return { portfolioId: cfg.portfolioId, snapshots }
}

export const holdingsFixture1: PortfolioHoldings = buildHoldings({
  portfolioId: PORTFOLIO_ID,
  startDate: '2024-05-01',
  tickers: [
    { ticker: 'VTI', baseWeight: 0.58 },
    { ticker: 'VEA', baseWeight: 0.22 },
    { ticker: 'BND', baseWeight: 0.2 }
  ],
  rotationPool: ['QQQ', 'IWM', 'EEM'],
  seed: 2001,
  withJustification: ['Momentum', 'Volatility', 'Trend']
})

export const holdingsFixture2: PortfolioHoldings = buildHoldings({
  portfolioId: PORTFOLIO_ID_2,
  startDate: '2024-05-01',
  tickers: [
    { ticker: 'BND', baseWeight: 0.5 },
    { ticker: 'VTIP', baseWeight: 0.3 },
    { ticker: 'SHY', baseWeight: 0.2 }
  ],
  seed: 2002
})

export const holdingsFixture3: PortfolioHoldings = buildHoldings({
  portfolioId: PORTFOLIO_ID_3,
  startDate: '2024-05-01',
  tickers: [
    { ticker: 'VT', baseWeight: 0.55 },
    { ticker: 'GLD', baseWeight: 0.25 },
    { ticker: 'TLT', baseWeight: 0.2 }
  ],
  rotationPool: ['VNQ', 'DBC'],
  seed: 2003
})

export const holdingsMap: Record<string, PortfolioHoldings> = {
  [PORTFOLIO_ID]: holdingsFixture1,
  [PORTFOLIO_ID_2]: holdingsFixture2,
  [PORTFOLIO_ID_3]: holdingsFixture3
}
```

- [ ] **Step 2: Add MSW handler in `src/mocks/handlers.ts`**

Update the import at the top:

```ts
import {
  portfolioFixture,
  portfolioFixture2,
  portfolioFixture3,
  portfolioListFixture,
  measurementsFixture,
  holdingsMap
} from './fixtures'
```

Append this handler to the exported `handlers` array (inside the array, after the measurements handler):

```ts
  http.get(`${base}/portfolios/:id/holdings`, ({ params }) => {
    const id = typeof params.id === 'string' ? params.id : String(params.id)
    const holdings = holdingsMap[id]
    if (!holdings) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(holdings)
  })
```

- [ ] **Step 3: Verify the app still boots + MSW handler is reachable**

```bash
npm run dev &
sleep 3
curl -s http://localhost:5173/v3/portfolios/00000000-0000-4000-a000-000000000001/holdings | head -c 200
kill %1
```

Expected: JSON payload with `portfolioId` and `snapshots` array. If the curl returns HTML, MSW isn't handling it in dev mode — check `VITE_USE_MOCKS=1` is set in `.env.development`. (It should already be from earlier phases.)

- [ ] **Step 4: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/fixtures.ts src/mocks/handlers.ts
git commit -m "feat(mocks): add holdings fixtures and MSW handler"
```

---

## Phase 2 — Extract shared PortfolioLayout

### Task 5: Update `TabBar` to support router-linked tabs

**Files:**
- Modify: `src/components/ui/TabBar.vue`

The current `TabBar` only emits a string. We need it to either emit as before (for local `ref` use on the Summary page until we migrate) **or** render `<router-link>`s. Easiest: accept an object form `{ label, to }` and render router-links when `to` is present.

- [ ] **Step 1: Replace the content of `src/components/ui/TabBar.vue`**

```vue
<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'

type TabItem = string | { label: string; to: string }

const props = defineProps<{
  tabs: TabItem[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, show: false })

const normalizedTabs = computed(() =>
  props.tabs.map((t) => (typeof t === 'string' ? { label: t } : t))
)

function isActive(tab: { label: string; to?: string }): boolean {
  if (tab.to) return route.path === tab.to || route.path.startsWith(tab.to + '/')
  return props.modelValue === tab.label
}

function updateIndicator() {
  if (!navRef.value) return
  const active = navRef.value.querySelector<HTMLElement>('.tab-bar-item.active')
  if (!active) {
    indicator.value = { left: 0, width: 0, show: false }
    return
  }
  indicator.value = { left: active.offsetLeft, width: active.offsetWidth, show: true }
}

watch(
  () => [props.modelValue, route.path],
  () => nextTick(updateIndicator)
)
onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateIndicator))
</script>

<template>
  <nav ref="navRef" class="tab-bar">
    <template v-for="tab in normalizedTabs" :key="tab.label">
      <router-link
        v-if="tab.to"
        :to="tab.to"
        class="tab-bar-item"
        :class="{ active: isActive(tab) }"
      >
        {{ tab.label }}
      </router-link>
      <a
        v-else
        class="tab-bar-item"
        :class="{ active: isActive(tab) }"
        @click="emit('update:modelValue', tab.label)"
      >
        {{ tab.label }}
      </a>
    </template>
    <span
      class="tab-underline"
      v-show="indicator.show"
      :style="{ transform: `translateX(${indicator.left}px)`, width: indicator.width + 'px' }"
    />
  </nav>
</template>

<style scoped>
.tab-bar {
  position: relative;
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
.tab-bar-item {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 180ms ease;
  position: relative;
  z-index: 1;
}
.tab-bar-item:hover {
  color: var(--text-2);
}
.tab-bar-item.active {
  color: var(--text-1);
}
.tab-underline {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--primary);
  transition:
    transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
    width 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  border-radius: 1px;
  box-shadow: 0 0 12px var(--primary-glow);
}
@media (prefers-reduced-motion: reduce) {
  .tab-underline {
    transition: none;
  }
}
</style>
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TabBar.vue
git commit -m "feat(ui): TabBar accepts object tabs with router-linked routing"
```

---

### Task 6: Create `PortfolioLayout.vue`

**Files:**
- Create: `src/layouts/PortfolioLayout.vue`

The layout owns the breadcrumb, title, meta row, and router-linked tabs. Note: the rich "risk gates" block currently next to the title on the Summary page stays on Summary for now — it's specific to that page and extracting it would widen scope.

- [ ] **Step 1: Create `src/layouts/PortfolioLayout.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumb from 'primevue/breadcrumb'
import Skeleton from 'primevue/skeleton'
import TabBar from '@/components/ui/TabBar.vue'
import StatusDot from '@/components/ui/StatusDot.vue'
import { formatDate } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'

const route = useRoute()
const router = useRouter()

const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: portfolio, isLoading, error } = usePortfolio(portfolioId)

const breadcrumbHome = {
  icon: 'pi pi-home',
  command: () => router.push('/portfolios')
}

const breadcrumbItems = computed(() => [
  { label: portfolio.value?.name ?? 'Portfolio' }
])

const tabs = computed(() => {
  const id = portfolioId.value
  if (!id) return []
  return [
    { label: 'Overview', to: `/portfolios/${id}` },
    { label: 'Holdings', to: `/portfolios/${id}/holdings` }
  ]
})
</script>

<template>
  <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="page-breadcrumb" />

  <div v-if="isLoading" class="pl-loading">
    <Skeleton width="40%" height="2rem" class="mb-2" />
    <Skeleton width="25%" height="1rem" />
  </div>
  <div v-else-if="error" class="error-banner" role="alert">
    Could not load portfolio. {{ (error as Error).message }}
  </div>

  <div v-if="portfolio" class="pl-header">
    <div class="pl-title-row">
      <h1>{{ portfolio.name }}</h1>
      <div class="pl-meta">
        <span class="meta">
          Last updated:
          {{ formatDate(portfolio.lastUpdated, { month: 'long', day: 'numeric', year: 'numeric' }) }}
        </span>
        <span class="meta">
          <StatusDot tone="ok" pulse />
          Live · {{ portfolio.currentAssets.length + 1 }} positions
        </span>
      </div>
    </div>
    <TabBar :tabs="tabs" />
  </div>

  <router-view v-if="portfolio" :key="$route.fullPath" />
</template>

<style scoped>
.page-breadcrumb {
  padding: 10px 24px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  font-size: 12px;
  color: var(--text-3);
}
.page-breadcrumb :deep(.p-breadcrumb-list) {
  padding: 0;
  gap: 8px;
}
.page-breadcrumb :deep(.p-breadcrumb-item-link),
.page-breadcrumb :deep(.p-breadcrumb-item) {
  color: var(--text-3);
  font-size: 12px;
}
.page-breadcrumb :deep(.p-breadcrumb-item-link:hover) {
  color: var(--primary);
}
.page-breadcrumb :deep(.p-breadcrumb-separator) {
  color: var(--text-4);
}
.page-breadcrumb :deep(.pi) {
  font-size: 12px;
  color: var(--primary);
}

.pl-header {
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 24px 0;
}
.pl-title-row h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.pl-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.pl-meta .meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.pl-loading {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}
.error-banner {
  max-width: 1440px;
  margin: 16px auto;
  padding: 12px 16px;
  background: var(--surface-elev);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-1);
}
</style>
```

- [ ] **Step 2: Update `src/router.ts` to nest routes under `PortfolioLayout`**

Replace the current `portfolios/:id` single route with a nested layout:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { requireAuth } from './auth/guard'
import MainLayout from './layouts/MainLayout.vue'
import SplashLayout from './layouts/SplashLayout.vue'
import PortfolioLayout from './layouts/PortfolioLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: SplashLayout,
    children: [
      {
        path: '',
        name: 'splash',
        component: () => import('./pages/SplashPage.vue')
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    beforeEnter: requireAuth,
    children: [
      {
        path: 'portfolios',
        name: 'portfolio-list',
        component: () => import('./pages/PortfolioList.vue')
      },
      {
        path: 'portfolios/:id',
        component: PortfolioLayout,
        children: [
          {
            path: '',
            name: 'portfolio-summary',
            component: () => import('./pages/PortfolioSummary.vue')
          },
          {
            path: 'holdings',
            name: 'portfolio-holdings',
            component: () => import('./pages/PortfolioHoldings.vue')
          }
        ]
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

*(Note: the `portfolio-holdings` component is created in Task 12. Until then, typecheck succeeds because the import is dynamic, but hitting the route will 500 at runtime. That's fine — we won't navigate to it until Phase 4.)*

- [ ] **Step 3: Strip the breadcrumb / title / tabs from `PortfolioSummary.vue`**

Open `src/pages/PortfolioSummary.vue` and make these surgical edits.

**(a) Template edits:**

1. Delete the `<Breadcrumb ... />` element (it's the first element in `<template>`, currently at the top of the file).
2. Delete the outer loading-state `<div v-if="portfolioLoading || measurementsLoading || !portfolioData" class="loading-state">...</div>` block. The layout now handles portfolio-level loading; keep only per-widget loading states (measurements chart skeleton, if any).
3. Delete the `<div v-else-if="portfolioError" class="error-banner">` block. (Portfolio-level error also handled by layout.)
4. Inside `<main v-if="portfolioData" class="d-main">`, delete the entire `<section class="d-header-section">...</section>` block **except** the `<div class="param-table">...</div>` sub-block. Extract the `.param-table` sub-block out and replace the deleted `<section>` with `<section class="ps-risk-gates">` that contains only the `.param-table`.
5. Leave everything else (KPIs, chart, drawdowns, metrics, trailing returns) untouched.

**(b) Script edits:**

1. Remove these imports from the `<script setup>` block:
   - `Breadcrumb` from `primevue/breadcrumb`
   - `Skeleton` from `primevue/skeleton` **only if** no other skeleton remains after (a).2 (search for `<Skeleton`; if any remain, keep the import)
   - `TabBar` from `@/components/ui/TabBar.vue`
   - `useRouter` from `vue-router` (keep `useRoute` — `route.params.id` is still needed for `portfolioId`)
2. Remove the now-unused refs and computeds: `activeTab`, `tabs`, `breadcrumbHome`, `breadcrumbItems`, and the `router` binding.
3. Keep `usePortfolio` and `usePortfolioMeasurements` — the page still needs both.

**(c) Do not touch the CSS:**

The `.d-main`, `.d-kpis`, and `.param-table` CSS can stay as-is. Add one new rule for the newly-extracted section:

```css
.ps-risk-gates {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 24px;
}
```

**(d) Quick sanity check:**

```bash
grep -n 'Breadcrumb\|TabBar\|breadcrumbHome\|breadcrumbItems\|activeTab' src/pages/PortfolioSummary.vue
```

Expected: no matches (empty output). If anything remains, finish the removal before moving on.

- [ ] **Step 4: Verify typecheck + existing e2e still pass**

```bash
npm run typecheck
npm run e2e -- tests/e2e/summary.spec.ts
```

Expected: typecheck PASS. Summary e2e may fail on the `h1` assertion if the layout's `h1` is now the portfolio name (it should be — that matches the old expectation). If the "4 risk rows" or KPI assertions fail, investigate and fix before committing. `tests/e2e/flow.spec.ts` might also need a tweak if it asserts on the list page `h1` vs summary `h1` — confirm it still passes.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/PortfolioLayout.vue src/router.ts src/pages/PortfolioSummary.vue
git commit -m "feat(routing): extract PortfolioLayout, nest summary + holdings routes"
```

---

## Phase 3 — RevoGrid setup

### Task 7: Install RevoGrid and create theme CSS

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/styles/revogrid-theme.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Install the package**

```bash
npm install @revolist/vue3-datagrid
```

Expected: success, new entry in `package.json`.

- [ ] **Step 2: Create `src/styles/revogrid-theme.css`**

```css
/*
 * RevoGrid theming for Penny Vault.
 * RevoGrid is a web component (Shadow DOM). Parts of its internal styling
 * are reachable via CSS custom properties it reads; other parts are styled
 * via ::part() selectors or wrapper classes.
 */

.revo-wrap {
  --revo-bg: var(--surface);
  --revo-border: var(--border);
  --revo-row-hover: var(--surface-elev);
  --revo-row-selected: color-mix(in srgb, var(--primary) 14%, transparent);
  --revo-header-bg: var(--surface-elev);
  --revo-header-fg: var(--text-3);
  --revo-cell-fg: var(--text-1);

  background: var(--revo-bg);
  color: var(--revo-cell-fg);
  border: 1px solid var(--revo-border);
  border-radius: 4px;
  overflow: hidden;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.revo-wrap revo-grid {
  --rvg-background: var(--revo-bg);
  --rvg-text: var(--revo-cell-fg);
  --rvg-header-bg: var(--revo-header-bg);
  --rvg-header-fg: var(--revo-header-fg);
  --rvg-border: var(--revo-border);
  height: 520px;
  width: 100%;
}

.revo-wrap .holdings-row-predicted {
  opacity: 0.6;
}
.revo-wrap .holdings-cell-up {
  color: var(--gain);
}
.revo-wrap .holdings-cell-down {
  color: var(--loss);
}
.revo-wrap .holdings-cell-muted {
  color: var(--text-4);
}
```

- [ ] **Step 3: Import it in `src/main.ts`**

Add this line near the other CSS imports:

```ts
import '@/styles/revogrid-theme.css'
```

- [ ] **Step 4: Verify build still passes**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/styles/revogrid-theme.css src/main.ts
git commit -m "chore(holdings): install RevoGrid and add theme CSS"
```

---

## Phase 4 — Build holdings components

### Task 8: `HoldingsHistoryGrid.vue`

**Files:**
- Create: `src/components/holdings/HoldingsHistoryGrid.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { RevoGrid } from '@revolist/vue3-datagrid'
import type { HoldingsSnapshot } from '@/api/endpoints/portfolios'
import { buildJustificationColumns } from '@/util/holdings'
import { formatCurrency, formatSignedPercent, formatDate } from '@/util/format'

const props = defineProps<{
  snapshots: HoldingsSnapshot[]
  selectedDate: string | null
}>()

const emit = defineEmits<{
  'select-date': [date: string]
}>()

interface Row {
  date: string
  dateLabel: string
  tickers: string
  returnRaw: number | null
  returnLabel: string
  returnClass: string
  valueRaw: number | null
  valueLabel: string
  predicted: boolean
  selected: boolean
  [key: string]: unknown
}

const justificationKeys = computed(() => buildJustificationColumns(props.snapshots))

const rows = computed<Row[]>(() =>
  props.snapshots.map((s) => {
    const tickers = s.positions
      .map((p) => p.ticker)
      .filter((t) => t !== '$CASH')
      .sort()
      .join(' ')
    const jmap = new Map((s.justification ?? []).map((j) => [j.key, j.value]))
    const row: Row = {
      date: s.date,
      dateLabel: formatDate(s.date, { month: 'short', year: 'numeric' }),
      tickers,
      returnRaw: s.periodReturn ?? null,
      returnLabel: s.predicted || s.periodReturn == null ? '—' : formatSignedPercent(s.periodReturn),
      returnClass:
        s.predicted || s.periodReturn == null
          ? 'holdings-cell-muted'
          : (s.periodReturn ?? 0) > 0
            ? 'holdings-cell-up'
            : 'holdings-cell-down',
      valueRaw: s.value ?? null,
      valueLabel: s.predicted || s.value == null ? '—' : formatCurrency(s.value),
      predicted: !!s.predicted,
      selected: s.date === props.selectedDate
    }
    for (const key of justificationKeys.value) {
      const v = jmap.get(key)
      row[`just_${key}`] = typeof v === 'number' ? v.toFixed(2) : (v ?? '')
    }
    return row
  })
)

const columns = computed(() => {
  const base = [
    { prop: 'dateLabel', name: 'Date', size: 110, pin: 'colPinStart', readonly: true, sortable: true },
    { prop: 'tickers', name: 'Tickers', size: 220, readonly: true, sortable: false },
    {
      prop: 'returnLabel',
      name: 'Return',
      size: 110,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: { model: Row }) => ({
        class: model.returnClass
      })
    },
    { prop: 'valueLabel', name: 'Value', size: 140, readonly: true, sortable: true }
  ]
  const dyn = justificationKeys.value.map((k) => ({
    prop: `just_${k}`,
    name: k,
    size: 120,
    readonly: true,
    sortable: true
  }))
  return [...base, ...dyn]
})

const rowClass = 'predicted'
const rowHeaders = { cellProperties: ({ model }: { model: Row }) => ({ class: model.predicted ? 'holdings-row-predicted' : model.selected ? 'holdings-row-selected' : '' }) }

function onAfterEdit() {
  // readonly grid — no-op
}

function onRowSelect(e: CustomEvent<{ model: Row }>) {
  const model = e.detail?.model
  if (!model) return
  if (model.predicted) return
  emit('select-date', model.date)
}
</script>

<template>
  <div class="revo-wrap">
    <RevoGrid
      :source="rows"
      :columns="columns"
      :readonly="true"
      :row-size="40"
      :theme="'compact'"
      :range="false"
      :auto-size-column="false"
      :row-headers="rowHeaders"
      @beforecellclick="onRowSelect"
    />
  </div>
</template>
```

*(If RevoGrid's event name differs — the library uses `@beforecellclick` for mouse-driven row selection in v1. Double-check against the installed version and adjust; selection via `@click` handler on the wrapper as a fallback is fine.)*

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS. If RevoGrid's types complain about the `columns` shape, simplify `cellProperties` / remove fields that don't exist in the installed version's types.

- [ ] **Step 3: Commit**

```bash
git add src/components/holdings/HoldingsHistoryGrid.vue
git commit -m "feat(holdings): add HoldingsHistoryGrid component"
```

---

### Task 9: `HoldingsDetailPanel.vue`

**Files:**
- Create: `src/components/holdings/HoldingsDetailPanel.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import type { HoldingsSnapshot } from '@/api/endpoints/portfolios'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/util/format'

const props = defineProps<{
  snapshot: HoldingsSnapshot | null
  hoveredTicker: string | null
}>()

const emit = defineEmits<{
  'open-calculator': []
}>()

const dateLabel = computed(() =>
  props.snapshot ? formatDate(props.snapshot.date, { month: 'short', year: 'numeric' }) : '—'
)

const rows = computed(() => {
  if (!props.snapshot) return []
  return [...props.snapshot.positions].sort((a, b) => b.weight - a.weight)
})
</script>

<template>
  <section class="hdp">
    <header class="hdp-header">
      <div class="hdp-title">
        Holdings detail for <span class="hdp-date">{{ dateLabel }}</span>
      </div>
      <Button
        icon="pi pi-calculator"
        text
        size="small"
        aria-label="Open holdings calculator"
        @click="emit('open-calculator')"
      />
    </header>
    <div class="hdp-table">
      <div class="hdp-head">
        <div>Ticker</div>
        <div class="num">Shares</div>
        <div class="num">%</div>
        <div class="num">Value</div>
      </div>
      <div
        v-for="p in rows"
        :key="p.ticker"
        class="hdp-row"
        :class="{ highlighted: hoveredTicker === p.ticker }"
      >
        <div class="hdp-ticker">{{ p.ticker }}</div>
        <div class="num">{{ formatNumber(p.shares) }}</div>
        <div class="num">{{ formatPercent(p.weight) }}</div>
        <div class="num">{{ formatCurrency(p.value) }}</div>
      </div>
      <div v-if="!rows.length" class="hdp-empty">No snapshot selected.</div>
    </div>
  </section>
</template>

<style scoped>
.hdp {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
}
.hdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.hdp-title {
  font-size: 13px;
  color: var(--text-3);
}
.hdp-date {
  color: var(--text-1);
  font-weight: 500;
}
.hdp-table {
  font-size: 13px;
}
.hdp-head {
  display: grid;
  grid-template-columns: 1fr 100px 80px 120px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hdp-head .num {
  text-align: right;
}
.hdp-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px 120px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  transition: background 160ms ease;
}
.hdp-row:last-child {
  border-bottom: none;
}
.hdp-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.hdp-row.highlighted {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.hdp-ticker {
  font-weight: 500;
}
.hdp-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/holdings/HoldingsDetailPanel.vue
git commit -m "feat(holdings): add HoldingsDetailPanel component"
```

---

### Task 10: `HoldingsFrequencyChart.vue`

**Files:**
- Create: `src/components/holdings/HoldingsFrequencyChart.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { HoldingsSnapshot } from '@/api/endpoints/portfolios'
import { computeTickerFrequency } from '@/util/holdings'

const props = defineProps<{
  snapshots: HoldingsSnapshot[]
}>()

const emit = defineEmits<{
  'hover-ticker': [ticker: string | null]
}>()

const freq = computed(() => computeTickerFrequency(props.snapshots))

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (p) => {
      const param = p as { name: string; value: number; percent: number }
      const item = freq.value.find((f) => f.ticker === param.name)
      if (!item) return ''
      return `<b>${item.ticker}</b><br/>${item.monthCount} months (${(item.percentOfMonths * 100).toFixed(1)}%)`
    }
  },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['52%', '78%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: 'var(--bg)',
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}',
        fontSize: 11,
        color: 'var(--text-3)'
      },
      labelLine: { length: 8, length2: 6 },
      data: freq.value.map((f) => ({ name: f.ticker, value: f.monthCount }))
    }
  ]
}))

function onMouseover(e: { name?: string }) {
  if (e.name) emit('hover-ticker', e.name)
}
function onMouseout() {
  emit('hover-ticker', null)
}
</script>

<template>
  <section class="freq">
    <header class="freq-header">Holdings Frequency</header>
    <VChart
      class="freq-chart"
      :option="option"
      autoresize
      @mouseover="onMouseover"
      @mouseout="onMouseout"
    />
  </section>
</template>

<style scoped>
.freq {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
}
.freq-header {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}
.freq-chart {
  height: 240px;
  width: 100%;
}
</style>
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS. If ECharts tooltip formatter's `p` type is too loose, widen the cast to `unknown` then narrow — but the cast above should work.

- [ ] **Step 3: Commit**

```bash
git add src/components/holdings/HoldingsFrequencyChart.vue
git commit -m "feat(holdings): add HoldingsFrequencyChart with ticker-hover emit"
```

---

### Task 11: `HoldingsCalculatorDialog.vue`

**Files:**
- Create: `src/components/holdings/HoldingsCalculatorDialog.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import type { HoldingsSnapshot } from '@/api/endpoints/portfolios'
import { recomputeCalculatorRows } from '@/util/holdings'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/util/format'

const props = defineProps<{
  open: boolean
  snapshot: HoldingsSnapshot | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const investAmount = ref<number>(10_000)

watch(
  () => props.open,
  (v) => {
    if (v) investAmount.value = 10_000
  }
)

const rows = computed(() =>
  props.snapshot ? recomputeCalculatorRows(props.snapshot, investAmount.value) : []
)

const dateLabel = computed(() =>
  props.snapshot ? formatDate(props.snapshot.date, { month: 'short', year: 'numeric' }) : ''
)
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="`Holdings calculator — ${dateLabel}`"
    :style="{ width: '520px' }"
    :closable="true"
    @update:visible="(v) => emit('update:open', v)"
  >
    <div class="hcalc-body">
      <label class="hcalc-label" for="hcalc-input">If I invested</label>
      <InputNumber
        id="hcalc-input"
        v-model="investAmount"
        mode="currency"
        currency="USD"
        :min="0"
        :step="1000"
        fluid
      />

      <div class="hcalc-table">
        <div class="hcalc-head">
          <div>Ticker</div>
          <div class="num">Shares</div>
          <div class="num">%</div>
          <div class="num">Value</div>
        </div>
        <div v-for="r in rows" :key="r.ticker" class="hcalc-row">
          <div>{{ r.ticker }}</div>
          <div class="num">{{ formatNumber(r.shares) }}</div>
          <div class="num">{{ formatPercent(r.weight) }}</div>
          <div class="num">{{ formatCurrency(r.value) }}</div>
        </div>
        <div v-if="!rows.length" class="hcalc-empty">Enter an amount above $0.</div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.hcalc-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hcalc-label {
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.hcalc-table {
  font-size: 13px;
}
.hcalc-head,
.hcalc-row {
  display: grid;
  grid-template-columns: 1fr 120px 80px 120px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.hcalc-head {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hcalc-head .num,
.hcalc-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.hcalc-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-3);
}
</style>
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/holdings/HoldingsCalculatorDialog.vue
git commit -m "feat(holdings): add HoldingsCalculatorDialog component"
```

---

### Task 12: `PortfolioHoldings.vue` page

**Files:**
- Create: `src/pages/PortfolioHoldings.vue`

- [ ] **Step 1: Create the page**

```vue
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import HoldingsHistoryGrid from '@/components/holdings/HoldingsHistoryGrid.vue'
import HoldingsDetailPanel from '@/components/holdings/HoldingsDetailPanel.vue'
import HoldingsFrequencyChart from '@/components/holdings/HoldingsFrequencyChart.vue'
import HoldingsCalculatorDialog from '@/components/holdings/HoldingsCalculatorDialog.vue'
import { usePortfolioHoldings } from '@/composables/usePortfolioHoldings'
import { buildJustificationColumns, snapshotsToCsv } from '@/util/holdings'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: holdings, isLoading, error } = usePortfolioHoldings(portfolioId)

const selectedDate = ref<string | null>(null)
const hoveredTicker = ref<string | null>(null)
const calculatorOpen = ref(false)

// Default selection = most recent non-predicted snapshot
watchEffect(() => {
  if (selectedDate.value) return
  const snaps = holdings.value?.snapshots ?? []
  for (let i = snaps.length - 1; i >= 0; i--) {
    if (!snaps[i]!.predicted) {
      selectedDate.value = snaps[i]!.date
      return
    }
  }
})

const selectedSnapshot = computed(() => {
  const snaps = holdings.value?.snapshots ?? []
  return snaps.find((s) => s.date === selectedDate.value) ?? null
})

function onSelectDate(date: string) {
  selectedDate.value = date
}

function onHoverTicker(ticker: string | null) {
  hoveredTicker.value = ticker
}

function downloadCsv() {
  if (!holdings.value) return
  const keys = buildJustificationColumns(holdings.value.snapshots)
  const csv = snapshotsToCsv(holdings.value.snapshots, keys)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${portfolioId.value ?? 'portfolio'}-holdings.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main class="ph-main">
    <div v-if="isLoading" class="ph-loading">
      <Skeleton width="100%" height="520px" />
      <div class="ph-loading-side">
        <Skeleton width="100%" height="240px" />
        <Skeleton width="100%" height="240px" />
      </div>
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load holdings. {{ (error as Error).message }}
    </div>
    <div v-else-if="holdings" class="ph-grid">
      <div class="ph-left">
        <HoldingsHistoryGrid
          :snapshots="holdings.snapshots"
          :selected-date="selectedDate"
          @select-date="onSelectDate"
        />
        <div class="ph-actions">
          <Button
            label="Export CSV"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            @click="downloadCsv"
          />
        </div>
      </div>
      <div class="ph-right">
        <HoldingsDetailPanel
          :snapshot="selectedSnapshot"
          :hovered-ticker="hoveredTicker"
          @open-calculator="calculatorOpen = true"
        />
        <HoldingsFrequencyChart
          :snapshots="holdings.snapshots"
          @hover-ticker="onHoverTicker"
        />
      </div>
    </div>

    <HoldingsCalculatorDialog
      v-model:open="calculatorOpen"
      :snapshot="selectedSnapshot"
    />
  </main>
</template>

<style scoped>
.ph-main {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}
.ph-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 20px;
}
.ph-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.ph-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ph-actions {
  display: flex;
  justify-content: flex-end;
}
.ph-loading {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 20px;
}
.ph-loading-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.error-banner {
  padding: 12px 16px;
  background: var(--surface-elev);
  border: 1px solid var(--loss);
  border-radius: 6px;
}
@media (max-width: 1023px) {
  .ph-grid,
  .ph-loading {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 2: Verify typecheck + dev server boots**

```bash
npm run typecheck
npm run dev &
sleep 3
curl -s http://localhost:5173/portfolios/00000000-0000-4000-a000-000000000001/holdings -o /tmp/holdings.html
head -c 500 /tmp/holdings.html
kill %1
```

Expected: typecheck PASS. HTML response contains the app shell (not 404). Confirm visually in a browser: `http://localhost:5173/portfolios/00000000-0000-4000-a000-000000000001/holdings` shows the tabs with "Holdings" active, the history grid with ~24 rows, a detail panel on the right, and the donut.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PortfolioHoldings.vue
git commit -m "feat(holdings): add PortfolioHoldings page"
```

---

## Phase 5 — Tests + polish

### Task 13: Playwright flow test

**Files:**
- Create: `tests/e2e/holdings.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio Holdings', () => {
  test('tab navigation from summary to holdings', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Holdings' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/holdings$`), {
      timeout: 5_000
    })
  })

  test('renders grid, detail, and frequency panels', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/holdings`)
    // RevoGrid renders a <revo-grid> custom element
    await expect(page.locator('.revo-wrap revo-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.hdp-title')).toContainText('Holdings detail for')
    await expect(page.locator('.freq-chart canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('calculator dialog opens with snapshot rows', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/holdings`)
    await page.getByRole('button', { name: /open holdings calculator/i }).click()
    await expect(page.locator('.p-dialog')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.p-dialog .hcalc-row').first()).toBeVisible()
  })
})
```

- [ ] **Step 2: Run e2e suite**

```bash
npm run e2e
```

Expected: all tests in `holdings.spec.ts` PASS. Existing tests in `flow.spec.ts` and `summary.spec.ts` still PASS. If summary.spec.ts's `h1` assertion or `pt-row` count fails, fix the Summary page's CSS class names — the risk-gates block must still render 4 `.pt-row` elements even after being moved into its own section.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/holdings.spec.ts
git commit -m "test(holdings): add Playwright flow test for the holdings page"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run the full check suite**

```bash
npm run lint:check
npm run typecheck
npm run test
npm run e2e
npm run build
```

Expected: all green.

- [ ] **Step 2: Smoke test in browser**

```bash
npm run dev
```

Manually verify at `http://localhost:5173/portfolios/00000000-0000-4000-a000-000000000001/holdings`:

- Grid shows ~24 monthly rows + 1 predicted row (muted, no value/return)
- Justification columns appear (`Momentum`, `Volatility`, `Trend`) for portfolio 1 only
- Clicking a row updates the detail panel header (`Holdings detail for <Month> <Year>`)
- Donut renders with ≥3 slices; hovering a slice highlights the matching ticker row in the detail panel
- "Export CSV" downloads a valid CSV
- Calculator icon opens a dialog; changing the dollar amount updates the table live
- Tab bar switches cleanly between Overview and Holdings without a full page reload
- Dark-mode toggle (top bar) flips the grid theme, detail panel, donut colors, and calculator correctly

- [ ] **Step 3: No-op commit if everything passes**

No new changes expected at this step. If any fixes were made, commit them:

```bash
git add -u
git commit -m "fix(holdings): adjustments from manual smoke test"
```

---

## Cross-Repo Follow-Up (not part of this plan)

These items track backend work needed to replace mocks with live data. Create them as GitHub issues or tickets in the `pv-api` repo:

1. Add `GET /portfolios/{slug}/holdings` path and the four schemas (`PortfolioHoldings`, `HoldingsSnapshot`, `HoldingPosition`, `JustificationEntry`) to `pv-api/.worktrees/pvapi-3-auth-schema/openapi/openapi.yaml`.
2. Implement the Go handler that streams monthly snapshots from the backtest runs table.
3. Regenerate oapi-codegen types and wire up the handler.
4. Once deployed, remove the MSW handler in frontend-ng and run the e2e suite against a staging API build.
