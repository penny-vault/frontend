<script setup lang="ts">
import { computed, ref, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import TabBar from '@/components/ui/TabBar.vue'
import RecalculatingPanel from '@/components/portfolio/RecalculatingPanel.vue'
import StrategyDescriptionDialog from '@/components/portfolio/StrategyDescriptionDialog.vue'
import { formatDate } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioSummary } from '@/composables/usePortfolioSummary'

const strategyDialogOpen = ref(false)

const route = useRoute()

const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: portfolio, isLoading, error } = usePortfolio(portfolioId)

// One snapshot-reading query at the layout level so any tab transition into
// a portfolio detects a missing-snapshot recompute. Vue Query dedups, so the
// PortfolioSummary page sees the same cache entry without a second request.
const {
  recalcInfo: summaryRecalcInfo,
  runStatus: summaryRunStatus,
  isRecalculating: summaryIsRecalculating,
  error: summaryError
} = usePortfolioSummary(portfolioId)
const showRecalc = computed(
  () => summaryIsRecalculating.value && route.name !== 'portfolio-settings'
)
const summaryErrorMessage = computed(() => summaryError.value?.message ?? null)

watchEffect(() => {
  document.title = portfolio.value ? `Penny Vault - ${portfolio.value.name}` : 'Penny Vault'
})

onUnmounted(() => {
  document.title = 'Penny Vault'
})

const tabs = computed(() => {
  const id = portfolioId.value
  if (!id) return []
  return [
    { label: 'Overview', to: `/portfolios/${id}` },
    { label: 'Returns', to: `/portfolios/${id}/returns` },
    { label: 'vs. Benchmark', to: `/portfolios/${id}/vs-benchmark` },
    { label: 'Risk', to: `/portfolios/${id}/risk` },
    { label: 'Holdings', to: `/portfolios/${id}/holdings` },
    { label: 'Transactions', to: `/portfolios/${id}/transactions` },
    { label: 'Settings', to: `/portfolios/${id}/settings` }
  ]
})
</script>

<template>
  <div v-if="isLoading" class="pl-loading">
    <Skeleton width="40%" height="2rem" class="mb-2" />
    <Skeleton width="25%" height="1rem" />
  </div>
  <div v-else-if="error" class="error-banner" role="alert">
    Could not load portfolio. {{ (error as Error).message }}
  </div>

  <div v-if="portfolio" class="pl-header">
    <div class="pl-title-row">
      <div class="pl-title-line">
        <h1>{{ portfolio.name }}</h1>
        <button
          type="button"
          class="pl-info-btn"
          aria-label="About this strategy"
          title="About this strategy"
          @click="strategyDialogOpen = true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
      <div class="pl-meta">
        <span v-if="portfolio.startDate" class="meta">
          Inception:
          {{ formatDate(portfolio.startDate, { month: 'long', day: 'numeric', year: 'numeric' }) }}
        </span>
        <span class="meta">
          Last updated:
          {{
            formatDate(portfolio.lastRunAt ?? portfolio.updatedAt, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          }}
        </span>
      </div>
    </div>
    <TabBar :tabs="tabs" class="pl-tabs" />
  </div>

  <StrategyDescriptionDialog
    v-if="portfolio"
    v-model:visible="strategyDialogOpen"
    :strategy-code="portfolio.strategyCode ?? null"
    :portfolio-parameters="portfolio.parameters ?? null"
  />

  <RecalculatingPanel
    v-if="portfolio && showRecalc && summaryRecalcInfo"
    :info="summaryRecalcInfo"
    :run-status="summaryRunStatus"
    :error="summaryErrorMessage"
  />
  <router-view v-else-if="portfolio" :key="$route.fullPath" />
</template>

<style scoped>
.pl-header {
  padding-top: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.pl-title-row {
  min-width: 0;
}
.pl-title-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.pl-title-line h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin: 0;
}
.pl-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}
.pl-info-btn:hover {
  color: var(--primary);
  border-color: var(--primary-border);
  background: var(--primary-soft-04);
}
.pl-info-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-glow);
}
.pl-tabs {
  margin-top: 0;
  flex-shrink: 0;
}
.pl-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.pl-meta .meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}

@media (max-width: 720px) {
  .pl-header {
    position: sticky;
    top: 48px;
    z-index: 9;
    padding-top: 10px;
    padding-bottom: 10px;
    margin-bottom: 12px;
    gap: 8px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .pl-title-line {
    margin-bottom: 4px;
  }
  .pl-title-line h1 {
    font-size: 20px;
  }
  .pl-info-btn {
    width: 22px;
    height: 22px;
  }
  .pl-meta .meta {
    font-size: 11px;
  }
  .pl-tabs {
    width: 100%;
  }
}

.pl-loading {
  padding: 24px 0;
}
.error-banner {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-1);
}
</style>
