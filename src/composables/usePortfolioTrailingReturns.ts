import { useQuery } from '@tanstack/vue-query'
import { getPortfolioTrailingReturns, type TrailingReturnRow } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioTrailingReturns(portfolioId: Ref<string | null>) {
  return useQuery<TrailingReturnRow[]>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'trailing-returns']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioTrailingReturns(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
