# Returns & vs. Benchmark Pages — Design

**Status:** Draft
**Date:** 2026-04-19
**Scope:** Two new tabs on the Portfolio layout — `Returns` and `vs. Benchmark` — replacing the currently-disabled `Strategy` and `Backtest` tab slots. Together they help the user understand the **consistency**, **magnitude**, and **uniqueness** of their portfolio's returns.

## Goals

- Let the user see year-over-year and month-over-month return texture at a glance (consistency)
- Give a clear reading of how large individual returns were (magnitude)
- Make it obvious where the portfolio diverged from the benchmark in timing, shape, and response (uniqueness)
- Keep everything client-side-derivable from the existing daily measurements so no new API endpoints are required

## Non-Goals

- Re-deriving metrics that already exist in `portfolio.metrics` (beta, alpha, up/down capture) — use the API values when present
- Duplicating the `Deepest drawdowns` content that lives on the Overview page
- Editing or uploading returns data (read-only)
- The old Quasar `Strategy` detail view — that concept may return later as its own distinct feature; it is not replaced by these pages

## Architecture

### Routing

Two new routes under `PortfolioLayout`:

```
/portfolios/:id               → PortfolioLayout.vue
  ''          (index)         → PortfolioSummary.vue        (existing)
  returns                     → PortfolioReturns.vue        (NEW)
  vs-benchmark                → PortfolioVsBenchmark.vue    (NEW)
  holdings                    → PortfolioHoldings.vue       (existing)
  transactions                → PortfolioTransactions.vue   (existing)
```

Route names: `portfolio-returns`, `portfolio-vs-benchmark`.

### Tab bar

`PortfolioLayout.vue` updates its `tabs` computed to:

```
Overview · Returns · vs. Benchmark · Holdings · Transactions · Settings (disabled)
```

The `Strategy` and `Backtest` entries are removed. `Transactions` moves to after the two performance tabs so the three performance-oriented tabs (`Overview`, `Returns`, `vs. Benchmark`) group together at the front.

### Components (new)

| Component | Path | Purpose |
|---|---|---|
| `PortfolioReturns.vue` | `src/pages/` | Page: Returns tab |
| `PortfolioVsBenchmark.vue` | `src/pages/` | Page: vs. Benchmark tab |
| `ReturnHeatmap.vue` | `src/components/charts/` | Year × month calendar heatmap |
| `RollingReturnsChart.vue` | `src/components/charts/` | 1Y / 3Y / 5Y rolling CAGR lines |
| `RollingExcessChart.vue` | `src/components/charts/` | Rolling portfolio − benchmark return |
| `ReturnDistributionChart.vue` | `src/components/charts/` | Overlaid histograms of monthly returns |
| `ReturnScatterChart.vue` | `src/components/charts/` | Monthly return scatter + regression |
| `AnnualReturnsList.vue` | `src/components/portfolio/` | Right-rail list: year + portfolio bar + delta pill |

### Components (reused)

`KpiCard`, `Panel`, `StatusDot`, `AnimatedBar`, `TabBar`. No changes to these.

### Composables

| Composable | New? | Purpose |
|---|---|---|
| `usePortfolio(id)` | existing | API-sourced `summary` + `metrics` (beta, alpha, up/down capture) |
| `usePortfolioMeasurements(id)` | existing | Daily `{date, portfolioValue, benchmarkValue}` series |
| `usePortfolioReturns(measurements)` | **new** | Derives monthly / annual / rolling / excess / scatter / stats series |

### Utility

`src/util/returns.ts` — pure functions, unit-testable without Vue:

- `toMonthly(points)` → `{year, month, portfolio, benchmark}[]`
- `toAnnual(monthly)` → `{year, portfolio, benchmark, delta}[]`
- `rollingCAGR(points, windowMonths)` → `{date, portfolio, benchmark}[]`
- `rollingExcess(points, windowMonths)` → `{date, value}[]`
- `linearRegression(pairs)` → `{beta, alpha, r2}`
- `returnStats(monthly, annual)` → `{pctPositiveMonths, longestPositiveStreak, bestYear, worstYear, bestMonth, worstMonth, trackingError, informationRatio, activeReturn}`

## Data Contract

No new endpoints. Both tabs are derived entirely from:

- `GET /portfolios/{id}` — `summary` + `metrics` (unchanged)
- `GET /portfolios/{id}/measurements` — daily series (unchanged)

### Derivation

`usePortfolioReturns(measurements)` returns all derived values as `computed` refs, memoized off the measurements query. Shape:

```ts
{
  monthly:   { year, month, portfolio, benchmark }[]
  annual:    { year, portfolio, benchmark, delta }[]
  rolling: {
    oneYear:   { date, portfolio, benchmark }[]
    threeYear: { date, portfolio, benchmark }[]
    fiveYear:  { date, portfolio, benchmark }[]
    excess6M:  { date, value }[]
    excess12M: { date, value }[]
    excess36M: { date, value }[]
  }
  scatter:    { x: benchmark, y: portfolio }[]
  regression: { beta, alpha, r2 }
  stats: {
    pctPositiveMonths: number
    longestPositiveStreak: number
    bestYear:  { year: number, return: number }
    worstYear: { year: number, return: number }
    bestMonth:  { year: number, month: number, return: number }
    worstMonth: { year: number, month: number, return: number }
    trackingError: number     // annualized stdev of monthly excess return
    informationRatio: number  // annualized active return / tracking error
    activeReturn: number      // annualized portfolio − benchmark CAGR
  }
}
```

Monthly returns are compounded from daily values within each calendar month. Annual returns are compounded from monthly returns. Rolling windows step monthly (not daily) to match the granularity of the stats.

### API values vs. derived

When rendering stats, prefer API values from `portfolio.metrics`:

- `Beta vs. Benchmark`, `Up Capture`, `Down Capture`, `Jensen's Alpha` — render the API value.
- If an expected metric is absent from `portfolio.metrics`, fall back to the derived value from `usePortfolioReturns`.

`Tracking Error`, `Information Ratio`, and the consistency stats (`pctPositiveMonths`, `longestPositiveStreak`, `bestMonth`, etc.) are always derived client-side; the API does not expose them today.

## Page Layout — Returns tab

### Stats strip (full width)

Six `KpiCard` tiles, equal-width grid, mirrors the Overview page KPI strip but without a hero tile:

| Tile | Source |
|---|---|
| % positive months | derived |
| Longest positive streak | derived |
| Best year | derived |
| Worst year | derived |
| Best month | derived |
| Worst month | derived |

### Body (2/3 + 1/3 columns at ≥1024px)

```
┌─ 2/3 left ─────────────────────────┬─ 1/3 right ───────────┐
│ Calendar heatmap                   │ Annual returns list    │
│   Rows: Jan–Dec                    │   Newest year at top   │
│   Cols: years (left → right)       │   Per row:             │
│   Cells: monthly return, diverging │     Year               │
│   color scale, zero = neutral      │     Portfolio % + bar  │
│                                    │     Benchmark % (dim)  │
│                                    │     Delta pill (±)     │
├────────────────────────────────────┤ Scrolls if > ~15 years │
│ Rolling returns chart              │                        │
│   Three overlaid lines:            │                        │
│     1Y / 3Y / 5Y trailing CAGR     │                        │
│   Benchmark as dimmed companion    │                        │
│   Toggle chips: 1Y · 3Y · 5Y       │                        │
└────────────────────────────────────┴────────────────────────┘
```

### Heatmap notes

- ECharts heatmap series. Uses an existing ECharts heatmap as the starting point.
- Diverging color scale anchored at 0: gain palette for positive, loss palette for negative, neutral wash at exactly zero.
- Tooltip: `Mar 2024 · +2.4%` (month name + year + signed percent, tabular-nums).
- Year-total sidebar column is **not** rendered inside the heatmap — annual totals are shown next to it in the right-rail `AnnualReturnsList`.

### Annual returns list notes

- Hand-built list, one `<li>` per year.
- Each row:
  - Year (IBM Plex Mono, prominent)
  - Portfolio return (signed percent, color-coded) + inline `AnimatedBar` scaled to the largest absolute annual return across the series
  - Benchmark return (dimmer, smaller)
  - Delta pill — `±X.Xpp`, colored gain/loss/neutral
- Emits `year-hover` on row hover; `PortfolioReturns.vue` forwards into `ReturnHeatmap.vue` so the hovered year's column highlights and other years dim. Reverse pairing (hover heatmap column → highlight list row) is also wired.
- Most recent year at the top, oldest at the bottom. Scrolls within the right-rail if the list exceeds container height.

### Rolling returns chart notes

- ECharts line chart, three series: 1Y, 3Y, 5Y trailing annualized return.
- Benchmark shown as a dimmed companion line for each visible window.
- Toggle chips above the chart control which windows are visible.
- Zero line emphasized so positive/negative periods read instantly.

## Page Layout — vs. Benchmark tab

### Stats strip (full width)

Six `KpiCard` tiles:

| Tile | Source |
|---|---|
| Active return (ann.) | derived |
| Tracking error | derived |
| Information ratio | derived |
| Up capture | API |
| Down capture | API |
| Beta | API |

### Body (vertical stack)

```
┌─ Rolling excess return (full width, hero) ─────────────────┐
│ Line: rolling 12-month portfolio − benchmark return        │
│ Zero line emphasized                                       │
│ Area fill: positive in gain tone, negative in loss tone    │
│ Y axis label: "excess return (pp)"                         │
│ Toggle chips: 6M · 12M · 36M rolling window                │
└────────────────────────────────────────────────────────────┘

┌─ 1/2 ──────────────────────────┬─ 1/2 ─────────────────────┐
│ Return distribution            │ Return scatter            │
│ Two overlaid histograms of     │ Each point: one month     │
│ monthly returns (portfolio +   │ x = benchmark return      │
│ benchmark)                     │ y = portfolio return      │
│ Mean & ±1σ markers             │ Regression line + β label │
│ Shared bin width, transparent  │ 45° reference line        │
│ fill so both tails are read.   │ Quadrants shaded subtly   │
└────────────────────────────────┴───────────────────────────┘
```

### Rolling excess chart notes

- ECharts area chart with a single line and two-toned area fill — `visualMap.pieces` split at `0` drives the color.
- Defaults to the 12-month rolling window.
- Toggle chips emit `update:window` and swap the active series in place (no chart re-mount).

### Distribution histogram notes

- Bins sized by Freedman–Diaconis rule clamped to a sensible range (e.g., 20–40 bins) so small and large histories both read.
- Both portfolio and benchmark series render as bars in the same bin buckets; bar fills are translucent so overlap is visible.
- Mean (solid vertical line) and ±1σ (dashed vertical lines) drawn on top for each series, color-matched.

### Scatter + regression notes

- One dot per monthly pair. Zero lines on both axes.
- 45° reference line (benchmark = portfolio) in a muted tone.
- Regression line drawn from the `regression.beta` + `regression.alpha` returned by `usePortfolioReturns`.
- Beta label shows next to the line: `β = 1.08`.
- Quadrants gently shaded (Q1 up-capture, Q3 down-capture) to key the viewer to the story each region tells.

## Interactions

| Event | Behavior |
|---|---|
| Hover a row in `AnnualReturnsList` | Heatmap column for that year gets a primary outline; other columns dim to ~50% opacity |
| Hover a heatmap column | Matching row in `AnnualReturnsList` highlights |
| Hover a heatmap cell | Tooltip shows month/year/return |
| Toggle chip on rolling returns | Show/hide that window (1Y/3Y/5Y) |
| Toggle chip on rolling excess | Swap the active window (6M/12M/36M) |
| Navigate between tabs | Each page remounts via `:key="$route.fullPath"` on `<router-view>` |

## Error & Loading States

- **Loading:** Page-level `Skeleton` blocks sized to match each module while measurements query resolves. Style matches Overview page.
- **Error (measurements query fails):** Reuse the `.error-banner` pattern from `PortfolioList.vue`. Hide all modules, show the banner.
- **Insufficient history (e.g., < 12 months):** Render modules that work with what's available; replace modules that require more history with an empty-state message scoped to that module (`"Not enough history for 3-year rolling return yet."`). Do not hide the entire page.

## Responsive

- **≥1024px:** Returns tab runs 2/3 + 1/3. vs. Benchmark runs full-width hero + paired 1/2 + 1/2 below.
- **768–1023px:** Both tabs collapse to a single column. On Returns, the annual list moves below the heatmap. On vs. Benchmark, distribution stacks above scatter.
- **<768px:** Single column. Stats strips wrap to two or three rows. Heatmap horizontally scrolls if years exceed viewport.

## Testing

### Unit (Vitest)

New `tests/unit/util/returns.spec.ts`:

- `toMonthly` compounds daily values correctly across month boundaries
- `toAnnual` compounds monthly values correctly across year boundaries
- `rollingCAGR` annualizes correctly and returns `null` when insufficient history
- `rollingExcess` returns differences for overlapping windows
- `linearRegression` recovers known `beta` / `alpha` from synthetic data
- `returnStats` counts positive months, tracks longest streak, identifies best/worst year and month, and annualizes tracking error and information ratio against hand-computed expected values

No UI unit tests — component behavior is covered by e2e.

### E2E (Playwright)

New `tests/e2e/returns.spec.ts`:

- Navigate to `/portfolios/:id/returns`; heatmap, annual list, rolling returns all visible
- Hover a row in the annual list; the corresponding heatmap column gets highlighted
- Toggle a rolling-window chip and confirm the line appears/disappears
- Navigate to `/portfolios/:id/vs-benchmark`; rolling excess, distribution, scatter all visible
- Toggle the rolling-excess window chip and confirm the chart updates

## Open Questions

None currently.
