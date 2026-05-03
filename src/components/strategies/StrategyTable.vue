<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import VGrid from '@revolist/vue3-datagrid'
import type { CellTemplateProp } from '@revolist/revogrid'
import type { Strategy } from '@/api/endpoints/strategies'
import { formatPercent, formatSignedPercent, formatNumber } from '@/util/format'

const props = defineProps<{
  strategies: Strategy[]
  selectedShortCode?: string | null
  hoveredShortCode?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', shortCode: string): void
  (e: 'hover', shortCode: string | null): void
}>()

const router = useRouter()

type MetricFormat = 'number' | 'percent' | 'signedPercent'
type MetricTone = 'sign' | 'warn' | 'muted'

interface MetricSpec {
  key: string
  label: string
  size: number
  format: MetricFormat
  tone: MetricTone
  pick: (s: Strategy) => number | null
}

const calmar = (cagr: number | null, maxDD: number | null): number | null => {
  if (cagr == null || maxDD == null || maxDD === 0) return null
  return cagr / Math.abs(maxDD)
}

const METRICS: MetricSpec[] = [
  { key: 'cagr', label: 'CAGR', size: 100, format: 'signedPercent', tone: 'sign',
    pick: (s) => s.cagr ?? null },
  { key: 'oneYearReturn', label: '1Y', size: 90, format: 'signedPercent', tone: 'sign',
    pick: (s) => s.oneYearReturn ?? null },
  { key: 'ytdReturn', label: 'YTD', size: 90, format: 'signedPercent', tone: 'sign',
    pick: (s) => s.ytdReturn ?? null },
  { key: 'benchmarkYtdReturn', label: 'BM YTD', size: 90, format: 'signedPercent', tone: 'muted',
    pick: (s) => s.benchmarkYtdReturn ?? null },
  { key: 'sharpe', label: 'Sharpe', size: 80, format: 'number', tone: 'sign',
    pick: (s) => s.sharpe ?? null },
  { key: 'sortino', label: 'Sortino', size: 80, format: 'number', tone: 'sign',
    pick: (s) => s.sortino ?? null },
  { key: 'calmar', label: 'Calmar', size: 80, format: 'number', tone: 'sign',
    pick: (s) => calmar(s.cagr ?? null, s.maxDrawDown ?? null) },
  { key: 'maxDD', label: 'Max DD', size: 90, format: 'percent', tone: 'warn',
    pick: (s) => s.maxDrawDown ?? null },
  { key: 'stdDev', label: 'Std Dev', size: 85, format: 'percent', tone: 'muted',
    pick: (s) => s.stdDev ?? null },
  { key: 'ulcerIndex', label: 'Ulcer', size: 75, format: 'number', tone: 'muted',
    pick: (s) => s.ulcerIndex ?? null },
  { key: 'beta', label: 'Beta', size: 75, format: 'number', tone: 'muted',
    pick: (s) => s.beta ?? null },
  { key: 'alpha', label: 'Alpha', size: 85, format: 'signedPercent', tone: 'sign',
    pick: (s) => s.alpha ?? null },
  { key: 'taxCostRatio', label: 'Tax Cost', size: 90, format: 'percent', tone: 'muted',
    pick: (s) => s.taxCostRatio ?? null }
]

interface Row {
  shortCode: string
  name: string
  schedule: string
  benchmark: string
  rowState: 'selected' | 'hovered' | ''
  [key: string]: unknown
}

function strategyName(s: Strategy): string {
  return s.describe?.name ?? s.repoName ?? s.shortCode
}

const SCHEDULE_LABELS: Record<string, string> = {
  '@daily': 'Daily',
  '@weekend': 'Weekly',
  '@weekly': 'Weekly',
  '@monthend': 'Monthly',
  '@monthly': 'Monthly',
  '@quarterend': 'Quarterly',
  '@quarterly': 'Quarterly',
  '@yearend': 'Annually',
  '@yearly': 'Annually'
}

function scheduleLabel(schedule: string | undefined): string {
  if (!schedule) return '—'
  return SCHEDULE_LABELS[schedule] ?? schedule.replace(/^@/, '')
}

function formatMetric(value: number | null, format: MetricFormat): string {
  if (value == null) return '—'
  if (format === 'percent') return formatPercent(value)
  if (format === 'signedPercent') return formatSignedPercent(value)
  return formatNumber(value)
}

function metricClass(value: number | null, tone: MetricTone): string {
  if (value == null) return 'st-cell-muted'
  if (tone === 'warn') return 'st-cell-warn'
  if (tone === 'muted') return 'st-cell-muted'
  return value >= 0 ? 'st-cell-up' : 'st-cell-down'
}

const rows = computed<Row[]>(() =>
  props.strategies.map<Row>((s) => {
    const rowState =
      s.shortCode === props.selectedShortCode
        ? 'selected'
        : s.shortCode === props.hoveredShortCode
          ? 'hovered'
          : ''
    const row: Row = {
      shortCode: s.shortCode,
      name: strategyName(s),
      schedule: scheduleLabel(s.describe?.schedule),
      benchmark: s.describe?.benchmark ?? '—',
      rowState
    }
    for (const m of METRICS) {
      const v = m.pick(s)
      row[m.key] = v
      row[`${m.key}Label`] = formatMetric(v, m.format)
      row[`${m.key}Class`] = metricClass(v, m.tone)
    }
    return row
  })
)

const columns = computed(() => {
  const rowClass = (row: Row) => (row.rowState ? `st-row-${row.rowState}` : '')

  return [
    {
      prop: 'name',
      name: 'Strategy',
      size: 220,
      pin: 'colPinStart' as const,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => ({
        class: `st-name ${rowClass(model as Row)}`.trim(),
        'data-short-code': (model as Row).shortCode
      })
    },
    ...METRICS.map((spec) => ({
      prop: spec.key,
      name: spec.label,
      size: spec.size,
      readonly: true,
      sortable: true,
      cellTemplate: (h: unknown, p: CellTemplateProp) =>
        (p.model as Row)[`${spec.key}Label`] as string,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        const cls = m[`${spec.key}Class`] as string
        return {
          class: `st-num ${cls} ${rowClass(m)}`.trim(),
          'data-short-code': m.shortCode
        }
      }
    })),
    {
      prop: 'schedule',
      name: 'Rebalance',
      size: 110,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return {
          class: `st-meta ${rowClass(m)}`.trim(),
          'data-short-code': m.shortCode
        }
      }
    },
    {
      prop: 'benchmark',
      name: 'Benchmark',
      size: 110,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return {
          class: `st-mono ${rowClass(m)}`.trim(),
          'data-short-code': m.shortCode
        }
      }
    },
    {
      prop: 'shortCode',
      name: '',
      size: 48,
      pin: 'colPinEnd' as const,
      readonly: true,
      sortable: false,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-play-cell ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      },
      cellTemplate: (h: unknown, p: CellTemplateProp) => {
        const hFn = h as typeof import('vue').h
        const shortCode = (p.model as Row).shortCode
        return hFn(
          'button',
          {
            class: 'st-play-btn',
            title: 'Create portfolio',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              router.push({ name: 'portfolio-create', query: { strategy: shortCode } })
            }
          },
          [
            hFn(
              'svg',
              {
                width: 11,
                height: 12,
                viewBox: '0 0 11 12',
                fill: 'currentColor'
              },
              [hFn('path', { d: 'M0 0l11 6-11 6V0z' })]
            )
          ]
        )
      }
    }
  ]
})

function onCellFocus(e: CustomEvent) {
  const detail = e.detail as { model?: Row } | undefined
  const code = detail?.model?.shortCode
  if (code) emit('select', code)
}

// table → chart: emit which row the mouse is over
// DOM-based lookup handles any sort order RevoGrid applies internally
function onGridMouseMove(e: MouseEvent) {
  const cell = (e.target as HTMLElement).closest('[data-short-code]')
  emit('hover', cell ? cell.getAttribute('data-short-code') : null)
}

function onGridMouseLeave() {
  emit('hover', null)
}
</script>

<template>
  <div class="st-wrap">
    <div v-if="!rows.length" class="st-empty">No strategies match.</div>

    <div
      v-else
      class="revo-wrap st-grid-wrap"
      @mousemove="onGridMouseMove"
      @mouseleave="onGridMouseLeave"
    >
      <v-grid
        :source="rows"
        :columns="columns"
        :readonly="true"
        :row-size="38"
        theme="compact"
        :range="false"
        @beforecellfocus="onCellFocus"
      />
    </div>
  </div>
</template>

<style scoped>
.st-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
  height: 100%;
}

.st-empty {
  padding: 60px 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.st-grid-wrap {
  flex: 1;
  min-height: 0;
}
</style>

<style>
.revo-wrap.st-grid-wrap .st-num {
  text-align: right;
  justify-content: flex-end;
  font-variant-numeric: tabular-nums;
}
.revo-wrap.st-grid-wrap .st-name {
  font-weight: 500;
  color: var(--text-1);
}
.revo-wrap.st-grid-wrap .st-mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--text-2);
  letter-spacing: 0.02em;
}
.revo-wrap.st-grid-wrap .st-meta {
  font-size: 12px;
  color: var(--text-3);
}
.revo-wrap.st-grid-wrap .st-cell-up {
  color: var(--gain);
}
.revo-wrap.st-grid-wrap .st-cell-down {
  color: var(--loss);
}
.revo-wrap.st-grid-wrap .st-cell-warn {
  color: var(--secondary);
}
.revo-wrap.st-grid-wrap .st-cell-muted {
  color: var(--text-3);
}

.revo-wrap.st-grid-wrap .st-row-selected {
  background: var(--primary-soft-08) !important;
}
.revo-wrap.st-grid-wrap .st-row-hovered {
  background: var(--primary-soft-05) !important;
}

.revo-wrap.st-grid-wrap .st-play-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.st-play-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid var(--gain);
  border-radius: 3px;
  color: var(--gain);
  cursor: pointer;
  transition:
    background 140ms ease,
    opacity 140ms ease;
}
.st-play-btn:hover {
  background: color-mix(in srgb, var(--gain) 15%, transparent);
  opacity: 0.9;
}
</style>
