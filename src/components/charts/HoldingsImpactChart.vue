<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  HoldingsImpactPeriod,
  HoldingsImpactPeriodKey,
  HoldingsImpactResponse
} from '@/api/endpoints/portfolios'

const props = defineProps<{
  impact: HoldingsImpactResponse
}>()

const selectedPeriodKey = ref<HoldingsImpactPeriodKey>('inception')
const removed = ref<Set<string>>(new Set())

// Reset removals when the period changes — a removal only makes sense
// in the context of its own period.
function switchPeriod(key: HoldingsImpactPeriodKey): void {
  if (key === selectedPeriodKey.value) return
  selectedPeriodKey.value = key
  removed.value = new Set()
}

function toggleTicker(ticker: string): void {
  const next = new Set(removed.value)
  if (next.has(ticker)) next.delete(ticker)
  else next.add(ticker)
  removed.value = next
}

const period = computed<HoldingsImpactPeriod>(() => {
  const match = props.impact.periods.find((p) => p.period === selectedPeriodKey.value)
  return match ?? props.impact.periods[0]!
})

// Convert a cumulative contribution (its share of the period's cumulative
// return) into a contribution to the *annualized* return. Scales linearly
// by the period's annualized:cumulative ratio so sum(annualized
// contributions) ≈ period.annualizedReturn. This is the number users
// actually understand — "this holding added X% to my annualized return"
// — and no single holding can exceed the annualized total.
function annualizedContribution(rawContribution: number): number {
  const p = period.value
  if (p.cumulativeReturn === 0) return 0
  return (rawContribution / p.cumulativeReturn) * p.annualizedReturn
}

const maxAbs = computed(() => {
  let m = 0
  for (const it of period.value.items) {
    const a = Math.abs(annualizedContribution(it.contribution))
    if (a > m) m = a
  }
  return m === 0 ? 1 : m
})

function pctBar(rawContribution: number): number {
  return (Math.abs(annualizedContribution(rawContribution)) / maxAbs.value) * 50
}

// We always compute the "original" annualized from the cumulative the
// same way we compute the adjusted one, so the two match exactly when
// nothing is removed.
function annualize(cum: number, years: number): number {
  if (years <= 0) return 0
  const base = 1 + cum
  if (base <= 0) return -1
  return Math.pow(base, 1 / years) - 1
}

const originalAnnualized = computed(() =>
  annualize(period.value.cumulativeReturn, period.value.years)
)

const adjustedCumulative = computed(() => {
  const p = period.value
  const removedSum = p.items
    .filter((it) => removed.value.has(it.ticker))
    .reduce((s, it) => s + it.contribution, 0)
  return p.cumulativeReturn - removedSum
})

const adjustedAnnualized = computed(() => annualize(adjustedCumulative.value, period.value.years))

const removedCount = computed(() => removed.value.size)
const deltaPp = computed(() => (adjustedAnnualized.value - originalAnnualized.value) * 100)

function fmtSignedPct(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${Math.abs(v * 100).toFixed(2)}%`
}
function fmtDelta(pctValue: number): string {
  const sign = pctValue >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pctValue).toFixed(2)}%`
}
</script>

<template>
  <div class="hac">
    <div class="hac-controls">
      <div class="hac-period-tabs" role="tablist" aria-label="Period">
        <button
          v-for="p in impact.periods"
          :key="p.period"
          type="button"
          role="tab"
          :aria-selected="p.period === selectedPeriodKey"
          class="hac-period-tab"
          :class="{ 'hac-period-tab-active': p.period === selectedPeriodKey }"
          @click="switchPeriod(p.period)"
        >
          {{ p.label }}
        </button>
      </div>
      <div class="hac-summary">
        <div class="hac-summary-block">
          <span class="hac-summary-label">Annualized return</span>
          <span class="hac-summary-value" :class="{ 'hac-summary-value-adj': removedCount > 0 }">
            {{ fmtSignedPct(adjustedAnnualized) }}
          </span>
          <span class="hac-summary-sub">
            <template v-if="removedCount === 0">—</template>
            <template v-else>
              was {{ fmtSignedPct(originalAnnualized) }} · {{ fmtDelta(deltaPp) }}
            </template>
          </span>
        </div>
      </div>
    </div>

    <ul class="hac-rows">
      <li class="hac-head-row">
        <div class="hac-col-head">Ticker</div>
        <div class="hac-col-head hac-col-head-center">Contribution to annualized return</div>
        <div class="hac-col-head hac-col-head-right">Contribution</div>
        <div class="hac-col-head hac-col-head-right">Avg weight</div>
      </li>
      <li
        v-for="item in period.items"
        :key="item.ticker"
        class="hac-row"
        :class="{ 'hac-row-removed': removed.has(item.ticker) }"
        @click="toggleTicker(item.ticker)"
      >
        <div class="hac-ticker">{{ item.ticker }}</div>
        <div class="hac-bar-track">
          <div class="hac-bar-mid" aria-hidden="true" />
          <div
            class="hac-bar"
            :class="item.contribution >= 0 ? 'hac-bar-up' : 'hac-bar-down'"
            :style="
              item.contribution >= 0
                ? { left: '50%', width: pctBar(item.contribution) + '%' }
                : { right: '50%', width: pctBar(item.contribution) + '%' }
            "
          />
        </div>
        <div class="hac-contrib num">
          {{ fmtSignedPct(annualizedContribution(item.contribution)) }}
        </div>
        <div class="hac-weight num">{{ (item.avgWeight * 100).toFixed(1) }}%</div>
      </li>
      <li v-if="period.rest.count > 0" class="hac-row hac-row-rest">
        <div class="hac-ticker hac-ticker-rest">
          {{ period.rest.count }} other{{ period.rest.count === 1 ? '' : 's' }}
        </div>
        <div class="hac-bar-track">
          <div class="hac-bar-mid" aria-hidden="true" />
          <div
            class="hac-bar"
            :class="period.rest.contribution >= 0 ? 'hac-bar-up' : 'hac-bar-down'"
            :style="
              period.rest.contribution >= 0
                ? { left: '50%', width: pctBar(period.rest.contribution) + '%' }
                : { right: '50%', width: pctBar(period.rest.contribution) + '%' }
            "
          />
        </div>
        <div class="hac-contrib num">
          {{ fmtSignedPct(annualizedContribution(period.rest.contribution)) }}
        </div>
        <div class="hac-weight num">—</div>
      </li>
    </ul>

    <p class="hac-help">
      Click a row to remove that holding and see the impact on annualized return.
    </p>
  </div>
</template>

<style scoped>
.hac {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hac-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hac-period-tabs {
  display: inline-flex;
  gap: 2px;
  background: var(--border);
  padding: 2px;
  border-radius: 3px;
}
.hac-period-tab {
  background: transparent;
  border: none;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  cursor: pointer;
  border-radius: 2px;
  transition:
    background 160ms ease,
    color 160ms ease;
}
.hac-period-tab:hover {
  color: var(--text-1);
}
.hac-period-tab-active {
  background: var(--panel);
  color: var(--text-1);
}
.hac-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hac-summary-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.hac-summary-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hac-summary-value {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 22px;
  font-weight: 300;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.hac-summary-value-adj {
  color: var(--secondary);
}
.hac-summary-sub {
  font-size: 11px;
  color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 1em;
}

.hac-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.hac-head-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 80px 64px;
  gap: 10px;
  padding: 0 4px 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.hac-col-head {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.hac-col-head-center {
  text-align: center;
}
.hac-col-head-right {
  text-align: right;
}
.hac-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 80px 64px;
  align-items: center;
  gap: 10px;
  padding: 5px 4px;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
  transition:
    background 140ms ease,
    opacity 160ms ease;
}
.hac-row:hover {
  background: var(--primary-soft-07, rgba(127, 127, 127, 0.05));
}
.hac-row-removed {
  opacity: 0.35;
}
.hac-row-removed .hac-ticker,
.hac-row-removed .hac-contrib,
.hac-row-removed .hac-weight {
  text-decoration: line-through;
}
.hac-row-rest {
  opacity: 0.75;
  cursor: default;
  pointer-events: none;
}
.hac-ticker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--text-1);
  font-weight: 500;
}
.hac-ticker-rest {
  color: var(--text-3);
  font-style: italic;
}
.hac-bar-track {
  position: relative;
  height: 14px;
  border-radius: 2px;
  overflow: hidden;
}
.hac-bar-mid {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  opacity: 0.8;
}
.hac-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 1px;
}
.hac-bar-up {
  background: var(--gain);
  opacity: 0.75;
}
.hac-bar-down {
  background: var(--loss);
  opacity: 0.75;
}
.hac-contrib {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  text-align: right;
}
.hac-weight {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
  text-align: right;
}
.hac-help {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
}
</style>
