# Risk Page — Design

**Status:** Draft
**Date:** 2026-04-19
**Scope:** A new `Risk` tab on the Portfolio layout that helps the user understand the *character* of the risk their portfolio takes on — how bad losses can get, how bumpy the ride is, and how the risk profile compares to the benchmark.

## Goals

- Make loss-side risk visceral: max drawdown, worst months, tail losses (VaR / CVaR), downside deviation, Ulcer index
- Show how volatile the ride is and how that volatility changes over time
- Let the user see where the portfolio's risk diverges from the benchmark's risk (correlation, asymmetric betas, drawdown co-movement)
- Stay client-side-derivable from existing daily `measurements` — no new API endpoints
- Explicitly omit any risk-free-rate-dependent metric (Sharpe, Sortino, Treynor). Those values already surface on Overview from backend values; Risk tab focuses on metrics that stand on their own.

## Non-Goals

- Re-deriving metrics already computed on the backend (beta, up/down capture). The Risk tab uses **its own** regime-split betas (up-beta, down-beta) which the backend does not provide; overall beta is borrowed from `portfolio.metrics` when shown.
- Risk-free-rate–dependent metrics (Sharpe, Sortino). Overview already exposes these from the backend; Risk intentionally skips them.
- Duplicating the rolling-excess / scatter / distribution charts on the `vs. Benchmark` tab. Risk-tab charts are risk-framed (drawdown, rolling vol, regime scatter) and visually distinct.
- The old Quasar `Backtest` detail view — that concept may return as a separate feature later; this tab does not replace it.
- User-adjustable risk-free rate. Zero risk-free data in the payload → no UI control for it.

## Architecture

### Routing

One new route under `PortfolioLayout`:

```
/portfolios/:id               → PortfolioLayout.vue
  ''          (index)         → PortfolioSummary.vue        (existing)
  returns                     → PortfolioReturns.vue        (existing)
  vs-benchmark                → PortfolioVsBenchmark.vue    (existing)
  risk                        → PortfolioRisk.vue           (NEW)
  holdings                    → PortfolioHoldings.vue       (existing)
  transactions                → PortfolioTransactions.vue   (existing)
```

Route name: `portfolio-risk`.

### Tab bar

`PortfolioLayout.vue` updates its `tabs` computed to:

```
Overview · Returns · vs. Benchmark · Risk · Holdings · Transactions · Settings (disabled)
```

`Risk` slots between `vs. Benchmark` and `Holdings` so the four performance/analysis tabs group together at the front.

### Components (new)

| Component | Path | Purpose |
|---|---|---|
| `PortfolioRisk.vue` | `src/pages/` | Page: Risk tab |
| `DrawdownCurveChart.vue` | `src/components/charts/` | Absolute portfolio drawdown over time, negative-valued area fill |
| `WorstMonthsList.vue` | `src/components/portfolio/` | Top 10 worst monthly returns, sorted, with horizontal bars |
| `RollingVolChart.vue` | `src/components/charts/` | Rolling 12-month annualized volatility, portfolio vs benchmark |
| `DrawdownOverlayChart.vue` | `src/components/charts/` | Absolute drawdown lines, portfolio + benchmark, overlaid |
| `UpDownScatterChart.vue` | `src/components/charts/` | Monthly scatter split by benchmark sign, separate fit lines |

### Composables and utilities (new / extended)

| File | Purpose |
|---|---|
| `src/util/risk.ts` | Pure math: VaR, CVaR, downside deviation, Ulcer, rolling volatility, regime-split regression, Calmar, Pearson correlation |
| `src/composables/usePortfolioRisk.ts` | Derives risk stats + chart-ready series from `measurements`; returns `PortfolioRiskDerived | null` |

`src/util/returns.ts` is unchanged. It already provides `toMonthly`, `toAnnual`, `toDrawdownSeries`, `linearRegression`, and base types (`MonthlyReturn`, `DailyPoint`). `src/util/chart-theme.ts` (`useChartPalette`) is reused for all color tokens.

### Data flow

```
usePortfolio(id)                  → Portfolio { summary, metrics, ... }
usePortfolioMeasurements(id)      → { points: DailyPoint[] }
                                      │
                                      ▼
                         usePortfolioRisk(measurements)
                                      │
                                      ▼
                      PortfolioRiskDerived {
                        stats: { maxDd, worstMonth, var5, cvar5,
                                 downsideDev, ulcer, vol, calmar,
                                 pctPositiveMonths, bestMonth,
                                 correlation, upBeta, downBeta },
                        drawdown:   DrawdownPoint[],       // portfolio only
                        overlay:    DrawdownPoint[],       // portfolio + benchmark
                        rollingVol: { date, portfolio, benchmark }[],
                        worstMonths: MonthlyReturn[],      // top 10 by -return
                        regimeScatter: {
                          up:   ScatterPoint[],   // benchmark month ≥ 0
                          down: ScatterPoint[],   // benchmark month < 0
                          upFit:   Regression,
                          downFit: Regression,
                        },
                      }
```

**Sourcing policy.** All section KPIs are computed client-side from `measurements.points` using the definitions below — same pattern as the `vs. Benchmark` tab. Overall beta is the one exception: it reads `portfolio.metrics` (label `"Beta vs. Benchmark"`) first and falls back to a full-sample regression, matching the `vs. Benchmark` tab so the two tabs show an identical beta. Up-beta and down-beta are always computed locally (the backend does not split regimes). Small numerical discrepancies with Overview (which may surface backend-computed Ulcer, vol, etc.) are acceptable — Risk is the authoritative detail view, Overview is a top-line glance.

## Page layout

```
┌──────────────────────────────────────────────────────────────┐
│  Section A · How bad could it get?                           │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐                 │
│  │ Max  │Worst │ VaR  │CVaR  │Down- │Ulcer │                 │
│  │  DD  │month │ 5%mo │ 5%mo │side  │index │                 │
│  └──────┴──────┴──────┴──────┴──────┴──────┘                 │
│  ┌──────────────────────────────┐  ┌─────────────────────┐   │
│  │ Drawdown curve (portfolio)   │  │ Worst 10 months     │   │
│  │  [How to read this]          │  │  (sorted bar list)  │   │
│  └──────────────────────────────┘  └─────────────────────┘   │
│                                                              │
│  Section B · How bumpy is the ride?                          │
│  ┌──────┬──────┬──────┬──────┐                               │
│  │ Vol  │Calmar│% pos │ Best │                               │
│  │ ann. │ratio │months│month │                               │
│  └──────┴──────┴──────┴──────┘                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Rolling volatility (12M), portfolio vs benchmark     │    │
│  │  [How to read this]                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Section C · Relative to the benchmark                       │
│  ┌──────┬──────┬──────┬──────┐                               │
│  │Corr. │β up  │β down│β     │                               │
│  │ (r)  │ mkt  │ mkt  │overall│                              │
│  └──────┴──────┴──────┴──────┘                               │
│  ┌──────────────────────────────┐  ┌─────────────────────┐   │
│  │ Drawdown overlay             │  │ Up/down regime      │   │
│  │ (portfolio + benchmark)      │  │ scatter             │   │
│  │  [How to read this]          │  │  [How to read this] │   │
│  └──────────────────────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Each section is a visually distinct band (section header + KPI strip + anchor chart(s)). Reading order encodes a narrative: **pain → ride → context**.

### Responsive breakpoints

- `≤ 1024px`: KPI strips collapse to 3 columns (A) / 2 columns (B, C). Side-by-side chart pairs stack.
- `≤ 720px`: KPI strips collapse to 2 columns. All charts stack single-column.

## Metric definitions

All "monthly" metrics are computed from `toMonthly(measurements.points)`. All "daily" metrics are computed from raw `DailyPoint[]`.

### Section A — Pain

- **Max drawdown** (`maxDd`): minimum of `toDrawdownSeries(days).portfolio`. Decimal, always ≤ 0. Displayed as signed percent.
- **Worst month** (`worstMonth`): min `portfolioReturn` across monthly pairs. Display includes month label (e.g. "Mar 2020").
- **VaR 5%** (`var5`): the 5th-percentile monthly portfolio return, using linear interpolation between ranks (same convention as NumPy `quantile(..., method='linear')`). Decimal, typically negative.
- **CVaR 5%** (`cvar5`): mean of the monthly portfolio returns at or below `var5`. Always ≤ `var5`.
- **Downside deviation** (`downsideDev`): `sqrt( mean( min(r - 0, 0)² ) ) * sqrt(12)` over all monthly portfolio returns. Annualized. Zero-threshold variant (Minimum Acceptable Return = 0).
- **Ulcer index** (`ulcer`): `sqrt( mean( dd_t² ) )` where `dd_t` is the portfolio drawdown at each daily point (decimal, ≤ 0). Multiplied by 100 for readability (expressed as a percent-like number, e.g. "6.34"). Display as `formatNumber(value * 100, 2)`.

### Section B — Ride

- **Annualized volatility** (`vol`): `stdDev(monthlyReturns) * sqrt(12)`. Decimal percent. Sample standard deviation (n-1 denominator).
- **Calmar ratio** (`calmar`): `cagrSinceInception / abs(maxDd)`. Uses `portfolio.summary.cagrSinceInception` when present; falls back to total-period CAGR from monthly returns when missing. Dimensionless.
- **% positive months** (`pctPositiveMonths`): fraction of months with `portfolioReturn > 0`. Reuse the existing value from `usePortfolioReturns` if convenient; otherwise recompute locally.
- **Best month** (`bestMonth`): max `portfolioReturn`. Display includes month label.

### Section C — Benchmark-relative

- **Correlation** (`correlation`): Pearson `r` between monthly portfolio and benchmark returns. Dimensionless, in `[-1, +1]`.
- **Up-beta** (`upBeta`): `linearRegression(pairs).beta` filtering pairs to those where `benchmarkReturn ≥ 0`.
- **Down-beta** (`downBeta`): `linearRegression(pairs).beta` filtering pairs to those where `benchmarkReturn < 0`.
- **Beta (overall)** (`beta`): from `portfolio.metrics` (label `"Beta vs. Benchmark"`), else full-sample `linearRegression(pairs).beta`.

### Edge cases

- Empty `measurements.points`: `usePortfolioRisk` returns `null`; page renders the `isLoading` skeleton state if query is still in flight, otherwise the empty-data branch (same pattern as existing pages).
- Fewer than 12 monthly points: rolling volatility series is empty (`RollingVolChart` renders an empty chart with axes but no lines).
- Fewer than 20 monthly points: VaR/CVaR still compute (a 5% tail of 15 months is ~0.75 observations — we interpolate and flag nothing, same as NumPy behavior). This is a YAGNI call; if the data is too thin to be meaningful, the whole portfolio is too new for the page to be useful anyway.
- All benchmark-return months the same sign: the opposite-regime beta has zero samples → report `null`, display `—`. Same for correlation when either series has zero variance.

## Chart specifications

All charts live in `src/components/charts/` (except `WorstMonthsList.vue` which is a list component in `src/components/portfolio/`). All use `vue-echarts` + `useChartPalette()`. Each chart has a "How to read this" button in the panel header that opens a PrimeVue `Dialog`, matching the existing Returns / vs. Benchmark pattern.

### `DrawdownCurveChart.vue`

- Single ECharts `line`, x: time, y: portfolio drawdown in percent (negative domain).
- Area fill below zero using `p.loss` with 0.25 alpha; line stroke `p.loss` at 1.5px.
- Y-axis formatted `{value}%`; always includes zero at the top (`max: 0`).
- Tooltip: `{formatDate} · drawdown {signedPercent}`.
- Grid: `{ left: 56, right: 16, top: 16, bottom: 36 }`. Height: 300px.

### `WorstMonthsList.vue`

- Hand-built (no ECharts). Sorted descending by loss magnitude, top 10 rows.
- Each row: left-aligned month label, right-aligned signed percent, background bar scaled to `abs(return) / abs(worst)` in `p.loss` at 0.15 alpha.
- Row height 28px; 13px base type; tabular-nums for the percent.
- Highlights on hover (background `panel-soft` 0.5 alpha) for visual pairing with the curve.

### `RollingVolChart.vue`

- Two ECharts `line` series: portfolio (primary) and benchmark (secondary), both at 1.5px stroke, no fill.
- X: time. Y: annualized volatility in percent.
- Computation: at each month `t` (starting at `t=11`), `vol_t = stdDev(monthly[t-11..t]) * sqrt(12) * 100`.
- Legend top; tooltip trigger `'axis'`, `valueFormatter` = `{value}%`.
- Height: 320px.

### `DrawdownOverlayChart.vue`

- Two ECharts `line` series — portfolio drawdown (primary color) and benchmark drawdown (secondary color). Both fill below zero at 0.15 alpha for their respective hues. 1.5px strokes.
- X: time. Y: drawdown in percent (`max: 0`).
- Tooltip trigger `'axis'`, custom formatter shows both series on the same date.
- Legend top.
- Height: 300px.

### `UpDownScatterChart.vue`

- Two ECharts `scatter` series: *up-regime* points (benchmark ≥ 0) colored `p.gain`, *down-regime* points (benchmark < 0) colored `p.loss`. Symbol size 7.
- Two ECharts `line` series: up-regime fit line (from `upFit`, drawn across x ∈ [0, xMax]), down-regime fit line (from `downFit`, drawn across x ∈ [xMin, 0]). Lines colored to match their regime, 2px.
- Dashed 45° reference line spanning full x-range (matches existing `ReturnScatterChart` pattern).
- Axes in percent with `{value}%` format. `axisRange` computed the same way as `ReturnScatterChart` (`Math.ceil(maxAbs * 100 * 1.1)` so labels read as whole percents).
- Header line above the chart reads: `β up = X.XX · β down = Y.YY · r = Z.ZZ` in mono/tabular font.
- Tooltip: `benchmark X.XX% → portfolio Y.YY% (up regime | down regime)`.
- Height: 280px.

## Interactions and state

- No cross-chart hover linking on Risk. Each panel is self-contained. (Returns tab links heatmap ↔ annual list; Risk's panels don't share a dimension that would make this useful.)
- "How to read this" dialogs — one per chart (5 total: drawdown curve, rolling vol, drawdown overlay, up/down scatter, and a single dialog for the Worst months list explaining the sort and bar encoding). Dialog state in page-local `ref<boolean>`s, same pattern as existing tabs.
- Theme tokens respond to dark/light via `useChartPalette()`.

## Testing

### Unit tests (`tests/unit/risk.spec.ts`)

- `var5` / `cvar5`: fixed monthly series → expected percentile and conditional mean, including edge cases (all-positive, all-zero, short series).
- `downsideDeviation`: mixed-sign series, verified against hand-computed value. All-positive series → 0.
- `ulcerIndex`: fixed daily series with a known drawdown shape → expected RMS value.
- `rollingVolatility`: 24-month synthetic series, windowed std * sqrt(12), verified.
- `regimeRegression`: pairs with known split → verified up-beta, down-beta, correlation.
- `calmar`: synthetic CAGR + max-DD → `cagr / abs(dd)`.
- Tiny-input handling: fewer than 12 months → empty rolling vol; zero-variance benchmark → null correlation/betas.

### Unit tests (`tests/unit/usePortfolioRisk.spec.ts`)

- `null` input → `null` output.
- Full fixture input → derived object with stats, drawdown points, rolling vol points, worst months of length 10, regime scatter with both regimes populated.
- Reactive: mutating source triggers recomputation (spec mirrors the existing `usePortfolioReturns` test pattern).

### Component tests (smoke-level only; full rendering covered by e2e)

- `DrawdownCurveChart` mounts with canned data; renders `.ddc-chart canvas`.
- `WorstMonthsList` renders 10 rows with correct month labels and bar widths.
- `RollingVolChart`, `DrawdownOverlayChart`, `UpDownScatterChart` all mount without error given fixture data.

### e2e tests (`tests/e2e/risk.spec.ts`)

Matches the style of `tests/e2e/vs-benchmark.spec.ts` and `returns.spec.ts`:

1. **Tab navigation**: from `/portfolios/:id` click `Risk` link → URL contains `/risk`.
2. **Renders**: on `/portfolios/:id/risk`, all six KPI cards of section A are present, all four of B, all four of C (14 total KPI cells); each chart canvas is visible; `Worst months` list has 10 rows.
3. **How to read dialogs**: clicking the first `How to read this` button opens a PrimeVue dialog; `Escape` closes it.

## Accessibility

- Each section header is an `<h2>` so screen readers can jump sections.
- `role="alert"` on the error banner.
- KPI strips are simple `<div>`/`<KpiCard>` trees — label above value, same pattern as existing pages.
- Charts are decorative visualizations; the KPI strips carry the numeric story and are fully readable without the charts.
- "How to read this" buttons have `aria-label="How to read this chart"`.

## Files summary

**New files:**
- `src/pages/PortfolioRisk.vue`
- `src/components/charts/DrawdownCurveChart.vue`
- `src/components/charts/RollingVolChart.vue`
- `src/components/charts/DrawdownOverlayChart.vue`
- `src/components/charts/UpDownScatterChart.vue`
- `src/components/portfolio/WorstMonthsList.vue`
- `src/composables/usePortfolioRisk.ts`
- `src/util/risk.ts`
- `tests/unit/risk.spec.ts`
- `tests/unit/usePortfolioRisk.spec.ts`
- `tests/e2e/risk.spec.ts`

**Modified files:**
- `src/router.ts` — add `portfolio-risk` route.
- `src/layouts/PortfolioLayout.vue` — insert `Risk` tab between `vs. Benchmark` and `Holdings`.
- `src/util/echarts-setup.ts` — verify required components (LineChart, ScatterChart) are already registered; add any missing.

No changes to API endpoints, mocks, or fixtures — existing `measurements` fixture contains enough points to exercise all sections.
