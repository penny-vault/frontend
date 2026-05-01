import { useQuery } from '@tanstack/vue-query'
import {
  getPortfolioPerformance,
  type PortfolioPerformance,
  type GetPerformanceParams
} from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioMeasurements(
  portfolioId: Ref<string | null>,
  params: Ref<GetPerformanceParams>
) {
  return useQuery<PortfolioPerformance>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'performance', params.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioPerformance(portfolioId.value, params.value)
    },
    enabled: computed(() => !!portfolioId.value),
    staleTime: 5 * 60_000
  })
}
