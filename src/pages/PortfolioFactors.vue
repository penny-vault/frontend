<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import Panel from '@/components/ui/Panel.vue'
import FactorExposuresChart from '@/components/charts/FactorExposuresChart.vue'
import FactorAttributionWaterfall from '@/components/charts/FactorAttributionWaterfall.vue'
import FactorVarianceBar from '@/components/charts/FactorVarianceBar.vue'
import FactorDrilldown from '@/components/charts/FactorDrilldown.vue'
import { usePortfolioFactors } from '@/composables/usePortfolioFactors'
import type { FactorKey, FactorPeriodKey } from '@/api/endpoints/portfolios'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data, isLoading, error } = usePortfolioFactors(portfolioId)

const selectedPeriodKey = ref<FactorPeriodKey>('1y')
const selectedFactor = ref<FactorKey>('market')
// Separate "hovered" to distinguish hover-reveal from sticky-select.
const hoveredFactor = ref<FactorKey | null>(null)

const period = computed(() => {
  const periods = data.value?.periods ?? []
  return periods.find((p) => p.period === selectedPeriodKey.value) ?? periods[0] ?? null
})

// Alpha as the visual residual: total − sum(factor contributions). Keeps
// the waterfall balanced even when the fixture's nominal alpha and factor
// contribs are set independently.
const derivedAlpha = computed(() => {
  const p = period.value
  if (!p) return 0
  const sum = p.factors.reduce((s, f) => s + f.returnContribution, 0)
  return p.totalReturn - sum
})

const focusedKey = computed<FactorKey>(() => hoveredFactor.value ?? selectedFactor.value)

const focusedLoading = computed(() => {
  const p = period.value
  if (!p) return null
  return p.factors.find((f) => f.factor === focusedKey.value) ?? p.factors[0] ?? null
})

watch(selectedPeriodKey, () => {
  // If the picked factor somehow isn't in the new period, reset.
  const p = period.value
  if (!p) return
  if (!p.factors.some((f) => f.factor === selectedFactor.value)) {
    selectedFactor.value = p.factors[0]?.factor ?? 'market'
  }
})

function handleSelect(key: FactorKey): void {
  selectedFactor.value = key
}
function handleHover(key: FactorKey | null): void {
  hoveredFactor.value = key
}
function handleWaterfallFocus(key: FactorKey | null): void {
  hoveredFactor.value = key
  if (key) selectedFactor.value = key
}
function handleVarianceFocus(key: FactorKey | null): void {
  hoveredFactor.value = key
  if (key) selectedFactor.value = key
}

const periodOptions: { key: FactorPeriodKey; label: string }[] = [
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: 'inception', label: 'Since inception' }
]
</script>

<template>
  <main class="pf-main">
    <div v-if="isLoading" class="pf-loading">
      <Skeleton width="100%" height="120px" />
      <Skeleton width="100%" height="320px" />
      <Skeleton width="100%" height="200px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load factor data. {{ (error as Error).message }}
    </div>

    <template v-else-if="period">
      <header class="pf-header">
        <div class="pf-intro">
          <h2 class="pf-kicker">Factor analysis</h2>
          <p class="pf-lede">
            Where returns and risk actually come from — six systematic tilts, and the unexplained
            residual (alpha) that's down to stock picking.
          </p>
        </div>
        <div class="pf-period" role="tablist" aria-label="Factor analysis period">
          <button
            v-for="opt in periodOptions"
            :key="opt.key"
            type="button"
            role="tab"
            :aria-selected="opt.key === selectedPeriodKey"
            class="pf-period-btn"
            :class="{ 'pf-period-btn-active': opt.key === selectedPeriodKey }"
            @click="selectedPeriodKey = opt.key"
          >
            {{ opt.label }}
          </button>
        </div>
      </header>

      <Panel class="pf-panel">
        <template #header>
          <div>
            <h2>Exposures</h2>
            <p class="panel-sub">
              Each factor loading vs the benchmark. Circle = your portfolio; tick = benchmark. Dim
              circles are statistically weak (|t| &lt; 2).
            </p>
          </div>
        </template>
        <div class="pf-exposures-grid">
          <FactorExposuresChart
            :factors="period.factors"
            :selected-factor="focusedKey"
            @select="handleSelect"
            @hover="handleHover"
          />
          <div class="pf-drilldown">
            <FactorDrilldown v-if="focusedLoading" :loading="focusedLoading" />
          </div>
        </div>
      </Panel>

      <div class="pf-row">
        <Panel class="pf-panel">
          <template #header>
            <div>
              <h2>What earned the return</h2>
              <p class="panel-sub">
                Each factor's contribution to total return (β × factor return). The residual is
                alpha — what isn't explained by these tilts.
              </p>
            </div>
          </template>
          <FactorAttributionWaterfall
            :factors="period.factors"
            :alpha="derivedAlpha"
            :total-return="period.totalReturn"
            :selected-factor="focusedKey"
            @select="handleWaterfallFocus"
          />
        </Panel>

        <Panel class="pf-panel">
          <template #header>
            <div>
              <h2>What moves the portfolio</h2>
              <p class="panel-sub">
                Share of return variance explained by each factor. Idiosyncratic is the unexplained
                slice — specific to individual holdings.
              </p>
            </div>
          </template>
          <FactorVarianceBar
            :factors="period.factors"
            :idiosyncratic-share="period.idiosyncraticShare"
            :r-squared="period.rSquared"
            :selected-factor="focusedKey"
            @select="handleVarianceFocus"
          />
        </Panel>
      </div>

      <p class="pf-methodology">
        Exposures estimated via rolling OLS regression of monthly excess returns on six-factor
        returns over the selected period. Benchmark loadings are the benchmark's own factor fit;
        "active" is portfolio − benchmark. Treat factor loadings with |t|&lt;2 as noise.
      </p>
    </template>
  </main>
</template>

<style scoped>
.pf-main {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.pf-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pf-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}
.pf-intro {
  max-width: 64ch;
}
.pf-kicker {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--text-1);
}
.pf-lede {
  font-size: 13px;
  color: var(--text-3);
  margin-top: 4px;
  line-height: 1.5;
}
.pf-period {
  display: inline-flex;
  gap: 2px;
  background: var(--border);
  padding: 2px;
  border-radius: 3px;
}
.pf-period-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  cursor: pointer;
  border-radius: 2px;
  transition:
    background 160ms ease,
    color 160ms ease;
}
.pf-period-btn:hover {
  color: var(--text-1);
}
.pf-period-btn-active {
  background: var(--panel);
  color: var(--text-1);
}
.pf-exposures-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
@media (max-width: 1100px) {
  .pf-exposures-grid {
    grid-template-columns: 1fr;
  }
}
.pf-drilldown {
  padding: 4px 0 4px 8px;
  border-left: 1px solid var(--border);
}
@media (max-width: 1100px) {
  .pf-drilldown {
    padding: 16px 0 0 0;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
.pf-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: stretch;
}
@media (max-width: 1100px) {
  .pf-row {
    grid-template-columns: 1fr;
  }
}
.pf-methodology {
  font-size: 11px;
  color: var(--text-4);
  line-height: 1.55;
  max-width: 76ch;
  margin: 0;
}
.error-banner {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
}
</style>
