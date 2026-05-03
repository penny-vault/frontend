import { getPortfolioTrailingReturns, type TrailingReturnRow } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioTrailingReturns(portfolioId: Ref<string | null>) {
  return useRecalculatingQuery<TrailingReturnRow[]>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'trailing-returns']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioTrailingReturns(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
