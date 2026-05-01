import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import {
  getPortfolioTransactions,
  type GetTransactionsParams,
  type TransactionsResponse
} from '@/api/endpoints/portfolios'

export function usePortfolioTransactions(
  portfolioId: Ref<string | null>,
  params: Ref<GetTransactionsParams>
) {
  return useQuery<TransactionsResponse>({
    queryKey: computed(() => [
      'portfolio',
      portfolioId.value,
      'transactions',
      params.value.from ?? null,
      params.value.to ?? null,
      [...(params.value.types ?? [])].sort().join(',') || null
    ]),
    queryFn: () => {
      if (!portfolioId.value) throw new Error('portfolioId is required')
      return getPortfolioTransactions(portfolioId.value, params.value)
    },
    enabled: computed(() => !!portfolioId.value)
  })
}
