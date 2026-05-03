<script setup lang="ts">
import { computed, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import TabBar from '@/components/ui/TabBar.vue'
import RecalculatingPanel from '@/components/portfolio/RecalculatingPanel.vue'
import { formatDate } from '@/util/format'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioSummary } from '@/composables/usePortfolioSummary'

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
    { label: 'Factors', to: `/portfolios/${id}/factors` },
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
      <h1>{{ portfolio.name }}</h1>
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
.pl-title-row h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
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
