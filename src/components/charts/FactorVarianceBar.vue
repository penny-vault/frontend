<script setup lang="ts">
import { computed } from 'vue'
import type { FactorKey, FactorLoading } from '@/api/endpoints/portfolios'

const props = defineProps<{
  factors: FactorLoading[]
  idiosyncraticShare: number
  rSquared: number
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

const FACTOR_COLORS: Record<FactorKey, string> = {
  market: 'var(--primary)',
  size: 'var(--accent-3, #d4a04e)',
  value: 'var(--accent-2, #7aa8c7)',
  momentum: 'var(--gain)',
  quality: 'var(--accent-1, #c8a2c8)',
  lowvol: 'var(--secondary)'
}

interface Segment {
  key: string
  factor: FactorKey | null
  name: string
  share: number
  color: string
}

const segments = computed<Segment[]>(() => {
  const sorted = [...props.factors].sort((a, b) => b.varianceShare - a.varianceShare)
  const segs: Segment[] = sorted.map((f) => ({
    key: f.factor,
    factor: f.factor,
    name: FACTOR_NAMES[f.factor],
    share: f.varianceShare,
    color: FACTOR_COLORS[f.factor]
  }))
  segs.push({
    key: 'idio',
    factor: null,
    name: 'Idiosyncratic',
    share: props.idiosyncraticShare,
    color: 'var(--border)'
  })
  return segs
})

function pct(v: number): string {
  return (v * 100).toFixed(0) + '%'
}
</script>

<template>
  <div class="fvb">
    <div class="fvb-headline">
      <div class="fvb-r2">
        <span class="fvb-r2-label">R²</span>
        <span class="fvb-r2-value num">{{ rSquared.toFixed(2) }}</span>
      </div>
      <div class="fvb-r2-expl">
        <span>{{ pct(rSquared) }}</span> of variance is explained by these six factors
      </div>
    </div>

    <div class="fvb-bar" role="list">
      <div
        v-for="seg in segments"
        :key="seg.key"
        class="fvb-seg"
        :class="{
          'fvb-seg-selected': seg.factor && seg.factor === selectedFactor,
          'fvb-seg-idio': seg.key === 'idio'
        }"
        :style="{ flexGrow: seg.share, background: seg.color }"
        @mouseenter="seg.factor && emit('select', seg.factor)"
        @mouseleave="emit('select', null)"
        @click="seg.factor && emit('select', seg.factor)"
        role="listitem"
        :aria-label="`${seg.name} ${pct(seg.share)}`"
      >
        <span class="fvb-seg-label">{{ seg.name }}</span>
      </div>
    </div>

    <ul class="fvb-legend">
      <li
        v-for="seg in segments"
        :key="seg.key"
        class="fvb-legend-item"
        :class="{
          'fvb-legend-item-selected': seg.factor && seg.factor === selectedFactor
        }"
        @mouseenter="seg.factor && emit('select', seg.factor)"
        @mouseleave="emit('select', null)"
      >
        <span class="fvb-swatch" :style="{ background: seg.color }" />
        <span class="fvb-legend-name">{{ seg.name }}</span>
        <span class="fvb-legend-pct num">{{ pct(seg.share) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.fvb {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fvb-headline {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}
.fvb-r2 {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.fvb-r2-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.fvb-r2-value {
  font-size: 22px;
  font-weight: 300;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.fvb-r2-expl {
  font-size: 12px;
  color: var(--text-3);
}
.fvb-r2-expl span {
  color: var(--text-1);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.fvb-bar {
  display: flex;
  height: 36px;
  border-radius: 2px;
  overflow: hidden;
  gap: 2px;
  background: var(--bg-alt);
}
.fvb-seg {
  position: relative;
  min-width: 4px;
  cursor: pointer;
  transition: filter 160ms ease, flex-grow 200ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.fvb-seg:first-child {
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
}
.fvb-seg:last-child {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
.fvb-seg-idio {
  cursor: default;
  opacity: 0.55;
}
.fvb-seg:hover,
.fvb-seg-selected {
  filter: brightness(1.18);
}
.fvb-seg-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bg);
  opacity: 0;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  transition: opacity 160ms ease;
}
.fvb-seg:hover .fvb-seg-label,
.fvb-seg-selected .fvb-seg-label {
  opacity: 1;
}
.fvb-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 6px 16px;
}
.fvb-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-2);
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 2px;
  transition: background 140ms ease;
}
.fvb-legend-item:hover,
.fvb-legend-item-selected {
  background: var(--primary-soft-07, rgba(127, 127, 127, 0.05));
}
.fvb-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 1px;
  flex-shrink: 0;
}
.fvb-legend-name {
  flex: 1;
  color: var(--text-2);
}
.fvb-legend-pct {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
  font-size: 11px;
}
.num {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
</style>
