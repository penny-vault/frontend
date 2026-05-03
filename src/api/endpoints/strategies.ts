import { apiClient } from '../client'

// Strategy registry — hand-typed against the pv-api openapi (Strategy /
// StrategyDescribe / StrategyParameter / StrategyPreset). The generated
// types.ts predates these schemas; regenerate once the backend bump lands.

export type StrategyInstallState = 'pending' | 'installing' | 'ready' | 'failed'

export interface StrategyParameter {
  name: string
  type: string
  default?: unknown
  description?: string | null
}

export interface StrategyPreset {
  name: string
  parameters: Record<string, unknown>
}

export interface StrategyDescribe {
  shortCode: string
  name: string
  description?: string | null
  parameters: StrategyParameter[]
  presets?: StrategyPreset[]
  schedule: string
  benchmark: string
}

export interface Strategy {
  shortCode: string
  repoOwner: string
  repoName: string
  cloneUrl?: string
  isOfficial: boolean
  ownerSub?: string | null
  description?: string | null
  categories?: string[]
  stars?: number | null
  installState: StrategyInstallState
  installedVer?: string | null
  lastAttemptedVer?: string | null
  installError?: string | null
  installedAt?: string | null
  describe?: StrategyDescribe | null
  cagr?: number | null
  maxDrawDown?: number | null
  sharpe?: number | null
  sortino?: number | null
  ulcerIndex?: number | null
  beta?: number | null
  alpha?: number | null
  stdDev?: number | null
  taxCostRatio?: number | null
  oneYearReturn?: number | null
  ytdReturn?: number | null
  benchmarkYtdReturn?: number | null
}

export function listStrategies(): Promise<Strategy[]> {
  return apiClient<Strategy[]>('/strategies')
}

export function getStrategy(shortCode: string): Promise<Strategy> {
  return apiClient<Strategy>(`/strategies/${shortCode}`)
}
