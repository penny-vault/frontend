import { emptyPortfolio, emptyPerformance } from './constants'

export function setMeasurements (state, measurements) {
  state.measurements = measurements
}

export function setHoldings (state, holdings) {
  state.holdings = holdings.Items
}

export function setTransactions (state, transactions) {
  state.transactions = transactions.Items
}

export function setPortfolios (state, portfolios) {
  portfolios.forEach((element) => {
    element.startDate = new Date(element.startDate * 1000)
    element.lastChanged = new Date(element.lastChanged * 1000)
    state.portfolioDict[element.id] = element
  })
  state.portfolios = portfolios
}

export function setPortfolioName (state, name) {
  state.current.name = name
}

export function setNotifications (state, notifications) {
  state.current.notifications = notifications
}

export function setCurrentPortfolio (state, portfolio) {
  state.current = portfolio
}

export function clearCurrentPortfolio (state) {
  state.current = emptyPortfolio
}

export function setBenchmark (state, benchmark) {
  state.benchmark = benchmark
}

export function clearBenchmark (state) {
  state.benchmark = emptyPerformance
}

export function setMetric (state, metric) {
  Object.assign(state.metrics[metric.name], metric.value)
}

export function setPortfolioLoaded (state, loaded) {
  state.loaded = loaded
}