import { apiClient } from '../client'
import type { components } from '../types'

export type Alert = components['schemas']['Alert']
export type AlertFrequency = components['schemas']['AlertFrequency']
export type AlertCreateRequest = components['schemas']['AlertCreateRequest']
export type AlertUpdateRequest = components['schemas']['AlertUpdateRequest']

export function listPortfolioAlerts(slug: string): Promise<Alert[]> {
  return apiClient<Alert[]>(`/portfolios/${slug}/alerts`)
}

export function createPortfolioAlert(slug: string, body: AlertCreateRequest): Promise<Alert> {
  return apiClient<Alert>(`/portfolios/${slug}/alerts`, { method: 'POST', body })
}

export function updatePortfolioAlert(
  slug: string,
  alertId: string,
  body: AlertUpdateRequest
): Promise<Alert> {
  return apiClient<Alert>(`/portfolios/${slug}/alerts/${alertId}`, { method: 'PATCH', body })
}

export function deletePortfolioAlert(slug: string, alertId: string): Promise<void> {
  return apiClient<void>(`/portfolios/${slug}/alerts/${alertId}`, { method: 'DELETE' })
}
