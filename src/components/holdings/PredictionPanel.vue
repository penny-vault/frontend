<script setup lang="ts">
import { computed } from 'vue'
import type { PredictionResponse } from '@/api/endpoints/portfolios'
import {
  formatCurrency,
  formatCurrencyCents,
  formatDate,
  formatNumber,
  formatPercent
} from '@/util/format'

const props = defineProps<{
  prediction: PredictionResponse
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

const dateLabel = computed(() => formatDate(props.prediction.date))

const positions = computed(() => [...props.prediction.holdings].sort((a, b) => b.weight - a.weight))
</script>

<template>
  <section class="pp" aria-labelledby="pp-title">
    <header class="pp-header">
      <div>
        <div class="pp-title-row">
          <span class="pp-chip">Projected</span>
          <h2 id="pp-title" class="pp-title">
            Next trade <span class="pp-date">{{ dateLabel }}</span>
          </h2>
        </div>
        <p class="pp-sub">Prices estimated at last close</p>
      </div>
      <div class="pp-total num">
        <span class="pp-total-label">Invested value</span>
        {{ formatCurrency(prediction.totalMarketValue) }}
      </div>
    </header>

    <div class="pp-body">
      <div class="pp-col">
        <h3 class="pp-col-title">Predicted orders</h3>
        <ul v-if="prediction.transactions.length" class="pp-orders">
          <li
            v-for="(t, i) in prediction.transactions"
            :key="`${t.type}-${t.ticker ?? ''}-${i}`"
            class="pp-order"
          >
            <div class="pp-order-main">
              <span class="pp-type" :class="`tx-${t.type}`">{{ typeLabel(t.type) }}</span>
              <span class="pp-ticker">{{ t.ticker ?? '—' }}</span>
              <span class="pp-qty num">
                {{ t.quantity != null ? formatNumber(t.quantity) : '—' }} ×
                {{ formatCurrencyCents(t.price) }}
              </span>
              <span class="pp-amount num">{{ formatCurrencyCents(t.amount) }}</span>
            </div>
            <p v-if="t.justification" class="pp-why">{{ t.justification }}</p>
          </li>
        </ul>
        <p v-else class="pp-empty">
          No trades predicted for this date. Positions carry forward unchanged.
        </p>
      </div>

      <div class="pp-col">
        <h3 class="pp-col-title">Positions after trading</h3>
        <div v-if="positions.length" class="pp-table">
          <div class="pp-head" role="row">
            <span>Ticker</span>
            <span class="num">Shares</span>
            <span class="num">%</span>
            <span class="num">Value</span>
          </div>
          <div v-for="p in positions" :key="`${p.ticker}-${p.figi ?? ''}`" class="pp-row">
            <span class="pp-ticker">{{ p.ticker }}</span>
            <span class="num">{{ formatNumber(p.quantity) }}</span>
            <span class="num">{{ formatPercent(p.weight) }}</span>
            <span class="num">{{ formatCurrency(p.marketValue) }}</span>
          </div>
        </div>
        <p v-else class="pp-empty">No securities held — the portfolio would be entirely in cash.</p>
      </div>
    </div>

    <p class="pp-note">
      Cash holds the remainder and is not listed; weights are shares of invested value.
    </p>
  </section>
</template>

<style scoped>
.pp {
  background: var(--panel);
  border: 1px dashed var(--text-5);
  border-radius: 4px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}
.pp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.pp-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pp-chip {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--secondary);
  background: var(--secondary-soft-06);
  border: 1px dashed var(--secondary-border);
  border-radius: 2px;
  padding: 2px 7px;
}
.pp-title {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-3);
}
.pp-date {
  color: var(--text-1);
  font-weight: 500;
}
.pp-sub {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 4px;
}
.pp-total {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-1);
  text-align: right;
}
.pp-total-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 400;
  color: var(--text-4);
  margin-bottom: 2px;
}
.pp-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
}
.pp-col {
  min-width: 0;
}
.pp-col-title {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--text-3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.pp-orders {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pp-order {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.pp-order:last-child {
  border-bottom: none;
}
.pp-order-main {
  display: grid;
  grid-template-columns: 64px 1fr auto 110px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.pp-type {
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
.pp-type.tx-buy {
  background: var(--gain-soft-15);
  color: var(--gain);
}
.pp-type.tx-sell {
  background: var(--loss-soft-15);
  color: var(--loss);
}
.pp-ticker {
  font-weight: 500;
  color: var(--text-1);
}
.pp-qty {
  color: var(--text-3);
  text-align: right;
}
.pp-amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pp-why {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 4px;
  padding-left: 74px;
}
.pp-table {
  font-size: 13px;
}
.pp-head,
.pp-row {
  display: grid;
  grid-template-columns: 1fr 90px 70px 110px;
  gap: 8px;
}
.pp-head {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.pp-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.pp-row:last-child {
  border-bottom: none;
}
.pp-head .num,
.pp-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pp-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
.pp-note {
  font-size: 11.5px;
  color: var(--text-5);
}

@media (max-width: 1023px) {
  .pp-body {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .pp-order-main {
    grid-template-columns: 56px 1fr auto;
  }
  .pp-amount {
    grid-column: 3;
  }
  .pp-qty {
    display: none;
  }
  .pp-why {
    padding-left: 66px;
  }
}
</style>
