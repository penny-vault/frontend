import { useQuery } from '@tanstack/vue-query'
import { getPortfolioDrawdowns, type Drawdown } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioDrawdowns(portfolioId: Ref<string | null>) {
  return useQuery<Drawdown[]>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'drawdowns']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioDrawdowns(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
