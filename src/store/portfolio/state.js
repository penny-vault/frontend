import { emptyPortfolio, emptyMetrics, emptyMeasurements } from './constants'

export default function () {
  return {
    loaded: false,
    portfolios: [],
    portfolioDict: {},
    current: emptyPortfolio,
    holdings: [],
    measurements: emptyMeasurements,
    metrics: emptyMetrics,
    transactions: []
  }
}
