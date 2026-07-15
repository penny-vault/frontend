import { computed, type Ref } from 'vue'
import { getPortfolioPrediction, type PredictionResponse } from '@/api/endpoints/portfolios'
import { useRecalculatingQuery } from './useRecalculatingQuery'

export function usePortfolioPrediction(portfolioId: Ref<string | null>) {
  return useRecalculatingQuery<PredictionResponse>({
    queryKey: computed(() => ['portfolio', portfolioId.value, 'prediction']),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioPrediction(portfolioId.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
