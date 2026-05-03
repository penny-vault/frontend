<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Tag from 'primevue/tag'
import StatusDot from '@/components/ui/StatusDot.vue'
import Panel from '@/components/ui/Panel.vue'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import FlippableKpi from '@/components/ui/FlippableKpi.vue'
import ValueChart from '@/components/charts/ValueChart.vue'
import type { DrawdownRange } from '@/util/chart'
import {
  formatCurrency,
  formatPercent,
  formatSignedPercent,
  formatNumber,
  formatDate
} from '@/util/format'
import { useMounted } from '@/util/motion'
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioSummary } from '@/composables/usePortfolioSummary'
import { usePortfolioDrawdowns } from '@/composables/usePortfolioDrawdowns'
import { usePortfolioStatistics } from '@/composables/usePortfolioStatistics'
import { usePortfolioTrailingReturns } from '@/composables/usePortfolioTrailingReturns'
import { usePortfolioHoldings } from '@/composables/usePortfolioHoldings'
import type { PortfolioStatistic } from '@/api/endpoints/portfolios'

const hoveredDrawdown = ref<DrawdownRange | null>(null)
const focusedDrawdown = ref<DrawdownRange | null>(null)
const showAllHoldings = ref(false)
const HOLDINGS_COLLAPSED_LIMIT = 10

// Theme — from Pinia UI store (read-only in the page, toggle lives in layout)
const ui = useUiStore()
const { theme: uiTheme } = storeToRefs(ui)
const isLight = computed(() => uiTheme.value === 'light')

// Portfolio data — fetched via Vue Query composables
const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})
const measurementsParams = ref({})

const { data: portfolioData } = usePortfolio(portfolioId)
const { data: summaryData } = usePortfolioSummary(portfolioId)
const { data: drawdownsData } = usePortfolioDrawdowns(portfolioId)
const { data: statisticsData } = usePortfolioStatistics(portfolioId)
const { data: trailingReturnsData } = usePortfolioTrailingReturns(portfolioId)

const { data: measurementsData } = usePortfolioMeasurements(portfolioId, measurementsParams)
const { data: holdingsData } = usePortfolioHoldings(portfolioId)

// Map measurement points to the chart TimeSeries shape
const chartSeries = computed(() => {
  const pts = measurementsData.value?.points ?? []
  return {
    dates: pts.map((p) => new Date(p.date).getTime()),
    portfolio: pts.map((p) => p.portfolioValue),
    benchmark: pts.map((p) => p.benchmarkValue)
  }
})

// Computed hero values from the separate summary endpoint
const heroValue = computed(() => summaryData.value?.currentValue ?? 0)
const heroYtd = computed(() => summaryData.value?.ytdReturn ?? 0)
const heroBenchmarkYtd = computed(() => summaryData.value?.benchmarkYtdReturn ?? null)
const heroOneYear = computed(() => summaryData.value?.oneYearReturn ?? 0)
const heroCagr = computed(() => summaryData.value?.cagrSinceInception ?? 0)
const heroMaxDd = computed(() => summaryData.value?.maxDrawDown ?? 0)
const heroSharpe = computed(() => summaryData.value?.sharpe ?? 0)
const heroSortino = computed(() => summaryData.value?.sortino ?? 0)
const heroBeta = computed(() => summaryData.value?.beta ?? 0)
const heroAlpha = computed(() => summaryData.value?.alpha ?? 0)

// Page-level mounted flag for AnimatedBar animations
const mounted = useMounted(60)

function toggleFocusDrawdown(d: DrawdownRange): void {
  if (focusedDrawdown.value === d) focusedDrawdown.value = null
  else focusedDrawdown.value = d
}

const darkTheme = {
  fontFamily: '"IBM Plex Sans", "Inter", sans-serif',
  axisLabel: '#6f7c8a',
  axisLine: 'rgba(111,124,138,0.25)',
  gridLine: 'rgba(111,124,138,0.12)',
  portfolioLine: '#3ba7ff',
  portfolioArea1: 'rgba(59,167,255,0.28)',
  portfolioArea2: 'rgba(59,167,255,0)',
  benchmarkLine: '#f7b84b',
  benchmarkDash: false,
  ddFill: 'rgba(255,107,107,0.08)',
  tooltipBg: '#171c23',
  tooltipBorder: 'rgba(111,124,138,0.3)',
  tooltipText: '#e8edf2',
  tooltipMuted: '#8593a3',
  tooltipShadow: '0 20px 40px rgba(0,0,0,0.5)',
  smooth: false,
  legend: false,
  hoverFill: 'rgba(247,184,75,0.24)',
  hoverBorder: 'rgba(247,184,75,0.85)',
  hoverLine: '#f7b84b',
  focusFill: 'rgba(59,167,255,0.16)',
  focusBorder: 'rgba(59,167,255,0.7)'
}

const lightTheme = {
  fontFamily: '"IBM Plex Sans", "Inter", sans-serif',
  axisLabel: '#6f7c8a',
  axisLine: 'rgba(111,124,138,0.35)',
  gridLine: 'rgba(111,124,138,0.14)',
  portfolioLine: '#0f62fe',
  portfolioArea1: 'rgba(15,98,254,0.22)',
  portfolioArea2: 'rgba(15,98,254,0)',
  benchmarkLine: '#d97706',
  benchmarkDash: false,
  ddFill: 'rgba(218,30,40,0.06)',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(111,124,138,0.28)',
  tooltipText: '#121619',
  tooltipMuted: '#6f7c8a',
  tooltipShadow: '0 20px 40px rgba(20,30,50,0.18)',
  smooth: false,
  legend: false,
  hoverFill: 'rgba(217,119,6,0.22)',
  hoverBorder: 'rgba(217,119,6,0.85)',
  hoverLine: '#d97706',
  focusFill: 'rgba(15,98,254,0.14)',
  focusBorder: 'rgba(15,98,254,0.7)'
}

const theme = computed(() => (isLight.value ? lightTheme : darkTheme))

const fmtInt = (v: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, v))

const deepestDrawdown = computed(() => drawdownsData.value?.[0] ?? null)
const fmt = (d: string) => formatDate(d, { month: 'short', year: 'numeric' })
const maxDdFront = computed(() => {
  const dd = deepestDrawdown.value
  if (!dd) return null
  return dd.recovery ? `recovered: ${fmt(dd.recovery)}` : 'unrecovered'
})
const maxDdBack = computed(() => {
  const dd = deepestDrawdown.value
  if (!dd) return []
  const rows: { label: string; value: string }[] = [
    { label: 'start', value: fmt(dd.start) },
    { label: 'trough', value: fmt(dd.trough) }
  ]
  if (dd.recovery) rows.push({ label: 'recovered', value: fmt(dd.recovery) })
  return rows
})

interface DisplayHolding {
  ticker: string
  name: string
  weight: number
  chg: number
  value: number
}

const displayHoldings = computed<DisplayHolding[]>(() => {
  const items = holdingsData.value?.items ?? []
  const total = holdingsData.value?.totalMarketValue ?? 0
  if (items.length > 0 && total > 0) {
    return items.map((h) => ({
      ticker: h.ticker,
      name: '',
      weight: h.marketValue / total,
      chg: h.dayChange ?? 0,
      value: h.marketValue
    }))
  }
  const cashValue = heroValue.value
  if (cashValue > 0) {
    return [{ ticker: '$CASH', name: 'Cash and equivalents', weight: 1, chg: 0, value: cashValue }]
  }
  return []
})

const visibleHoldings = computed<DisplayHolding[]>(() =>
  showAllHoldings.value
    ? displayHoldings.value
    : displayHoldings.value.slice(0, HOLDINGS_COLLAPSED_LIMIT)
)
const hiddenHoldingsCount = computed(() =>
  Math.max(0, displayHoldings.value.length - HOLDINGS_COLLAPSED_LIMIT)
)

function metricValue(m: PortfolioStatistic): string {
  if (m.format === 'percent') return formatPercent(m.value)
  return formatNumber(m.value)
}
</script>

<template>
  <main v-if="portfolioData" class="d-main">
    <section class="d-kpis reveal" :style="{ '--d': '80ms' }">
      <KpiCard label="Portfolio value" big>
        <div class="kpi-value">
          <span class="ccy">$</span><span class="num">{{ fmtInt(heroValue) }}</span>
        </div>
        <div class="kpi-sub">
          <span class="chip" :class="heroYtd >= 0 ? 'up' : 'down'">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path :d="heroYtd >= 0 ? 'm5 15 7-7 7 7' : 'm5 9 7 7 7-7'" />
            </svg>
            {{ formatSignedPercent(heroYtd) }}
          </span>
          <span class="muted"
            >YTD · vs. bench
            <strong
              v-if="heroBenchmarkYtd !== null"
              :class="heroBenchmarkYtd >= 0 ? 'up' : 'down'"
              >{{ formatSignedPercent(heroBenchmarkYtd) }}</strong
            ></span
          >
        </div>
      </KpiCard>

      <KpiCard label="1-Year return">
        <div class="kpi-value small" :class="heroOneYear >= 0 ? 'up' : 'down'">
          {{ formatSignedPercent(heroOneYear) }}
        </div>
        <div class="kpi-sub muted">bench {{ formatSignedPercent(0.1471) }}</div>
      </KpiCard>

      <KpiCard label="CAGR">
        <div class="kpi-value small" :class="heroCagr >= 0 ? 'up' : 'down'">
          {{ formatSignedPercent(heroCagr) }}
        </div>
        <div class="kpi-sub muted">since inception</div>
      </KpiCard>

      <FlippableKpi label="Max drawdown">
        <div class="kpi-value small warn">{{ formatPercent(heroMaxDd) }}</div>
        <div class="kpi-sub muted">{{ maxDdFront ?? '—' }}</div>
        <template #back>
          <div class="kpi-dd-rows">
            <div v-for="r in maxDdBack" :key="r.label" class="kpi-dd-row">
              <span class="kpi-dd-lbl">{{ r.label }}</span>
              <span class="kpi-dd-val">{{ r.value }}</span>
            </div>
          </div>
        </template>
      </FlippableKpi>

      <KpiCard label="Sharpe · Sortino">
        <div class="kpi-value small">
          {{ formatNumber(heroSharpe) }} <span class="divider-slash">/</span>
          {{ formatNumber(heroSortino) }}
        </div>
        <div class="kpi-sub muted">rolling 3-yr</div>
      </KpiCard>

      <KpiCard label="Beta · Alpha">
        <div class="kpi-value small">
          {{ formatNumber(heroBeta) }} <span class="divider-slash">/</span>
          {{ formatPercent(heroAlpha) }}
        </div>
        <div class="kpi-sub muted">vs. {{ portfolioData.benchmark }}</div>
      </KpiCard>
    </section>

    <section class="d-chart-row">
      <ValueChart
        :series="chartSeries"
        :drawdowns="(drawdownsData ?? []) as DrawdownRange[]"
        :theme="theme"
        :benchmark-label="portfolioData.benchmark ?? ''"
        :hovered-drawdown="hoveredDrawdown"
        :focused-drawdown="focusedDrawdown"
        class="reveal"
        :style="{ '--d': '160ms' }"
        @update:focused-drawdown="focusedDrawdown = $event"
      />

      <Panel class="holdings-panel reveal" :style="{ '--d': '220ms' }">
        <template #header>
          <div>
            <h2>Holdings</h2>
            <p class="panel-sub">
              {{ displayHoldings.length }} position{{ displayHoldings.length === 1 ? '' : 's' }}
              <template v-if="holdingsData?.date">
                · as of
                {{ formatDate(holdingsData.date, { month: 'short', day: 'numeric' }) }}</template
              >
            </p>
          </div>
          <button class="icon-btn sm" title="View all">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </template>
        <ul class="holdings">
          <li v-for="(h, i) in visibleHoldings" :key="h.ticker" :style="{ '--i': i }">
            <div class="h-top">
              <span class="ticker">{{ h.ticker }}</span>
              <span class="name">{{ h.name }}</span>
              <span class="weight num">{{ formatPercent(h.weight) }}</span>
            </div>
            <AnimatedBar
              :value="h.weight"
              :gradient="'var(--grad-primary-to-gain)'"
              :delay="240 + i * 90"
              :animate="mounted"
              style="margin-top: 6px"
            />
            <div class="h-bot">
              <span class="value num">{{ formatCurrency(h.value) }}</span>
              <span class="chg num" :class="h.chg > 0 ? 'up' : h.chg < 0 ? 'down' : 'muted'">
                {{ h.chg === 0 ? '—' : formatSignedPercent(h.chg) }}
              </span>
            </div>
          </li>
        </ul>
        <button
          v-if="hiddenHoldingsCount > 0"
          class="show-all-btn"
          type="button"
          @click="showAllHoldings = !showAllHoldings"
        >
          {{ showAllHoldings ? 'Show less' : `Show all (${displayHoldings.length})` }}
        </button>
      </Panel>
    </section>

    <section class="d-bottom-row">
      <Panel
        title="Deepest drawdowns"
        subtitle="Peak to trough events"
        class="reveal"
        :style="{ '--d': '280ms' }"
      >
        <ul class="dd-list" :class="{ 'has-focus': focusedDrawdown }">
          <li
            v-for="(d, i) in (drawdownsData ?? []).slice(0, 10)"
            :key="i"
            :style="{ '--i': i }"
            :class="{
              'is-hovered': hoveredDrawdown === d && focusedDrawdown !== d,
              'is-focused': focusedDrawdown === d,
              'is-dimmed': focusedDrawdown && focusedDrawdown !== d
            }"
            role="button"
            tabindex="0"
            @mouseenter="hoveredDrawdown = d"
            @mouseleave="hoveredDrawdown = null"
            @focus="hoveredDrawdown = d"
            @blur="hoveredDrawdown = null"
            @click="toggleFocusDrawdown(d)"
            @keydown.enter.prevent="toggleFocusDrawdown(d)"
            @keydown.space.prevent="toggleFocusDrawdown(d)"
          >
            <span class="dd-rank">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="dd-dot" />
            <div class="dd-body">
              <div class="dd-top">
                <span class="dd-depth num">{{ formatPercent(d.depth) }}</span>
                <span class="dd-status" :class="d.recovery ? 'ok' : 'warn'">
                  <StatusDot :tone="d.recovery ? 'ok' : 'warn'" :pulse="!d.recovery" />
                  {{ d.recovery ? 'Recovered' : 'Active' }}
                </span>
              </div>
              <div class="dd-meta">
                {{ formatDate(d.start, { month: 'short', day: 'numeric', year: 'numeric' }) }}
                <span class="arr">→</span>
                {{
                  d.recovery
                    ? formatDate(d.recovery, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'ongoing'
                }}
                <span class="dd-hint">
                  <span class="dd-cue" v-if="focusedDrawdown === d">focused · click to clear</span>
                  <span class="dd-cue" v-else>click to zoom</span>
                </span>
              </div>
              <AnimatedBar
                :value="Math.min(1, Math.abs(d.depth) / 0.35)"
                :gradient="'var(--grad-gain-to-warn)'"
                :delay="360 + i * 80"
                :animate="mounted"
                style="margin-top: 8px"
              />
            </div>
            <span class="dd-pin" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </li>
        </ul>
      </Panel>

      <Panel
        title="Risk &amp; style metrics"
        subtitle="Trailing statistics"
        class="reveal"
        :style="{ '--d': '340ms' }"
      >
        <div class="d-metrics-grid">
          <div
            v-for="(m, i) in statisticsData ?? []"
            :key="m.label"
            class="dm"
            :style="{ '--i': i }"
          >
            <div class="dm-l">{{ m.label }}</div>
            <div class="dm-v num">{{ metricValue(m) }}</div>
          </div>
        </div>
      </Panel>
    </section>

    <Panel class="d-returns reveal" :style="{ '--d': '400ms' }">
      <template #header>
        <div>
          <h2>Trailing returns</h2>
          <p class="panel-sub">Portfolio vs. benchmark · TWRR / MWRR · tax-adjusted variants</p>
        </div>
        <div class="chip-row">
          <Tag :value="portfolioData.benchmark" severity="warn" />
          <Tag
            :value="'Tax ratio · ' + formatPercent(summaryData?.taxCostRatio ?? 0)"
            severity="secondary"
          />
        </div>
      </template>
      <div class="ret-table-wrap">
        <table class="ret-table">
          <thead>
            <tr>
              <th></th>
              <th>YTD</th>
              <th>1Y</th>
              <th>3Y</th>
              <th>5Y</th>
              <th>10Y</th>
              <th>Inception</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in trailingReturnsData ?? []"
              :key="r.title"
              :class="`v-${r.kind}`"
              :style="{ '--i': i }"
            >
              <th scope="row">{{ r.title }}</th>
              <td class="num">{{ formatPercent(r.ytd) }}</td>
              <td class="num">{{ formatPercent(r.oneYear) }}</td>
              <td class="num">{{ formatPercent(r.threeYear) }}</td>
              <td class="num">{{ formatPercent(r.fiveYear) }}</td>
              <td class="num">{{ formatPercent(r.tenYear) }}</td>
              <td class="num">{{ formatPercent(r.sinceInception) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </main>
</template>

<style scoped>
/* Main */
.d-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* KPIs */
.d-kpis {
  display: grid;
  grid-template-columns: 1.6fr repeat(5, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 2px;
}
.muted {
  color: var(--text-3);
}
.muted strong {
  color: var(--gain);
  font-weight: 600;
}
.muted strong.down {
  color: var(--loss);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 2px;
  font-weight: 500;
  transition: transform 180ms ease;
}
.chip:hover {
  transform: translateY(-1px);
}
.chip.up {
  background: var(--gain-soft-15);
  color: var(--gain);
}
.chip.down {
  background: var(--loss-soft-15);
  color: var(--loss);
}
/* .chip.bench and .chip.neutral replaced by PrimeVue Tag */

/* Chart row */
.d-chart-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 16px;
}
/* Holdings */
.holdings-panel {
  min-height: 0;
}
.holdings-panel .holdings {
  list-style: none;
  padding: 0 6px 0 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}
.holdings-panel .holdings::-webkit-scrollbar {
  width: 6px;
}
.holdings-panel .holdings::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
.holdings li {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  transition: background 180ms ease;
  padding-left: 6px;
  margin-left: -6px;
  border-radius: 2px;
}
.holdings li:hover {
  background: var(--primary-soft-04);
}
.holdings li:last-child {
  border-bottom: none;
}
.h-top {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 10px;
  font-size: 12.5px;
  align-items: baseline;
}
.ticker {
  font-weight: 600;
  color: var(--primary);
}
.name {
  color: var(--text-2);
  font-size: 12px;
}
.weight {
  color: var(--text-1);
  font-weight: 500;
}

.h-bot {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
}
.value {
  color: var(--text-2);
}
.chg.up {
  color: var(--gain);
}
.chg.down {
  color: var(--loss);
}
.chg.muted {
  color: var(--text-5);
}

.show-all-btn {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-2);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease,
    border-color 180ms ease;
}
.show-all-btn:hover {
  background: var(--primary-soft-04);
  color: var(--primary);
  border-color: var(--primary-border);
}
.show-all-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-glow);
}

/* Bottom row */
.d-bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dd-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dd-list li {
  display: grid;
  grid-template-columns: 32px 1px 1fr auto;
  gap: 14px;
  padding: 10px 10px;
  margin: 0 -10px;
  border-bottom: 1px solid var(--border);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    opacity 180ms ease,
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  outline: none;
}
.dd-list li:last-child {
  border-bottom: none;
}
.dd-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: transparent;
  border-radius: 2px;
  transition:
    background 180ms ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-origin: center;
  transform: scaleY(0.4);
}
.dd-list li.is-hovered {
  background: var(--secondary-soft-06);
  border-bottom-color: var(--secondary-border);
}
.dd-list li.is-hovered::before {
  background: var(--secondary);
  transform: scaleY(1);
}
.dd-list li.is-focused {
  background: var(--primary-soft-07);
  border: 1px solid var(--primary-border);
  border-bottom-color: var(--primary-border);
}
.dd-list li.is-focused::before {
  background: var(--primary);
  transform: scaleY(1);
  box-shadow: 0 0 10px var(--primary-glow);
}
.dd-list.has-focus li.is-dimmed {
  opacity: 0.42;
}
.dd-list.has-focus li.is-dimmed:hover {
  opacity: 0.75;
}

.dd-list li:focus-visible {
  box-shadow: 0 0 0 2px var(--primary-glow);
}

.dd-rank {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.08em;
  padding-top: 2px;
  transition: color 180ms ease;
}
.dd-list li.is-hovered .dd-rank {
  color: var(--secondary);
}
.dd-list li.is-focused .dd-rank {
  color: var(--primary);
}

.dd-dot {
  background: var(--border);
  width: 1px;
  height: 100%;
  transition: background 180ms ease;
}
.dd-list li.is-hovered .dd-dot {
  background: var(--secondary);
}
.dd-list li.is-focused .dd-dot {
  background: var(--primary);
}

.dd-body {
  min-width: 0;
}
.dd-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dd-depth {
  font-size: 14px;
  font-weight: 600;
  color: var(--loss);
  font-variant-numeric: tabular-nums;
}
.dd-status {
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.dd-status.ok {
  color: var(--gain);
}
.dd-status.warn {
  color: var(--secondary);
}
.dd-meta {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dd-meta .arr {
  color: var(--text-5);
  margin: 0 6px;
}
.dd-hint {
  margin-left: auto;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-5);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    color 180ms ease;
}
.dd-list li.is-hovered .dd-hint,
.dd-list li.is-focused .dd-hint,
.dd-list li:focus-visible .dd-hint {
  opacity: 1;
  transform: translateX(0);
}
.dd-list li.is-hovered .dd-cue {
  color: var(--secondary);
}
.dd-list li.is-focused .dd-cue {
  color: var(--primary);
}

.dd-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  color: var(--text-5);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    color 180ms ease;
  align-self: center;
}
.dd-list li.is-hovered .dd-pin {
  opacity: 1;
  transform: translateX(0);
  color: var(--secondary);
}
.dd-list li.is-focused .dd-pin {
  opacity: 1;
  transform: translateX(0) rotate(45deg);
  color: var(--primary);
}

/* Metrics grid */
.d-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  margin-top: 0;
}
.dm {
  background: var(--panel);
  padding: 12px 14px;
  transition: background 180ms ease;
}
.dm:hover {
  background: var(--panel-hover);
}
.dm-l {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
  margin-bottom: 6px;
}
.dm-v {
  font-size: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
  font-family: 'IBM Plex Mono', monospace;
}

/* Returns */
.chip-row {
  display: inline-flex;
  gap: 8px;
}

.ret-table-wrap {
  overflow-x: auto;
}
.ret-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.ret-table thead th {
  text-align: right;
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.ret-table thead th:first-child {
  text-align: left;
  width: 38%;
}
.ret-table tbody th {
  font-weight: 500;
  color: var(--text-1);
  text-align: left;
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
}
.ret-table tbody td {
  text-align: right;
  padding: 11px 12px;
  border-bottom: 1px solid var(--border);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}
.ret-table tr.v-portfolio th,
.ret-table tr.v-portfolio td {
  color: var(--text-1);
}
.ret-table tr.v-portfolio td {
  font-weight: 500;
}
.ret-table tr.v-portfolio-tax th,
.ret-table tr.v-portfolio-tax td {
  color: var(--text-2);
  font-style: italic;
}
.ret-table tr.v-benchmark th,
.ret-table tr.v-benchmark td {
  color: var(--secondary);
}
.ret-table tr.v-benchmark-tax th,
.ret-table tr.v-benchmark-tax td {
  color: var(--secondary);
  font-style: italic;
  opacity: 0.75;
}
.ret-table tbody tr {
  transition: background 180ms ease;
}
.ret-table tbody tr:hover {
  background: var(--primary-soft-05);
}

/* up/down helpers */
.up {
  color: var(--gain);
}
.down {
  color: var(--loss);
}
.warn {
  color: var(--secondary);
}

@media (max-width: 1280px) {
  .d-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .d-chart-row {
    grid-template-columns: 1fr;
  }
  .d-bottom-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .d-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .holdings li {
    transition: none !important;
  }
  .dd-list li,
  .dd-list li::before,
  .dd-rank,
  .dd-dot,
  .dd-hint,
  .dd-pin {
    transition: none;
  }
}

.kpi-dd-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 2px;
}

.kpi-dd-row {
  display: flex;
  gap: 5px;
  font-size: 11px;
  line-height: 1.4;
}

.kpi-dd-lbl {
  color: var(--text-4);
  min-width: 62px;
}

.kpi-dd-val {
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
</style>
