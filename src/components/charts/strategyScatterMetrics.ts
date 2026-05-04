export type MetricKey =
  | 'cagr'
  | 'maxDrawDown'
  | 'sharpe'
  | 'sortino'
  | 'ulcerIndex'
  | 'beta'
  | 'alpha'
  | 'stdDev'
  | 'taxCostRatio'

export type SizeKey = MetricKey | 'uniform'

export interface MetricDef {
  key: MetricKey
  label: string
  format: 'percent' | 'number'
  precision: number
  // axis/size derived from |value|; tooltip and chart show the magnitude.
  magnitude?: boolean
  // axis can be clamped at 0 because the metric is non-negative by definition.
  nonNegative?: boolean
}

export const METRICS: Record<MetricKey, MetricDef> = {
  cagr: { key: 'cagr', label: 'CAGR', format: 'percent', precision: 2 },
  maxDrawDown: {
    key: 'maxDrawDown',
    label: 'Max Drawdown',
    format: 'percent',
    precision: 1,
    magnitude: true,
    nonNegative: true
  },
  sharpe: { key: 'sharpe', label: 'Sharpe', format: 'number', precision: 2 },
  sortino: { key: 'sortino', label: 'Sortino', format: 'number', precision: 2 },
  ulcerIndex: {
    key: 'ulcerIndex',
    label: 'Ulcer Index',
    format: 'number',
    precision: 2,
    nonNegative: true
  },
  beta: { key: 'beta', label: 'Beta', format: 'number', precision: 2 },
  alpha: { key: 'alpha', label: 'Alpha', format: 'percent', precision: 2 },
  stdDev: {
    key: 'stdDev',
    label: 'Volatility',
    format: 'percent',
    precision: 1,
    nonNegative: true
  },
  taxCostRatio: {
    key: 'taxCostRatio',
    label: 'Tax Cost Ratio',
    format: 'percent',
    precision: 2,
    nonNegative: true
  }
}

export interface PairDef {
  id: string
  label: string
  x: MetricKey
  y: MetricKey
}

export const PAIRS: PairDef[] = [
  { id: 'cagr-ulcer', label: 'CAGR vs Ulcer Index', y: 'cagr', x: 'ulcerIndex' },
  { id: 'cagr-vol', label: 'CAGR vs Volatility', y: 'cagr', x: 'stdDev' },
  { id: 'cagr-mdd', label: 'CAGR vs Max Drawdown', y: 'cagr', x: 'maxDrawDown' },
  { id: 'cagr-beta', label: 'CAGR vs Beta', y: 'cagr', x: 'beta' },
  { id: 'alpha-beta', label: 'Alpha vs Beta', y: 'alpha', x: 'beta' },
  { id: 'sharpe-mdd', label: 'Sharpe vs Max Drawdown', y: 'sharpe', x: 'maxDrawDown' }
]

export const DEFAULT_PAIR_ID = 'cagr-ulcer'
export const DEFAULT_SIZE_KEY: SizeKey = 'maxDrawDown'

export const SIZE_OPTIONS: Array<{ key: SizeKey; label: string }> = [
  { key: 'maxDrawDown', label: 'Max Drawdown' },
  { key: 'stdDev', label: 'Volatility' },
  { key: 'ulcerIndex', label: 'Ulcer Index' },
  { key: 'sharpe', label: 'Sharpe' },
  { key: 'sortino', label: 'Sortino' },
  { key: 'beta', label: 'Beta' },
  { key: 'taxCostRatio', label: 'Tax Cost Ratio' },
  { key: 'uniform', label: 'Uniform' }
]
