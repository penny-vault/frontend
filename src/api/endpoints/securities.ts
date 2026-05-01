import { apiClient } from '../client'

export interface SecurityResult {
  ticker: string
  name: string
  compositeFigi?: string
  cusip?: string
}

export function searchSecurities(q: string): Promise<SecurityResult[]> {
  return apiClient<SecurityResult[]>('/security', {
    params: { q },
    headers: { Range: 'items=0-9' }
  })
}
