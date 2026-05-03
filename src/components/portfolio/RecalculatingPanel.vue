<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { usePortfolioRunProgress } from '@/composables/usePortfolioRunProgress'
import type { RecalculatingResponse } from '@/api/endpoints/portfolios'
import type { BacktestRun } from '@/api/endpoints/portfolios'

const props = defineProps<{
  info: RecalculatingResponse
  runStatus: BacktestRun['status'] | null
  error: string | null
}>()

const fallbackError = ref<string | null>(null)
const { progressPct, start } = usePortfolioRunProgress({
  onFailure: (msg) => {
    fallbackError.value = msg
  }
})

onMounted(() => {
  start(props.info.portfolioSlug, props.info.runId)
})

watch(
  () => props.info.runId,
  (next, prev) => {
    if (next && next !== prev) {
      fallbackError.value = null
      start(props.info.portfolioSlug, next)
    }
  }
)

const displayError = ref<string | null>(null)
watch(
  [() => props.error, fallbackError],
  ([extError, internalError]) => {
    displayError.value = extError ?? internalError
  },
  { immediate: true }
)
</script>

<template>
  <section class="rp" role="status" aria-live="polite">
    <div class="rp-card">
      <div class="rp-label">
        {{ runStatus === 'queued' ? 'Queued' : 'Recalculating portfolio' }}
      </div>
      <h2 class="rp-title">Bringing this portfolio up to date</h2>
      <p class="rp-sub">
        We're rebuilding the latest snapshot. This usually takes 10–30 seconds.
      </p>

      <div class="rp-progress-track">
        <div class="rp-progress-bar" :style="{ width: progressPct + '%' }" />
      </div>
      <div class="rp-progress-pct">{{ progressPct }}%</div>

      <div v-if="displayError" class="rp-error" role="alert">
        {{ displayError }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.rp {
  display: flex;
  justify-content: center;
  padding: 64px 0;
}
.rp-card {
  width: 100%;
  max-width: 460px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 28px 32px 30px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rp-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-3);
}
.rp-title {
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--text-1);
  margin: 2px 0 0;
}
.rp-sub {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.5;
  margin: 0 0 6px;
}
.rp-progress-track {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}
.rp-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 400ms ease;
}
.rp-progress-pct {
  font-size: 11px;
  color: var(--text-4);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rp-error {
  margin-top: 8px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--loss) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--loss) 30%, transparent);
  border-radius: 3px;
  font-size: 13px;
  color: var(--loss);
}

@media (prefers-reduced-motion: reduce) {
  .rp-progress-bar {
    transition: none;
  }
}
</style>
