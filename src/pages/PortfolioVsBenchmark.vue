<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import KpiCard from '@/components/ui/KpiCard.vue'
import Panel from '@/components/ui/Panel.vue'
import RollingExcessChart from '@/components/charts/RollingExcessChart.vue'
import ReturnDistributionChart from '@/components/charts/ReturnDistributionChart.vue'
import ReturnScatterChart from '@/components/charts/ReturnScatterChart.vue'
import { formatSignedPercent, formatPercent, formatNumber } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioMeasurements } from '@/composables/usePortfolioMeasurements'
import { usePortfolioReturns } from '@/composables/usePortfolioReturns'
import { usePortfolioMetrics } from '@/composables/usePortfolioMetrics'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const measurementsParams = ref({})
const { data: portfolio } = usePortfolio(portfolioId)
const {
  data: measurements,
  isLoading,
  error
} = usePortfolioMeasurements(portfolioId, measurementsParams)
const { data: captureMetrics } = usePortfolioMetrics(portfolioId, {
  metric: 'UpsideCaptureRatio,DownsideCaptureRatio',
  window: 'since_inception'
})
const derived = usePortfolioReturns(measurements)

function captureMetricValue(name: string): number | null {
  const m = captureMetrics.value
  if (!m) return null
  const idx = m.windows.indexOf('since_inception')
  if (idx < 0) return null
  return m.risk?.[name]?.[idx] ?? null
}

const beta = computed(() => derived.value?.regression.beta ?? 0)
const upCapture = computed(() => captureMetricValue('UpsideCaptureRatio'))
const downCapture = computed(() => captureMetricValue('DownsideCaptureRatio'))

const scatterHelpOpen = ref(false)
const excessHelpOpen = ref(false)
const distHelpOpen = ref(false)
</script>

<template>
  <main class="pvb-main">
    <div v-if="isLoading" class="pvb-loading">
      <Skeleton width="100%" height="92px" />
      <Skeleton width="100%" height="320px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load data. {{ (error as Error).message }}
    </div>

    <template v-else-if="derived">
      <section class="pvb-kpis">
        <KpiCard label="Active return (ann.)">
          <div class="kpi-value small" :class="derived.stats.activeReturn >= 0 ? 'up' : 'down'">
            {{ formatSignedPercent(derived.stats.activeReturn) }}
          </div>
        </KpiCard>
        <KpiCard label="Tracking error">
          <div class="kpi-value small">{{ formatSignedPercent(derived.stats.trackingError) }}</div>
        </KpiCard>
        <KpiCard label="Win rate">
          <div class="kpi-value small">{{ formatPercent(derived.stats.winRate) }}</div>
          <div class="kpi-sub muted">months beat benchmark</div>
        </KpiCard>
        <KpiCard label="Up capture">
          <div class="kpi-value small">
            {{ upCapture != null ? (upCapture * 100).toFixed(0) + '%' : '—' }}
          </div>
        </KpiCard>
        <KpiCard label="Down capture">
          <div class="kpi-value small">
            {{ downCapture != null ? (downCapture * 100).toFixed(0) + '%' : '—' }}
          </div>
        </KpiCard>
        <KpiCard label="Beta">
          <div class="kpi-value small">{{ formatNumber(beta) }}</div>
        </KpiCard>
      </section>

      <Panel class="excess-panel">
        <template #header>
          <div>
            <h2>Rolling excess return</h2>
            <p class="panel-sub">
              Annualized return, portfolio minus {{ portfolio?.benchmark ?? 'benchmark' }}, over
              trailing 1Y / 3Y / 5Y windows
            </p>
          </div>
          <button
            type="button"
            class="help-btn"
            aria-label="How to read this chart"
            @click="excessHelpOpen = true"
          >
            <span class="help-icon">ⓘ</span>
            How to read this
          </button>
        </template>
        <RollingExcessChart
          :excess12-m="derived.rolling.excess12M"
          :excess36-m="derived.rolling.excess36M"
          :excess60-m="derived.rolling.excess60M"
        />
      </Panel>

      <Dialog
        v-model:visible="excessHelpOpen"
        modal
        header="How to read rolling excess return"
        :style="{ width: '520px' }"
        :closable="true"
      >
        <ul class="help-body">
          <li>
            <strong>Each line is a rolling window.</strong> On any date, the value is the
            portfolio's compounded return over the prior 12 / 36 / 60 months, minus the benchmark's
            compounded return over the same period.
          </li>
          <li>
            <strong>Above zero = you beat the benchmark over that window.</strong> Below zero = the
            benchmark beat you. The further from zero, the larger the gap.
          </li>
          <li>
            <strong>Shorter windows (1Y) swing more; longer windows (5Y) are smoother.</strong>
            When the 5Y line stays above zero while the 1Y oscillates, you have durable
            outperformance. When only the 1Y line is up, it's a short-term streak that may not last.
          </li>
          <li>Toggle windows on and off to isolate a single horizon when the overlap gets busy.</li>
        </ul>
      </Dialog>

      <div class="pvb-pair">
        <Panel class="dist-panel">
          <template #header>
            <div>
              <h2>Return distribution</h2>
              <p class="panel-sub">Monthly return histogram, portfolio vs. benchmark</p>
            </div>
            <button
              type="button"
              class="help-btn"
              aria-label="How to read this chart"
              @click="distHelpOpen = true"
            >
              <span class="help-icon">ⓘ</span>
              How to read this
            </button>
          </template>
          <ReturnDistributionChart :monthly="derived.monthly" />
        </Panel>

        <Dialog
          v-model:visible="distHelpOpen"
          modal
          header="How to read the return distribution"
          :style="{ width: '520px' }"
          :closable="true"
        >
          <ul class="help-body">
            <li>
              <strong>Each bar counts months</strong> whose return fell into that bucket. Monthly
              returns are grouped into 24 equal-width bins spanning the full range of both series.
            </li>
            <li>
              <strong>Two series overlay the same bins</strong> — portfolio (primary color) and
              {{ portfolio?.benchmark ?? 'benchmark' }} (secondary) — so you can compare shape
              directly.
            </li>
            <li>
              <strong>Shift</strong> (whose distribution is centered further right) tells you who
              delivered higher average monthly returns. <strong>Width</strong> tells you who was
              more volatile — a narrower distribution means more months clustered around the mean.
            </li>
            <li>
              <strong>Tails</strong> are where the story of risk lives. A taller right tail = more
              unusually-good months; a taller left tail = more unusually-bad months. A portfolio
              with a thinner left tail than the benchmark is absorbing downside better.
            </li>
          </ul>
        </Dialog>
        <Panel class="scatter-panel">
          <template #header>
            <div>
              <h2>Return scatter</h2>
              <p class="panel-sub">Portfolio vs. benchmark, monthly</p>
            </div>
            <button
              type="button"
              class="help-btn"
              aria-label="How to read this chart"
              @click="scatterHelpOpen = true"
            >
              <span class="help-icon">ⓘ</span>
              How to read this
            </button>
          </template>
          <ReturnScatterChart :scatter="derived.scatter" :regression="derived.regression" />
        </Panel>

        <Dialog
          v-model:visible="scatterHelpOpen"
          modal
          header="How to read the return scatter"
          :style="{ width: '520px' }"
          :closable="true"
        >
          <ul class="help-body">
            <li>
              <strong>Each dot is one month.</strong> Its x-value is the benchmark's return that
              month; its y-value is your portfolio's return.
            </li>
            <li>
              <strong>Dashed 45° line</strong> = portfolio matched the benchmark exactly. Dots
              <em>above</em> it are months you outperformed; <em>below</em>, you underperformed.
            </li>
            <li>
              <strong>Orange line = regression fit.</strong> Its slope is <strong>β (beta)</strong>:
              β &gt; 1 means you amplified benchmark moves, β &lt; 1 means you dampened them, β &lt;
              0 means you moved against the benchmark.
            </li>
            <li>
              <strong>α (alpha)</strong> is the portfolio's average monthly return at a
              zero-benchmark return — the part not explained by tracking the index.
            </li>
            <li>
              <strong>r²</strong> is how much of the portfolio's variance is explained by the
              benchmark. Close to 1 = tracks the index tightly; close to 0 = moves independently.
            </li>
          </ul>
        </Dialog>
      </div>
    </template>
  </main>
</template>

<style scoped>
.pvb-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.pvb-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pvb-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 2px;
}
.pvb-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
.kpi-sub {
  font-size: 12px;
}
.kpi-sub.muted {
  color: var(--text-3);
}

.scatter-panel :deep(header),
.excess-panel :deep(header),
.dist-panel :deep(header) {
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
  .pvb-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .pvb-pair {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .pvb-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
