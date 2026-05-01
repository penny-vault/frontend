import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPortfolioHoldings, type HoldingsResponse } from '@/api/endpoints/portfolios'

export function usePortfolioHoldings(portfolioId: Ref<string | null>) {
  return useQuery<HoldingsResponse>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'holdings']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioHoldings(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
