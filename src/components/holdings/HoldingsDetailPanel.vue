<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import type { HoldingsHistoryEntry, PredictedTransaction } from '@/api/endpoints/portfolios'
import {
  formatCurrency,
  formatCurrencyCents,
  formatNumber,
  formatPercent,
  formatDate
} from '@/util/format'
import { computeEntryValue, materialHoldings } from '@/util/holdings'

const props = defineProps<{
  entry: HoldingsHistoryEntry | null
  hoveredTicker: string | null
  predicted?: boolean
  predictedTransactions?: PredictedTransaction[] | null
}>()

const TYPE_LABELS: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  interest: 'Interest',
  fee: 'Fee',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  split: 'Split',
  journal: 'Journal'
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

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
  const total = computeEntryValue(props.entry)
  const items = materialHoldings(props.entry).map((i) => ({
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
        <span v-if="predicted" class="hdp-pred-badge">Predicted</span>
        {{ predicted ? 'Holdings after trading on' : 'Holdings detail for' }}
        <span class="hdp-date">{{ dateLabel }}</span>
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
      <div v-if="!rows.length" class="hdp-empty">
        {{
          predicted
            ? 'No securities held — the portfolio would be entirely in cash.'
            : 'No entry selected.'
        }}
      </div>
    </div>

    <div v-if="predicted" class="hdp-orders">
      <h3 class="hdp-orders-title">Predicted orders</h3>
      <ul v-if="predictedTransactions?.length" class="hdp-order-list">
        <li
          v-for="(t, i) in predictedTransactions"
          :key="`${t.type}-${t.ticker ?? ''}-${i}`"
          class="hdp-order"
        >
          <div class="hdp-order-main">
            <span class="hdp-order-type" :class="`tx-${t.type}`">{{ typeLabel(t.type) }}</span>
            <span class="hdp-order-ticker">{{ t.ticker ?? '—' }}</span>
            <span class="hdp-order-qty num">
              {{ t.quantity != null ? formatNumber(t.quantity) : '—' }} ×
              {{ formatCurrencyCents(t.price) }}
            </span>
            <span class="hdp-order-amount num">{{ formatCurrencyCents(t.amount) }}</span>
          </div>
          <p v-if="t.justification" class="hdp-order-why">{{ t.justification }}</p>
        </li>
      </ul>
      <p v-else class="hdp-orders-empty">
        No trades predicted for this date. Positions carry forward unchanged.
      </p>
      <p class="hdp-pred-note">
        Prices estimated at last close. Cash holds the remainder and is not listed.
      </p>
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
.hdp-pred-badge {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--secondary);
  background: var(--secondary-soft-06);
  border: 1px dashed var(--secondary-border);
  border-radius: 2px;
  padding: 2px 7px;
  margin-right: 6px;
}
.hdp-orders {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--secondary-border);
}
.hdp-orders-title {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--text-3);
  margin-bottom: 4px;
}
.hdp-order-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.hdp-order {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.hdp-order:last-child {
  border-bottom: none;
}
.hdp-order-main {
  display: grid;
  grid-template-columns: 64px 1fr auto 100px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.hdp-order-type {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 2px;
  background: var(--panel-hover);
  color: var(--text-2);
  text-align: center;
}
.hdp-order-type.tx-buy {
  background: var(--gain-soft-15);
  color: var(--gain);
}
.hdp-order-type.tx-sell {
  background: var(--loss-soft-15);
  color: var(--loss);
}
.hdp-order-ticker {
  font-weight: 500;
  color: var(--text-1);
}
.hdp-order-qty {
  color: var(--text-3);
  text-align: right;
}
.hdp-order-amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.hdp-order-why {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 4px;
  padding-left: 74px;
}
.hdp-orders-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
.hdp-pred-note {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--text-5);
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
