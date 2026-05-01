<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { useChartPalette } from '@/util/chart-theme'

const palette = useChartPalette()

const props = defineProps<{
  sortino: number
}>()

const MAX = 4

const clamped = computed(() => Math.max(0, Math.min(MAX, props.sortino)))

const zones = computed(() => {
  const p = palette.value
  return [
    { range: '0–1', label: 'poor', color: p.loss },
    { range: '1–2', label: 'ok', color: p.secondary },
    { range: '2–3', label: 'good', color: p.gain },
    { range: '3+', label: 'great', color: p.gain }
  ]
})

const activeIndex = computed(() => {
  const v = props.sortino
  if (v < 1) return 0
  if (v < 2) return 1
  if (v < 3) return 2
  return 3
})

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    series: [
      {
        type: 'gauge',
        radius: '100%',
        center: ['50%', '88%'],
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: MAX,
        splitNumber: 0,
        axisLine: {
          lineStyle: {
            width: 5,
            color: [
              [0.25, p.loss],
              [0.5, p.secondary],
              [0.75, p.gain],
              [1, p.gain]
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { width: 2, length: '80%', itemStyle: { color: p.text1 } },
        anchor: { show: true, size: 4, itemStyle: { color: p.text1 } },
        detail: { show: false },
        title: { show: false },
        data: [{ value: clamped.value }]
      }
    ]
  }
})
</script>

<template>
  <div class="sg-wrap">
    <VChart class="sg-chart" :option="chartOption" autoresize />
    <div class="sg-tip">
      <div
        v-for="(z, i) in zones"
        :key="z.range"
        class="sg-tip-row"
        :class="{ 'sg-tip-active': i === activeIndex }"
      >
        <span class="sg-tip-range" :style="{ color: z.color }">{{ z.range }}</span>
        <span class="sg-tip-label">{{ z.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sg-wrap {
  position: relative;
  width: 100%;
}
.sg-chart {
  width: 100%;
  height: 44px;
}
.sg-tip {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 10;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 6px 9px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}
.sg-wrap:hover .sg-tip {
  opacity: 1;
}
.sg-tip-row {
  display: flex;
  gap: 8px;
  font-size: 10px;
  align-items: baseline;
  color: var(--text-3);
}
.sg-tip-row.sg-tip-active {
  color: var(--text-1);
  font-weight: 500;
}
.sg-tip-range {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  min-width: 26px;
}
.sg-tip-label {
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
