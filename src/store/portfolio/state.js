import { emptyPortfolio, emptyPerformance, emptyHoldings, emptyMetrics, emptyMeasurements, emptyTransactions } from './constants'

export default function () {
  return {
    portfolios: [],
    portfolioDict: {},
    current: emptyPortfolio,
    holdings: [],
    benchmark: emptyPerformance,
    measurements: emptyMeasurements,
    metrics: emptyMetrics,
    transactions: emptyTransactions
  }
}
