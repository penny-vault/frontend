<script setup lang="ts">
import { computed } from 'vue'
import type { FactorKey, FactorLoading } from '@/api/endpoints/portfolios'

const props = defineProps<{
  factors: FactorLoading[]
  alpha: number
  totalReturn: number
  selectedFactor: FactorKey | null
}>()

const emit = defineEmits<{
  select: [key: FactorKey | null]
}>()

const FACTOR_NAMES: Record<FactorKey, string> = {
  market: 'Market',
  size: 'Size',
  value: 'Value',
  momentum: 'Momentum',
  quality: 'Quality',
  lowvol: 'Low Vol'
}

interface Segment {
  key: string
  factor: FactorKey | null
  name: string
  contribution: number
  runStart: number
  runEnd: number
  type: 'factor' | 'alpha' | 'total'
}

const segments = computed<Segment[]>(() => {
  const out: Segment[] = []
  let running = 0
  // Sort factors by absolute contribution, largest first — most readable
  const ordered = [...props.factors].sort(
    (a, b) => Math.abs(b.returnContribution) - Math.abs(a.returnContribution)
  )
  for (const f of ordered) {
    out.push({
      key: f.factor,
      factor: f.factor,
      name: FACTOR_NAMES[f.factor],
      contribution: f.returnContribution,
      runStart: running,
      runEnd: running + f.returnContribution,
      type: 'factor'
    })
    running += f.returnContribution
  }
  out.push({
    key: 'alpha',
    factor: null,
    name: 'Alpha',
    contribution: props.alpha,
    runStart: running,
    runEnd: running + props.alpha,
    type: 'alpha'
  })
  running += props.alpha
  out.push({
    key: 'total',
    factor: null,
    name: 'Total',
    contribution: props.totalReturn,
    runStart: 0,
    runEnd: props.totalReturn,
    type: 'total'
  })
  return out
})

const scale = computed(() => {
  let lo = 0
  let hi = 0
  for (const s of segments.value) {
    if (s.runStart < lo) lo = s.runStart
    if (s.runEnd < lo) lo = s.runEnd
    if (s.runStart > hi) hi = s.runStart
    if (s.runEnd > hi) hi = s.runEnd
  }
  // Add 10% headroom
  const pad = (hi - lo) * 0.1 || 0.01
  return { lo: lo - pad, hi: hi + pad }
})

function topPct(value: number): number {
  const { lo, hi } = scale.value
  return ((hi - value) / (hi - lo)) * 100
}

const zeroPct = computed(() => topPct(0))

function fmtSigned(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${(Math.abs(v) * 100).toFixed(1)}%`
}
function fmtTotal(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${(Math.abs(v) * 100).toFixed(1)}%`
}
</script>

<template>
  <div class="faw">
    <div class="faw-chart" :style="{ '--zero': zeroPct + '%' }">
      <div class="faw-zero" aria-hidden="true" />
      <div class="faw-cols">
        <div
          v-for="seg in segments"
          :key="seg.key"
          class="faw-col"
          :class="[
            `faw-col-${seg.type}`,
            seg.contribution >= 0 ? 'faw-col-up' : 'faw-col-down',
            { 'faw-col-selected': seg.factor && seg.factor === selectedFactor }
          ]"
          @mouseenter="seg.factor && emit('select', seg.factor)"
          @mouseleave="emit('select', null)"
          @click="seg.factor && emit('select', seg.factor)"
        >
          <div class="faw-contrib">{{ fmtSigned(seg.contribution) }}</div>
          <div class="faw-bar-holder">
            <div
              class="faw-bar"
              :style="{
                top: topPct(Math.max(seg.runStart, seg.runEnd)) + '%',
                height: Math.abs(topPct(seg.runStart) - topPct(seg.runEnd)) + '%'
              }"
            />
          </div>
          <div class="faw-name">{{ seg.name }}</div>
        </div>
      </div>
    </div>
    <div class="faw-summary">
      <div class="faw-summary-item">
        <span class="faw-summary-label">Factor-explained</span>
        <span class="faw-summary-value num">
          {{ fmtTotal(totalReturn - alpha) }}
        </span>
      </div>
      <div class="faw-summary-item">
        <span class="faw-summary-label">Alpha</span>
        <span class="faw-summary-value num" :class="alpha >= 0 ? 'up' : 'down'">
          {{ fmtTotal(alpha) }}
        </span>
      </div>
      <div class="faw-summary-item">
        <span class="faw-summary-label">Total return</span>
        <span
          class="faw-summary-value faw-summary-total num"
          :class="totalReturn >= 0 ? 'up' : 'down'"
        >
          {{ fmtTotal(totalReturn) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faw {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.faw-chart {
  position: relative;
  height: 240px;
  padding: 12px 0 32px;
}
.faw-zero {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(12px + var(--zero));
  border-top: 1px dashed var(--border);
  pointer-events: none;
}
.faw-cols {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 6px;
  height: 100%;
}
.faw-col {
  position: relative;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.faw-col-alpha,
.faw-col-total {
  cursor: default;
}
.faw-col-total {
  margin-left: 8px;
}
.faw-contrib {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  text-align: center;
  height: 16px;
  line-height: 16px;
}
.faw-col-up .faw-contrib {
  color: var(--gain);
}
.faw-col-down .faw-contrib {
  color: var(--loss);
}
.faw-col-alpha .faw-contrib {
  color: var(--primary);
}
.faw-col-total .faw-contrib {
  color: var(--text-1);
}
.faw-bar-holder {
  position: relative;
  flex: 1;
  min-height: 0;
}
.faw-bar {
  position: absolute;
  left: 10%;
  right: 10%;
  border-radius: 1px;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.faw-col-up .faw-bar {
  background: var(--gain);
  opacity: 0.75;
}
.faw-col-down .faw-bar {
  background: var(--loss);
  opacity: 0.75;
}
.faw-col-alpha .faw-bar {
  background: var(--primary);
  opacity: 0.85;
  left: 18%;
  right: 18%;
}
.faw-col-total .faw-bar {
  background: transparent;
  border: 1px solid var(--text-2);
  left: 16%;
  right: 16%;
}
.faw-col-total.faw-col-up .faw-bar {
  border-color: var(--gain);
  background: color-mix(in srgb, var(--gain) 12%, transparent);
}
.faw-col:hover .faw-bar,
.faw-col-selected .faw-bar {
  opacity: 1;
  transform: translateX(-0.5px);
}
.faw-name {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  text-align: center;
  height: 20px;
  line-height: 20px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.faw-col-total .faw-name,
.faw-col-alpha .faw-name {
  color: var(--text-1);
  font-weight: 500;
}
.faw-summary {
  display: flex;
  gap: 18px;
  padding: 8px 0 0;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.faw-summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.faw-summary-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.faw-summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
}
.faw-summary-total {
  font-size: 16px;
}
.faw-summary-value.up {
  color: var(--gain);
}
.faw-summary-value.down {
  color: var(--loss);
}
.num {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
</style>
