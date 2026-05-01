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

interface Row {
  shortCode: string
  name: string
  repoLabel: string
  state: Strategy['installState']
  stateLabel: string
  isOfficial: boolean
  ownerTag: 'official' | 'community'
  cagr: number | null
  sharpe: number | null
  maxDD: number | null
  stars: number | null
  cagrLabel: string
  cagrClass: string
  sharpeLabel: string
  maxDDLabel: string
  starsLabel: string
  rowState: 'selected' | 'hovered' | ''
  [key: string]: unknown
}

function strategyName(s: Strategy): string {
  return s.describe?.name ?? s.repoName ?? s.shortCode
}

const rows = computed<Row[]>(() =>
  props.strategies.map<Row>((s) => {
    const cagr = s.cagr ?? null
    const rowState =
      s.shortCode === props.selectedShortCode ? 'selected'
      : s.shortCode === props.hoveredShortCode ? 'hovered'
      : ''
    return {
      shortCode: s.shortCode,
      name: strategyName(s),
      repoLabel: `${s.repoOwner}/${s.repoName}`,
      state: s.installState,
      stateLabel: s.installState,
      isOfficial: s.isOfficial,
      ownerTag: s.isOfficial ? 'official' : 'community',
      cagr,
      sharpe: s.sharpe ?? null,
      maxDD: s.maxDrawDown ?? null,
      stars: s.stars ?? null,
      cagrLabel: cagr == null ? '—' : formatSignedPercent(cagr),
      cagrClass: cagr == null ? 'st-cell-muted' : cagr >= 0 ? 'st-cell-up' : 'st-cell-down',
      sharpeLabel: s.sharpe == null ? '—' : formatNumber(s.sharpe),
      maxDDLabel: s.maxDrawDown == null ? '—' : formatPercent(s.maxDrawDown),
      starsLabel: s.stars == null ? '—' : String(s.stars),
      rowState
    }
  })
)

const columns = computed(() => {
  const rowClass = (row: Row) => row.rowState ? `st-row-${row.rowState}` : ''

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
    {
      prop: 'cagr',
      name: 'CAGR',
      size: 100,
      readonly: true,
      sortable: true,
      cellTemplate: (h: unknown, p: CellTemplateProp) => (p.model as Row).cagrLabel,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-num ${m.cagrClass} ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      }
    },
    {
      prop: 'sharpe',
      name: 'Sharpe',
      size: 90,
      readonly: true,
      sortable: true,
      cellTemplate: (h: unknown, p: CellTemplateProp) => (p.model as Row).sharpeLabel,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-num ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      }
    },
    {
      prop: 'maxDD',
      name: 'Max DD',
      size: 100,
      readonly: true,
      sortable: true,
      cellTemplate: (h: unknown, p: CellTemplateProp) => (p.model as Row).maxDDLabel,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-num st-cell-warn ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      }
    },
    {
      prop: 'stars',
      name: 'Stars',
      size: 80,
      readonly: true,
      sortable: true,
      cellTemplate: (h: unknown, p: CellTemplateProp) => (p.model as Row).starsLabel,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-num st-cell-muted ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      }
    },
    {
      prop: 'shortCode',
      name: 'Code',
      size: 80,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-code ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
      }
    },
    {
      prop: 'ownerTag',
      name: 'Source',
      size: 110,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return {
          class: `st-source st-source-${m.ownerTag} ${rowClass(m)}`.trim(),
          'data-short-code': m.shortCode
        }
      }
    },
    {
      prop: 'stateLabel',
      name: 'State',
      size: 100,
      readonly: true,
      sortable: true,
      cellProperties: ({ model }: CellTemplateProp) => {
        const m = model as Row
        return { class: `st-state st-state-${m.state} ${rowClass(m)}`.trim(), 'data-short-code': m.shortCode }
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
        return hFn('button', {
          class: 'st-play-btn',
          title: 'Create portfolio',
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            router.push({ name: 'portfolio-create', query: { strategy: shortCode } })
          }
        }, [
          hFn('svg', {
            width: 11, height: 12,
            viewBox: '0 0 11 12',
            fill: 'currentColor'
          }, [
            hFn('path', { d: 'M0 0l11 6-11 6V0z' })
          ])
        ])
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
.revo-wrap.st-grid-wrap .st-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.revo-wrap.st-grid-wrap .st-repo {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  color: var(--text-4);
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

.revo-wrap.st-grid-wrap .st-source,
.revo-wrap.st-grid-wrap .st-state {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.revo-wrap.st-grid-wrap .st-source-official {
  color: var(--primary);
}
.revo-wrap.st-grid-wrap .st-source-community {
  color: var(--secondary);
}
.revo-wrap.st-grid-wrap .st-state-ready {
  color: var(--gain);
}
.revo-wrap.st-grid-wrap .st-state-installing,
.revo-wrap.st-grid-wrap .st-state-pending {
  color: var(--primary);
}
.revo-wrap.st-grid-wrap .st-state-failed {
  color: var(--loss);
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
  transition: background 140ms ease, opacity 140ms ease;
}
.st-play-btn:hover {
  background: color-mix(in srgb, var(--gain) 15%, transparent);
  opacity: 0.9;
}
</style>
