import { useQuery } from '@tanstack/vue-query'
import { listStrategies, type Strategy } from '@/api/endpoints/strategies'

export function useStrategyList() {
  return useQuery<Strategy[]>({
    queryKey: ['strategies'],
    queryFn: listStrategies
  })
}
