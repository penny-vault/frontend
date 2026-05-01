import { useQuery } from '@tanstack/vue-query'
import { listPortfolios, type PortfolioListItem } from '@/api/endpoints/portfolios'

export function usePortfolioList() {
  return useQuery<PortfolioListItem[]>({
    queryKey: ['portfolios'],
    queryFn: listPortfolios
  })
}
