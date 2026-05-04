<script setup lang="ts">
import { computed } from 'vue'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'
import { formatSignedPercent } from '@/util/format'
import type { AnnualReturn } from '@/util/returns'

const props = defineProps<{
  annual: AnnualReturn[]
  highlightedYear?: number | null
}>()

const emit = defineEmits<{
  'year-hover': [year: number | null]
  'year-select': [year: number]
}>()

const sorted = computed(() => [...props.annual].sort((a, b) => b.year - a.year))

const maxAbs = computed(() => {
  let max = 0
  for (const a of props.annual) {
    const m = Math.max(Math.abs(a.portfolio), Math.abs(a.benchmark))
    if (m > max) max = m
  }
  return max === 0 ? 1 : max
})

function barValue(v: number): number {
  return Math.min(1, Math.abs(v) / maxAbs.value)
}

function rowClass(year: number): string {
  if (props.highlightedYear == null) return ''
  return props.highlightedYear === year ? 'is-highlighted' : 'is-dimmed'
}
</script>

<template>
  <ul class="arl">
    <li
      v-for="a in sorted"
      :key="a.year"
      :class="rowClass(a.year)"
      role="button"
      tabindex="0"
      :aria-label="`View details for ${a.year}`"
      @mouseenter="emit('year-hover', a.year)"
      @mouseleave="emit('year-hover', null)"
      @focus="emit('year-hover', a.year)"
      @blur="emit('year-hover', null)"
      @click="emit('year-select', a.year)"
      @keydown.enter.prevent="emit('year-select', a.year)"
      @keydown.space.prevent="emit('year-select', a.year)"
    >
      <div class="arl-top">
        <span class="arl-year">{{ a.year }}</span>
        <span class="arl-pf num" :class="a.portfolio >= 0 ? 'up' : 'down'">
          {{ formatSignedPercent(a.portfolio) }}
        </span>
      </div>
      <AnimatedBar
        :value="barValue(a.portfolio)"
        :gradient="a.portfolio >= 0 ? 'var(--grad-primary-to-gain)' : 'var(--grad-gain-to-warn)'"
        :animate="true"
        style="margin-top: 4px"
      />
      <div class="arl-bot">
        <span class="arl-bench num">bench {{ formatSignedPercent(a.benchmark) }}</span>
        <span class="arl-delta" :class="a.delta >= 0 ? 'up' : 'down'">
          {{ a.delta >= 0 ? '+' : '' }}{{ (a.delta * 100).toFixed(2) }}pp
        </span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.arl {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 720px;
  overflow-y: auto;
}
.arl li {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  border-radius: 2px;
  transition:
    background 180ms ease,
    opacity 180ms ease;
  cursor: pointer;
  outline: none;
}
.arl li:focus-visible {
  box-shadow: 0 0 0 2px var(--primary-glow);
}
.arl li:last-child {
  border-bottom: none;
}
.arl li.is-highlighted {
  background: var(--primary-soft-07);
}
.arl li.is-dimmed {
  opacity: 0.45;
}
.arl-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.arl-year {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--text-2);
  font-weight: 500;
}
.arl-pf {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 500;
}
.arl-pf.up {
  color: var(--gain);
}
.arl-pf.down {
  color: var(--loss);
}
.arl-bot {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-3);
}
.arl-bench {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.arl-delta {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 11px;
}
.arl-delta.up {
  color: var(--gain);
  background: var(--gain-soft-15);
}
.arl-delta.down {
  color: var(--loss);
  background: var(--loss-soft-15);
}
</style>
