<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import VGrid from '@revolist/vue3-datagrid'
import type { CellTemplateProp, CellCompareFunc } from '@revolist/revogrid'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import DateRangePicker, { type DateRange } from '@/components/ui/DateRangePicker.vue'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioTransactions } from '@/composables/usePortfolioTransactions'
import type {
  GetTransactionsParams,
  Transaction,
  TransactionType
} from '@/api/endpoints/portfolios'
import { formatCurrencyCents, formatDate, formatNumber } from '@/util/format'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const TYPE_LABELS: Record<TransactionType, string> = {
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

const dateRange = ref<DateRange>({ from: null, to: null })
const searchText = ref('')

const { data: portfolio } = usePortfolio(portfolioId)
const inceptionDate = computed(() => portfolio.value?.createdAt?.slice(0, 10) ?? null)

function toIso(d: Date | null): string | undefined {
  if (!d) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const queryParams = computed<GetTransactionsParams>(() => {
  const out: GetTransactionsParams = {}
  const from = toIso(dateRange.value.from)
  const to = toIso(dateRange.value.to)
  if (from) out.from = from
  if (to) out.to = to
  return out
})

const { data, isLoading, error } = usePortfolioTransactions(portfolioId, queryParams)

const filteredItems = computed<Transaction[]>(() => {
  const items = data.value?.items ?? []
  const q = searchText.value.trim().toLowerCase()
  if (!q) return items
  return items.filter((t) => {
    const ticker = (t.ticker ?? '').toLowerCase()
    const just = (t.justification ?? '').toLowerCase()
    const label = TYPE_LABELS[t.type].toLowerCase()
    return ticker.includes(q) || just.includes(q) || label.includes(q)
  })
})

const rows = computed(() => {
  return filteredItems.value.map((t) => ({
    _dateMs: new Date(t.date + 'T12:00:00Z').getTime(),
    _quantity: t.quantity ?? 0,
    _price: t.price ?? 0,
    _amount: t.amount ?? 0,
    date: t.date,
    dateLabel: formatDate(t.date + 'T12:00:00Z', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }),
    type: t.type,
    typeLabel: TYPE_LABELS[t.type],
    ticker: t.ticker ?? '',
    quantity: t.quantity ?? null,
    quantityLabel: t.quantity != null ? formatNumber(t.quantity) : '—',
    price: t.price ?? null,
    priceLabel: t.price != null ? formatCurrencyCents(t.price) : '—',
    amount: t.amount ?? null,
    amountLabel: t.amount != null ? formatCurrencyCents(t.amount) : '—',
    amountClass:
      t.amount == null
        ? 'tx-cell-muted'
        : t.amount > 0
          ? 'tx-cell-up'
          : t.amount < 0
            ? 'tx-cell-down'
            : 'tx-cell-muted',
    qualifiedLabel:
      t.type === 'dividend' || t.type === 'interest'
        ? t.qualified === true ? 'Yes' : t.qualified === false ? 'No' : '—'
        : '—',
    justification: t.justification ?? ''
  }))
})

const hasAnyTransactions = computed(() => (data.value?.items.length ?? 0) > 0)

type Row = (typeof rows.value)[number]

const compareByDate: CellCompareFunc = (_p, a, b) => (a as Row)._dateMs - (b as Row)._dateMs
const compareByQty: CellCompareFunc = (_p, a, b) => (a as Row)._quantity - (b as Row)._quantity
const compareByPrice: CellCompareFunc = (_p, a, b) => (a as Row)._price - (b as Row)._price
const compareByAmount: CellCompareFunc = (_p, a, b) => (a as Row)._amount - (b as Row)._amount

const columns = computed(() => [
  {
    prop: 'dateLabel',
    name: 'Date',
    size: 130,
    pin: 'colPinStart' as const,
    readonly: true,
    sortable: true,
    order: 'desc' as const,
    cellCompare: compareByDate
  },
  {
    prop: 'typeLabel',
    name: 'Type',
    size: 120,
    readonly: true,
    sortable: true,
    cellProperties: ({ model }: CellTemplateProp) => ({
      class: `tx-type tx-type-${(model as { type: string }).type}`
    })
  },
  { prop: 'ticker', name: 'Ticker', size: 90, readonly: true, sortable: true },
  {
    prop: 'quantityLabel',
    name: 'Qty',
    size: 100,
    readonly: true,
    sortable: true,
    cellCompare: compareByQty,
    cellProperties: () => ({ class: 'tx-num' })
  },
  {
    prop: 'priceLabel',
    name: 'Price',
    size: 110,
    readonly: true,
    sortable: true,
    cellCompare: compareByPrice,
    cellProperties: () => ({ class: 'tx-num' })
  },
  {
    prop: 'amountLabel',
    name: 'Amount',
    size: 130,
    readonly: true,
    sortable: true,
    cellCompare: compareByAmount,
    cellProperties: ({ model }: CellTemplateProp) => {
      const m = model as Row & { amountClass: string }
      return { class: `tx-num ${m?.amountClass ?? ''}`.trim() }
    }
  },
  {
    prop: 'qualifiedLabel',
    name: 'Qualified',
    size: 100,
    readonly: true,
    sortable: true
  },
  {
    prop: 'justification',
    name: 'Justification',
    size: 260,
    readonly: true,
    sortable: false
  }
])

function toCsv(items: Transaction[]): string {
  const headers = [
    'date',
    'type',
    'ticker',
    'quantity',
    'price',
    'amount',
    'qualified',
    'justification'
  ]
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [headers.join(',')]
  for (const t of items) {
    lines.push(
      [
        t.date,
        t.type,
        t.ticker ?? '',
        t.quantity ?? '',
        t.price ?? '',
        t.amount ?? '',
        t.qualified == null ? '' : t.qualified ? 'yes' : 'no',
        t.justification ?? ''
      ]
        .map(esc)
        .join(',')
    )
  }
  return lines.join('\n')
}

function downloadCsv() {
  const items = filteredItems.value
  if (!items.length) return
  const csv = toCsv(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${portfolioId.value ?? 'portfolio'}-transactions.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

</script>

<template>
  <main class="pt-main">
    <div class="pt-filters">
      <label class="pt-search-wrap">
        <i class="pi pi-search pt-search-icon" aria-hidden="true" />
        <input
          v-model="searchText"
          type="text"
          class="pt-search"
          placeholder="Search ticker, type, or justification"
        />
      </label>
      <DateRangePicker v-model="dateRange" :inception-date="inceptionDate" />
    </div>

    <div v-if="isLoading" class="pt-loading">
      <Skeleton width="100%" height="420px" />
    </div>
    <div v-else-if="error" class="error-banner" role="alert">
      Could not load transactions. {{ (error as Error).message }}
    </div>
    <div v-else-if="!hasAnyTransactions" class="pt-empty">
      No transactions in this portfolio yet.
    </div>
    <div v-else class="pt-grid">
      <div class="revo-wrap">
        <v-grid
          :source="rows"
          :columns="columns"
          :readonly="true"
          :row-size="36"
          theme="compact"
          :range="false"
        />
      </div>
      <div v-if="!rows.length" class="pt-empty-overlay">
        No transactions match the current filters.
      </div>
      <Button
        class="pt-export"
        icon="pi pi-download"
        text
        rounded
        size="small"
        aria-label="Export CSV"
        title="Export CSV"
        @click="downloadCsv"
      />
    </div>
  </main>
</template>

<style scoped>
.pt-main {
  padding: 8px 0 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ----- Filter bar ------------------------------------------------------- */
.pt-filters {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.pt-search-wrap {
  position: relative;
  display: block;
  width: 280px;
  max-width: 100%;
}
.pt-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-4);
  pointer-events: none;
}
.pt-search {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 30px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-1);
  font: inherit;
  font-size: 12px;
  outline: none;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}
.pt-search:hover {
  border-color: var(--text-4);
}
.pt-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft-25);
}
.pt-search::placeholder {
  color: var(--text-4);
}

/* ----- Grid area -------------------------------------------------------- */
.pt-grid {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  display: flex;
  flex-direction: column;
}
.pt-grid > .revo-wrap {
  flex: 1 1 0;
  min-height: 0 !important;
  height: 100%;
}
.pt-export {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}
.pt-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  font-size: 13px;
  background: var(--panel);
  pointer-events: none;
  z-index: 1;
}

/* ----- States ----------------------------------------------------------- */
.pt-loading {
  flex: 1;
  min-height: 0;
  display: flex;
}
.pt-empty {
  flex: 1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--panel);
}
.error-banner {
  padding: 12px 16px;
  background: var(--loss-soft-15);
  border: 1px solid var(--loss);
  border-radius: 6px;
}
</style>

<style>
/* Unscoped — RevoGrid renders cells inside shadow DOM so cell classes need
   to be matched globally (same pattern as HoldingsHistoryGrid). */
.revo-wrap .tx-num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.revo-wrap .tx-cell-up {
  color: var(--gain);
}
.revo-wrap .tx-cell-down {
  color: var(--loss);
}
.revo-wrap .tx-cell-muted {
  color: var(--text-4);
}
.revo-wrap .tx-type {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
}
.revo-wrap .tx-type-buy {
  color: var(--text-2);
}
.revo-wrap .tx-type-sell {
  color: var(--text-2);
}
.revo-wrap .tx-type-dividend,
.revo-wrap .tx-type-interest {
  color: var(--gain);
}
.revo-wrap .tx-type-fee,
.revo-wrap .tx-type-withdrawal {
  color: var(--loss);
}
.revo-wrap .tx-type-deposit {
  color: var(--primary);
}
.revo-wrap .tx-type-split,
.revo-wrap .tx-type-journal {
  color: var(--secondary);
}
</style>
