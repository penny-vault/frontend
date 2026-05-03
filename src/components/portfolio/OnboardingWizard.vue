<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { listStrategies } from '@/api/endpoints/strategies'
import type { Strategy, StrategyParameter } from '@/api/endpoints/strategies'
import { createPortfolio } from '@/api/endpoints/portfolios'
import { usePortfolioRunProgress } from '@/composables/usePortfolioRunProgress'

const router = useRouter()
const queryClient = useQueryClient()

type Step = 1 | 2 | 3
const step = ref<Step>(1)

const strategies = ref<Strategy[]>([])
const strategiesLoading = ref(true)
const strategiesError = ref<string | null>(null)

async function loadStrategies() {
  strategiesLoading.value = true
  strategiesError.value = null
  try {
    const all = await listStrategies()
    strategies.value = all
      .filter((s) => s.installState === 'ready')
      .sort((a, b) => strategyDisplayName(a).localeCompare(strategyDisplayName(b)))
  } catch (e) {
    strategiesError.value = (e as Error).message
  } finally {
    strategiesLoading.value = false
  }
}
loadStrategies()

const selectedStrategy = ref<Strategy | null>(null)
const paramValues = ref<Record<string, string>>({})

const parameters = computed<StrategyParameter[]>(
  () => selectedStrategy.value?.describe?.parameters ?? []
)
const presets = computed(() => selectedStrategy.value?.describe?.presets ?? [])

function strategyDisplayName(s: Strategy): string {
  return s.describe?.name ?? s.repoName ?? s.shortCode
}

function strategyShortDescription(s: Strategy): string {
  const raw = s.describe?.description ?? s.description ?? ''
  const stripped = raw
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`>]/g, '')
    .trim()
  const firstPara = stripped.split(/\n\s*\n/)[0] ?? ''
  return firstPara.length > 180 ? firstPara.slice(0, 177).trimEnd() + '...' : firstPara
}

function initParamValues() {
  const first = presets.value[0]
  if (first) {
    const vals: Record<string, string> = {}
    for (const [k, v] of Object.entries(first.parameters)) vals[k] = String(v)
    paramValues.value = vals
    return
  }
  const vals: Record<string, string> = {}
  for (const p of parameters.value) {
    vals[p.name] = p.default != null ? String(p.default) : ''
  }
  paramValues.value = vals
}

const portfolioName = ref('')

function pickStrategy(s: Strategy) {
  selectedStrategy.value = s
  portfolioName.value = strategyDisplayName(s)
  initParamValues()
  step.value = 3
}

function onPresetChange(e: Event) {
  const name = (e.target as HTMLSelectElement).value
  const preset = presets.value.find((p) => p.name === name)
  if (!preset) return
  for (const [k, v] of Object.entries(preset.parameters)) {
    paramValues.value[k] = String(v)
  }
}

function inputType(p: StrategyParameter): string {
  return p.type === 'int' || p.type === 'float' ? 'number' : 'text'
}
function inputStep(p: StrategyParameter): string {
  return p.type === 'float' ? 'any' : '1'
}

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

const submitting = ref(false)
const submitError = ref<string | null>(null)
const waitingPortfolioName = ref('')

const {
  progressPct,
  isWaiting: waitingForRun,
  start: startProgressStream
} = usePortfolioRunProgress({
  onSuccess: (slug) => {
    queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    router.push({ name: 'portfolio-summary', params: { id: slug } })
  },
  onFailure: (error) => {
    submitError.value = error
    submitting.value = false
  }
})

const canSubmit = computed(() => !!selectedStrategy.value && portfolioName.value.trim() !== '')

async function onCreate() {
  const s = selectedStrategy.value
  if (!s) return
  if (portfolioName.value.trim() === '') return
  submitting.value = true
  submitError.value = null
  try {
    const created = await createPortfolio({
      name: portfolioName.value.trim(),
      strategyCode: s.shortCode,
      parameters: coercedParams(),
      benchmark: s.describe?.benchmark ?? 'SPY',
      startDate: '2010-01-01',
      runRetention: 2
    })
    waitingPortfolioName.value = created.name
    if (!created.runId) throw new Error('Server did not return a runId')
    startProgressStream(created.slug, created.runId)
  } catch (e: unknown) {
    const fe = e as {
      data?: { title?: string; detail?: string }
      message?: string
    }
    submitError.value = fe.data?.detail ?? fe.data?.title ?? fe.message ?? 'Unknown error'
    submitting.value = false
  }
}

const stepsMeta = [
  { key: 1, label: 'Welcome' },
  { key: 2, label: 'Strategy' },
  { key: 3, label: 'Configure' }
] as const
</script>

<template>
  <div class="ow-page">
    <div v-if="waitingForRun" class="ow-waiting">
      <div class="ow-waiting-card">
        <div class="ow-waiting-label">Running backtest</div>
        <div class="ow-waiting-name">{{ waitingPortfolioName }}</div>
        <div class="ow-progress-track">
          <div class="ow-progress-bar" :style="{ width: progressPct + '%' }" />
        </div>
        <div class="ow-progress-pct">{{ progressPct }}%</div>
        <div class="ow-waiting-hint">This usually takes 10–30 seconds</div>
      </div>
    </div>

    <template v-else>
      <ol class="ow-stepper" aria-label="Setup progress">
        <li
          v-for="(s, i) in stepsMeta"
          :key="s.key"
          class="ow-step"
          :class="{
            'ow-step--active': step === s.key,
            'ow-step--done': step > s.key
          }"
        >
          <span class="ow-step-marker">{{ i + 1 }}</span>
          <span class="ow-step-label">{{ s.label }}</span>
        </li>
      </ol>

      <div class="ow-card">
        <!-- Step 1: intro -->
        <section v-if="step === 1" class="ow-step-body ow-intro">
          <h1 class="ow-title">Let's create your first portfolio</h1>
          <div class="ow-intro-body">
            <p>
              A portfolio is a backtested implementation of a quantitative strategy. Penny Vault
              runs the strategy across historical market data so you can see how it would have
              performed, and then keeps it up to date on the strategy's rebalance schedule.
            </p>
            <p>
              You'll pick a strategy, review its parameters, and we'll handle the backtest. You can
              always tweak the name, benchmark, and other settings afterward.
            </p>
          </div>
          <div class="ow-actions">
            <button class="ow-btn ow-btn--primary" @click="step = 2">Get started</button>
          </div>
        </section>

        <!-- Step 2: pick a strategy -->
        <section v-else-if="step === 2" class="ow-step-body">
          <header class="ow-step-header">
            <h1 class="ow-title">Pick a strategy</h1>
            <p class="ow-sub">
              Choose how your portfolio will decide what to hold. You can change this later by
              creating another portfolio.
            </p>
          </header>

          <div v-if="strategiesLoading" class="ow-strategies-loading">Loading strategies…</div>
          <div v-else-if="strategiesError" class="ow-error" role="alert">
            Could not load strategies. {{ strategiesError }}
          </div>
          <div v-else-if="!strategies.length" class="ow-empty">
            No strategies are installed yet.
          </div>
          <div v-else class="ow-strategy-list">
            <button
              v-for="s in strategies"
              :key="s.shortCode"
              class="ow-strategy-card"
              type="button"
              @click="pickStrategy(s)"
            >
              <div class="ow-strategy-head">
                <span class="ow-strategy-name">{{ strategyDisplayName(s) }}</span>
                <span class="ow-strategy-code">{{ s.shortCode }}</span>
              </div>
              <p v-if="strategyShortDescription(s)" class="ow-strategy-desc">
                {{ strategyShortDescription(s) }}
              </p>
              <div class="ow-strategy-go" aria-hidden="true">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          <div class="ow-actions ow-actions--between">
            <button class="ow-btn ow-btn--ghost" type="button" @click="step = 1">Back</button>
          </div>
        </section>

        <!-- Step 3: configure parameters -->
        <section v-else-if="step === 3 && selectedStrategy" class="ow-step-body">
          <header class="ow-step-header">
            <h1 class="ow-title">Configure parameters</h1>
            <p class="ow-sub">Defaults usually work well — pick a preset for a different style.</p>
          </header>

          <div class="ow-selected">
            <div class="ow-selected-names">
              <span class="ow-selected-name">{{ strategyDisplayName(selectedStrategy) }}</span>
              <span class="ow-selected-code">{{ selectedStrategy.shortCode }}</span>
            </div>
            <button class="ow-selected-change" type="button" @click="step = 2">Change</button>
          </div>

          <form class="ow-form" @submit.prevent="onCreate">
            <div class="ow-field ow-field--full">
              <label class="ow-label" for="ow-name">Portfolio name</label>
              <input id="ow-name" v-model="portfolioName" class="ow-input" type="text" required />
            </div>

            <div v-if="presets.length" class="ow-preset-row">
              <label class="ow-label" for="ow-preset">Preset</label>
              <select id="ow-preset" class="ow-input" @change="onPresetChange">
                <option v-for="p in presets" :key="p.name" :value="p.name">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <div v-if="parameters.length" class="ow-params">
              <div v-for="p in parameters" :key="p.name" class="ow-field">
                <label class="ow-label" :for="`ow-param-${p.name}`">
                  {{ p.name.replace(/_/g, ' ') }}
                </label>
                <input
                  :id="`ow-param-${p.name}`"
                  v-model="paramValues[p.name]"
                  class="ow-input"
                  :type="inputType(p)"
                  :step="inputStep(p)"
                />
                <span v-if="p.description" class="ow-hint">{{ p.description }}</span>
              </div>
            </div>
            <p v-else class="ow-no-params">This strategy has no configurable parameters.</p>

            <div v-if="submitError" class="ow-error" role="alert">{{ submitError }}</div>

            <div class="ow-actions ow-actions--between">
              <button
                class="ow-btn ow-btn--ghost"
                type="button"
                :disabled="submitting"
                @click="step = 2"
              >
                Back
              </button>
              <button
                class="ow-btn ow-btn--primary"
                type="submit"
                :disabled="submitting || !canSubmit"
              >
                {{ submitting ? 'Creating…' : 'Create portfolio' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ow-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 0 80px;
}

.ow-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
}
.ow-step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.ow-step + .ow-step::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  width: 8px;
  height: 1px;
  background: var(--border);
}
.ow-step-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-alt);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition:
    background 200ms ease,
    border-color 200ms ease,
    color 200ms ease;
}
.ow-step-label {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  transition: color 200ms ease;
}
.ow-step--active .ow-step-marker {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.ow-step--active .ow-step-label {
  color: var(--text-1);
}
.ow-step--done .ow-step-marker {
  border-color: var(--primary);
  color: var(--primary);
}

.ow-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 36px 40px 32px;
}

.ow-step-body {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.ow-step-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ow-title {
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--text-1);
}

.ow-sub {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.5;
}

.ow-intro {
  text-align: center;
  align-items: center;
}
.ow-intro .ow-title {
  margin-bottom: 4px;
}
.ow-intro-body {
  max-width: 520px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ow-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}
.ow-actions--between {
  justify-content: space-between;
}
.ow-intro .ow-actions {
  justify-content: center;
}

.ow-btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 3px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    opacity 140ms ease,
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}
.ow-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ow-btn--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-2);
}
.ow-btn--ghost:hover:not(:disabled) {
  border-color: var(--text-3);
  color: var(--text-1);
}
.ow-btn--primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
}
.ow-btn--primary:hover:not(:disabled) {
  opacity: 0.88;
}

.ow-strategies-loading,
.ow-empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
  border: 1px dashed var(--border);
  border-radius: 3px;
}

.ow-strategy-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ow-strategy-card {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'head go'
    'desc go';
  gap: 4px 16px;
  padding: 14px 16px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}
.ow-strategy-card:hover {
  border-color: var(--primary);
  background: var(--panel);
  transform: translateY(-1px);
}
.ow-strategy-card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ow-strategy-head {
  grid-area: head;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ow-strategy-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
}
.ow-strategy-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.ow-strategy-desc {
  grid-area: desc;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-3);
}
.ow-strategy-go {
  grid-area: go;
  align-self: center;
  color: var(--text-4);
  display: inline-flex;
  transition: color 160ms ease;
}
.ow-strategy-card:hover .ow-strategy-go {
  color: var(--primary);
}

.ow-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
}
.ow-selected-names {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.ow-selected-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
}
.ow-selected-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.ow-selected-change {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
}
.ow-selected-change:hover {
  text-decoration: underline;
}

.ow-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ow-preset-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 260px;
}

.ow-params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.ow-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ow-field--full {
  width: 100%;
}

.ow-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ow-hint {
  font-size: 11px;
  color: var(--text-4);
  line-height: 1.4;
}

.ow-input {
  height: 34px;
  padding: 0 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
  width: 100%;
  box-sizing: border-box;
}
.ow-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.ow-no-params {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
  font-style: italic;
}

.ow-error {
  padding: 10px 14px;
  background: color-mix(in srgb, var(--loss) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--loss) 30%, transparent);
  border-radius: 3px;
  font-size: 13px;
  color: var(--loss);
}

.ow-waiting {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}
.ow-waiting-card {
  width: 100%;
  max-width: 420px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 32px 36px 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ow-waiting-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-3);
}
.ow-waiting-name {
  font-size: 18px;
  font-weight: 400;
  color: var(--text-1);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
.ow-progress-track {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.ow-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 400ms ease;
}
.ow-progress-pct {
  font-size: 11px;
  color: var(--text-4);
  text-align: right;
  margin-top: -4px;
}
.ow-waiting-hint {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 2px;
}

@media (max-width: 600px) {
  .ow-card {
    padding: 20px 16px;
  }
  .ow-params {
    grid-template-columns: 1fr;
  }
  .ow-stepper {
    gap: 18px;
  }
  .ow-step-label {
    display: none;
  }
  .ow-waiting {
    padding: 32px 16px 0;
  }
  .ow-waiting-card {
    padding: 24px 20px 28px;
  }
  .ow-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 8px;
  }
  .ow-btn {
    width: 100%;
  }
  .ow-title {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ow-strategy-card,
  .ow-progress-bar,
  .ow-step-marker,
  .ow-step-label,
  .ow-btn {
    transition: none !important;
  }
}
</style>
