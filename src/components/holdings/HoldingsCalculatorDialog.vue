<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'
import { recomputeCalculatorRows } from '@/util/holdings'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/util/format'

const props = defineProps<{
  open: boolean
  entry: HoldingsHistoryEntry | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const investAmount = ref<number | null>(10_000)

watch(
  () => props.open,
  (v) => {
    if (v) investAmount.value = 10_000
  }
)

const rows = computed(() =>
  props.entry && investAmount.value != null
    ? recomputeCalculatorRows(props.entry, investAmount.value)
    : []
)

const dateLabel = computed(() =>
  props.entry
    ? formatDate(props.entry.timestamp.slice(0, 10), { month: 'short', year: 'numeric' })
    : ''
)
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="`Holdings calculator — ${dateLabel}`"
    :style="{ width: '520px' }"
    :closable="true"
    @update:visible="(v) => emit('update:open', v)"
  >
    <div class="hcalc-body">
      <label class="hcalc-label" for="hcalc-input">If I invested</label>
      <InputNumber
        id="hcalc-input"
        v-model="investAmount"
        mode="currency"
        currency="USD"
        :min="0"
        :step="1000"
        fluid
      />

      <div class="hcalc-table">
        <div class="hcalc-head">
          <div>Ticker</div>
          <div class="num">Shares</div>
          <div class="num">%</div>
          <div class="num">Value</div>
        </div>
        <div v-for="r in rows" :key="r.ticker" class="hcalc-row">
          <div>{{ r.ticker }}</div>
          <div class="num">{{ formatNumber(r.shares) }}</div>
          <div class="num">{{ formatPercent(r.weight) }}</div>
          <div class="num">{{ formatCurrency(r.value) }}</div>
        </div>
        <div v-if="!rows.length" class="hcalc-empty">Enter an amount above $0.</div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.hcalc-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hcalc-label {
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.hcalc-table {
  font-size: 13px;
}
.hcalc-head,
.hcalc-row {
  display: grid;
  grid-template-columns: 1fr 120px 80px 120px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.hcalc-head {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hcalc-head .num,
.hcalc-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.hcalc-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-3);
}
</style>
