<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { getStrategy, listStrategies } from '@/api/endpoints/strategies'
import type { Strategy, StrategyParameter } from '@/api/endpoints/strategies'
import { createPortfolio } from '@/api/endpoints/portfolios'
import { openProgressStream } from '@/api/sse'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import TickerPicker from '@/components/ui/TickerPicker.vue'
import type { SecurityResult } from '@/api/endpoints/securities'

const route = useRoute()
const router = useRouter()

const strategyShortCode = ref((route.query.strategy as string) ?? '')
const backLabel = route.query.from === 'portfolios' ? 'Portfolios' : 'Strategies'

const strategy = ref<Strategy | null>(null)
const loadError = ref<string | null>(null)

const availableStrategies = ref<Strategy[]>([])
const pickingStrategy = computed(() => !strategyShortCode.value)

const descriptionHtml = computed(() => {
  const raw = strategy.value?.describe?.description
  if (!raw) return null
  return marked.parse(raw) as string
})

async function loadAvailableStrategies() {
  try {
    const all = await listStrategies()
    availableStrategies.value = all.filter(s => s.installState === 'ready')
  } catch {
    // non-fatal — picker just stays empty
  }
}

if (pickingStrategy.value) {
  loadAvailableStrategies()
}

function strategyDisplayName(s: Strategy): string {
  return s.describe?.name ?? s.repoName ?? s.shortCode
}

async function selectStrategy(shortCode: string) {
  strategyShortCode.value = shortCode
  await loadStrategy()
}

async function loadStrategy() {
  if (!strategyShortCode.value) return
  try {
    strategy.value = await getStrategy(strategyShortCode.value)
    if (!name.value) {
      name.value = strategy.value.describe?.name ?? strategy.value.repoName ?? strategyShortCode.value
    }
    if (strategy.value.describe?.benchmark) {
      benchmark.value = { ticker: strategy.value.describe.benchmark, name: '' }
    }
    initParamValues()
  } catch (e) {
    loadError.value = (e as Error).message
  }
}

loadStrategy()

const parameters = computed<StrategyParameter[]>(() => strategy.value?.describe?.parameters ?? [])
const presets = computed(() => strategy.value?.describe?.presets ?? [])

const paramValues = ref<Record<string, string>>({})

function initParamValues() {
  const first = presets.value[0]
  if (first) {
    const vals: Record<string, string> = {}
    for (const [k, v] of Object.entries(first.parameters)) {
      vals[k] = String(v)
    }
    paramValues.value = vals
  } else {
    const vals: Record<string, string> = {}
    for (const p of parameters.value) {
      vals[p.name] = p.default != null ? String(p.default) : ''
    }
    paramValues.value = vals
  }
}

function onPresetChange(e: Event) {
  const name = (e.target as HTMLSelectElement).value
  const preset = presets.value.find(p => p.name === name)
  if (!preset) return
  for (const [k, v] of Object.entries(preset.parameters)) {
    paramValues.value[k] = String(v)
  }
}

watch(parameters, initParamValues)

const name = ref('')
const inceptionDate = ref('2010-01-01')
const benchmark = ref<SecurityResult | null>({ ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust' })
const initialValue = ref<number | null>(null)

const alertsEnabled = ref(true)
const alertFrequency = ref('run')

const alertFrequencyOptions = [
  { key: 'run', label: 'Every run' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' }
] as const

const isValid = computed(() =>
  strategyShortCode.value.trim() !== '' &&
  name.value.trim() !== '' &&
  inceptionDate.value !== ''
)

const submitting = ref(false)
const submitError = ref<string | null>(null)
const waitingForRun = ref(false)
const waitingPortfolioName = ref('')
const progressPct = ref(0)
let abortController: AbortController | null = null

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/v3'

async function startProgressStream(slug: string, runId: string) {
  waitingForRun.value = true
  progressPct.value = 0
  abortController = new AbortController()
  const url = `${baseUrl}/portfolios/${slug}/runs/${runId}/progress`
  try {
    await openProgressStream(url, {
      onProgress(data) { progressPct.value = data.pct },
      onDone() {
        progressPct.value = 100
        router.push({ name: 'portfolio-summary', params: { id: slug } })
      },
      onError(_status, error) {
        waitingForRun.value = false
        submitError.value = error ?? 'Backtest failed. Please try again.'
        submitting.value = false
      },
    }, abortController.signal)
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      waitingForRun.value = false
      submitError.value = (e as Error).message
      submitting.value = false
    }
  }
}

onUnmounted(() => abortController?.abort())

function coercedParams(): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const p of parameters.value) {
    const raw = paramValues.value[p.name]
    if (raw == null) continue
    if (p.type === 'int') {
      const n = parseInt(raw, 10)
      result[p.name] = isNaN(n) ? raw : n
    } else if (p.type === 'float') {
      const n = parseFloat(raw)
      result[p.name] = isNaN(n) ? raw : n
    } else {
      result[p.name] = raw
    }
  }
  return result
}

async function onSubmit() {
  if (!isValid.value) return
  submitting.value = true
  submitError.value = null
  try {
    const created = await createPortfolio({
      name: name.value.trim(),
      strategyCode: strategyShortCode.value,
      parameters: coercedParams(),
      benchmark: benchmark.value?.ticker ?? 'SPY',
      ...(inceptionDate.value ? { startDate: inceptionDate.value } : {}),
    })
    waitingPortfolioName.value = created.name
    if (!created.runId) throw new Error('Server did not return a runId')
    startProgressStream(created.slug, created.runId)
  } catch (e: unknown) {
    const fe = e as { data?: { title?: string; detail?: string; errors?: unknown }; message?: string }
    submitError.value = fe.data?.detail ?? fe.data?.title ?? JSON.stringify(fe.data) ?? fe.message ?? 'Unknown error'
    submitting.value = false
  }
}

function inputType(p: StrategyParameter): string {
  return p.type === 'int' || p.type === 'float' ? 'number' : 'text'
}
function inputStep(p: StrategyParameter): string {
  return p.type === 'float' ? 'any' : '1'
}
</script>

<template>
  <div class="pc-page">
    <div class="pc-header">
      <button class="pc-back" @click="router.back()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        {{ backLabel }}
      </button>
      <h1>New portfolio</h1>
    </div>

    <!-- Backtest waiting screen -->
    <div v-if="waitingForRun" class="pc-waiting">
      <div class="pc-waiting-card">
        <div class="pc-waiting-label">Running backtest</div>
        <div class="pc-waiting-name">{{ waitingPortfolioName }}</div>
        <div class="pc-progress-track">
          <div class="pc-progress-bar" :style="{ width: progressPct + '%' }" />
        </div>
        <div class="pc-progress-pct">{{ progressPct }}%</div>
        <div class="pc-waiting-hint">This usually takes 10–30 seconds</div>
      </div>
    </div>

    <div v-else class="pc-layout">
      <!-- Left: form -->
      <main class="pc-main">
        <div v-if="loadError" class="pc-error" role="alert">{{ loadError }}</div>

        <form class="pc-form" @submit.prevent="onSubmit">
          <!-- Strategy identity -->
          <div class="pc-card">
            <div class="pc-card-header"><div class="pc-card-title">Strategy</div></div>

            <div v-if="pickingStrategy" class="pc-strategy-pick">
              <select class="pc-input pc-strategy-select" @change="e => selectStrategy((e.target as HTMLSelectElement).value)">
                <option value="" disabled selected>Select a strategy...</option>
                <option v-for="s in availableStrategies" :key="s.shortCode" :value="s.shortCode">
                  {{ strategyDisplayName(s) }}
                </option>
              </select>
            </div>

            <div v-else class="pc-strategy-row">
              <div class="pc-strategy-names">
                <span class="pc-strategy-name">{{ strategy?.describe?.name ?? strategy?.repoName ?? strategyShortCode }}</span>
                <span class="pc-strategy-code">{{ strategyShortCode }}</span>
              </div>
              <button type="button" class="pc-strategy-change" @click="strategyShortCode = ''; strategy = null; name = ''; loadAvailableStrategies()">
                Change
              </button>
            </div>
          </div>

          <!-- Portfolio settings -->
          <div class="pc-card">
            <div class="pc-card-header"><div class="pc-card-title">Portfolio</div></div>
            <div class="pc-fields">
              <div class="pc-field pc-field--full">
                <label class="pc-label" for="pc-name">Name</label>
                <input id="pc-name" v-model="name" class="pc-input" type="text" placeholder="My portfolio" required />
              </div>
              <div class="pc-field">
                <label class="pc-label" for="pc-date">Inception date</label>
                <input id="pc-date" v-model="inceptionDate" class="pc-input" type="date" required />
              </div>
              <div class="pc-field">
                <label class="pc-label">Benchmark</label>
                <TickerPicker v-model="benchmark" placeholder="Search benchmark..." />
              </div>
              <div class="pc-field">
                <label class="pc-label" for="pc-value">Initial value</label>
                <div class="pc-prefix-wrap">
                  <span class="pc-prefix">$</span>
                  <input id="pc-value" v-model.number="initialValue" class="pc-input pc-input--prefix" type="number" min="0" step="1" placeholder="100,000" />
                </div>
              </div>
            </div>
          </div>

          <!-- Strategy parameters -->
          <div v-if="parameters.length" class="pc-card">
            <div class="pc-card-header">
              <div class="pc-card-title">Parameters</div>
              <select v-if="presets.length" class="pc-preset-select" @change="onPresetChange">
                <option v-for="p in presets" :key="p.name" :value="p.name">{{ p.name }}</option>
              </select>
            </div>
            <div class="pc-fields">
              <div v-for="p in parameters" :key="p.name" class="pc-field">
                <label class="pc-label" :for="`pc-param-${p.name}`">
                  {{ p.name.replace(/_/g, ' ') }}
                </label>
                <input
                  :id="`pc-param-${p.name}`"
                  v-model="paramValues[p.name]"
                  class="pc-input"
                  :type="inputType(p)"
                  :step="inputStep(p)"
                />
                <span v-if="p.description" class="pc-hint">{{ p.description }}</span>
              </div>
            </div>
          </div>

          <!-- Alerts -->
          <div class="pc-card">
            <div class="pc-card-header">
              <div>
                <div class="pc-card-title">Email alerts</div>
                <p class="pc-card-sub">Receive a summary each time this portfolio runs</p>
              </div>
              <button
                type="button"
                class="pc-toggle"
                :class="{ 'pc-toggle--on': alertsEnabled }"
                :aria-pressed="alertsEnabled"
                @click="alertsEnabled = !alertsEnabled"
              >
                <span class="pc-toggle-thumb" />
              </button>
            </div>
            <div v-if="alertsEnabled" class="pc-alert-freq">
              <span class="pc-label">Frequency</span>
              <SegmentedControl v-model="alertFrequency" :options="alertFrequencyOptions" />
            </div>
          </div>

          <div v-if="submitError" class="pc-error" role="alert">{{ submitError }}</div>

          <div class="pc-actions">
            <button type="button" class="pc-btn pc-btn--ghost" @click="router.back()">Cancel</button>
            <button type="submit" class="pc-btn pc-btn--primary" :disabled="!isValid || submitting">
              {{ submitting ? 'Creating...' : 'Create portfolio' }}
            </button>
          </div>
        </form>
      </main>

      <!-- Right: strategy description -->
      <aside v-if="descriptionHtml" class="pc-aside">
        <div class="pc-aside-inner">
          <div class="pc-card-title pc-aside-label">About this strategy</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="pc-prose" v-html="descriptionHtml" />
        </div>
      </aside>
    </div>
  </div>

</template>

<style scoped>
.pc-page {
  padding: 32px 0 80px;
}

.pc-layout {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.pc-main {
  flex: 0 0 500px;
  min-width: 0;
}

.pc-aside {
  flex: 1 1 0;
  min-width: 0;
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.pc-aside-inner {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px 24px 24px;
}

.pc-aside-label {
  margin-bottom: 16px;
}

.pc-header {
  margin-bottom: 28px;
}

.pc-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-3);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 14px;
  transition: color 140ms ease;
}
.pc-back:hover { color: var(--text-1); }

h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
}

.pc-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pc-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px 24px;
}

.pc-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pc-card-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-3);
}

.pc-card-sub {
  font-size: 12px;
  color: var(--text-4);
  margin: 2px 0 0;
}

.pc-toggle {
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background: var(--border);
  cursor: pointer;
  position: relative;
  transition: background 200ms ease;
  padding: 0;
}
.pc-toggle--on {
  background: var(--primary);
}
.pc-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms ease;
  display: block;
}
.pc-toggle--on .pc-toggle-thumb {
  transform: translateX(16px);
}

.pc-alert-freq {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.pc-preset-select {
  height: 28px;
  padding: 0 24px 0 8px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 140ms ease;
}
.pc-preset-select:focus {
  border-color: var(--primary);
}

.pc-strategy-select {
  height: 34px;
  width: 100%;
}

.pc-strategy-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pc-strategy-names {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.pc-strategy-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-1);
}
.pc-strategy-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.pc-strategy-change {
  margin-top: 4px;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
  align-self: flex-start;
}
.pc-strategy-change:hover {
  text-decoration: underline;
}

.pc-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pc-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pc-field--full {
  grid-column: 1 / -1;
}

.pc-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.pc-hint {
  font-size: 11px;
  color: var(--text-4);
  line-height: 1.4;
}

.pc-input {
  height: 34px;
  padding: 0 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease;
  width: 100%;
  box-sizing: border-box;
}
.pc-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.pc-input::placeholder { color: var(--text-5); }

.pc-prefix-wrap {
  position: relative;
  display: flex;
}
.pc-prefix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-3);
  pointer-events: none;
}
.pc-input--prefix {
  padding-left: 20px;
}

.pc-error {
  padding: 10px 14px;
  background: color-mix(in srgb, var(--loss) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--loss) 30%, transparent);
  border-radius: 3px;
  font-size: 13px;
  color: var(--loss);
}

.pc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.pc-btn {
  height: 34px;
  padding: 0 18px;
  border-radius: 3px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 140ms ease, background 140ms ease;
}
.pc-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.pc-btn--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-2);
}
.pc-btn--ghost:hover:not(:disabled) {
  border-color: var(--text-3);
  color: var(--text-1);
}

.pc-btn--primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
}
.pc-btn--primary:hover:not(:disabled) { opacity: 0.88; }

/* Prose styles for rendered markdown */
.pc-prose {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-2);
}

.pc-prose :deep(h1),
.pc-prose :deep(h2),
.pc-prose :deep(h3) {
  color: var(--text-1);
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 1.4em 0 0.5em;
}
.pc-prose :deep(h1:first-child),
.pc-prose :deep(h2:first-child),
.pc-prose :deep(h3:first-child) {
  margin-top: 0;
}
.pc-prose :deep(h1) { font-size: 15px; }
.pc-prose :deep(h2) { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); }
.pc-prose :deep(h3) { font-size: 13px; }

.pc-prose :deep(p) {
  margin: 0 0 0.9em;
}
.pc-prose :deep(p:last-child) { margin-bottom: 0; }

.pc-prose :deep(ul),
.pc-prose :deep(ol) {
  margin: 0 0 0.9em 1.2em;
  padding: 0;
}
.pc-prose :deep(li) {
  margin-bottom: 0.25em;
}

.pc-prose :deep(strong) {
  font-weight: 600;
  color: var(--text-1);
}

.pc-prose :deep(em) {
  font-style: italic;
  color: var(--text-2);
}

.pc-prose :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 1px 4px;
  color: var(--text-2);
}

.pc-prose :deep(pre) {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 0 0 0.9em;
}
.pc-prose :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
}

.pc-prose :deep(blockquote) {
  border-left: 2px solid var(--border);
  margin: 0 0 0.9em;
  padding-left: 14px;
  color: var(--text-3);
  font-style: italic;
}

.pc-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.2em 0;
}

.pc-waiting {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

.pc-waiting-card {
  width: 420px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 32px 36px 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-waiting-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-3);
}

.pc-waiting-name {
  font-size: 18px;
  font-weight: 400;
  color: var(--text-1);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}

.pc-progress-track {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.pc-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 400ms ease;
}

.pc-progress-pct {
  font-size: 11px;
  color: var(--text-4);
  text-align: right;
  margin-top: -4px;
}

.pc-waiting-hint {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 2px;
}
</style>
