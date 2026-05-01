<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth0 } from '@auth0/auth0-vue'
import { usePortfolio } from '@/composables/usePortfolio'
import { usePortfolioAlerts } from '@/composables/usePortfolioAlerts'
import {
  updatePortfolio,
  deletePortfolio,
  sendPortfolioEmailSummary
} from '@/api/endpoints/portfolios'
import {
  createPortfolioAlert,
  updatePortfolioAlert,
  deletePortfolioAlert,
  type Alert,
  type AlertFrequency
} from '@/api/endpoints/alerts'
import { formatDate } from '@/util/format'

const isMockMode = import.meta.env.VITE_USE_MOCKS === '1'
const auth = isMockMode ? null : useAuth0()
const defaultEmail = isMockMode
  ? 'jeremy@fergason.me'
  : (auth?.user?.value?.email ?? '')

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const { data: portfolio } = usePortfolio(portfolioId)

// --- Rename ---
const nameInput = ref('')
watch(portfolio, (p) => { if (p && !nameInput.value) nameInput.value = p.name }, { immediate: true })

const nameChanged = computed(() =>
  portfolio.value ? nameInput.value.trim() !== portfolio.value.name : false
)
const renaming = ref(false)
const renameError = ref<string | null>(null)
const renameSuccess = ref(false)

async function onRename() {
  if (!portfolioId.value || !nameChanged.value) return
  renaming.value = true
  renameError.value = null
  renameSuccess.value = false
  try {
    await updatePortfolio(portfolioId.value, { name: nameInput.value.trim() })
    await queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId.value] })
    await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    renameSuccess.value = true
    setTimeout(() => { renameSuccess.value = false }, 2500)
  } catch (e) {
    renameError.value = (e as Error).message
  } finally {
    renaming.value = false
  }
}

// --- Delete ---
type DeleteState = 'idle' | 'confirming'
const deleteState = ref<DeleteState>('idle')
const deleteInput = ref('')
const deleting = ref(false)
const deleteError = ref<string | null>(null)

const deleteEnabled = computed(
  () => portfolio.value && deleteInput.value === portfolio.value.name
)

function startDelete() {
  deleteState.value = 'confirming'
  deleteInput.value = ''
  deleteError.value = null
}

function cancelDelete() {
  deleteState.value = 'idle'
  deleteInput.value = ''
  deleteError.value = null
}

async function onDelete() {
  if (!portfolioId.value || !deleteEnabled.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await deletePortfolio(portfolioId.value)
    await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    router.push('/portfolios')
  } catch (e) {
    deleteError.value = (e as Error).message
    deleting.value = false
  }
}

const infoRows = computed(() => {
  const p = portfolio.value
  if (!p) return []
  return [
    { label: 'Strategy', value: p.strategyCode || '—', mono: true },
    { label: 'Version', value: p.strategyVer || '—', mono: true },
    { label: 'Benchmark', value: p.benchmark || '—', mono: true },
    { label: 'Preset', value: p.presetName || '—', mono: false },
    { label: 'Slug', value: p.slug, mono: true },
    { label: 'Created', value: formatDate(p.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }), mono: false },
    { label: 'Updated', value: formatDate(p.lastUpdated, { month: 'short', day: 'numeric', year: 'numeric' }), mono: false },
    { label: 'Last run', value: p.lastRunAt ? formatDate(p.lastRunAt, { month: 'short', day: 'numeric', year: 'numeric' }) : '—', mono: false },
  ]
})

const parameters = computed(() => {
  const p = portfolio.value?.parameters
  if (!p) return []
  return Object.entries(p).map(([key, value]) => ({ key, value: String(value) }))
})

// --- Email alerts ---
const { data: alerts } = usePortfolioAlerts(portfolioId)

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: 'scheduled_run', label: 'Each run' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

function frequencyLabel(f: AlertFrequency): string {
  return FREQUENCY_OPTIONS.find(o => o.value === f)?.label ?? f
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Editor state — `editing` is the alert id being edited, 'new' for a fresh alert,
// or null when the editor is closed.
const editing = ref<string | 'new' | null>(null)
const editorForm = reactive<{
  frequency: AlertFrequency
  recipientsText: string
}>({
  frequency: 'weekly',
  recipientsText: defaultEmail
})
const editorError = ref<string | null>(null)
const editorSaving = ref(false)

// Inline delete confirm — alert id pending confirm, or null.
const confirmingDelete = ref<string | null>(null)
const deletingAlert = ref(false)

function openNewAlert() {
  editing.value = 'new'
  editorForm.frequency = 'weekly'
  editorForm.recipientsText = defaultEmail
  editorError.value = null
  confirmingDelete.value = null
}

function openEditAlert(alert: Alert) {
  editing.value = alert.id
  editorForm.frequency = alert.frequency
  editorForm.recipientsText = alert.recipients.join(', ')
  editorError.value = null
  confirmingDelete.value = null
}

function closeEditor() {
  editing.value = null
  editorError.value = null
}

function parseRecipients(text: string): string[] {
  return text
    .split(/[,\s;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

const editorRecipients = computed(() => parseRecipients(editorForm.recipientsText))

const editorValid = computed(() => {
  const r = editorRecipients.value
  return r.length > 0 && r.every(addr => emailRe.test(addr))
})

async function onSaveAlert() {
  if (!portfolioId.value || !editorValid.value || editorSaving.value) return
  editorSaving.value = true
  editorError.value = null
  try {
    const body = {
      frequency: editorForm.frequency,
      recipients: editorRecipients.value
    }
    if (editing.value === 'new') {
      await createPortfolioAlert(portfolioId.value, body)
    } else if (editing.value) {
      await updatePortfolioAlert(portfolioId.value, editing.value, body)
    }
    await queryClient.invalidateQueries({ queryKey: ['portfolio-alerts', portfolioId.value] })
    closeEditor()
  } catch (e) {
    editorError.value = (e as Error).message
  } finally {
    editorSaving.value = false
  }
}

function startDeleteAlert(id: string) {
  confirmingDelete.value = id
}

function cancelDeleteAlert() {
  confirmingDelete.value = null
}

async function confirmDeleteAlert(id: string) {
  if (!portfolioId.value || deletingAlert.value) return
  deletingAlert.value = true
  try {
    await deletePortfolioAlert(portfolioId.value, id)
    await queryClient.invalidateQueries({ queryKey: ['portfolio-alerts', portfolioId.value] })
    confirmingDelete.value = null
    if (editing.value === id) closeEditor()
  } finally {
    deletingAlert.value = false
  }
}

// --- Email summary (one-shot test send) ---
type EmailState = 'idle' | 'sending' | 'sent' | 'error'
const emailRecipient = ref(defaultEmail)
const emailState = ref<EmailState>('idle')
const emailError = ref<string | null>(null)

const emailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient.value.trim())
)

async function onSendEmail() {
  if (!portfolioId.value || !emailValid.value || emailState.value === 'sending') return
  emailState.value = 'sending'
  emailError.value = null
  try {
    await sendPortfolioEmailSummary(portfolioId.value, {
      recipient: emailRecipient.value.trim()
    })
    emailState.value = 'sent'
    setTimeout(() => {
      if (emailState.value === 'sent') emailState.value = 'idle'
    }, 3500)
  } catch (e) {
    emailState.value = 'error'
    const err = e as Error & { status?: number }
    if (err.status === 503) {
      emailError.value = 'Email sending is not configured on this server.'
    } else {
      emailError.value = err.message || 'Failed to send email.'
    }
  }
}
</script>

<template>
  <main v-if="portfolio" class="ps-main">

    <!-- Q1: Name + Parameters -->
    <section class="ps-card ps-q1">
      <div class="ps-subsection">
        <div class="ps-section-label">Name</div>
        <form class="ps-rename-form" @submit.prevent="onRename">
          <input
            id="ps-name-input"
            v-model="nameInput"
            class="ps-input"
            type="text"
            placeholder="Portfolio name"
            maxlength="120"
          />
          <button type="submit" class="ps-btn ps-btn--primary" :disabled="!nameChanged || renaming">
            {{ renaming ? 'Saving…' : 'Save' }}
          </button>
        </form>
        <p v-if="renameSuccess" class="ps-ok">Name updated.</p>
        <p v-if="renameError" class="ps-err">{{ renameError }}</p>
      </div>

      <div class="ps-subsection-divider" />

      <div class="ps-subsection ps-subsection--grow">
        <div class="ps-section-label">Parameters</div>
        <div v-if="parameters.length" class="ps-kv-list">
          <div v-for="p in parameters" :key="p.key" class="ps-kv-row">
            <span class="ps-kv-key mono">{{ p.key }}</span>
            <span class="ps-kv-val mono">{{ p.value }}</span>
          </div>
        </div>
        <p v-else class="ps-empty">No parameters.</p>
      </div>
    </section>

    <!-- Q2: Details -->
    <section class="ps-card ps-q2">
      <div class="ps-section-label">Details</div>
      <div class="ps-kv-list">
        <div v-for="row in infoRows" :key="row.label" class="ps-kv-row">
          <span class="ps-kv-key">{{ row.label }}</span>
          <span class="ps-kv-val" :class="{ mono: row.mono }">{{ row.value }}</span>
        </div>
      </div>
    </section>

    <!-- Q3: Danger zone -->
    <section class="ps-card ps-q3">
      <div class="ps-section-label ps-section-label--danger">Danger zone</div>

      <template v-if="deleteState === 'idle'">
        <p class="ps-danger-desc">Permanently removes all runs, holdings, and transaction history. This cannot be undone.</p>
        <div>
          <button type="button" class="ps-btn ps-btn--danger" @click="startDelete">Delete portfolio</button>
        </div>
      </template>

      <template v-else>
        <p class="ps-danger-desc">Permanently removes all runs, holdings, and transaction history. This cannot be undone.</p>
        <p class="ps-confirm-prompt">Type <strong>{{ portfolio.name }}</strong> to confirm.</p>
        <input
          v-model="deleteInput"
          class="ps-input ps-input--danger ps-input--block"
          type="text"
          placeholder="Portfolio name"
          autocomplete="off"
        />
        <div class="ps-confirm-actions">
          <button type="button" class="ps-btn ps-btn--ghost" @click="cancelDelete">Cancel</button>
          <button
            type="button"
            class="ps-btn ps-btn--danger"
            :disabled="!deleteEnabled || deleting"
            @click="onDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete permanently' }}
          </button>
        </div>
        <p v-if="deleteError" class="ps-err">{{ deleteError }}</p>
      </template>
    </section>

    <!-- Q4: Email -->
    <section class="ps-card ps-q4">
      <!-- Alerts -->
      <div class="ps-subsection ps-subsection--grow">
        <div class="ps-alerts-head">
          <div class="ps-section-label">Email alerts</div>
          <button
            v-if="editing === null"
            type="button"
            class="ps-btn ps-btn--ghost ps-btn--sm"
            @click="openNewAlert"
          >
            + Add alert
          </button>
        </div>

        <div v-if="alerts && alerts.length" class="ps-alert-list">
          <template v-for="a in alerts" :key="a.id">
            <!-- Edit form for this alert -->
            <div v-if="editing === a.id" class="ps-alert-editor">
              <div class="ps-field-label">Frequency</div>
              <div class="ps-freq-options">
                <label
                  v-for="opt in FREQUENCY_OPTIONS"
                  :key="opt.value"
                  class="ps-freq-chip"
                  :class="{ 'ps-freq-chip--on': editorForm.frequency === opt.value }"
                >
                  <input
                    v-model="editorForm.frequency"
                    type="radio"
                    name="freq-edit"
                    :value="opt.value"
                  />
                  <span>{{ opt.label }}</span>
                </label>
              </div>

              <div class="ps-field-label">Recipients</div>
              <input
                v-model="editorForm.recipientsText"
                class="ps-input ps-input--block"
                type="text"
                placeholder="email@example.com, another@example.com"
                spellcheck="false"
                autocomplete="off"
              />
              <p class="ps-field-hint">Comma-separated. At least one required.</p>

              <div class="ps-editor-actions">
                <button type="button" class="ps-btn ps-btn--ghost" @click="closeEditor">Cancel</button>
                <button
                  type="button"
                  class="ps-btn ps-btn--primary"
                  :disabled="!editorValid || editorSaving"
                  @click="onSaveAlert"
                >
                  {{ editorSaving ? 'Saving…' : 'Save' }}
                </button>
              </div>
              <p v-if="editorError" class="ps-err">{{ editorError }}</p>
            </div>

            <!-- Read-only row -->
            <div v-else class="ps-alert-row">
              <div class="ps-alert-main">
                <span class="ps-alert-freq">{{ frequencyLabel(a.frequency) }}</span>
                <span class="ps-alert-arrow">→</span>
                <span class="ps-alert-recipients">{{ a.recipients.join(', ') }}</span>
              </div>
              <div v-if="confirmingDelete === a.id" class="ps-alert-actions">
                <span class="ps-confirm-text">Delete?</span>
                <button type="button" class="ps-btn ps-btn--ghost ps-btn--sm" @click="cancelDeleteAlert">Cancel</button>
                <button
                  type="button"
                  class="ps-btn ps-btn--danger ps-btn--sm"
                  :disabled="deletingAlert"
                  @click="confirmDeleteAlert(a.id)"
                >
                  {{ deletingAlert ? '…' : 'Delete' }}
                </button>
              </div>
              <div v-else class="ps-alert-actions">
                <button type="button" class="ps-icon-btn" :disabled="editing !== null" @click="openEditAlert(a)" aria-label="Edit alert">Edit</button>
                <button type="button" class="ps-icon-btn ps-icon-btn--danger" :disabled="editing !== null" @click="startDeleteAlert(a.id)" aria-label="Delete alert">Delete</button>
              </div>
            </div>
          </template>
        </div>

        <!-- New-alert editor (shown below the list) -->
        <div v-if="editing === 'new'" class="ps-alert-editor">
          <div class="ps-field-label">Frequency</div>
          <div class="ps-freq-options">
            <label
              v-for="opt in FREQUENCY_OPTIONS"
              :key="opt.value"
              class="ps-freq-chip"
              :class="{ 'ps-freq-chip--on': editorForm.frequency === opt.value }"
            >
              <input
                v-model="editorForm.frequency"
                type="radio"
                name="freq-new"
                :value="opt.value"
              />
              <span>{{ opt.label }}</span>
            </label>
          </div>

          <div class="ps-field-label">Recipients</div>
          <input
            v-model="editorForm.recipientsText"
            class="ps-input ps-input--block"
            type="text"
            placeholder="email@example.com, another@example.com"
            spellcheck="false"
            autocomplete="off"
          />
          <p class="ps-field-hint">Comma-separated. At least one required.</p>

          <div class="ps-editor-actions">
            <button type="button" class="ps-btn ps-btn--ghost" @click="closeEditor">Cancel</button>
            <button
              type="button"
              class="ps-btn ps-btn--primary"
              :disabled="!editorValid || editorSaving"
              @click="onSaveAlert"
            >
              {{ editorSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p v-if="editorError" class="ps-err">{{ editorError }}</p>
        </div>

        <p v-if="alerts && alerts.length === 0 && editing !== 'new'" class="ps-empty">
          No alerts. Add one to receive scheduled summaries by email.
        </p>
      </div>

      <div class="ps-subsection-divider" />

      <!-- One-shot test send -->
      <div class="ps-subsection">
        <div class="ps-section-label">Send test summary</div>
        <p class="ps-section-desc">
          Send the latest portfolio summary now to verify the email pipeline.
        </p>
        <form class="ps-email-form" @submit.prevent="onSendEmail">
          <input
            v-model="emailRecipient"
            class="ps-input"
            type="email"
            placeholder="recipient@example.com"
            autocomplete="email"
            spellcheck="false"
          />
          <button
            type="submit"
            class="ps-btn ps-btn--primary"
            :disabled="!emailValid || emailState === 'sending'"
          >
            {{ emailState === 'sending' ? 'Sending…' : 'Send' }}
          </button>
        </form>
        <p v-if="emailState === 'sent'" class="ps-ok">
          Sent to {{ emailRecipient }}.
        </p>
        <p v-if="emailState === 'error' && emailError" class="ps-err">
          {{ emailError }}
        </p>
      </div>
    </section>

  </main>
</template>

<style scoped>
.ps-main {
  flex: 1;
  min-height: 0;
  padding: 8px 0 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.ps-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px 24px;
  overflow: auto;
  min-height: 0;
}

/* ── Section labels ────────────────────────────────── */
.ps-section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 14px;
}

.ps-section-label--danger {
  color: color-mix(in srgb, var(--loss) 70%, var(--text-3));
}

/* ── Q1: two subsections stacked ───────────────────── */
.ps-q1 {
  display: flex;
  flex-direction: column;
}

.ps-subsection {
  flex: 0 0 auto;
}

.ps-subsection--grow {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
}

.ps-subsection-divider {
  border-top: 1px solid var(--border);
  margin: 16px 0;
}

/* ── Rename form ───────────────────────────────────── */
.ps-rename-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ── Key-value list ────────────────────────────────── */
.ps-kv-list {
  display: flex;
  flex-direction: column;
}

.ps-kv-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.ps-kv-row:last-child {
  border-bottom: none;
}

.ps-kv-key {
  font-size: 11px;
  color: var(--text-3);
}

.ps-kv-val {
  font-size: 13px;
  color: var(--text-1);
}

.ps-kv-key.mono,
.ps-kv-val.mono {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.01em;
}

/* ── Email card ────────────────────────────────────── */
.ps-q4 {
  display: flex;
  flex-direction: column;
}
.ps-section-desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
  margin: 0 0 10px;
}
.ps-email-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ── Alerts list ───────────────────────────────────── */
.ps-alerts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ps-alerts-head .ps-section-label {
  margin-bottom: 0;
}

.ps-alert-list {
  display: flex;
  flex-direction: column;
}

.ps-alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.ps-alert-row:last-child {
  border-bottom: none;
}

.ps-alert-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.ps-alert-freq {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-1);
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.ps-alert-arrow {
  color: var(--text-3);
  font-size: 11px;
  flex-shrink: 0;
}

.ps-alert-recipients {
  font-size: 12px;
  color: var(--text-2);
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ps-alert-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ps-confirm-text {
  font-size: 11px;
  color: var(--text-3);
  margin-right: 4px;
}

.ps-icon-btn {
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 2px;
  transition: color 140ms ease, background 140ms ease;
}
.ps-icon-btn:hover:not(:disabled) {
  color: var(--text-1);
  background: var(--bg-alt);
}
.ps-icon-btn--danger:hover:not(:disabled) {
  color: var(--loss);
}
.ps-icon-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* ── Alert editor ──────────────────────────────────── */
.ps-alert-editor {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 14px;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ps-field-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.ps-freq-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.ps-freq-chip {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-size: 12px;
  color: var(--text-2);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 5px 10px;
  cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}
.ps-freq-chip:hover {
  color: var(--text-1);
  border-color: var(--text-3);
}
.ps-freq-chip input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.ps-freq-chip--on {
  background: color-mix(in srgb, var(--primary) 12%, var(--panel));
  border-color: var(--primary);
  color: var(--text-1);
}

.ps-field-hint {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
}

.ps-editor-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.ps-btn--sm {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
}

/* ── Danger zone ───────────────────────────────────── */
.ps-q3 {
  border-color: color-mix(in srgb, var(--loss) 28%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ps-danger-desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
  margin: 0;
}

.ps-confirm-prompt {
  font-size: 12px;
  color: var(--text-2);
  margin: 0;
}

.ps-confirm-prompt strong {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-1);
}

.ps-confirm-actions {
  display: flex;
  gap: 8px;
}

/* ── Inputs ────────────────────────────────────────── */
.ps-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-1);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease;
  box-sizing: border-box;
}

.ps-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.ps-input--danger:focus {
  border-color: var(--loss);
  box-shadow: 0 0 0 1px var(--loss);
}

.ps-input--block {
  display: block;
  width: 100%;
  flex: none;
}

/* ── Buttons ───────────────────────────────────────── */
.ps-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 2px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 140ms ease;
}

.ps-btn:disabled { opacity: 0.38; cursor: not-allowed; }

.ps-btn--primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
}
.ps-btn--primary:hover:not(:disabled) { opacity: 0.85; }

.ps-btn--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-2);
}
.ps-btn--ghost:hover:not(:disabled) { border-color: var(--text-3); color: var(--text-1); }

.ps-btn--danger {
  background: var(--loss);
  border: 1px solid var(--loss);
  color: #fff;
}
.ps-btn--danger:hover:not(:disabled) { opacity: 0.85; }

/* ── Misc ──────────────────────────────────────────── */
.ps-empty {
  font-size: 12px;
  color: var(--text-3);
  margin: 0;
}

.ps-ok  { font-size: 12px; color: var(--gain); margin: 0; }
.ps-err { font-size: 12px; color: var(--loss); margin: 0; }
</style>
