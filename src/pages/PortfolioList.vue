<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import Panel from '@/components/ui/Panel.vue'
import OnboardingWizard from '@/components/portfolio/OnboardingWizard.vue'
import type { PortfolioListItem } from '@/api/endpoints/portfolios'
import { usePortfolioList } from '@/composables/usePortfolioList'
import { formatCurrency, formatPercent, formatDate } from '@/util/format'

const router = useRouter()
const { data: portfolios, isLoading, error } = usePortfolioList()

const showOnboarding = computed(
  () => !isLoading.value && !error.value && (portfolios.value?.length ?? 0) === 0
)

// The OpenAPI schema and the actual server payload disagree on a couple of
// fields on the portfolio list response. Read both spellings.
type ListItemActual = PortfolioListItem & {
  maxDrawDown?: number | null
  updatedAt?: string | null
}

function maxDrawdownOf(p: ListItemActual): number | null {
  return p.maxDrawdown ?? p.maxDrawDown ?? null
}

function lastRefreshOf(p: ListItemActual): string | null {
  return p.lastRunAt ?? p.updatedAt ?? p.lastUpdated ?? null
}

function openPortfolio(id: string) {
  router.push(`/portfolios/${id}`)
}

function createPortfolio() {
  router.push({ name: 'portfolio-create', query: { from: 'portfolios' } })
}
</script>

<template>
  <main class="pl-main">
    <OnboardingWizard v-if="showOnboarding" />

    <template v-else>
      <div class="pl-header">
        <div>
          <h1>Portfolios</h1>
          <p v-if="portfolios?.length" class="pl-sub">{{ portfolios.length }} portfolios</p>
        </div>
        <RouterLink :to="{ name: 'strategy-list' }" class="pl-strategies-link">
          Browse strategies
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </RouterLink>
      </div>

      <div v-if="isLoading" class="pl-loading">
        <Skeleton v-for="n in 4" :key="n" width="100%" height="10rem" />
      </div>
      <div v-else-if="error" class="error-banner" role="alert">
        Could not load portfolios. {{ (error as Error).message }}
      </div>

      <div v-else class="pl-cards">
      <Panel
        v-for="p in portfolios"
        :key="p.slug"
        class="portfolio-card"
        tabindex="0"
        @click="openPortfolio(p.slug)"
        @keydown.enter="openPortfolio(p.slug)"
      >
        <div class="card-top">
          <h2>{{ p.name }}</h2>
          <span class="card-bench">{{ p.benchmark }}</span>
        </div>
        <div class="card-kpis">
          <div class="card-kpi">
            <div class="card-kpi-label">Current value</div>
            <div class="card-kpi-value num">{{ formatCurrency(p.currentValue) }}</div>
          </div>
          <div class="card-kpi">
            <div class="card-kpi-label">YTD</div>
            <div class="card-kpi-value num" :class="(p.ytdReturn ?? 0) >= 0 ? 'up' : 'down'">
              {{ formatPercent(p.ytdReturn ?? 0) }}
            </div>
          </div>
          <div class="card-kpi">
            <div class="card-kpi-label">Max DD</div>
            <div class="card-kpi-value num warn">{{ formatPercent(maxDrawdownOf(p)) }}</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date"
            >Since
            {{
              p.inceptionDate
                ? formatDate(p.inceptionDate, { month: 'short', year: 'numeric' })
                : '—'
            }}</span
          >
          <span class="card-updated">
            Updated
            {{ lastRefreshOf(p) ? formatDate(lastRefreshOf(p)!) : '—' }}
          </span>
        </div>
      </Panel>

      <button class="portfolio-card-new" @click="createPortfolio">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>New portfolio</span>
      </button>
    </div>
    </template>
  </main>
</template>

<style scoped>
.pl-main {
  padding: 24px 0 80px;
}

.pl-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
}
.pl-header h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}
.pl-sub {
  font-size: 13px;
  color: var(--text-3);
}

.pl-strategies-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
  text-decoration: none;
  padding-bottom: 2px;
  transition: opacity 140ms ease;
}
.pl-strategies-link:hover {
  opacity: 0.75;
}

.pl-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pl-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.portfolio-card {
  cursor: pointer;
}
.portfolio-card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.card-top {
  margin-bottom: 14px;
}
.card-top h2 {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.005em;
  margin-bottom: 3px;
}
.card-bench {
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.card-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.card-kpi-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 4px;
}
.card-kpi-value {
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.card-kpi-value.up {
  color: var(--gain);
}
.card-kpi-value.down {
  color: var(--loss);
}
.card-kpi-value.warn {
  color: var(--secondary);
}
.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  font-size: 12px;
  color: var(--text-4);
}

.portfolio-card-new {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 10rem;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 2px;
  color: var(--text-4);
  font: inherit;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 220ms ease,
    color 220ms ease,
    transform 220ms ease,
    box-shadow 220ms ease;
}
.portfolio-card-new:hover {
  border-color: var(--text-3);
  color: var(--text-2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-panel);
}
.portfolio-card-new:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .portfolio-card-new {
    transition: none !important;
  }
}

.error-banner {
  margin: 8px 0;
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
  font-size: 13px;
}
</style>
