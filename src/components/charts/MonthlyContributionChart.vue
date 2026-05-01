<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MonthlyReturn } from '@/util/returns'

type Granularity = 'month' | 'quarter' | 'year'

const props = defineProps<{
  monthly: MonthlyReturn[]
}>()

const granularity = ref<Granularity>('month')
const removed = ref<Set<string>>(new Set())

function switchGranularity(g: Granularity): void {
  if (g === granularity.value) return
  granularity.value = g
  removed.value = new Set()
}

interface Period {
  key: string
  label: string
  memberKeys: string[] // monthKeys of months in this period
  return: number // compound return for the period, decimal
}

function monthKey(m: MonthlyReturn): string {
  return `${m.year}-${String(m.month).padStart(2, '0')}`
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const allPeriods = computed<Period[]>(() => {
  if (props.monthly.length === 0) return []
  if (granularity.value === 'month') {
    return props.monthly.map((m) => {
      const k = monthKey(m)
      return {
        key: k,
        label: `${MONTHS_SHORT[m.month - 1] ?? ''} ${m.year}`,
        memberKeys: [k],
        return: m.portfolio
      }
    })
  }
  if (granularity.value === 'quarter') {
    const buckets = new Map<string, { label: string; members: MonthlyReturn[] }>()
    for (const m of props.monthly) {
      const q = Math.floor((m.month - 1) / 3) + 1
      const k = `${m.year}-Q${q}`
      const existing = buckets.get(k)
      if (existing) existing.members.push(m)
      else buckets.set(k, { label: `Q${q} ${m.year}`, members: [m] })
    }
    return Array.from(buckets.entries()).map(([k, v]) => ({
      key: k,
      label: v.label,
      memberKeys: v.members.map(monthKey),
      return: v.members.reduce((c, m) => c * (1 + m.portfolio), 1) - 1
    }))
  }
  // year
  const buckets = new Map<number, MonthlyReturn[]>()
  for (const m of props.monthly) {
    const arr = buckets.get(m.year)
    if (arr) arr.push(m)
    else buckets.set(m.year, [m])
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, members]) => ({
      key: String(year),
      label: String(year),
      memberKeys: members.map(monthKey),
      return: members.reduce((c, m) => c * (1 + m.portfolio), 1) - 1
    }))
})

const TOP_N = 8
const BOTTOM_N = 6

const displayedPeriods = computed(() => {
  const sorted = [...allPeriods.value].sort((a, b) => b.return - a.return)
  const positive = sorted.filter((p) => p.return > 0)
  const negative = sorted.filter((p) => p.return < 0)
  const top = positive.slice(0, TOP_N)
  const bottom = negative.slice(-BOTTOM_N)
  const shown = new Set([...top, ...bottom].map((p) => p.key))
  const restPeriods = sorted.filter((p) => !shown.has(p.key))
  const restReturn =
    restPeriods.length === 0
      ? 0
      : restPeriods.reduce((c, p) => c * (1 + p.return), 1) - 1
  const restMemberKeys = restPeriods.flatMap((p) => p.memberKeys)
  return {
    top,
    bottom,
    rest: {
      count: restPeriods.length,
      return: restReturn,
      memberKeys: restMemberKeys
    }
  }
})

const maxAbs = computed(() => {
  let m = 0
  for (const p of [...displayedPeriods.value.top, ...displayedPeriods.value.bottom]) {
    const a = Math.abs(p.return)
    if (a > m) m = a
  }
  return m === 0 ? 1 : m
})

function pctBar(r: number): number {
  return (Math.abs(r) / maxAbs.value) * 50
}

// All monthKeys that are "removed" (including via period rollups)
const removedMonthKeys = computed<Set<string>>(() => {
  const result = new Set<string>()
  const lookup = new Map<string, string[]>()
  for (const p of allPeriods.value) lookup.set(p.key, p.memberKeys)
  // Also handle the 'rest' rollup
  const restKeys = displayedPeriods.value.rest.memberKeys
  for (const key of removed.value) {
    if (key === '__rest__') {
      for (const mk of restKeys) result.add(mk)
      continue
    }
    const members = lookup.get(key)
    if (members) for (const mk of members) result.add(mk)
  }
  return result
})

const years = computed(() => props.monthly.length / 12)

const originalCumulative = computed(() => {
  let c = 1
  for (const m of props.monthly) c *= 1 + m.portfolio
  return c - 1
})

const adjustedCumulative = computed(() => {
  const skip = removedMonthKeys.value
  let c = 1
  for (const m of props.monthly) {
    if (skip.has(monthKey(m))) continue
    c *= 1 + m.portfolio
  }
  return c - 1
})

function annualize(cumulative: number): number {
  if (years.value <= 0) return 0
  const base = 1 + cumulative
  if (base <= 0) return -1
  return Math.pow(base, 1 / years.value) - 1
}

const originalAnnualized = computed(() => annualize(originalCumulative.value))
const adjustedAnnualized = computed(() => annualize(adjustedCumulative.value))
const removedCount = computed(() => removed.value.size)
const deltaPp = computed(() => (adjustedAnnualized.value - originalAnnualized.value) * 100)

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${Math.abs(v * 100).toFixed(2)}%`
}
function fmtDelta(pctValue: number): string {
  const sign = pctValue >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pctValue).toFixed(2)}%`
}

function toggle(key: string): void {
  const next = new Set(removed.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  removed.value = next
}

const unit = computed(() =>
  granularity.value === 'month' ? 'month' : granularity.value === 'quarter' ? 'quarter' : 'year'
)

function shareOfTotal(r: number): string {
  const denom = originalCumulative.value
  if (denom === 0) return '—'
  const v = (r / denom) * 100
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${Math.abs(v).toFixed(1)}%`
}
</script>

<template>
  <div class="mcc">
    <div class="mcc-controls">
      <div class="mcc-granularity" role="tablist" aria-label="Period granularity">
        <button
          v-for="g in (['month', 'quarter', 'year'] as Granularity[])"
          :key="g"
          type="button"
          role="tab"
          :aria-selected="g === granularity"
          class="mcc-gran-tab"
          :class="{ 'mcc-gran-tab-active': g === granularity }"
          @click="switchGranularity(g)"
        >
          {{ g === 'month' ? 'Monthly' : g === 'quarter' ? 'Quarterly' : 'Yearly' }}
        </button>
      </div>
      <div class="mcc-summary">
        <div class="mcc-summary-block">
          <span class="mcc-summary-label">Annualized return</span>
          <span class="mcc-summary-value" :class="{ 'mcc-summary-value-adj': removedCount > 0 }">
            {{ fmtPct(adjustedAnnualized) }}
          </span>
          <span class="mcc-summary-sub">
            <template v-if="removedCount === 0">—</template>
            <template v-else>
              was {{ fmtPct(originalAnnualized) }} · {{ fmtDelta(deltaPp) }}
            </template>
          </span>
        </div>
      </div>
    </div>

    <ul class="mcc-rows">
      <li class="mcc-head-row">
        <div class="mcc-col-head">Period</div>
        <div class="mcc-col-head mcc-col-head-center">Return during period</div>
        <div class="mcc-col-head mcc-col-head-right">Return</div>
        <div class="mcc-col-head mcc-col-head-right">% of total</div>
      </li>
      <li class="mcc-group-label">Best {{ unit }}s</li>
      <li
        v-for="item in displayedPeriods.top"
        :key="item.key"
        class="mcc-row"
        :class="{ 'mcc-row-removed': removed.has(item.key) }"
        @click="toggle(item.key)"
      >
        <div class="mcc-label">{{ item.label }}</div>
        <div class="mcc-bar-track">
          <div class="mcc-bar-mid" aria-hidden="true" />
          <div
            class="mcc-bar mcc-bar-up"
            :style="{ left: '50%', width: pctBar(item.return) + '%' }"
          />
        </div>
        <div class="mcc-contrib num">{{ fmtPct(item.return) }}</div>
        <div class="mcc-share num">{{ shareOfTotal(item.return) }}</div>
      </li>

      <li v-if="displayedPeriods.bottom.length > 0" class="mcc-group-label">Worst {{ unit }}s</li>
      <li
        v-for="item in displayedPeriods.bottom"
        :key="item.key"
        class="mcc-row"
        :class="{ 'mcc-row-removed': removed.has(item.key) }"
        @click="toggle(item.key)"
      >
        <div class="mcc-label">{{ item.label }}</div>
        <div class="mcc-bar-track">
          <div class="mcc-bar-mid" aria-hidden="true" />
          <div
            class="mcc-bar mcc-bar-down"
            :style="{ right: '50%', width: pctBar(item.return) + '%' }"
          />
        </div>
        <div class="mcc-contrib num">{{ fmtPct(item.return) }}</div>
        <div class="mcc-share num">{{ shareOfTotal(item.return) }}</div>
      </li>

      <li v-if="displayedPeriods.rest.count > 0" class="mcc-row mcc-row-rest">
        <div class="mcc-label mcc-label-rest">
          {{ displayedPeriods.rest.count }} other {{ unit }}{{ displayedPeriods.rest.count === 1 ? '' : 's' }}
        </div>
        <div class="mcc-bar-track">
          <div class="mcc-bar-mid" aria-hidden="true" />
          <div
            class="mcc-bar"
            :class="displayedPeriods.rest.return >= 0 ? 'mcc-bar-up' : 'mcc-bar-down'"
            :style="
              displayedPeriods.rest.return >= 0
                ? { left: '50%', width: pctBar(displayedPeriods.rest.return) + '%' }
                : { right: '50%', width: pctBar(displayedPeriods.rest.return) + '%' }
            "
          />
        </div>
        <div class="mcc-contrib num">{{ fmtPct(displayedPeriods.rest.return) }}</div>
        <div class="mcc-share num">{{ shareOfTotal(displayedPeriods.rest.return) }}</div>
      </li>
    </ul>

    <p class="mcc-help">Click a row to remove that {{ unit }} and see the impact on annualized return.</p>
  </div>
</template>

<style scoped>
.mcc {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mcc-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.mcc-granularity {
  display: inline-flex;
  gap: 2px;
  background: var(--border);
  padding: 2px;
  border-radius: 3px;
}
.mcc-gran-tab {
  background: transparent;
  border: none;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  cursor: pointer;
  border-radius: 2px;
  transition: background 160ms ease, color 160ms ease;
}
.mcc-gran-tab:hover {
  color: var(--text-1);
}
.mcc-gran-tab-active {
  background: var(--panel);
  color: var(--text-1);
}
.mcc-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}
.mcc-summary-block {
  display: flex;
  flex-direction: column;
}
.mcc-summary-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.mcc-summary-value {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 22px;
  font-weight: 300;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.mcc-summary-value-adj {
  color: var(--secondary);
}
.mcc-summary-sub {
  font-size: 11px;
  color: var(--text-3);
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 1em;
}

.mcc-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.mcc-head-row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 72px 64px;
  gap: 10px;
  padding: 0 4px 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.mcc-col-head {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.mcc-col-head-center {
  text-align: center;
}
.mcc-col-head-right {
  text-align: right;
}
.mcc-group-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 10px 4px 4px;
  border-top: 1px solid var(--border);
}
.mcc-group-label:first-child {
  border-top: none;
  padding-top: 0;
}
.mcc-row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 72px 64px;
  align-items: center;
  gap: 10px;
  padding: 5px 4px;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
  transition: background 140ms ease, opacity 160ms ease;
}
.mcc-row:hover {
  background: var(--primary-soft-07, rgba(127, 127, 127, 0.05));
}
.mcc-row-removed {
  opacity: 0.35;
}
.mcc-row-removed .mcc-label,
.mcc-row-removed .mcc-contrib {
  text-decoration: line-through;
}
.mcc-row-rest {
  opacity: 0.75;
  cursor: default;
  pointer-events: none;
}
.mcc-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--text-1);
  font-weight: 500;
}
.mcc-label-rest {
  color: var(--text-3);
  font-style: italic;
}
.mcc-bar-track {
  position: relative;
  height: 14px;
  border-radius: 2px;
  overflow: hidden;
}
.mcc-bar-mid {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  opacity: 0.8;
}
.mcc-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 1px;
}
.mcc-bar-up {
  background: var(--gain);
  opacity: 0.75;
}
.mcc-bar-down {
  background: var(--loss);
  opacity: 0.75;
}
.mcc-contrib {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  text-align: right;
}
.mcc-share {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
  text-align: right;
}
.mcc-help {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
}
</style>
