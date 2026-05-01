<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { searchSecurities } from '@/api/endpoints/securities'
import type { SecurityResult } from '@/api/endpoints/securities'

const props = defineProps<{
  modelValue: SecurityResult | SecurityResult[] | null
  multiple?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SecurityResult | SecurityResult[] | null]
}>()

const query = ref('')
const results = ref<SecurityResult[]>([])
const open = ref(false)
const activeIdx = ref(-1)
const loading = ref(false)
const root = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function selected(): SecurityResult[] {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
}

function isSelected(s: SecurityResult) {
  return selected().some((x) => x.ticker === s.ticker)
}

function onInput() {
  activeIdx.value = -1
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = query.value.trim()
  if (!q) {
    results.value = []
    open.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      results.value = await searchSecurities(q)
      open.value = results.value.length > 0
    } finally {
      loading.value = false
    }
  }, 180)
}

function pick(s: SecurityResult) {
  if (props.multiple) {
    const cur = selected()
    const next = isSelected(s) ? cur.filter((x) => x.ticker !== s.ticker) : [...cur, s]
    emit('update:modelValue', next)
  } else {
    emit('update:modelValue', s)
    query.value = ''
    open.value = false
  }
  nextTick(() => inputEl.value?.focus())
}

function remove(ticker: string) {
  if (props.multiple) {
    const next = selected().filter((x) => x.ticker !== ticker)
    emit('update:modelValue', next.length ? next : null)
  } else {
    emit('update:modelValue', null)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, 0)
  } else if (e.key === 'Enter' && activeIdx.value >= 0) {
    e.preventDefault()
    pick(results.value[activeIdx.value]!)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="root" class="tp">
    <div class="tp-input-wrap" @click="inputEl?.focus()">
      <!-- chips for multi mode -->
      <span v-for="s in selected()" :key="s.ticker" class="tp-chip">
        {{ s.ticker }}
        <button type="button" class="tp-chip-x" @click.stop="remove(s.ticker)" aria-label="Remove">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </span>

      <!-- single-mode selected display -->
      <span v-if="!multiple && selected().length" class="tp-single-value">
        <span class="tp-single-ticker">{{ selected()[0]!.ticker }}</span>
        <span class="tp-single-name">{{ selected()[0]!.name }}</span>
        <button
          type="button"
          class="tp-chip-x tp-clear"
          @click.stop="remove(selected()[0]!.ticker)"
          aria-label="Clear"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </span>

      <input
        v-if="multiple || !selected().length"
        ref="inputEl"
        v-model="query"
        class="tp-input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :placeholder="placeholder ?? (multiple ? 'Search tickers...' : 'Search ticker...')"
        @input="onInput"
        @keydown="onKeydown"
        @focus="query && results.length && (open = true)"
      />
    </div>

    <div v-if="open" class="tp-dropdown" role="listbox">
      <div
        v-for="(s, i) in results"
        :key="s.ticker"
        class="tp-option"
        :class="{ 'tp-option--active': i === activeIdx, 'tp-option--selected': isSelected(s) }"
        role="option"
        :aria-selected="isSelected(s)"
        @mousedown.prevent="pick(s)"
        @mouseover="activeIdx = i"
      >
        <span class="tp-option-ticker">{{ s.ticker }}</span>
        <span class="tp-option-name">{{ s.name }}</span>
        <svg
          v-if="isSelected(s)"
          class="tp-option-check"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tp {
  position: relative;
  width: 100%;
}

.tp-input-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  padding: 3px 8px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  cursor: text;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}
.tp-input-wrap:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.tp-input {
  flex: 1;
  min-width: 80px;
  height: 24px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  padding: 0;
}
.tp-input::placeholder {
  color: var(--text-5);
}

/* chip (multi mode) */
.tp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 6px;
  background: var(--primary-soft-08);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: 2px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--primary);
}

.tp-chip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  line-height: 1;
}
.tp-chip-x:hover {
  opacity: 1;
}

/* single-mode selected */
.tp-single-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.tp-single-ticker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--primary);
}
.tp-single-name {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tp-clear {
  margin-left: auto;
  color: var(--text-4);
}
.tp-clear:hover {
  color: var(--text-1);
}

/* dropdown */
.tp-dropdown {
  position: absolute;
  top: calc(100% + 3px);
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 200;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.tp-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 100ms ease;
}
.tp-option--active {
  background: var(--bg-alt);
}
.tp-option--selected {
  background: var(--primary-soft-05);
}

.tp-option-ticker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-1);
  min-width: 52px;
}
.tp-option-name {
  font-size: 12px;
  color: var(--text-3);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tp-option-check {
  color: var(--primary);
  flex-shrink: 0;
}
</style>
