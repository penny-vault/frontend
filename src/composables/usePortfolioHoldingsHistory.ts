import { computed, type Ref } from 'vue'
import {
  getPortfolioHoldingsHistory,
  type HoldingsHistoryResponse
} from '@/api/endpoints/portfolios'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioHoldingsHistory(portfolioId: Ref<string | null>) {
  return useRecalculatingQuery<HoldingsHistoryResponse>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'holdings-history']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioHoldingsHistory(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
