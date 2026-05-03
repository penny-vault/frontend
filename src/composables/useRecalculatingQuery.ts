import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, watch, type ComputedRef } from 'vue'
import {
  getPortfolioRun,
  type BacktestRun,
  type MaybeRecalculating,
  type RecalculatingResponse
} from '@/api/endpoints/portfolios'

const POLL_MS = 1500

export interface UseRecalculatingQueryOptions<T> {
  queryKey: ComputedRef<readonly unknown[]>
  queryFn: () => Promise<MaybeRecalculating<T>>
  enabled?: ComputedRef<boolean>
  staleTime?: number
}

export interface UseRecalculatingQueryReturn<T> {
  data: ComputedRef<T | undefined>
  isLoading: ComputedRef<boolean>
  isFetching: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  isRecalculating: ComputedRef<boolean>
  recalcInfo: ComputedRef<RecalculatingResponse | null>
  runStatus: ComputedRef<BacktestRun['status'] | null>
}

// Wraps useQuery for endpoints that may return 202 RecalculatingResponse.
// While recalculating, polls the run status; on `success` invalidates the
// original query so it retries and resolves to the 200 payload. On `failed`
// surfaces the run's error message.
export function useRecalculatingQuery<T>(
  opts: UseRecalculatingQueryOptions<T>
): UseRecalculatingQueryReturn<T> {
  const queryClient = useQueryClient()

  const baseQuery = useQuery<MaybeRecalculating<T>>({
    queryKey: opts.queryKey,
    queryFn: opts.queryFn,
    enabled: opts.enabled,
    staleTime: opts.staleTime ?? 0
  })

  const recalcInfo = computed<RecalculatingResponse | null>(() => {
    const v: MaybeRecalculating<T> | undefined = baseQuery.data.value
    return v && v.recalculating ? v.info : null
  })

  const data = computed<T | undefined>(() => {
    const v: MaybeRecalculating<T> | undefined = baseQuery.data.value
    return v && !v.recalculating ? v.data : undefined
  })

  const runQueryKey = computed(() => [
    'portfolio-run',
    recalcInfo.value?.portfolioSlug ?? null,
    recalcInfo.value?.runId ?? null
  ])

  const runQuery = useQuery<BacktestRun>({
    queryKey: runQueryKey,
    queryFn: () => {
      const info = recalcInfo.value
      if (!info) throw new Error('runQuery enabled without recalc info')
      return getPortfolioRun(info.portfolioSlug, info.runId)
    },
    enabled: computed(() => !!recalcInfo.value),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'success' || status === 'failed') return false
      return POLL_MS
    },
    refetchIntervalInBackground: false
  })

  watch(
    () => runQuery.data.value?.status,
    (status) => {
      if (!status) return
      if (status === 'success') {
        queryClient.invalidateQueries({ queryKey: opts.queryKey.value })
      }
    }
  )

  const error = computed<Error | null>(() => {
    if (baseQuery.error.value) return baseQuery.error.value as Error
    const run = runQuery.data.value
    if (run?.status === 'failed') {
      return new Error(run.error ?? 'Backtest failed')
    }
    return null
  })

  return {
    data,
    isLoading: computed(() => baseQuery.isLoading.value && !recalcInfo.value),
    isFetching: computed(() => baseQuery.isFetching.value),
    error,
    isRecalculating: computed(() => !!recalcInfo.value),
    recalcInfo,
    runStatus: computed(() => runQuery.data.value?.status ?? recalcInfo.value?.runStatus ?? null)
  }
}
