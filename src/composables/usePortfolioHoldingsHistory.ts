import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPortfolioHoldingsHistory, type HoldingsHistoryResponse } from '@/api/endpoints/portfolios'

export function usePortfolioHoldingsHistory(portfolioId: Ref<string | null>) {
  return useQuery<HoldingsHistoryResponse>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'holdings-history']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioHoldingsHistory(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
