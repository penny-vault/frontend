<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/util/format'

const props = defineProps<{
  entry: HoldingsHistoryEntry | null
  hoveredTicker: string | null
}>()

const emit = defineEmits<{
  'open-calculator': []
}>()

const dateLabel = computed(() =>
  props.entry
    ? formatDate(props.entry.timestamp, {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '—'
)

type SortKey = 'ticker' | 'quantity' | 'weight' | 'value'
type SortDir = 'asc' | 'desc'

const defaultDir: Record<SortKey, SortDir> = {
  ticker: 'asc',
  quantity: 'desc',
  weight: 'desc',
  value: 'desc'
}

const sortKey = ref<SortKey>('weight')
const sortDir = ref<SortDir>('desc')

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = defaultDir[key]
}

function ariaSort(key: SortKey): 'none' | 'ascending' | 'descending' {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const rows = computed(() => {
  if (!props.entry) return []
  const total = props.entry.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
  const items = props.entry.items.map((i) => ({
    ...i,
    weight: total > 0 ? i.lastTradeValue / total : 0
  }))
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  items.sort((a, b) => {
    if (key === 'ticker') return a.ticker.localeCompare(b.ticker) * dir
    if (key === 'quantity') return (a.quantity - b.quantity) * dir
    if (key === 'weight') return (a.weight - b.weight) * dir
    return (a.lastTradeValue - b.lastTradeValue) * dir
  })
  return items
})
</script>

<template>
  <section class="hdp">
    <header class="hdp-header">
      <div class="hdp-title">
        Holdings detail for <span class="hdp-date">{{ dateLabel }}</span>
        <span v-if="rows.length" class="hdp-count">
          · {{ rows.length }} {{ rows.length === 1 ? 'position' : 'positions' }}
        </span>
      </div>
      <Button
        icon="pi pi-calculator"
        text
        size="small"
        aria-label="Open holdings calculator"
        @click="emit('open-calculator')"
      />
    </header>
    <div class="hdp-table">
      <div class="hdp-head" role="row">
        <button
          type="button"
          class="hdp-h"
          :class="{ active: sortKey === 'ticker' }"
          :aria-sort="ariaSort('ticker')"
          @click="setSort('ticker')"
        >
          <span>Ticker</span>
          <i
            v-if="sortKey === 'ticker'"
            :class="['pi', sortDir === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill']"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="hdp-h num"
          :class="{ active: sortKey === 'quantity' }"
          :aria-sort="ariaSort('quantity')"
          @click="setSort('quantity')"
        >
          <span>Shares</span>
          <i
            v-if="sortKey === 'quantity'"
            :class="['pi', sortDir === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill']"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="hdp-h num"
          :class="{ active: sortKey === 'weight' }"
          :aria-sort="ariaSort('weight')"
          @click="setSort('weight')"
        >
          <span>%</span>
          <i
            v-if="sortKey === 'weight'"
            :class="['pi', sortDir === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill']"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="hdp-h num"
          :class="{ active: sortKey === 'value' }"
          :aria-sort="ariaSort('value')"
          @click="setSort('value')"
        >
          <span>Value</span>
          <i
            v-if="sortKey === 'value'"
            :class="['pi', sortDir === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill']"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        v-for="p in rows"
        :key="p.ticker"
        class="hdp-row"
        :class="{ highlighted: hoveredTicker === p.ticker }"
      >
        <div class="hdp-ticker">{{ p.ticker }}</div>
        <div class="num">{{ p.quantity > 0 ? formatNumber(p.quantity) : '—' }}</div>
        <div class="num">{{ p.lastTradeValue > 0 ? formatPercent(p.weight) : '—' }}</div>
        <div class="num">{{ p.lastTradeValue > 0 ? formatCurrency(p.lastTradeValue) : '—' }}</div>
      </div>
      <div v-if="!rows.length" class="hdp-empty">No entry selected.</div>
    </div>
  </section>
</template>

<style scoped>
.hdp {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
}
.hdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.hdp-title {
  font-size: 13px;
  color: var(--text-3);
}
.hdp-date {
  color: var(--text-1);
  font-weight: 500;
}
.hdp-count {
  color: var(--text-4);
  margin-left: 4px;
  font-size: 12px;
}
.hdp-table {
  font-size: 13px;
}
.hdp-head {
  display: grid;
  grid-template-columns: 1fr 100px 80px 120px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hdp-h {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: pointer;
  transition: color 120ms ease;
}
.hdp-h:hover,
.hdp-h:focus-visible {
  color: var(--text-1);
}
.hdp-h.num {
  justify-content: flex-end;
}
.hdp-h.active {
  color: var(--text-1);
}
.hdp-h .pi {
  font-size: 10px;
}
.hdp-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px 120px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  transition: background 160ms ease;
}
.hdp-row:last-child {
  border-bottom: none;
}
.hdp-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.hdp-row.highlighted {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.hdp-ticker {
  font-weight: 500;
}
.hdp-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}

@media (max-width: 720px) {
  .hdp {
    padding: 12px;
  }
  .hdp-head,
  .hdp-row {
    grid-template-columns: minmax(60px, 1fr) 80px 50px 90px;
    gap: 8px;
    font-size: 12px;
  }
  .hdp-head {
    font-size: 10px;
  }
}
</style>
