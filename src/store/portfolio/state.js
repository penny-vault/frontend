import { emptyPortfolio, emptyPerformance, emptyMetrics } from './constants'

export default function () {
  return {
    portfolios: [],
    portfolioDict: {},
    current: emptyPortfolio,
    benchmark: emptyPerformance,
    metrics: emptyMetrics
  }
}
