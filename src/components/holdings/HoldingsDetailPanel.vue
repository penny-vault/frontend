<script setup lang="ts">
import { computed } from 'vue'
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

const rows = computed(() => {
  if (!props.entry) return []
  const total = props.entry.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
  return [...props.entry.items]
    .map((i) => ({ ...i, weight: total > 0 ? i.lastTradeValue / total : 0 }))
    .sort((a, b) => b.weight - a.weight)
})
</script>

<template>
  <section class="hdp">
    <header class="hdp-header">
      <div class="hdp-title">
        Holdings detail for <span class="hdp-date">{{ dateLabel }}</span>
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
      <div class="hdp-head">
        <div>Ticker</div>
        <div class="num">Shares</div>
        <div class="num">%</div>
        <div class="num">Value</div>
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
.hdp-head .num {
  text-align: right;
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
