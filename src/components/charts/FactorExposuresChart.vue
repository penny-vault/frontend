<script setup lang="ts">
import { computed } from 'vue'
import type { FactorKey, FactorLoading } from '@/api/endpoints/portfolios'

const props = defineProps<{
  factors: FactorLoading[]
  selectedFactor: FactorKey
}>()

const emit = defineEmits<{
  select: [key: FactorKey]
  hover: [key: FactorKey | null]
}>()

const FACTOR_META: Record<
  FactorKey,
  { name: string; sub: string; tiltPos: string; tiltNeg: string }
> = {
  market: { name: 'Market', sub: 'β', tiltPos: 'aggressive', tiltNeg: 'defensive' },
  size: { name: 'Size', sub: 'SMB', tiltPos: 'small-cap tilt', tiltNeg: 'large-cap tilt' },
  value: { name: 'Value', sub: 'HML', tiltPos: 'value tilt', tiltNeg: 'growth tilt' },
  momentum: { name: 'Momentum', sub: 'MOM', tiltPos: 'recent winners', tiltNeg: 'recent losers' },
  quality: { name: 'Quality', sub: 'QMJ', tiltPos: 'profitable, stable', tiltNeg: 'junk tilt' },
  lowvol: { name: 'Low Volatility', sub: 'BAB', tiltPos: 'defensive', tiltNeg: 'aggressive' }
}

// Market loading is raw (0→1.5ish). Others are standardized exposures
// centered roughly on 0. Normalize the two separately so bars stay
// comparable.
const MAX_ACTIVE = 0.6

function benchmarkPct(f: FactorLoading): number {
  if (f.factor === 'market') return 50 // benchmark β is 1, that's our "center"
  const b = Math.max(-MAX_ACTIVE, Math.min(MAX_ACTIVE, f.benchmark))
  return 50 + (b / MAX_ACTIVE) * 50
}

function portfolioPct(f: FactorLoading): number {
  if (f.factor === 'market') {
    // For market, show β on a 0..1.5 scale so benchmark (β=1) sits at the center (50%).
    const p = Math.max(0, Math.min(1.5, f.portfolio))
    return (p / 1.5) * 100
  }
  const p = Math.max(-MAX_ACTIVE, Math.min(MAX_ACTIVE, f.portfolio))
  return 50 + (p / MAX_ACTIVE) * 50
}

function tiltLabel(f: FactorLoading): string {
  const meta = FACTOR_META[f.factor]
  if (Math.abs(f.active) < 0.04) return 'neutral'
  return f.active >= 0 ? meta.tiltPos : meta.tiltNeg
}

function fmtExposure(f: FactorLoading): string {
  if (f.factor === 'market') return f.portfolio.toFixed(2)
  const sign = f.active >= 0 ? '+' : '−'
  return `${sign}${Math.abs(f.active).toFixed(2)}`
}

function significance(t: number): 'strong' | 'weak' | 'noise' {
  const a = Math.abs(t)
  if (a >= 2) return 'strong'
  if (a >= 1) return 'weak'
  return 'noise'
}

const rows = computed(() =>
  props.factors.map((f) => ({
    factor: f,
    meta: FACTOR_META[f.factor],
    barLeft: Math.min(benchmarkPct(f), portfolioPct(f)),
    barWidth: Math.abs(portfolioPct(f) - benchmarkPct(f)),
    benchPos: benchmarkPct(f),
    portfolioPos: portfolioPct(f),
    tilt: tiltLabel(f),
    sig: significance(f.tStat),
    value: fmtExposure(f)
  }))
)
</script>

<template>
  <ul class="fec-rows" role="list">
    <li class="fec-head">
      <div />
      <div class="fec-axis" aria-hidden="true">
        <span>underweight</span>
        <span>benchmark</span>
        <span>overweight</span>
      </div>
      <div class="fec-head-right">exposure</div>
      <div class="fec-head-right">tilt</div>
    </li>
    <li
      v-for="row in rows"
      :key="row.factor.factor"
      class="fec-row"
      :class="{ 'fec-row-selected': row.factor.factor === selectedFactor }"
      @mouseenter="emit('hover', row.factor.factor)"
      @mouseleave="emit('hover', null)"
      @click="emit('select', row.factor.factor)"
    >
      <div class="fec-label">
        <span class="fec-name">{{ row.meta.name }}</span>
        <span class="fec-sub">{{ row.meta.sub }}</span>
      </div>
      <div class="fec-track">
        <div class="fec-zero" aria-hidden="true" />
        <div
          class="fec-connector"
          :class="row.factor.active >= 0 ? 'fec-up' : 'fec-down'"
          :style="{ left: row.barLeft + '%', width: row.barWidth + '%' }"
        />
        <div class="fec-bench" :style="{ left: row.benchPos + '%' }" aria-label="benchmark" />
        <div
          class="fec-port"
          :class="[row.factor.active >= 0 ? 'fec-up' : 'fec-down', `fec-sig-${row.sig}`]"
          :style="{ left: row.portfolioPos + '%' }"
          aria-label="portfolio"
        />
      </div>
      <div class="fec-value num" :class="row.factor.active >= 0 ? 'up' : 'down'">
        {{ row.value }}
      </div>
      <div class="fec-tilt">{{ row.tilt }}</div>
    </li>
  </ul>
</template>

<style scoped>
.fec-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.fec-head {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 70px 110px;
  align-items: end;
  gap: 12px;
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 6px;
}
.fec-axis {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-4);
}
.fec-head-right {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  text-align: right;
}
.fec-head-right:last-child {
  text-align: left;
}
.fec-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 70px 110px;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 140ms ease;
}
.fec-row:hover {
  background: var(--primary-soft-07, rgba(127, 127, 127, 0.05));
}
.fec-row-selected {
  background: var(--primary-soft-07, rgba(127, 127, 127, 0.06));
}
.fec-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fec-name {
  font-size: 13px;
  color: var(--text-1);
  font-weight: 500;
  letter-spacing: -0.005em;
}
.fec-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.fec-track {
  position: relative;
  height: 22px;
}
.fec-zero {
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: var(--border);
}
.fec-connector {
  position: absolute;
  top: 9px;
  bottom: 9px;
  border-radius: 1px;
  opacity: 0.4;
}
.fec-connector.fec-up {
  background: var(--gain);
}
.fec-connector.fec-down {
  background: var(--loss);
}
.fec-bench {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  margin-left: -1px;
  background: var(--secondary, var(--text-3));
  opacity: 0.7;
}
.fec-port {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  margin-left: -6px;
  border-radius: 50%;
  border: 2px solid var(--panel);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}
.fec-port.fec-up {
  background: var(--gain);
}
.fec-port.fec-down {
  background: var(--loss);
}
.fec-port.fec-sig-weak {
  opacity: 0.55;
}
.fec-port.fec-sig-noise {
  opacity: 0.35;
}
.fec-row:hover .fec-port,
.fec-row-selected .fec-port {
  transform: scale(1.25);
  box-shadow: 0 0 0 3px var(--primary-glow, rgba(255, 255, 255, 0.1));
}
.fec-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text-2);
}
.fec-value.up {
  color: var(--gain);
}
.fec-value.down {
  color: var(--loss);
}
.fec-tilt {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.01em;
}
.num {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
</style>
