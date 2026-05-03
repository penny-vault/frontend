<script setup lang="ts">
import { ref, computed } from 'vue'
import Skeleton from 'primevue/skeleton'
import Panel from '@/components/ui/Panel.vue'
import StrategyScatter from '@/components/charts/StrategyScatter.vue'
import StrategyTable from '@/components/strategies/StrategyTable.vue'
import { useStrategyList } from '@/composables/useStrategyList'
import type { Strategy } from '@/api/endpoints/strategies'

const { data: strategies, isLoading, error } = useStrategyList()

const selected = ref<string | null>(null)
const hovered = ref<string | null>(null)
const query = ref('')

const orderedStrategies = computed<Strategy[]>(() => {
  if (!strategies.value) return []
  return [...strategies.value].sort((a, b) => {
    const aReady = a.installState === 'ready' ? 1 : 0
    const bReady = b.installState === 'ready' ? 1 : 0
    if (aReady !== bReady) return bReady - aReady
    const aCagr = a.cagr ?? -Infinity
    const bCagr = b.cagr ?? -Infinity
    return bCagr - aCagr
  })
})

const filteredStrategies = computed<Strategy[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return orderedStrategies.value
  return orderedStrategies.value.filter((s) => {
    const haystack = [
      s.shortCode,
      s.describe?.name ?? '',
      s.repoOwner,
      s.repoName,
      ...(s.categories ?? [])
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const highlightShortCode = computed(() => hovered.value ?? selected.value)
</script>

<template>
  <main class="sl-main">
    <div class="sl-header">
      <div>
        <h1>Strategies</h1>
      </div>
      <div class="sl-search">
        <svg
          class="sl-search-icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.35-4.35" />
        </svg>
        <input
          v-model="query"
          class="sl-search-input"
          type="text"
          placeholder="Filter by name, code, repo..."
        />
        <button v-if="query" class="sl-search-clear" aria-label="Clear" @click="query = ''">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="sl-loading">
      <Skeleton width="100%" height="3rem" class="mb-3" />
      <Skeleton width="100%" height="20rem" />
    </div>

    <div v-else-if="error" class="error-banner" role="alert">
      Could not load strategies. {{ (error as Error).message }}
    </div>

    <div v-else-if="!orderedStrategies.length" class="sl-empty">No strategies found.</div>

    <div v-else class="sl-layout">
      <section class="sl-table-wrap">
        <StrategyTable
          :strategies="filteredStrategies"
          :selected-short-code="selected"
          :hovered-short-code="hovered"
          @select="selected = $event"
          @hover="hovered = $event"
        />
      </section>

      <aside class="sl-aside">
        <Panel class="sl-scatter-panel">
          <template #header>
            <div>
              <h2>Risk · return</h2>
              <p class="panel-sub">Sortino vs CAGR · bubble = max drawdown</p>
            </div>
          </template>
          <StrategyScatter
            :strategies="filteredStrategies"
            :highlight-short-code="highlightShortCode"
            @select="selected = $event"
            @hover="hovered = $event"
          />
        </Panel>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.sl-main {
  padding: 24px 0 80px;
}
.sl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.sl-header h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}

.sl-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sl-search {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 260px;
}
.sl-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-3);
  pointer-events: none;
}
.sl-search-input {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 28px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}
.sl-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.sl-search-input::placeholder {
  color: var(--text-5);
}
.sl-search-clear {
  position: absolute;
  right: 6px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-4);
  cursor: pointer;
  border-radius: 2px;
  transition: color 140ms ease;
}
.sl-search-clear:hover {
  color: var(--text-1);
}

.sl-empty {
  padding: 80px 24px;
  text-align: center;
  font-size: 15px;
  color: var(--text-3);
}

.sl-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
.sl-table-wrap {
  min-width: 0;
  height: calc(100vh - 96px);
  max-height: 720px;
  min-height: 460px;
  display: flex;
  flex-direction: column;
}
.sl-aside {
  position: sticky;
  top: 64px;
  min-width: 0;
}
.sl-scatter-panel {
  height: calc(100vh - 96px);
  max-height: 720px;
  min-height: 460px;
}

@media (max-width: 880px) {
  .sl-layout {
    grid-template-columns: 1fr;
  }
  .sl-aside {
    position: static;
  }
  .sl-table-wrap,
  .sl-scatter-panel {
    height: 460px;
    max-height: none;
  }
}
</style>
