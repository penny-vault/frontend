<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Popover from 'primevue/popover'
import DatePicker from 'primevue/datepicker'
import { formatDate } from '@/util/format'

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface QuickRangeKey {
  key: string
  label: string
  group: 'calendar' | 'trailing' | 'history'
}

const props = defineProps<{
  modelValue: DateRange
  /** Portfolio inception (YYYY-MM-DD) — enables the "Since inception" quick range. */
  inceptionDate?: string | null
  /** Hard maximum for the "To" date (defaults to today). */
  maxDate?: Date
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
}>()

const popRef = ref<InstanceType<typeof Popover> | null>(null)
const draftFrom = ref<Date | null>(props.modelValue.from)
const draftTo = ref<Date | null>(props.modelValue.to)
const search = ref('')

watch(
  () => props.modelValue,
  (v) => {
    draftFrom.value = v.from
    draftTo.value = v.to
  },
  { deep: true }
)

const today = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
})

const effectiveMaxDate = computed(() => props.maxDate ?? today.value)

// --- Quick ranges --------------------------------------------------------
const QUICK_RANGES: QuickRangeKey[] = [
  { key: 'today', label: 'Today', group: 'calendar' },
  { key: 'wtd', label: 'Week to date', group: 'calendar' },
  { key: 'mtd', label: 'Month to date', group: 'calendar' },
  { key: 'qtd', label: 'Quarter to date', group: 'calendar' },
  { key: 'ytd', label: 'Year to date', group: 'calendar' },
  { key: 'last-week', label: 'Last week', group: 'calendar' },
  { key: 'last-month', label: 'Last month', group: 'calendar' },
  { key: 'last-quarter', label: 'Last quarter', group: 'calendar' },
  { key: 'last-year', label: 'Last year', group: 'calendar' },
  { key: 't30d', label: 'Last 30 days', group: 'trailing' },
  { key: 't90d', label: 'Last 90 days', group: 'trailing' },
  { key: 't6m', label: 'Last 6 months', group: 'trailing' },
  { key: 't1y', label: 'Last 1 year', group: 'trailing' },
  { key: 't3y', label: 'Last 3 years', group: 'trailing' },
  { key: 't5y', label: 'Last 5 years', group: 'trailing' },
  { key: 't10y', label: 'Last 10 years', group: 'trailing' },
  { key: 'inception', label: 'Since inception', group: 'history' },
  { key: 'all', label: 'All time', group: 'history' }
]

const visibleRanges = computed(() => {
  const hasInception = !!props.inceptionDate
  return QUICK_RANGES.filter((r) => {
    if (r.key === 'inception' && !hasInception) return false
    if (!search.value) return true
    return r.label.toLowerCase().includes(search.value.toLowerCase())
  })
})

function startOfWeek(d: Date): Date {
  // ISO week starting Monday.
  const day = d.getDay()
  const delta = (day + 6) % 7
  const s = new Date(d)
  s.setDate(s.getDate() - delta)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate())
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0)
}

function rangeFor(key: string): DateRange {
  const t = today.value
  switch (key) {
    case 'today':
      return { from: t, to: t }
    case 'wtd':
      return { from: startOfWeek(t), to: t }
    case 'mtd':
      return { from: startOfMonth(t), to: t }
    case 'qtd':
      return { from: startOfQuarter(t), to: t }
    case 'ytd':
      return { from: startOfYear(t), to: t }
    case 'last-week': {
      const start = startOfWeek(t)
      start.setDate(start.getDate() - 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: start, to: end }
    }
    case 'last-month': {
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1)
      return { from: start, to: endOfMonth(start) }
    }
    case 'last-quarter': {
      const anchor = new Date(t.getFullYear(), t.getMonth() - 3, 1)
      const start = startOfQuarter(anchor)
      return { from: start, to: endOfQuarter(start) }
    }
    case 'last-year': {
      const start = new Date(t.getFullYear() - 1, 0, 1)
      const end = new Date(t.getFullYear() - 1, 11, 31)
      return { from: start, to: end }
    }
    case 't30d': {
      const start = new Date(t)
      start.setDate(start.getDate() - 30)
      return { from: start, to: t }
    }
    case 't90d': {
      const start = new Date(t)
      start.setDate(start.getDate() - 90)
      return { from: start, to: t }
    }
    case 't6m': {
      const start = new Date(t)
      start.setMonth(start.getMonth() - 6)
      return { from: start, to: t }
    }
    case 't1y': {
      const start = new Date(t)
      start.setFullYear(start.getFullYear() - 1)
      return { from: start, to: t }
    }
    case 't3y': {
      const start = new Date(t)
      start.setFullYear(start.getFullYear() - 3)
      return { from: start, to: t }
    }
    case 't5y': {
      const start = new Date(t)
      start.setFullYear(start.getFullYear() - 5)
      return { from: start, to: t }
    }
    case 't10y': {
      const start = new Date(t)
      start.setFullYear(start.getFullYear() - 10)
      return { from: start, to: t }
    }
    case 'inception':
      if (props.inceptionDate) {
        const [y, m, d] = props.inceptionDate.split('-').map((n) => parseInt(n, 10))
        return { from: new Date(y!, (m ?? 1) - 1, d ?? 1), to: t }
      }
      return { from: null, to: null }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

// --- Active range detection ---------------------------------------------
function sameDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const activeKey = computed<string | null>(() => {
  for (const r of QUICK_RANGES) {
    const candidate = rangeFor(r.key)
    if (
      sameDay(candidate.from, props.modelValue.from) &&
      sameDay(candidate.to, props.modelValue.to)
    ) {
      return r.key
    }
  }
  return null
})

// --- Display label -------------------------------------------------------
const triggerLabel = computed(() => {
  const active = activeKey.value
  if (active) {
    const entry = QUICK_RANGES.find((r) => r.key === active)
    if (entry) return entry.label
  }
  const from = props.modelValue.from
  const to = props.modelValue.to
  if (from && to) {
    return `${formatDate(from, { month: 'short', day: 'numeric', year: 'numeric' })} – ${formatDate(to, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (from) {
    return `From ${formatDate(from, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (to) {
    return `Until ${formatDate(to, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return 'All time'
})

// --- Actions -------------------------------------------------------------
function toggle(event: Event) {
  popRef.value?.toggle(event)
}

function applyAbsolute() {
  emit('update:modelValue', { from: draftFrom.value, to: draftTo.value })
  popRef.value?.hide()
}

function applyQuick(key: string) {
  const r = rangeFor(key)
  emit('update:modelValue', r)
  popRef.value?.hide()
}

const groupedRanges = computed(() => {
  const out: Record<QuickRangeKey['group'], QuickRangeKey[]> = {
    calendar: [],
    trailing: [],
    history: []
  }
  for (const r of visibleRanges.value) out[r.group].push(r)
  return out
})

const GROUP_LABELS: Record<QuickRangeKey['group'], string> = {
  calendar: 'Calendar periods',
  trailing: 'Trailing periods',
  history: 'Full history'
}
</script>

<template>
  <div class="drp">
    <button type="button" class="drp-trigger" @click="toggle">
      <i class="pi pi-calendar" aria-hidden="true" />
      <span class="drp-trigger-label">{{ triggerLabel }}</span>
      <i class="pi pi-chevron-down drp-trigger-caret" aria-hidden="true" />
    </button>

    <Popover ref="popRef" :pt="{ root: { class: 'drp-pop' } }">
      <div class="drp-panel">
        <div class="drp-col drp-col-absolute">
          <div class="drp-heading">Absolute time range</div>
          <label class="drp-field">
            <span>From</span>
            <DatePicker
              v-model="draftFrom"
              date-format="M d, yy"
              :max-date="draftTo ?? effectiveMaxDate"
              placeholder="Start date"
              fluid
              class="drp-datepicker"
            />
          </label>
          <label class="drp-field">
            <span>To</span>
            <DatePicker
              v-model="draftTo"
              date-format="M d, yy"
              :min-date="draftFrom ?? undefined"
              :max-date="effectiveMaxDate"
              placeholder="End date"
              fluid
              class="drp-datepicker"
            />
          </label>
          <button type="button" class="drp-apply" @click="applyAbsolute">Apply time range</button>
        </div>

        <div class="drp-col drp-col-quick">
          <div class="drp-search-outer">
            <label class="drp-search-wrap">
              <i class="pi pi-search drp-search-icon" aria-hidden="true" />
              <input
                v-model="search"
                class="drp-search"
                type="text"
                placeholder="Search quick ranges"
              />
            </label>
          </div>

          <div class="drp-groups">
            <template v-for="group in ['calendar', 'trailing', 'history'] as const" :key="group">
              <div v-if="groupedRanges[group].length" class="drp-group">
                <div class="drp-group-label">{{ GROUP_LABELS[group] }}</div>
                <button
                  v-for="r in groupedRanges[group]"
                  :key="r.key"
                  type="button"
                  class="drp-quick"
                  :class="{ active: activeKey === r.key }"
                  @click="applyQuick(r.key)"
                >
                  {{ r.label }}
                </button>
              </div>
            </template>
            <div v-if="!visibleRanges.length" class="drp-empty">No matches</div>
          </div>
        </div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.drp {
  display: inline-flex;
}

/* ---- Trigger --------------------------------------------------------- */
.drp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}
.drp-trigger:hover {
  border-color: var(--text-4);
  background: var(--panel-hover);
}
.drp-trigger:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.drp-trigger .pi-calendar {
  font-size: 12px;
  color: var(--text-3);
}
.drp-trigger-label {
  font-variant-numeric: tabular-nums;
}
.drp-trigger-caret {
  font-size: 10px;
  color: var(--text-4);
  margin-left: 2px;
}
</style>

<style>
/* Unscoped — PrimeVue Popover and DatePicker panels render at document.body
   via Teleport, so styles inside them must be global to cross the shadow. */

/* ---- Popover shell overrides ---------------------------------------- */
.drp-pop.p-popover {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
  box-shadow:
    0 1px 0 0 rgba(0, 0, 0, 0.04),
    0 10px 30px -8px rgba(0, 0, 0, 0.55),
    0 2px 8px -2px rgba(0, 0, 0, 0.25) !important;
  margin-top: 6px !important;
}
.drp-pop .p-popover-content {
  padding: 0 !important;
  background: transparent !important;
  color: inherit !important;
}
.drp-pop.p-popover::before {
  border-bottom-color: var(--border) !important;
}
.drp-pop.p-popover::after {
  border-bottom-color: var(--panel) !important;
}

/* ---- Panel layout --------------------------------------------------- */
.drp-panel {
  display: grid;
  grid-template-columns: 280px 280px;
  min-height: 400px;
}
.drp-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.drp-col-absolute {
  padding: 14px 16px 16px;
  border-right: 1px solid var(--border);
  gap: 12px;
}
.drp-col-quick {
  padding: 14px 0 0;
  gap: 0;
}
.drp-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: -0.005em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

/* ---- From / To fields ----------------------------------------------- */
.drp-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.drp-field > span {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
}

.drp-datepicker.p-datepicker,
.drp-datepicker .p-datepicker {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  display: block !important;
  width: 100% !important;
}
.drp-datepicker .p-inputtext,
.drp-datepicker.p-datepicker .p-datepicker-input,
.drp-datepicker .p-datepicker-input {
  width: 100% !important;
  background: var(--bg-alt) !important;
  border: 1px solid var(--border) !important;
  border-radius: 3px !important;
  padding: 7px 10px !important;
  color: var(--text-1) !important;
  font: inherit !important;
  font-size: 13px !important;
  height: 34px !important;
  box-shadow: none !important;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease !important;
}
.drp-datepicker .p-inputtext:hover,
.drp-datepicker .p-datepicker-input:hover {
  border-color: var(--text-4) !important;
}
.drp-datepicker .p-inputtext:focus,
.drp-datepicker .p-datepicker-input:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 2px var(--primary-soft-25) !important;
  outline: none !important;
}
.drp-datepicker .p-inputtext::placeholder,
.drp-datepicker .p-datepicker-input::placeholder {
  color: var(--text-4) !important;
}

/* ---- Apply button --------------------------------------------------- */
.drp-apply {
  appearance: none;
  margin-top: 4px;
  align-self: flex-start;
  background: var(--primary);
  color: var(--primary-fg);
  border: 1px solid var(--primary);
  border-radius: 3px;
  padding: 8px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    filter 140ms ease,
    box-shadow 140ms ease;
}
.drp-apply:hover {
  filter: brightness(1.08);
}
.drp-apply:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-soft-25);
}

/* ---- Quick ranges (right column) ----------------------------------- */
.drp-search-outer {
  padding: 0 16px 12px;
  border-bottom: 1px solid var(--border);
}
.drp-search-wrap {
  position: relative;
  display: block;
}
.drp-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-4);
  pointer-events: none;
}
.drp-search {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 30px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-1);
  font: inherit;
  font-size: 12px;
  outline: none;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}
.drp-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft-25);
}
.drp-search::placeholder {
  color: var(--text-4);
}

.drp-groups {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 340px;
  padding: 4px 0 10px;
}
.drp-group {
  display: flex;
  flex-direction: column;
}
.drp-group + .drp-group {
  border-top: 1px solid var(--border);
  margin-top: 6px;
  padding-top: 6px;
}
.drp-group-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
  font-weight: 500;
  padding: 6px 16px 4px;
}
.drp-quick {
  appearance: none;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 7px 16px 7px 14px;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}
.drp-quick:hover {
  background: var(--hover-surface);
  color: var(--text-1);
}
.drp-quick.active {
  background: var(--primary-soft-08);
  border-left-color: var(--primary);
  color: var(--text-1);
  font-weight: 500;
}
.drp-empty {
  font-size: 12px;
  color: var(--text-4);
  padding: 20px 16px;
  text-align: center;
}

/* ---- DatePicker calendar panel (teleported popup) ------------------- */
.p-datepicker-panel {
  background: var(--panel) !important;
  color: var(--text-1) !important;
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
  box-shadow:
    0 10px 30px -8px rgba(0, 0, 0, 0.55),
    0 2px 8px -2px rgba(0, 0, 0, 0.25) !important;
  padding: 8px !important;
}
.p-datepicker-panel .p-datepicker-header {
  background: transparent !important;
  color: var(--text-1) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 6px 8px !important;
}
.p-datepicker-panel .p-datepicker-title,
.p-datepicker-panel .p-datepicker-select-year,
.p-datepicker-panel .p-datepicker-select-month {
  color: var(--text-1) !important;
  background: transparent !important;
  font-weight: 500 !important;
}
.p-datepicker-panel .p-datepicker-weekday {
  color: var(--text-4) !important;
  font-weight: 500 !important;
}
.p-datepicker-panel .p-datepicker-day {
  color: var(--text-2) !important;
  border-radius: 4px !important;
  transition:
    background 120ms ease,
    color 120ms ease !important;
}
.p-datepicker-panel .p-datepicker-day:hover {
  background: var(--hover-surface) !important;
  color: var(--text-1) !important;
}
.p-datepicker-panel .p-datepicker-day-selected {
  background: var(--primary) !important;
  color: var(--primary-fg) !important;
}
.p-datepicker-panel .p-datepicker-other-month {
  color: var(--text-5) !important;
}
.p-datepicker-panel .p-datepicker-prev-button,
.p-datepicker-panel .p-datepicker-next-button {
  color: var(--text-3) !important;
  background: transparent !important;
  border-radius: 4px !important;
}
.p-datepicker-panel .p-datepicker-prev-button:hover,
.p-datepicker-panel .p-datepicker-next-button:hover {
  background: var(--hover-surface) !important;
  color: var(--text-1) !important;
}

/* ---- Quick ranges column ------------------------------------------- */
.drp-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.drp-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-4);
  pointer-events: none;
}
.drp-search {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 30px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 12px;
  outline: none;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}
.drp-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.drp-search::placeholder {
  color: var(--text-4);
}

.drp-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 320px;
  padding-right: 2px;
}
.drp-group {
  display: flex;
  flex-direction: column;
}
.drp-group-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
  margin: 4px 0;
}
.drp-quick {
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  border-left: 2px solid transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 6px 10px;
  border-radius: 2px;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}
.drp-quick:hover {
  background: var(--hover-surface);
  color: var(--text-1);
}
.drp-quick.active {
  background: var(--primary-soft-08);
  border-left-color: var(--primary);
  color: var(--text-1);
}
.drp-empty {
  font-size: 12px;
  color: var(--text-4);
  padding: 20px 10px;
  text-align: center;
}

@media (max-width: 640px) {
  .drp-panel {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .drp-col-absolute {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
</style>
