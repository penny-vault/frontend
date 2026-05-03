import { getPortfolioStatistics, type PortfolioStatistic } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioStatistics(portfolioId: Ref<string | null>) {
  return useRecalculatingQuery<PortfolioStatistic[]>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'statistics']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioStatistics(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
