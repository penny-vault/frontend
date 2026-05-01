import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { listPortfolioAlerts, type Alert } from '@/api/endpoints/alerts'

export function usePortfolioAlerts(portfolioId: Ref<string | null>) {
  return useQuery<Alert[]>({
    queryKey: computed(() => ['portfolio-alerts', portfolioId.value]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return listPortfolioAlerts(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
