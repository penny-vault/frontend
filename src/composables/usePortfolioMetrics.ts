import { useQuery } from '@tanstack/vue-query'
import { getPortfolioMetrics, type PortfolioMetrics, type GetMetricsParams } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioMetrics(portfolioId: Ref<string | null>, params: GetMetricsParams = {}) {
  return useQuery<PortfolioMetrics>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'metrics', params.window, params.metric]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioMetrics(portfolioId.value, params)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
