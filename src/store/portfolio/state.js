import { emptyPortfolio, emptyMetrics, emptyMeasurements } from './constants'

export default function () {
  return {
    portfolios: [],
    portfolioDict: {},
    current: emptyPortfolio,
    holdings: [],
    measurements: emptyMeasurements,
    metrics: emptyMetrics,
    transactions: []
  }
}
