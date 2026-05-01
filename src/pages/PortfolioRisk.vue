<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import Panel from '@/components/ui/Panel.vue'
import FlippableKpi from '@/components/ui/FlippableKpi.vue'
import SortinoGauge from '@/components/charts/SortinoGauge.vue'
import HoldingsImpactChart from '@/components/charts/HoldingsImpactChart.vue'
import MonthlyContributionChart from '@/components/charts/MonthlyContributionChart.vue'
import CrisisSmallMultiples from '@/components/charts/CrisisSmallMultiples.vue'
import { formatSignedPercent, formatPercent } from '@/util/format'
import { toMonthly, type DailyPoint } from '@/util/returns'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioRisk } from '@/composables/usePortfolioRisk'
import { usePortfolioHoldingsImpact } from '@/composables/usePortfolioHoldingsImpact'
import { usePortfolioSummary } from '@/composables/usePortfolioSummary'
import { usePortfolioDrawdowns } from '@/composables/usePortfolioDrawdowns'
import { usePortfolioMetrics } from '@/composables/usePortfolioMetrics'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: portfolio } = usePortfolio(portfolioId)
const { data: summary } = usePortfolioSummary(portfolioId)
const {
  data: measurements,
  isLoading,
  error
} = usePortfolioMeasurements(
  portfolioId,
  computed(() => ({}))
)
const { data: holdingsImpact } = usePortfolioHoldingsImpact(portfolioId)
const { data: drawdowns } = usePortfolioDrawdowns(portfolioId)
const { data: captureMetrics } = usePortfolioMetrics(portfolioId, {
  metric: 'UpsideCaptureRatio,DownsideCaptureRatio',
  window: 'since_inception'
})
const derived = usePortfolioRisk(portfolio, measurements, drawdowns)

const capture = computed(() => {
  const m = captureMetrics.value
  const idx = m ? m.windows.indexOf('since_inception') : -1
  if (!m || idx < 0) return derived.value?.capture ?? { up: null, down: null }
  return {
    up: m.risk?.['UpsideCaptureRatio']?.[idx] ?? null,
    down: m.risk?.['DownsideCaptureRatio']?.[idx] ?? null
  }
})

const sortinoValue = computed(() => summary.value?.sortino ?? 0)
const winRate = computed(() => {
  const d = derived.value
  if (!d || d.winLoss.total === 0) return 0
  return d.winLoss.positive / d.winLoss.total
})

const monthlyReturns = computed(() => {
  const pts = measurements.value?.points ?? []
  const days: DailyPoint[] = pts.map((p) => ({
    date: p.date,
    portfolioValue: p.portfolioValue,
    benchmarkValue: p.benchmarkValue
  }))
  return toMonthly(days)
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
      <section class="prr-kpis">
        <FlippableKpi label="Sortino ratio">
          <div class="kpi-value small">{{ sortinoValue.toFixed(2) }}</div>
          <div class="prr-sortino-gauge">
            <SortinoGauge :sortino="sortinoValue" />
          </div>
        </FlippableKpi>
        <FlippableKpi label="Max drawdown">
          <div class="kpi-value small down">
            {{ formatSignedPercent(derived.verdict.maxDd) }}
          </div>
        </FlippableKpi>
        <FlippableKpi label="Volatility (ann.)">
          <div class="kpi-value small">{{ (derived.verdict.portfolioVol * 100).toFixed(1) }}%</div>
          <div class="kpi-sub muted">
            bench {{ (derived.verdict.benchmarkVol * 100).toFixed(1) }}%
          </div>
        </FlippableKpi>
        <FlippableKpi label="Up capture">
          <div class="kpi-value small">
            {{ capture.up != null ? (capture.up * 100).toFixed(0) + '%' : '—' }}
          </div>
          <template #back>
            <div class="prr-back">
              <p class="prr-back-main">
                <strong>{{
                  capture.up != null ? (capture.up * 100).toFixed(0) + '%' : '—'
                }}</strong>
                of benchmark gains
              </p>
              <p v-if="capture.up != null" class="prr-back-example">
                bench +10% → you +{{ (10 * capture.up).toFixed(1) }}%
              </p>
              <p class="prr-back-rule">higher = beat the index in rallies</p>
            </div>
          </template>
        </FlippableKpi>
        <FlippableKpi label="Down capture">
          <div class="kpi-value small">
            {{ capture.down != null ? (capture.down * 100).toFixed(0) + '%' : '—' }}
          </div>
          <template #back>
            <div class="prr-back">
              <p class="prr-back-main">
                <strong>{{
                  capture.down != null ? (capture.down * 100).toFixed(0) + '%' : '—'
                }}</strong>
                of benchmark losses
              </p>
              <p v-if="capture.down != null" class="prr-back-example">
                bench −10% → you −{{ (10 * capture.down).toFixed(1) }}%
              </p>
              <p class="prr-back-rule">lower = cushioned in selloffs</p>
            </div>
          </template>
        </FlippableKpi>
        <FlippableKpi label="% positive months">
          <div class="kpi-value small">{{ formatPercent(winRate) }}</div>
          <div class="kpi-sub muted">
            {{ derived.winLoss.positive }} of {{ derived.winLoss.total }}
          </div>
        </FlippableKpi>
      </section>

      <div class="prr-concentration-row">
        <Panel class="prr-panel">
          <template #header>
            <div>
              <h2>Concentration by holding</h2>
              <p class="panel-sub">
                Each holding's contribution to the period's return. Click a row to see how the
                annualized return changes without it.
              </p>
            </div>
          </template>
          <HoldingsImpactChart v-if="holdingsImpact" :impact="holdingsImpact" />
          <div v-else class="prr-placeholder">Holdings impact not available.</div>
        </Panel>

        <Panel class="prr-panel">
          <template #header>
            <div>
              <h2>Concentration by period</h2>
              <p class="panel-sub">
                The best and worst periods by return. Click a row to remove that period and see the
                impact on annualized return.
              </p>
            </div>
          </template>
          <MonthlyContributionChart :monthly="monthlyReturns" />
        </Panel>
      </div>

      <section class="prr-crisis-section">
        <header class="prr-section-head">
          <div>
            <h2>Crisis behavior</h2>
            <p class="panel-sub">Known market crises in this period.</p>
          </div>
          <div class="prr-legend" aria-hidden="true">
            <span class="prr-legend-item">
              <span class="prr-legend-swatch prr-legend-portfolio"></span>
              portfolio
            </span>
            <span class="prr-legend-item">
              <span class="prr-legend-swatch prr-legend-benchmark"></span>
              benchmark
            </span>
          </div>
        </header>
        <CrisisSmallMultiples :episodes="derived.crisisEpisodes" />
      </section>
    </template>
  </main>
</template>

<style scoped>
.prr-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.prr-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.prr-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 2px;
  align-items: stretch;
}
.prr-crisis-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prr-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.prr-legend {
  display: inline-flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-3);
}
.prr-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.prr-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 2px;
  border-radius: 1px;
}
.prr-legend-portfolio {
  background: var(--primary);
  height: 2.5px;
}
.prr-legend-benchmark {
  background: var(--secondary);
}
.prr-section-head .panel-sub {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}
.prr-section-head h2 {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.prr-panel :deep(header) {
  align-items: center;
}
.prr-sortino-gauge {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 72px;
}
.prr-back {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}
.prr-back-main {
  font-size: 12px;
  line-height: 1.35;
  color: var(--text-2);
}
.prr-back-main strong {
  color: var(--text-1);
  font-weight: 500;
}
.prr-back-example {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.prr-back-rule {
  font-size: 10px;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.prr-placeholder {
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}
.prr-concentration-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}
@media (max-width: 1100px) {
  .prr-concentration-row {
    grid-template-columns: 1fr;
  }
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
  .prr-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 720px) {
  .prr-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
