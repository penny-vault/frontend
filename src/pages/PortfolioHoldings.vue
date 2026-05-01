<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import HoldingsHistoryGrid from '@/components/holdings/HoldingsHistoryGrid.vue'
import HoldingsDetailPanel from '@/components/holdings/HoldingsDetailPanel.vue'
import HoldingsFrequencyChart from '@/components/holdings/HoldingsFrequencyChart.vue'
import HoldingsCalculatorDialog from '@/components/holdings/HoldingsCalculatorDialog.vue'
import { usePortfolioHoldingsHistory } from '@/composables/usePortfolioHoldingsHistory'
import { buildJustificationColumns, entriesToCsv } from '@/util/holdings'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: history, isLoading, error } = usePortfolioHoldingsHistory(portfolioId)

const selectedTimestamp = ref<string | null>(null)
const hoveredTicker = ref<string | null>(null)
const calculatorOpen = ref(false)

watchEffect(() => {
  if (selectedTimestamp.value) return
  const items = history.value?.items ?? []
  if (items.length > 0) {
    selectedTimestamp.value = items[items.length - 1]!.timestamp
  }
})

const selectedEntry = computed(() => {
  const items = history.value?.items ?? []
  return items.find((e) => e.timestamp === selectedTimestamp.value) ?? null
})

function onSelectEntry(timestamp: string) {
  selectedTimestamp.value = timestamp
}

function onHoverTicker(ticker: string | null) {
  hoveredTicker.value = ticker
}

function downloadCsv() {
  if (!history.value) return
  const keys = buildJustificationColumns(history.value.items)
  const csv = entriesToCsv(history.value.items, keys)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${portfolioId.value ?? 'portfolio'}-holdings.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main class="ph-main">
    <div v-if="isLoading" class="ph-loading">
      <Skeleton width="100%" height="520px" />
      <div class="ph-loading-side">
        <Skeleton width="100%" height="240px" />
        <Skeleton width="100%" height="240px" />
      </div>
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load holdings. {{ (error as Error).message }}
    </div>
    <div v-else-if="history" class="ph-grid">
      <div class="ph-left">
        <HoldingsHistoryGrid
          :entries="history.items"
          :selected-timestamp="selectedTimestamp"
          @select-entry="onSelectEntry"
        />
        <Button
          class="ph-export"
          icon="pi pi-download"
          text
          rounded
          size="small"
          aria-label="Export CSV"
          title="Export CSV"
          @click="downloadCsv"
        />
      </div>
      <div class="ph-right">
        <HoldingsDetailPanel
          :entry="selectedEntry"
          :hovered-ticker="hoveredTicker"
          @open-calculator="calculatorOpen = true"
        />
        <HoldingsFrequencyChart
          :entries="history.items"
          @hover-ticker="onHoverTicker"
        />
      </div>
    </div>

    <HoldingsCalculatorDialog
      v-model:open="calculatorOpen"
      :entry="selectedEntry"
    />
  </main>
</template>

<style scoped>
.ph-main {
  padding: 8px 0 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ph-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  grid-template-rows: 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}
.ph-left {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.ph-left :deep(.revo-wrap) {
  flex: 1;
  min-height: 0;
}
.ph-export {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}
.ph-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}
.ph-loading {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 20px;
}
.ph-loading-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.error-banner {
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
}
@media (max-width: 1023px) {
  .ph-grid,
  .ph-loading {
    grid-template-columns: 1fr;
  }
}
</style>
