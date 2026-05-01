import { useQuery } from '@tanstack/vue-query'
import { getPortfolio, type Portfolio } from '@/api/endpoints/portfolios'
import { computed, type Ref } from 'vue'

export function usePortfolio(portfolioId: Ref<string | null>) {
  return useQuery<Portfolio>({
    queryKey: computed(() => ['portfolio', portfolioId.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolio(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
