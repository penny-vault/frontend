<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import type { CrisisEpisode } from '@/composables/usePortfolioRisk'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  episodes: CrisisEpisode[]
}>()

const flipped = ref<Set<string>>(new Set())

function toggle(key: string): void {
  const next = new Set(flipped.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  flipped.value = next
}

function onKey(e: KeyboardEvent, key: string): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle(key)
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatTick(ts: number): string {
  const d = new Date(ts)
  return `${MONTHS[d.getUTCMonth()] ?? ''} '${String(d.getUTCFullYear()).slice(2)}`
}

const globalYMin = computed(() => {
  let m = 0
  for (const ep of props.episodes) {
    for (const pt of ep.days) {
      if (pt.portfolio < m) m = pt.portfolio
      if (pt.benchmark < m) m = pt.benchmark
    }
  }
  return Math.floor(m * 100) - 2 // percent, a little padding below
})

function optionFor(episode: CrisisEpisode): EChartsOption {
  const p = palette.value
  const pf: [string, number][] = episode.days.map((d) => [d.date, d.portfolio * 100])
  const bn: [string, number][] = episode.days.map((d) => [d.date, d.benchmark * 100])
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.panel,
      borderColor: p.border,
      textStyle: { color: p.text1 },
      valueFormatter: (v: unknown) =>
        typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)
    },
    grid: { left: 44, right: 10, top: 10, bottom: 22 },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: p.text3,
        fontSize: 10,
        hideOverlap: true,
        formatter: formatTick
      },
      axisLine: { lineStyle: { color: p.border } },
      minInterval: 1000 * 3600 * 24 * 20
    },
    yAxis: {
      type: 'value',
      max: 0,
      min: globalYMin.value,
      axisLabel: { color: p.text3, fontSize: 10, formatter: '{value}%' },
      splitLine: { show: false }
    },
    series: [
      {
        type: 'line',
        data: pf,
        showSymbol: false,
        lineStyle: { width: 1.5, color: p.primary },
        areaStyle: { color: p.primarySoft15, origin: 0 },
        itemStyle: { color: p.primary }
      },
      {
        type: 'line',
        data: bn,
        showSymbol: false,
        lineStyle: { width: 1, color: p.secondary },
        itemStyle: { color: p.secondary }
      }
    ]
  }
}
</script>

<template>
  <div v-if="episodes.length === 0" class="csm-empty">No major drawdown episodes</div>
  <div v-else class="csm">
    <article
      v-for="ep in episodes"
      :key="ep.label"
      class="csm-item"
      role="button"
      tabindex="0"
      :aria-pressed="flipped.has(ep.label)"
      :aria-label="`${ep.label} — click to see details`"
      @click="toggle(ep.label)"
      @keydown="onKey($event, ep.label)"
    >
      <div class="csm-card" :class="{ 'csm-flipped': flipped.has(ep.label) }">
        <div class="csm-face csm-front">
          <header class="csm-head">
            <h3 class="csm-label">{{ ep.label }}</h3>
            <div class="csm-depths">
              <span class="csm-depth num csm-depth-port">{{ (ep.depth * 100).toFixed(1) }}%</span>
              <span class="csm-depth num csm-depth-bench">{{ (ep.benchmarkDepth * 100).toFixed(1) }}%</span>
            </div>
          </header>
          <VChart class="csm-chart" :option="optionFor(ep)" autoresize />
          <span class="csm-hint" aria-hidden="true">ⓘ</span>
        </div>
        <div class="csm-face csm-back">
          <h3 class="csm-label">{{ ep.label }}</h3>
          <p class="csm-desc">{{ ep.description }}</p>
          <div class="csm-reveals">
            <span class="csm-reveals-label">What it reveals</span>
            <p class="csm-reveals-text">{{ ep.reveals }}</p>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.csm {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.csm-item {
  perspective: 1000px;
  cursor: pointer;
  outline: none;
  border-radius: 2px;
  min-height: 210px;
}
.csm-item:focus-visible {
  box-shadow: 0 0 0 2px var(--primary);
}
.csm-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 210px;
  transform-style: preserve-3d;
  transition: transform 450ms cubic-bezier(0.4, 0, 0.2, 1);
}
.csm-card.csm-flipped {
  transform: rotateY(180deg);
}
.csm-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}
.csm-front {
  transform: rotateY(0deg);
}
.csm-back {
  transform: rotateY(180deg);
  gap: 12px;
}
.csm-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.csm-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
}
.csm-depths {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.csm-depth {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.csm-depth-port {
  color: var(--primary);
}
.csm-depth-bench {
  color: var(--secondary);
}
.csm-chart {
  width: 100%;
  height: 140px;
}
.csm-hint {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 11px;
  color: var(--text-4);
  opacity: 0.55;
  pointer-events: none;
}
.csm-desc {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-2);
}
.csm-reveals {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.csm-reveals-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-4);
  margin-bottom: 4px;
}
.csm-reveals-text {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-2);
}
.csm-empty {
  padding: 40px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}

@media (prefers-reduced-motion: reduce) {
  .csm-card {
    transition: none;
  }
}
</style>
