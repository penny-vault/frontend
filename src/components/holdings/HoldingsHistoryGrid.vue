<script setup lang="ts">
import { computed } from 'vue'
import VGrid from '@revolist/vue3-datagrid'
import type { CellTemplateProp, CellCompareFunc } from '@revolist/revogrid'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'
import { buildJustificationColumns } from '@/util/holdings'
import { formatCurrency, formatDate } from '@/util/format'
import { useMediaQuery } from '@/util/motion'

const isNarrow = useMediaQuery('(max-width: 720px)')

const props = defineProps<{
  entries: HoldingsHistoryEntry[]
  selectedTimestamp: string | null
}>()

const emit = defineEmits<{
  'select-entry': [timestamp: string]
}>()

interface Row {
  timestamp: string
  dateLabel: string
  tickers: string
  valueLabel: string
  _totalValue: number
  [key: string]: unknown
}

const justificationKeys = computed(() => buildJustificationColumns(props.entries))

function formatAnnotationValue(raw: string): string {
  if (raw === '') return ''
  const n = parseFloat(raw)
  if (Number.isFinite(n)) return n.toFixed(2)
  return raw
}

const rows = computed<Row[]>(() =>
  props.entries.map((e) => {
    const tickers = e.items
      .map((i) => i.ticker)
      .filter((t) => t !== '$CASH')
      .sort()
      .join(' ')
    const totalValue = e.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
    const row: Row = {
      timestamp: e.timestamp,
      dateLabel: formatDate(e.timestamp, {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      tickers,
      valueLabel: totalValue > 0 ? formatCurrency(totalValue) : '—',
      _totalValue: totalValue
    }
    for (const key of justificationKeys.value) {
      row[`just_${key}`] = formatAnnotationValue(e.annotations?.[key] ?? '')
      row[`_raw_${key}`] = parseFloat(e.annotations?.[key] ?? '') || 0
    }
    return row
  })
)

const compareByTimestamp: CellCompareFunc = (_prop, a, b) =>
  new Date((a as Row).timestamp).getTime() - new Date((b as Row).timestamp).getTime()

const compareByTotalValue: CellCompareFunc = (_prop, a, b) =>
  (a as Row)._totalValue - (b as Row)._totalValue

function compareByAnnotation(key: string): CellCompareFunc {
  return (_prop, a, b) =>
    ((a as Row)[`_raw_${key}`] as number) - ((b as Row)[`_raw_${key}`] as number)
}

const columns = computed(() => {
  const rowClass = (model: Row) =>
    model.timestamp === props.selectedTimestamp ? 'holdings-row-selected' : ''
  const narrow = isNarrow.value
  const base = [
    {
      prop: 'dateLabel',
      name: 'Date',
      size: narrow ? 110 : 130,
      pin: 'colPinStart' as const,
      readonly: true,
      sortable: true,
      order: 'desc' as const,
      cellCompare: compareByTimestamp,
      cellProperties: ({ model }: CellTemplateProp) => ({ class: rowClass(model as Row) })
    },
    {
      prop: 'tickers',
      name: 'Tickers',
      size: narrow ? 120 : 220,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => ({ class: rowClass(model as Row) })
    },
    {
      prop: 'valueLabel',
      name: 'Value',
      size: narrow ? 100 : 140,
      readonly: true,
      sortable: true,
      cellCompare: compareByTotalValue,
      cellProperties: ({ model }: CellTemplateProp) => ({ class: rowClass(model as Row) })
    }
  ]
  const dyn = justificationKeys.value.map((k) => ({
    prop: `just_${k}`,
    name: k,
    size: narrow ? 90 : 120,
    readonly: true,
    sortable: true,
    cellCompare: compareByAnnotation(k),
    cellProperties: ({ model }: CellTemplateProp) => ({ class: rowClass(model as Row) })
  }))
  return [...base, ...dyn]
})

function onCellFocus(e: CustomEvent) {
  const detail = e.detail as { model?: Row } | undefined
  const model = detail?.model
  if (!model) return
  emit('select-entry', model.timestamp)
}
</script>

<template>
  <div class="revo-wrap holdings-history-grid" :class="{ 'is-narrow': isNarrow }">
    <v-grid
      :source="rows"
      :columns="columns"
      :readonly="true"
      :row-size="40"
      theme="compact"
      :range="false"
      @beforecellfocus="onCellFocus"
    />
  </div>
</template>

<style>
.holdings-history-grid.is-narrow {
  font-size: 11px;
}
.holdings-history-grid.is-narrow .rgHeaderCell,
.holdings-history-grid.is-narrow .rgCell {
  font-size: 11px;
}
</style>
