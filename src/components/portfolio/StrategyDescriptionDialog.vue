<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import Dialog from 'primevue/dialog'
import { marked } from 'marked'
import { getStrategy, type Strategy } from '@/api/endpoints/strategies'

const props = defineProps<{
  visible: boolean
  strategyCode: string | null
  portfolioParameters: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const codeRef: Ref<string | null> = computed(() => props.strategyCode)
const enabled = computed(() => props.visible && !!codeRef.value)

const {
  data: strategy,
  isLoading,
  error
} = useQuery<Strategy>({
  queryKey: computed(() => ['strategy', codeRef.value]),
  queryFn: () => {
    if (!codeRef.value) throw new Error('strategyCode is required')
    return getStrategy(codeRef.value)
  },
  enabled,
  staleTime: 5 * 60 * 1000
})

const describe = computed(() => strategy.value?.describe ?? null)

const headerText = computed(() => {
  const name = describe.value?.name || strategy.value?.repoName || props.strategyCode
  return name ? `About ${name}` : 'About this strategy'
})

const descriptionHtml = computed<string | null>(() => {
  const raw = describe.value?.description
  if (!raw) return null
  return marked.parse(raw) as string
})

interface ParamRow {
  name: string
  type: string
  defaultValue: string | null
  currentValue: string | null
  description: string | null
}

function fmtValue(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

const paramRows = computed<ParamRow[]>(() => {
  const params = describe.value?.parameters ?? []
  const portfolioParams = props.portfolioParameters ?? {}
  return params.map((p) => ({
    name: p.name,
    type: p.type,
    defaultValue: fmtValue(p.default),
    currentValue: fmtValue(portfolioParams[p.name]),
    description: p.description ?? null
  }))
})

const repoUrl = computed<string | null>(() => {
  const s = strategy.value
  if (!s || s.isOfficial) return null
  return s.cloneUrl ?? null
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="headerText"
    :style="{ width: '90vw', maxWidth: '720px' }"
    :breakpoints="{ '960px': '95vw' }"
    :closable="true"
    class="strategy-desc-dialog"
  >
    <div class="sdd-body">
      <div v-if="isLoading" class="sdd-loading">Loading strategy details…</div>
      <div v-else-if="error" class="sdd-error">
        Could not load strategy. {{ (error as Error).message }}
      </div>

      <template v-else-if="strategy">
        <div class="sdd-meta">
          <div v-if="strategyCode" class="sdd-meta-row">
            <span class="sdd-meta-label">Code</span>
            <span class="sdd-meta-value mono">{{ strategyCode }}</span>
          </div>
          <div v-if="describe?.schedule" class="sdd-meta-row">
            <span class="sdd-meta-label">Schedule</span>
            <span class="sdd-meta-value">{{ describe.schedule }}</span>
          </div>
          <div v-if="describe?.benchmark" class="sdd-meta-row">
            <span class="sdd-meta-label">Default benchmark</span>
            <span class="sdd-meta-value mono">{{ describe.benchmark }}</span>
          </div>
          <div v-if="strategy.installedVer" class="sdd-meta-row">
            <span class="sdd-meta-label">Version</span>
            <span class="sdd-meta-value mono">{{ strategy.installedVer }}</span>
          </div>
          <div v-if="repoUrl" class="sdd-meta-row">
            <span class="sdd-meta-label">Source</span>
            <a class="sdd-link" :href="repoUrl" target="_blank" rel="noopener noreferrer">
              {{ strategy.repoOwner }}/{{ strategy.repoName }}
            </a>
          </div>
        </div>

        <section v-if="descriptionHtml" class="sdd-section">
          <h3 class="sdd-section-h">Description</h3>
          <div class="sdd-prose" v-html="descriptionHtml" />
        </section>
        <section v-else class="sdd-section">
          <h3 class="sdd-section-h">Description</h3>
          <p class="sdd-empty">No description provided.</p>
        </section>

        <section v-if="paramRows.length > 0" class="sdd-section">
          <h3 class="sdd-section-h">Parameters</h3>
          <ul class="sdd-params">
            <li v-for="p in paramRows" :key="p.name">
              <div class="sdd-param-top">
                <span class="sdd-param-name mono">{{ p.name }}</span>
                <span class="sdd-param-type">{{ p.type }}</span>
              </div>
              <div class="sdd-param-values">
                <span class="sdd-param-current">
                  <span class="sdd-param-label">value</span>
                  <span class="mono">{{ p.currentValue ?? '—' }}</span>
                </span>
                <span
                  v-if="p.defaultValue !== null && p.defaultValue !== p.currentValue"
                  class="sdd-param-default"
                >
                  <span class="sdd-param-label">default</span>
                  <span class="mono">{{ p.defaultValue }}</span>
                </span>
              </div>
              <p v-if="p.description" class="sdd-param-desc">{{ p.description }}</p>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </Dialog>
</template>

<style scoped>
.sdd-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.sdd-loading,
.sdd-error,
.sdd-empty {
  font-size: 13px;
  color: var(--text-3);
  padding: 12px 0;
}
.sdd-error {
  color: var(--loss);
}
.sdd-meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  font-size: 12.5px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.sdd-meta-row {
  display: contents;
}
.sdd-meta-label {
  color: var(--text-3);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  align-self: center;
}
.sdd-meta-value {
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: 'IBM Plex Mono', monospace;
}
.sdd-link {
  color: var(--primary);
  text-decoration: none;
}
.sdd-link:hover {
  text-decoration: underline;
}
.sdd-section-h {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
  margin: 0 0 10px;
}
.sdd-prose {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-2);
}
.sdd-prose :deep(p) {
  margin: 0 0 12px;
}
.sdd-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.sdd-prose :deep(strong) {
  color: var(--text-1);
}
.sdd-prose :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  background: var(--panel-hover);
  padding: 1px 5px;
  border-radius: 2px;
}
.sdd-prose :deep(a) {
  color: var(--primary);
}
.sdd-prose :deep(ul),
.sdd-prose :deep(ol) {
  padding-left: 20px;
  margin: 0 0 12px;
}
.sdd-params {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sdd-params li {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 2px;
  background: var(--panel);
}
.sdd-param-top {
  display: flex;
  align-items: baseline;
  gap: 10px;
  justify-content: space-between;
}
.sdd-param-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-1);
}
.sdd-param-type {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.sdd-param-values {
  margin-top: 6px;
  display: flex;
  gap: 16px;
  font-size: 12px;
  flex-wrap: wrap;
}
.sdd-param-current,
.sdd-param-default {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.sdd-param-label {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.sdd-param-current .mono {
  color: var(--text-1);
}
.sdd-param-default .mono {
  color: var(--text-3);
}
.sdd-param-desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
  margin: 8px 0 0;
}

@media (max-width: 720px) {
  .sdd-meta {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
  .sdd-meta-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
  }
  .sdd-meta-row:last-child {
    border-bottom: none;
  }
}
</style>
