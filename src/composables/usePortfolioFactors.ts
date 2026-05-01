import { useQuery } from '@tanstack/vue-query'
import { getPortfolioFactors, type PortfolioFactorAnalysis } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioFactors(portfolioId: Ref<string | null>) {
  return useQuery<PortfolioFactorAnalysis>({
    queryKey: computed(() => ['portfolio-factors', portfolioId.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioFactors(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
