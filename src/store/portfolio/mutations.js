export function setPortfolios (state, portfolios) {
  portfolios.forEach((element) => {
    element.start_date = new Date(element.start_date * 1000)
    element.lastchanged = new Date(element.lastchanged * 1000)
    state.portfolioDict[element.id] = element
  })
  state.portfolios = portfolios
}

export function setNotifications (state, notifications) {
  state.current.notifications = notifications
}

export function setCurrentPortfolio (state, portfolio) {
  state.current = portfolio
}

export function setBenchmark (state, benchmark) {
  state.benchmark = benchmark
}

export function setMetric (state, metric) {
  Object.assign(state.metrics[metric.name], metric.value)
}

export function setPortfolioLoading (state, loading) {
  state.loading = loading
}
