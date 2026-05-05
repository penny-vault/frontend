<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import Tag from 'primevue/tag'
import Panel from '@/components/ui/Panel.vue'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import FlippableKpi from '@/components/ui/FlippableKpi.vue'
import ValueChart from '@/components/charts/ValueChart.vue'
import type { DrawdownRange } from '@/util/chart'
import {
  formatCurrency,
  formatCurrencyCents,
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
import { usePortfolioTransactions } from '@/composables/usePortfolioTransactions'
import type {
  GetTransactionsParams,
  PortfolioStatistic,
  Transaction,
  TransactionType
} from '@/api/endpoints/portfolios'

const showAllHoldings = ref(false)
const HOLDINGS_COLLAPSED_LIMIT = 5

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

const transactionsParams = ref<GetTransactionsParams>({})
const { data: transactionsData } = usePortfolioTransactions(portfolioId, transactionsParams)

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  interest: 'Interest',
  fee: 'Fee',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  split: 'Split',
  journal: 'Journal'
}

const recentTransactions = computed<Transaction[]>(() => {
  const items = transactionsData.value?.items ?? []
  return [...items]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.batchId - a.batchId))
    .slice(0, 5)
})

function txAmountClass(t: Transaction): string {
  const a = t.amount ?? 0
  if (a > 0) return 'up'
  if (a < 0) return 'down'
  return 'muted'
}

function txDirClass(v: number): string {
  if (v > 0) return 'up'
  if (v < 0) return 'down'
  return 'muted'
}

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
const heroBenchmarkOneYear = computed(
  () => trailingReturnsData.value?.find((r) => r.kind === 'benchmark')?.oneYear ?? null
)
const heroCagr = computed(() => summaryData.value?.cagrSinceInception ?? 0)
const heroMaxDd = computed(() => summaryData.value?.maxDrawDown ?? 0)
const heroSharpe = computed(() => summaryData.value?.sharpe ?? 0)
const heroSortino = computed(() => summaryData.value?.sortino ?? 0)
const heroBeta = computed(() => summaryData.value?.beta ?? 0)
const heroAlpha = computed(() => summaryData.value?.alpha ?? 0)

// Page-level mounted flag for AnimatedBar animations
const mounted = useMounted(60)

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
const singleHolding = computed<DisplayHolding | null>(() =>
  displayHoldings.value.length === 1 ? (displayHoldings.value[0] ?? null) : null
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
        <div class="kpi-sub muted">
          <template v-if="heroBenchmarkOneYear !== null">
            bench {{ formatSignedPercent(heroBenchmarkOneYear) }}
          </template>
        </div>
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

    <Panel class="d-returns reveal" :style="{ '--d': '140ms' }">
      <template #header>
        <div>
          <h2>Trailing returns</h2>
          <p class="panel-sub">Portfolio and benchmark, with after-tax variants</p>
        </div>
        <div class="chip-row">
          <Tag
            :value="'Benchmark · ' + portfolioData.benchmark"
            severity="warn"
            :title="'Benchmark index used for comparison'"
          />
          <Tag
            :value="'Tax cost ratio · ' + formatPercent(summaryData?.taxCostRatio ?? 0)"
            severity="secondary"
            :title="'Annualized percentage of return lost to taxes (since inception)'"
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

    <section class="d-chart-row">
      <ValueChart
        :series="chartSeries"
        :drawdowns="(drawdownsData ?? []) as DrawdownRange[]"
        :theme="theme"
        :benchmark-label="portfolioData.benchmark ?? ''"
        class="reveal"
        :style="{ '--d': '200ms' }"
      />

      <Panel class="holdings-panel reveal" :style="{ '--d': '260ms' }">
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
          <RouterLink
            v-if="portfolioId"
            :to="{ name: 'portfolio-holdings', params: { id: portfolioId } }"
            class="icon-btn sm"
            title="View all holdings"
            aria-label="View all holdings"
          >
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
          </RouterLink>
        </template>

        <div v-if="singleHolding" class="holdings-hero">
          <div class="hero-top">
            <span class="hero-ticker">{{ singleHolding.ticker }}</span>
            <span class="hero-chg num" :class="txDirClass(singleHolding.chg)">
              {{ singleHolding.chg === 0 ? '—' : formatSignedPercent(singleHolding.chg) }}
            </span>
          </div>
          <div class="hero-value num">{{ formatCurrency(singleHolding.value) }}</div>
          <div class="hero-meta">
            {{ formatPercent(singleHolding.weight) }} of portfolio
            <template v-if="singleHolding.name"> · {{ singleHolding.name }}</template>
          </div>
        </div>

        <template v-else>
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
                <span class="chg num" :class="txDirClass(h.chg)">
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
        </template>
      </Panel>
    </section>

    <section class="d-bottom-row">
      <Panel
        title="Risk &amp; style metrics"
        subtitle="Trailing statistics"
        class="reveal"
        :style="{ '--d': '320ms' }"
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

      <Panel class="reveal" :style="{ '--d': '380ms' }">
        <template #header>
          <div>
            <h2>Recent activity</h2>
            <p class="panel-sub">Latest portfolio actions</p>
          </div>
          <RouterLink
            v-if="portfolioId"
            :to="{ name: 'portfolio-transactions', params: { id: portfolioId } }"
            class="icon-btn sm"
            title="View all transactions"
            aria-label="View all transactions"
          >
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
          </RouterLink>
        </template>
        <ul v-if="recentTransactions.length > 0" class="activity-list">
          <li
            v-for="(t, i) in recentTransactions"
            :key="`${t.batchId}-${t.date}-${t.ticker ?? ''}-${i}`"
            :style="{ '--i': i }"
          >
            <span class="act-date">{{
              formatDate(t.date + 'T12:00:00Z', {
                timeZone: 'America/New_York',
                month: 'short',
                day: 'numeric'
              })
            }}</span>
            <span class="act-type" :class="`tx-${t.type}`">{{
              TRANSACTION_TYPE_LABELS[t.type]
            }}</span>
            <span class="act-ticker">{{ t.ticker || '—' }}</span>
            <span class="act-amount num" :class="txAmountClass(t)">
              {{ t.amount != null ? formatCurrencyCents(t.amount) : '—' }}
            </span>
          </li>
        </ul>
        <div v-else class="activity-empty">No transactions yet.</div>
      </Panel>
    </section>
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

/* Holdings hero (single-holding case) */
.holdings-hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 4px 8px;
}
.hero-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.hero-ticker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--primary);
}
.hero-chg {
  font-size: 14px;
  font-weight: 500;
}
.hero-value {
  font-size: 26px;
  font-weight: 500;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  font-family: 'IBM Plex Mono', monospace;
  line-height: 1.1;
}
.hero-meta {
  font-size: 12px;
  color: var(--text-3);
}

/* Bottom row */
.d-bottom-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
}

/* Recent activity */
.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.activity-list li {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 10px 4px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.activity-list li:last-child {
  border-bottom: none;
}
.act-date {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  color: var(--text-3);
  letter-spacing: 0.04em;
  min-width: 54px;
}
.act-type {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 2px;
  background: var(--panel-hover);
  color: var(--text-2);
}
.act-type.tx-buy {
  background: var(--gain-soft-15);
  color: var(--gain);
}
.act-type.tx-sell {
  background: var(--loss-soft-15);
  color: var(--loss);
}
.act-type.tx-dividend,
.act-type.tx-interest {
  background: var(--primary-soft-07);
  color: var(--primary);
}
.act-ticker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-1);
}
.act-amount {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.act-amount.up {
  color: var(--gain);
}
.act-amount.down {
  color: var(--loss);
}
.act-amount.muted {
  color: var(--text-5);
}
.activity-empty {
  font-size: 12.5px;
  color: var(--text-3);
  padding: 20px 4px;
  text-align: center;
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
  align-items: center;
  flex-wrap: wrap;
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
