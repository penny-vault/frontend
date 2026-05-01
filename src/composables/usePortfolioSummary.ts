import { useQuery } from '@tanstack/vue-query'
import { getPortfolioSummary, type PortfolioSummary } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolioSummary(portfolioId: Ref<string | null>) {
  return useQuery<PortfolioSummary>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'summary']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioSummary(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
