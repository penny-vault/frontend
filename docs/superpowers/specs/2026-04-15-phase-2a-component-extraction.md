# Phase 2a: Component Extraction — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Scope:** Extract reusable UI primitives from the PortfolioSummary.vue monolith into focused components. No new pages, no new features — purely structural.

## Goal

Break the 1700-line `PortfolioSummary.vue` into focused, reusable components under `src/components/ui/` and `src/components/charts/`, plus a `MainLayout` in `src/layouts/`. PortfolioSummary becomes a thin page that composes them. The existing e2e smoke tests must still pass after extraction (the page looks and behaves identically).

## File Structure

```
src/
  layouts/
    MainLayout.vue              # top bar, breadcrumb slot, nav, search, theme toggle, scroll elevation, user avatar
  components/
    ui/
      KpiCard.vue               # label / value / sub-value stat card with hover glow
      KpiStrip.vue              # 6-up grid layout, first slot is "big"
      SegmentedControl.vue      # button group with sliding indicator
      TabBar.vue                # tab links with animated underline
      Panel.vue                 # bordered card container with hover lift + shadow
      HealthBar.vue             # 5-segment buffer gauge with cascade bounce on hover
      AnimatedBar.vue           # width-grow-on-mount bar (used by holdings + drawdowns)
      StatusDot.vue             # pulsing status indicator (ok/warn/err)
      FocusBanner.vue           # enter/leave transition banner (drawdown focus state)
    charts/
      ValueChart.vue            # ECharts line chart with range chips, legend, drawdown hover/focus interaction
  pages/
    PortfolioSummary.vue        # thin page composing the above
```

## Layout Architecture

`MainLayout` wraps the router view. The router config changes from rendering pages directly to rendering them inside the layout:

```ts
{
  path: '/',
  component: MainLayout,
  children: [
    { path: '', name: 'portfolio-summary', component: () => import('./pages/PortfolioSummary.vue') }
  ]
}
```

### MainLayout owns:
- Sticky top bar with brand logo, nav links, search field, theme toggle (moon/sun), notification bell, user avatar
- Scroll-elevation behavior (backdrop blur + shadow on scroll)
- Breadcrumb bar (populated via route meta or named slot)
- `.d-root` class with CSS theme variables (`theme-light` / `pv-dark`)
- `is-mounted` class for entrance animations

### Pages own:
- Their content (everything below the breadcrumb)
- Their data queries (Vue Query composables)
- Page-specific interactions (drawdown focus, chart zoom)

## Component Props

| Component | Props | Emits | Slots |
|---|---|---|---|
| `KpiCard` | `label: string`, `value: string`, `sub?: string`, `tone?: 'up'\|'down'\|'warn'`, `big?: boolean` | — | — |
| `KpiStrip` | — | — | default (KpiCard children) |
| `SegmentedControl` | `options: {key: string, label: string}[]`, `modelValue: string` | `update:modelValue` | — |
| `TabBar` | `tabs: string[]`, `modelValue: string` | `update:modelValue` | — |
| `Panel` | `title?: string`, `subtitle?: string` | — | default, `header` (optional override) |
| `HealthBar` | `segments: {filled: boolean, tone: 'ok'\|'warn'\|'err'}[]`, `bounceOnHover?: boolean` | — | — |
| `AnimatedBar` | `value: number` (0-1 fraction), `gradient?: string` (CSS gradient), `delay?: number` (ms) | — | — |
| `StatusDot` | `tone: 'ok'\|'warn'\|'err'`, `pulse?: boolean` | — | — |
| `FocusBanner` | `visible: boolean` | `clear` | default |
| `ValueChart` | `series: TimeSeries`, `drawdowns: Drawdown[]`, `range: RangeKey`, `logScale: boolean`, `showDrawDowns: boolean`, `hoveredDrawdown: Drawdown\|null`, `focusedDrawdown: Drawdown\|null`, `theme: ChartTheme` | `update:range`, `update:logScale`, `update:showDrawDowns` | — |

## CSS Strategy

- **CSS variables stay on the root.** `MainLayout` sets `.d-root` with all theme variables. Components consume `var(--primary)`, `var(--panel)`, etc. No prop-drilling colors.
- **Scoped styles per component.** Each component has its own `<style scoped>` block containing only its styles (moved from PortfolioSummary.vue).
- **Animation classes** (`reveal`, `is-mounted`) flow from the layout. Components use `var(--d)` for staggered entrance delays.
- **`prefers-reduced-motion`** overrides stay in the layout's global scope.

## Testing Strategy

- Each extracted component gets a Vitest test verifying it renders with expected props and emits correctly.
- The existing Playwright e2e smoke tests (page shell + KPI count + chart canvas + theme toggle) serve as the integration gate. They must pass identically after extraction.
- No new e2e tests in this phase.

## Success Criteria

1. `PortfolioSummary.vue` drops from ~1700 lines to ~300 lines (page-level composition only)
2. All 11 components exist in `src/components/ui/` and `src/components/charts/`
3. `MainLayout.vue` owns the app shell
4. `npm run typecheck && npm run build && npm run test && npm run e2e` all pass
5. The rendered page is pixel-identical to the pre-extraction state (same visual, same interactions, same animations)

## Out of scope

- New pages (Phase 2b)
- New visual design or interactions
- Splash/login page
- Changes to the API layer, MSW, or auth
