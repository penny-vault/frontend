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

export function setBenchmark (state, benchmark) {
  state.benchmark = benchmark
}

export function setMetric (state, metric) {
  Object.assign(state.metrics[metric.name], metric.value)
}
