<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import KpiCard from '@/components/ui/KpiCard.vue'
import Panel from '@/components/ui/Panel.vue'
import ReturnHeatmap from '@/components/charts/ReturnHeatmap.vue'
import DrawdownCompareChart from '@/components/charts/DrawdownCompareChart.vue'
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
const heatmapHelpOpen = ref(false)
const ddHelpOpen = ref(false)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtMonth(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? ''} ${year}`
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
          <Panel class="heatmap-panel">
            <template #header>
              <div>
                <h2>Monthly returns</h2>
                <p class="panel-sub">Year × month · diverging scale</p>
              </div>
              <button
                type="button"
                class="help-btn"
                aria-label="How to read this chart"
                @click="heatmapHelpOpen = true"
              >
                <span class="help-icon">ⓘ</span>
                How to read this
              </button>
            </template>
            <ReturnHeatmap
              :monthly="derived.monthly"
              :highlighted-year="highlightedYear"
              @year-hover="(y) => (highlightedYear = y)"
            />
          </Panel>

          <Panel class="dd-panel">
            <template #header>
              <div>
                <h2>Drawdown comparison</h2>
                <p class="panel-sub">
                  Portfolio drawdown minus {{ portfolio?.benchmark ?? 'benchmark' }} drawdown ·
                  above zero = held up better
                </p>
              </div>
              <button
                type="button"
                class="help-btn"
                aria-label="How to read this chart"
                @click="ddHelpOpen = true"
              >
                <span class="help-icon">ⓘ</span>
                How to read this
              </button>
            </template>
            <DrawdownCompareChart
              :drawdowns="derived.drawdowns"
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

      <Dialog
        v-model:visible="heatmapHelpOpen"
        modal
        header="How to read the monthly returns heatmap"
        :style="{ width: '520px' }"
        :closable="true"
      >
        <ul class="help-body">
          <li>
            <strong>Each cell is one month's return.</strong> Rows are months Jan–Dec, columns
            are years left to right.
          </li>
          <li>
            <strong>Green = positive, red = negative.</strong> The color always matches the
            sign, so a bad month stays clearly red no matter its magnitude.
          </li>
          <li>
            <strong>Color intensity scales with magnitude.</strong> A big gain is vibrant
            green; a small gain is faint green. Near-zero months are faintly tinted (not
            invisible) so the grid always reads as a full checkerboard.
          </li>
          <li>
            <strong>Hover any cell</strong> for the exact month, year, and percentage. Hover a
            row in the Annual returns rail to highlight that year's column.
          </li>
        </ul>
      </Dialog>

      <Dialog
        v-model:visible="ddHelpOpen"
        modal
        header="How to read the drawdown comparison"
        :style="{ width: '520px' }"
        :closable="true"
      >
        <ul class="help-body">
          <li>
            <strong>Drawdown</strong> is how far a series sits below its running peak. Always
            zero or negative. A −20% drawdown means the portfolio is 20% below its highest
            value to date.
          </li>
          <li>
            This chart plots the <strong>delta</strong>: portfolio drawdown minus
            {{ portfolio?.benchmark ?? 'benchmark' }} drawdown, evaluated at every date.
          </li>
          <li>
            <strong>Above zero (green fill) = portfolio held up better</strong> — it was either
            drawn down less than the benchmark, or it was at a peak while the benchmark was
            falling.
          </li>
          <li>
            <strong>Below zero (red fill) = portfolio fell harder</strong> than the benchmark
            at that moment. Big red stretches are exactly the episodes where holding the index
            would have hurt you less.
          </li>
        </ul>
      </Dialog>
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

.heatmap-panel :deep(header),
.dd-panel :deep(header) {
  align-items: center;
}
.help-btn {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 12px;
  padding: 2px 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 180ms ease;
}
.help-btn:hover {
  color: var(--text-1);
}
.help-icon {
  font-size: 12px;
  opacity: 0.75;
}
.help-body {
  margin: 0;
  padding: 0 0 0 20px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}
.help-body li + li {
  margin-top: 10px;
}
.help-body strong,
.help-body em {
  color: var(--text-1);
  font-style: normal;
  font-weight: 500;
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
