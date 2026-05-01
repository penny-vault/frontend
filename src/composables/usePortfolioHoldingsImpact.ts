import { useQuery } from '@tanstack/vue-query'
import {
  getPortfolioHoldingsImpact,
  type HoldingsImpactResponse
} from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioHoldingsImpact(portfolioId: Ref<string | null>) {
  return useQuery<HoldingsImpactResponse>({
    queryKey: computed(() => ['portfolio-holdings-impact', portfolioId.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioHoldingsImpact(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
