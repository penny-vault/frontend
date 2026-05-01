<script setup lang="ts">
import { computed } from 'vue'
import type { FactorKey, FactorLoading } from '@/api/endpoints/portfolios'

const props = defineProps<{
  loading: FactorLoading
}>()

const FACTOR_META: Record<FactorKey, { name: string; blurb: string }> = {
  market: {
    name: 'Market',
    blurb:
      "Overall sensitivity to broad equity. β=1.0 moves one-for-one with the benchmark; below 1.0 means less swing in both directions."
  },
  size: {
    name: 'Size (SMB)',
    blurb:
      'Small-minus-big. Positive exposure means a small-cap tilt relative to a market-cap-weighted benchmark.'
  },
  value: {
    name: 'Value (HML)',
    blurb:
      'High-minus-low book-to-market. Positive exposure tilts toward cheap stocks; negative tilts toward growth.'
  },
  momentum: {
    name: 'Momentum',
    blurb:
      'Past 12-2 month winners vs losers. Positive exposure means holdings that have been trending up.'
  },
  quality: {
    name: 'Quality (QMJ)',
    blurb:
      'Profitable, stable, well-run companies vs the rest. Positive = defensive growth tilt.'
  },
  lowvol: {
    name: 'Low Volatility (BAB)',
    blurb:
      'Low-beta, low-volatility stocks. Positive = defensive tilt; negative = more volatile names.'
  }
}

const meta = computed(() => FACTOR_META[props.loading.factor])

// Sparkline path — generate SVG path from time series exposure values
const SPARK_W = 260
const SPARK_H = 64

const sparkline = computed(() => {
  const pts = props.loading.timeSeries
  if (pts.length === 0) return { path: '', area: '', points: [] as { x: number; y: number; date: string; exposure: number }[], yZero: SPARK_H, min: 0, max: 0, benchmark: 0 }
  const exposures = pts.map((p) => p.exposure)
  const raw = [...exposures, props.loading.benchmark, 0]
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const pad = (max - min) * 0.1 || 0.02
  const yMin = min - pad
  const yMax = max + pad
  const y = (v: number) => SPARK_H - ((v - yMin) / (yMax - yMin)) * SPARK_H
  const xStep = pts.length > 1 ? SPARK_W / (pts.length - 1) : 0
  const nodes = pts.map((p, i) => ({
    x: i * xStep,
    y: y(p.exposure),
    date: p.date,
    exposure: p.exposure
  }))
  const path = nodes.map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z`
  return {
    path,
    area,
    points: nodes,
    yZero: y(0),
    min: yMin,
    max: yMax,
    benchmark: y(props.loading.benchmark)
  }
})

const lastPoint = computed(() => {
  const pts = sparkline.value.points
  return pts.length > 0 ? pts[pts.length - 1]! : null
})

function fmtContribution(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${(Math.abs(v) * 100).toFixed(2)}pp`
}

function fmtExposure(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}

function maxContribAbs(rows: { contribution: number }[]): number {
  if (rows.length === 0) return 1
  return Math.max(...rows.map((r) => Math.abs(r.contribution))) || 1
}

const posMax = computed(() => maxContribAbs(props.loading.positiveDrivers))
const negMax = computed(() => maxContribAbs(props.loading.negativeDrivers))
</script>

<template>
  <div class="fd">
    <header class="fd-head">
      <div>
        <h3 class="fd-title">{{ meta.name }}</h3>
        <p class="fd-blurb">{{ meta.blurb }}</p>
      </div>
      <div class="fd-stats">
        <div class="fd-stat">
          <span class="fd-stat-label">Exposure</span>
          <span class="fd-stat-value num">{{ fmtExposure(loading.portfolio) }}</span>
          <span class="fd-stat-sub num">
            bench {{ fmtExposure(loading.benchmark) }}
          </span>
        </div>
        <div class="fd-stat">
          <span class="fd-stat-label">Contribution</span>
          <span
            class="fd-stat-value num"
            :class="loading.returnContribution >= 0 ? 'up' : 'down'"
          >
            {{ fmtContribution(loading.returnContribution) }}
          </span>
          <span class="fd-stat-sub">to total return</span>
        </div>
        <div class="fd-stat">
          <span class="fd-stat-label">t-stat</span>
          <span
            class="fd-stat-value num"
            :class="Math.abs(loading.tStat) >= 2 ? '' : 'fd-stat-weak'"
          >
            {{ loading.tStat.toFixed(1) }}
          </span>
          <span class="fd-stat-sub">
            {{ Math.abs(loading.tStat) >= 2 ? 'significant' : 'noise' }}
          </span>
        </div>
      </div>
    </header>

    <div class="fd-grid">
      <section class="fd-spark">
        <div class="fd-section-label">Exposure drift</div>
        <svg
          class="fd-spark-svg"
          :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${meta.name} exposure over the period`"
        >
          <line
            v-if="sparkline.yZero >= 0 && sparkline.yZero <= SPARK_H"
            class="fd-spark-zero"
            :x1="0"
            :x2="SPARK_W"
            :y1="sparkline.yZero"
            :y2="sparkline.yZero"
          />
          <line
            v-if="sparkline.benchmark >= 0 && sparkline.benchmark <= SPARK_H"
            class="fd-spark-bench"
            :x1="0"
            :x2="SPARK_W"
            :y1="sparkline.benchmark"
            :y2="sparkline.benchmark"
          />
          <path class="fd-spark-area" :d="sparkline.area" />
          <path class="fd-spark-line" :d="sparkline.path" />
          <circle
            v-if="lastPoint"
            class="fd-spark-dot"
            :cx="lastPoint.x"
            :cy="lastPoint.y"
            r="3"
          />
        </svg>
        <div class="fd-spark-legend">
          <span class="fd-spark-legend-item">
            <span class="fd-swatch fd-swatch-line" />
            portfolio
          </span>
          <span class="fd-spark-legend-item">
            <span class="fd-swatch fd-swatch-bench" />
            benchmark
          </span>
        </div>
      </section>

      <section class="fd-drivers">
        <div class="fd-drivers-col">
          <div class="fd-section-label">Top contributors</div>
          <ul class="fd-driver-list">
            <li
              v-for="d in loading.positiveDrivers"
              :key="'p-' + d.ticker"
              class="fd-driver"
            >
              <span class="fd-ticker">{{ d.ticker }}</span>
              <span class="fd-driver-bar-track">
                <span
                  class="fd-driver-bar fd-driver-bar-up"
                  :style="{ width: (Math.abs(d.contribution) / posMax) * 100 + '%' }"
                />
              </span>
              <span class="fd-driver-num num">{{ fmtContribution(d.contribution) }}</span>
            </li>
            <li v-if="loading.positiveDrivers.length === 0" class="fd-driver-empty">—</li>
          </ul>
        </div>
        <div class="fd-drivers-col">
          <div class="fd-section-label">Top detractors</div>
          <ul class="fd-driver-list">
            <li
              v-for="d in loading.negativeDrivers"
              :key="'n-' + d.ticker"
              class="fd-driver"
            >
              <span class="fd-ticker">{{ d.ticker }}</span>
              <span class="fd-driver-bar-track">
                <span
                  class="fd-driver-bar fd-driver-bar-down"
                  :style="{ width: (Math.abs(d.contribution) / negMax) * 100 + '%' }"
                />
              </span>
              <span class="fd-driver-num num">{{ fmtContribution(d.contribution) }}</span>
            </li>
            <li v-if="loading.negativeDrivers.length === 0" class="fd-driver-empty">—</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fd {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.fd-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.fd-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--text-1);
}
.fd-blurb {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
  max-width: 44ch;
  line-height: 1.45;
}
.fd-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.fd-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 80px;
}
.fd-stat-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.fd-stat-value {
  font-size: 16px;
  font-weight: 300;
  color: var(--text-1);
  letter-spacing: -0.005em;
}
.fd-stat-value.up {
  color: var(--gain);
}
.fd-stat-value.down {
  color: var(--loss);
}
.fd-stat-weak {
  color: var(--text-3) !important;
}
.fd-stat-sub {
  font-size: 10px;
  color: var(--text-4);
}
.fd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 24px;
}
@media (max-width: 900px) {
  .fd-grid {
    grid-template-columns: 1fr;
  }
}
.fd-section-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 6px;
}
.fd-spark {
  display: flex;
  flex-direction: column;
}
.fd-spark-svg {
  width: 100%;
  height: 64px;
  overflow: visible;
}
.fd-spark-zero {
  stroke: var(--border);
  stroke-dasharray: 3 4;
  stroke-width: 1;
}
.fd-spark-bench {
  stroke: var(--secondary);
  stroke-dasharray: 2 3;
  stroke-width: 1;
  opacity: 0.7;
}
.fd-spark-line {
  stroke: var(--primary);
  stroke-width: 1.5;
  fill: none;
}
.fd-spark-area {
  fill: var(--primary);
  opacity: 0.08;
}
.fd-spark-dot {
  fill: var(--primary);
  stroke: var(--panel);
  stroke-width: 1.5;
}
.fd-spark-legend {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-3);
}
.fd-spark-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fd-swatch {
  display: inline-block;
  width: 10px;
  height: 2px;
  border-radius: 1px;
}
.fd-swatch-line {
  background: var(--primary);
}
.fd-swatch-bench {
  background: var(--secondary);
}
.fd-drivers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.fd-driver-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fd-driver {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 80px;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 11.5px;
}
.fd-ticker {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--text-1);
  font-weight: 500;
}
.fd-driver-bar-track {
  position: relative;
  height: 8px;
  border-radius: 1px;
  background: var(--bg-alt);
  overflow: hidden;
}
.fd-driver-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 1px;
}
.fd-driver-bar-up {
  background: var(--gain);
  opacity: 0.75;
}
.fd-driver-bar-down {
  background: var(--loss);
  opacity: 0.75;
}
.fd-driver-num {
  text-align: right;
  color: var(--text-2);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}
.fd-driver-empty {
  font-size: 11px;
  color: var(--text-4);
  padding: 3px 0;
}
.num {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
</style>
