import {
  getPortfolioPerformance,
  type PortfolioPerformance,
  type GetPerformanceParams
} from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioMeasurements(
  portfolioId: Ref<string | null>,
  params: Ref<GetPerformanceParams>
) {
  return useRecalculatingQuery<PortfolioPerformance>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'performance', params.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioPerformance(portfolioId.value, params.value)
    },
    enabled: computed(() => !!portfolioId.value),
    staleTime: 5 * 60_000
  })
}
