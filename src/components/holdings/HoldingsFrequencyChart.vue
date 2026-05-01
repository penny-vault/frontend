<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'
import { computeTickerFrequency } from '@/util/holdings'

const props = defineProps<{
  entries: HoldingsHistoryEntry[]
}>()

const emit = defineEmits<{
  'hover-ticker': [ticker: string | null]
}>()

const TOP_N = 10
const expanded = ref(false)

const freq = computed(() => computeTickerFrequency(props.entries))
const visible = computed(() => (expanded.value ? freq.value : freq.value.slice(0, TOP_N)))
const remaining = computed(() => Math.max(0, freq.value.length - TOP_N))

function onEnter(ticker: string) {
  emit('hover-ticker', ticker)
}
function onLeave() {
  emit('hover-ticker', null)
}
</script>

<template>
  <section class="freq">
    <header class="freq-header">
      <span>Holdings Frequency</span>
      <span class="freq-meta">{{ freq.length }} tickers</span>
    </header>

    <ol class="freq-list" :class="{ 'is-expanded': expanded }">
      <li
        v-for="(item, idx) in visible"
        :key="item.ticker"
        class="freq-row"
        @mouseenter="onEnter(item.ticker)"
        @mouseleave="onLeave"
      >
        <span class="freq-rank">{{ idx + 1 }}</span>
        <span class="freq-ticker">{{ item.ticker }}</span>
        <span class="freq-bar" aria-hidden="true">
          <span class="freq-fill" :style="{ width: item.percentOfMonths * 100 + '%' }" />
        </span>
        <span class="freq-pct num"> {{ Math.round(item.percentOfMonths * 100) }}% </span>
      </li>
    </ol>

    <button v-if="remaining > 0" type="button" class="freq-toggle" @click="expanded = !expanded">
      {{ expanded ? `Show top ${TOP_N}` : `Show all (${freq.length})` }}
    </button>
  </section>
</template>

<style scoped>
.freq {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
}
.freq-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 14px;
}
.freq-meta {
  font-size: 10px;
  color: var(--text-4);
  letter-spacing: 0.08em;
}

.freq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.freq-list.is-expanded {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.freq-row {
  display: grid;
  grid-template-columns: 18px 56px 1fr 44px;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 12px;
  color: var(--text-2);
  border-bottom: 1px solid transparent;
  transition: color 0.15s ease;
}
.freq-row:hover {
  color: var(--text-1);
}
.freq-row:hover .freq-fill {
  filter: brightness(1.15);
}

.freq-rank {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 10px;
  color: var(--text-5);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.freq-ticker {
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-1);
}
.freq-bar {
  position: relative;
  height: 6px;
  background: var(--hover-surface);
  border-radius: 2px;
  overflow: hidden;
}
.freq-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--gain));
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.freq-pct {
  font-size: 11px;
  text-align: right;
  color: var(--text-2);
}

.freq-toggle {
  margin-top: 12px;
  width: 100%;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-3);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 8px 10px;
  border-radius: 3px;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}
.freq-toggle:hover {
  color: var(--text-1);
  border-color: var(--text-4);
  background: var(--hover-surface);
}
</style>
