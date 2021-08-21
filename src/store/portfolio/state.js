import { emptyPortfolio, emptyPerformance, emptyMetrics, emptyMeasurements } from './constants'

export default function () {
  return {
    portfolios: [],
    portfolioDict: {},
    current: emptyPortfolio,
    benchmark: emptyPerformance,
    measurements: emptyMeasurements,
    metrics: emptyMetrics
  }
}
