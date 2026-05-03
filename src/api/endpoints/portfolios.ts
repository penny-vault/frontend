import { apiClient } from '../client'
import type { components } from '../types'

export type Portfolio = components['schemas']['Portfolio']
export type PortfolioCreated = components['schemas']['PortfolioCreated']
export type PortfolioSummary = components['schemas']['PortfolioSummary']
export type Drawdown = components['schemas']['Drawdown']
export type PortfolioStatistic = components['schemas']['PortfolioStatistic']
export type TrailingReturnRow = components['schemas']['TrailingReturnRow']
export type PortfolioPerformance = components['schemas']['PortfolioPerformance']
export type PerformancePoint = components['schemas']['PerformancePoint']
export type Holding = components['schemas']['Holding']
export type HoldingsResponse = components['schemas']['HoldingsResponse']
export type HistoricalHolding = components['schemas']['HistoricalHolding']
export type HoldingsAsOfResponse = components['schemas']['HoldingsAsOfResponse']
export type HoldingsHistoryEntry = components['schemas']['HoldingsHistoryEntry']
export type HoldingsHistoryResponse = components['schemas']['HoldingsHistoryResponse']
export type Transaction = components['schemas']['Transaction']
export type TransactionsResponse = components['schemas']['TransactionsResponse']
export type TransactionType = Transaction['type']
export type BacktestRun = components['schemas']['BacktestRun']
export type PortfolioMetrics = components['schemas']['PortfolioMetrics']
export type MetricGroup = components['schemas']['MetricGroup']

// listPortfolios returns Portfolio[]; the KPI fields the dashboard needs
// (currentValue, ytdReturn, maxDrawdown, inceptionDate) live on Portfolio itself.
export type PortfolioListItem = Portfolio

export type PortfolioCreateRequest = components['schemas']['PortfolioCreateRequest']

export function listPortfolios(): Promise<PortfolioListItem[]> {
  return apiClient<PortfolioListItem[]>('/portfolios')
}

export function createPortfolio(body: PortfolioCreateRequest): Promise<PortfolioCreated> {
  return apiClient<PortfolioCreated>('/portfolios', { method: 'POST', body })
}

export function getPortfolio(slug: string): Promise<Portfolio> {
  return apiClient<Portfolio>(`/portfolios/${slug}`)
}

export type PortfolioUpdateRequest = components['schemas']['PortfolioUpdateRequest']

export function updatePortfolio(slug: string, body: PortfolioUpdateRequest): Promise<Portfolio> {
  return apiClient<Portfolio>(`/portfolios/${slug}`, { method: 'PATCH', body })
}

export function deletePortfolio(slug: string): Promise<void> {
  return apiClient<void>(`/portfolios/${slug}`, { method: 'DELETE' })
}

export function triggerPortfolioRun(slug: string): Promise<BacktestRun> {
  return apiClient<BacktestRun>(`/portfolios/${slug}/runs`, { method: 'POST' })
}

export function getPortfolioRun(slug: string, runId: string): Promise<BacktestRun> {
  return apiClient<BacktestRun>(`/portfolios/${slug}/runs/${runId}`)
}

export function getPortfolioSummary(slug: string): Promise<PortfolioSummary> {
  return apiClient<PortfolioSummary>(`/portfolios/${slug}/summary`)
}

export function getPortfolioDrawdowns(slug: string): Promise<Drawdown[]> {
  return apiClient<Drawdown[]>(`/portfolios/${slug}/drawdowns`)
}

export function getPortfolioStatistics(slug: string): Promise<PortfolioStatistic[]> {
  return apiClient<PortfolioStatistic[]>(`/portfolios/${slug}/statistics`)
}

export interface GetMetricsParams {
  window?: string
  metric?: string
}

export function getPortfolioMetrics(
  slug: string,
  params: GetMetricsParams = {}
): Promise<PortfolioMetrics> {
  return apiClient<PortfolioMetrics>(`/portfolios/${slug}/metrics`, { params })
}

export function getPortfolioTrailingReturns(slug: string): Promise<TrailingReturnRow[]> {
  return apiClient<TrailingReturnRow[]>(`/portfolios/${slug}/trailing-returns`)
}

export interface GetPerformanceParams {
  from?: string
  to?: string
  resolution?: 'daily' | 'weekly' | 'monthly'
}

export function getPortfolioPerformance(
  slug: string,
  params: GetPerformanceParams = {}
): Promise<PortfolioPerformance> {
  return apiClient<PortfolioPerformance>(`/portfolios/${slug}/performance`, { params })
}

export function getPortfolioHoldings(slug: string): Promise<HoldingsResponse> {
  return apiClient<HoldingsResponse>(`/portfolios/${slug}/holdings`)
}

export function getPortfolioHoldingsHistory(slug: string): Promise<HoldingsHistoryResponse> {
  return apiClient<HoldingsHistoryResponse>(`/portfolios/${slug}/holdings/history`)
}

export interface GetTransactionsParams {
  from?: string
  to?: string
  types?: TransactionType[]
}

export function getPortfolioTransactions(
  slug: string,
  params: GetTransactionsParams = {}
): Promise<TransactionsResponse> {
  const queryParams: Record<string, string> = {}
  if (params.from) queryParams.from = params.from
  if (params.to) queryParams.to = params.to
  if (params.types?.length) queryParams.type = params.types.join(',')
  return apiClient<TransactionsResponse>(`/portfolios/${slug}/transactions`, {
    params: queryParams
  })
}

export type HoldingsImpactResponse = components['schemas']['HoldingsImpactResponse']
export type HoldingsImpactPeriod = components['schemas']['HoldingsImpactPeriod']
export type HoldingsImpactItem = components['schemas']['HoldingsImpactItem']
export type HoldingsImpactRest = components['schemas']['HoldingsImpactRest']
export type HoldingsImpactPeriodKey = HoldingsImpactPeriod['period']

export interface GetHoldingsImpactParams {
  top?: number
}

export function getPortfolioHoldingsImpact(
  slug: string,
  params: GetHoldingsImpactParams = {}
): Promise<HoldingsImpactResponse> {
  const queryParams: Record<string, string> = {}
  if (params.top !== undefined) queryParams.top = String(params.top)
  return apiClient<HoldingsImpactResponse>(`/portfolios/${slug}/holdings-impact`, {
    params: queryParams
  })
}

export type EmailSummaryRequest = components['schemas']['EmailSummaryRequest']

export function sendPortfolioEmailSummary(slug: string, body: EmailSummaryRequest): Promise<void> {
  return apiClient<void>(`/portfolios/${slug}/email-summary`, {
    method: 'POST',
    body
  })
}

// Factor analysis — hand-typed, not yet in the backend OpenAPI spec
export type FactorKey = 'market' | 'size' | 'value' | 'momentum' | 'quality' | 'lowvol'
export type FactorPeriodKey = '1y' | '3y' | '5y' | 'inception'

export interface FactorDriver {
  ticker: string
  contribution: number
}

export interface FactorTimePoint {
  date: string
  exposure: number
}

export interface FactorLoading {
  factor: FactorKey
  portfolio: number
  benchmark: number
  active: number
  returnContribution: number
  varianceShare: number
  tStat: number
  timeSeries: FactorTimePoint[]
  positiveDrivers: FactorDriver[]
  negativeDrivers: FactorDriver[]
}

export interface FactorPeriod {
  period: FactorPeriodKey
  label: string
  startDate: string
  endDate: string
  years: number
  totalReturn: number
  alpha: number
  rSquared: number
  idiosyncraticShare: number
  factors: FactorLoading[]
}

export interface PortfolioFactorAnalysis {
  periods: FactorPeriod[]
}

export function getPortfolioFactors(slug: string): Promise<PortfolioFactorAnalysis> {
  return apiClient<PortfolioFactorAnalysis>(`/portfolios/${slug}/factors`)
}
