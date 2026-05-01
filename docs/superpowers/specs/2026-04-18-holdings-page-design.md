# Holdings Page — Design

**Status:** Draft
**Date:** 2026-04-18
**Scope:** Full parity with the old Quasar `PortfolioHoldings.vue`, rebuilt in the Midnight Carbon design language established on the Portfolio Summary page.

## Goals

Give portfolio owners a full view of their portfolio's composition over time:

- See what was held in each month back to inception, with period return and end-of-period value
- Inspect the strategy's reasoning for each monthly allocation (dynamic justification columns)
- Drill into a specific month and see per-position shares/%/value
- Understand which tickers appear most often (frequency donut)
- Simulate "what would I hold if I invested $X" via a calculator dialog
- Export the history as CSV

## Non-Goals

- Editing or uploading holdings (read-only)
- Transaction-level detail (lives on the forthcoming Transactions page)
- Tax lot tracking
- Real-time price updates on the detail panel (snapshot values only)

## Architecture

### Routing

Convert `/portfolios/:id` into a nested route so Overview, Holdings, and future sibling pages share chrome.

```
/portfolios/:id               → PortfolioLayout.vue
  ''         (index)          → PortfolioSummary.vue
  holdings                    → PortfolioHoldings.vue
```

`PortfolioLayout.vue` (new, in `src/layouts/`) owns:

- Breadcrumb
- Portfolio title + benchmark chip + last-updated timestamp
- `TabBar` (router-linked, not local `ref`)
- `<RouterView />` for the active child page

`PortfolioSummary.vue` loses its duplicated breadcrumb/title/tabs (that code moves to `PortfolioLayout`) and becomes only the summary body.

### Components (new)

| Component | Path | Purpose |
|---|---|---|
| `PortfolioLayout.vue` | `src/layouts/` | Shared chrome (breadcrumb, title, tabs, outlet) |
| `PortfolioHoldings.vue` | `src/pages/` | Page: history grid + detail + frequency donut + calculator trigger |
| `HoldingsHistoryGrid.vue` | `src/components/holdings/` | RevoGrid wrapper with column defs, selection, dark-mode theming |
| `HoldingsDetailPanel.vue` | `src/components/holdings/` | Hand-built table (ticker/shares/%/value) + header + calculator button |
| `HoldingsFrequencyChart.vue` | `src/components/holdings/` | ECharts donut, emits `ticker-hover` |
| `HoldingsCalculatorDialog.vue` | `src/components/holdings/` | PrimeVue `Dialog` + input + computed share table |

### Composables

`usePortfolioHoldings(slug)` — thin TanStack Query wrapper around `GET /portfolios/{slug}/holdings`. Mirrors the shape of `usePortfolio` / `usePortfolioMeasurements`.

### State (in `PortfolioHoldings.vue`)

- `selectedDate: Ref<string | null>` — the history row currently selected. Defaults to most recent non-predicted snapshot.
- `hoveredTicker: Ref<string | null>` — emitted by the donut; `HoldingsDetailPanel` highlights the matching row.
- `calculatorOpen: Ref<boolean>` — controls the dialog.
- All derived data (detail positions, frequency counts) is `computed` off the query result + `selectedDate`.

## Data Contract

New endpoint to add to pv-api's `openapi.yaml`. Frontend-ng adds a local copy to its own `api/openapi.yaml` and a corresponding MSW handler. The backend work is out of scope for this project but is tracked in the Cross-Repo Work section below.

### Endpoint

```
GET /portfolios/{slug}/holdings
200 → PortfolioHoldings
401 → Unauthorized
404 → NotFound
500 → ServerError
```

### Schemas

```yaml
PortfolioHoldings:
  type: object
  required: [portfolioSlug, snapshots]
  properties:
    portfolioSlug:
      type: string
    snapshots:
      type: array
      items: { $ref: '#/components/schemas/HoldingsSnapshot' }

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
      description: True for future/projected allocations the strategy has issued but have not been executed.
    periodReturn:
      type: number
      format: double
      nullable: true
      description: Decimal period return for this snapshot. Null for the first snapshot and for predicted rows.
    value:
      type: number
      format: double
      nullable: true
      description: Portfolio value at end of period. Null for predicted rows.
    positions:
      type: array
      items: { $ref: '#/components/schemas/HoldingPosition' }
    justification:
      type: array
      description: Strategy-specific reasoning for this allocation. Keys are not fixed; the frontend builds columns dynamically from the union of keys across snapshots.
      items: { $ref: '#/components/schemas/JustificationEntry' }

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
        - { type: string }
        - { type: number }
```

### Mock data

MSW handler returns per-portfolio monthly snapshots from inception to today + one predicted row. Target ~24 snapshots for the existing fixtures, with at least one portfolio carrying justification keys (e.g. `Momentum`, `Volatility`) to exercise the dynamic-column path.

## Page Layout

Two-column grid at ≥1024px, stacks at narrower widths. Breakpoint matches existing Summary page.

```
┌─────────────────────────────────────────────────────────────┐
│  PortfolioLayout (breadcrumb · title · benchmark · tabs)    │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  Holdings detail          │
│                                  │  for Mar 2026     [calc]  │
│                                  │  ──────────────────────   │
│  Holdings history (RevoGrid)     │  Ticker  Shares   %  Val  │
│                                  │  VTI     120.5  58%  $..  │
│  Date · Tickers · Return · Value │  VEA      40.2  22%  $..  │
│  · [dynamic justification cols]  │  BND      30.0  20%  $..  │
│                                  │                           │
│  Predicted rows: muted + tag     ├──────────────────────────┤
│                                  │  Holdings Frequency       │
│                                  │  (ECharts donut)          │
│                                  │                           │
├──────────────────────────────────┴──────────────────────────┤
│  [Export CSV]                                                │
└─────────────────────────────────────────────────────────────┘
```

### Holdings history grid (RevoGrid)

- `@revolist/vue3-datagrid` — web-component based, native virtual scroll, handles dynamic columns cleanly.
- **Columns:**
  - `Date` — pinned left, formatted `MMM yyyy`, sorted desc by default.
  - `Tickers` — alpha-joined ticker list (`BND VEA VTI`), excluding `$CASH`.
  - `Return` — `formatPercent`, green/red per sign, dashed for null/predicted.
  - `Value` — `formatCurrency`, dashed for predicted.
  - *Dynamic justification columns* — built from the union of `justification[].key` across all snapshots. String values passed through; numbers rounded to 2dp.
- **Predicted rows:** row-level class `predicted`, sets `opacity: 0.6` and renders a `<Tag severity="info">Predicted</Tag>` after the ticker list. Return and value render `—`.
- **Selection:** single row. Emits `selectedDate`. Highlight style matches `--primary` at low opacity to fit the dark theme.
- **Theming:** RevoGrid uses CSS custom props and `::part()`. We add a thin theme override CSS file (`src/styles/revogrid-theme.css`) that binds RevoGrid's vars to our `--bg`, `--surface`, `--border`, `--text-*`, `--primary` tokens. Dark/light react automatically via existing `.d-root` / `.pv-dark` toggles because the tokens already do.

### Holdings detail panel

- Hand-built table, matching the risk-gates/metrics/trailing-returns visual language on the Summary page (so the holdings detail doesn't feel disjoint).
- **Columns:** Ticker · Shares · % · Value.
- **Header:** `Holdings detail for Mar 2026`, updates on selection.
- **Calculator button:** right-aligned icon button (`pi pi-calculator`) → opens `HoldingsCalculatorDialog`.
- **Hover sync:** when `hoveredTicker` is non-null, rows matching it get a `.highlighted` class (subtle background tint in the primary color).

### Holdings frequency donut

- ECharts donut using existing vue-echarts setup.
- Data: `{ ticker, monthCount, percentOfMonths }` per ticker (excluding `$CASH`), sorted desc by count.
- Colors cycle through a theme-safe palette (use existing `--chart-1..n` tokens if present; otherwise add them).
- Emits `mouseover`/`mouseout` → parent updates `hoveredTicker`.
- Center label shows total distinct tickers.

### Calculator dialog

- PrimeVue `Dialog`, modal, 520px wide.
- Body: `InputNumber` (default $10,000) + table of the currently-selected snapshot's positions with recomputed `shares = (newValue × weight) / pricePerShare` and `value = newValue × weight`.
- Price per share derived from the snapshot: `pricePerShare = position.value / position.shares`.
- Read-only; no submit. Close via `x` or Esc.

### CSV export

- Plain button below the grid, `Export CSV`.
- Builds a CSV client-side from the grid's current column order and sort, downloads via `Blob` + `a[download]`.
- No xlsx dependency; CSV covers the 80% case.

## Interactions

| Event | Behavior |
|---|---|
| Page mount | Fetch holdings; select most recent non-predicted row by default |
| Click history row | Update `selectedDate`; detail panel + frequency (if filtered) recompute |
| Hover donut slice | `hoveredTicker` set; detail panel row highlights |
| Click calculator button | Open dialog with current snapshot's positions |
| Change input in calculator | Live-recompute shares + value |
| Click Export CSV | Download `{slug}-holdings.csv` |
| Predicted row | Not selectable (skip on arrow keys, ignore click) |

## Error + Loading States

- **Loading:** Skeleton for the grid (tall block), skeletons for detail and donut. Match the Summary page's loading-state treatment.
- **Error:** Reuse `.error-banner` pattern from `PortfolioList.vue`; show endpoint error message.
- **Empty (no snapshots):** Empty state panel with "No holdings history yet" copy. Shouldn't happen in practice but covered for new portfolios.

## Responsive

- ≥1024px: two-column 2/3 + 1/3.
- 768–1023px: single column, order = grid → detail → frequency.
- <768px: single column, grid horizontally scrolls inside its container, everything else full-width.

## Testing

- **Playwright (extend `tests/e2e/flow.spec.ts` or new `holdings.spec.ts`):**
  - From summary, click `Holdings` tab, URL updates to `/portfolios/{id}/holdings`.
  - Grid visible with ≥1 row.
  - Detail panel shows the default selected month.
  - Clicking a different row updates the detail panel header.
  - Calculator dialog opens and closes.
- **No new unit tests** unless a non-trivial pure helper falls out (e.g. CSV builder). If so, add a focused Vitest file.

## Cross-Repo Work (out of scope)

Backend changes needed to make this live-data-capable (not done in this project):

1. Add `GET /portfolios/{slug}/holdings` and the four schemas above to `pv-api/.worktrees/pvapi-3-auth-schema/openapi/openapi.yaml`.
2. Implement the handler in pvapi.
3. Regenerate oapi-codegen types.

Frontend-ng will work against MSW mocks until the backend ships; then we swap `VITE_USE_MOCKS` off and exercise the real endpoint.

## Open Questions

None currently.
