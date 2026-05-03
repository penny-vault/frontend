import { getPortfolioDrawdowns, type Drawdown } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioDrawdowns(portfolioId: Ref<string | null>) {
  return useRecalculatingQuery<Drawdown[]>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'drawdowns']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioDrawdowns(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
