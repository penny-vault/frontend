import { emptyPortfolio, emptyPerformance, Daily, Weekly, Monthly, Annually } from './constants'
import { api } from 'boot/axios'
import { authPlugin } from '../../auth'

// Helper functions

function ymdString(dt) {
  return dt.toISOString().split("T")[0]
}

function normalizePortfolio(portfolio) {
  portfolio.start_date = new Date(portfolio.start_date * 1000)
  portfolio.lastchanged = new Date(portfolio.lastchanged * 1000)

  var notification_opts = emptyPortfolio.notification_opts
  if ((portfolio.notifications & Daily) == Daily) {
    notification_opts.daily.state = true
  }
  if ((portfolio.notifications & Weekly) == Weekly) {
    notification_opts.weekly.state = true
  }
  if ((portfolio.notifications & Monthly) == Monthly) {
    notification_opts.monthly.state = true
  }
  if ((portfolio.notifications & Annually) == Annually) {
    notification_opts.annually.state = true
  }

  portfolio.notification_opts
  return portfolio
}

async function lookupPortfolio(api, options, portfolioDict, currentPortfolio, portfolioId) {
  return new Promise((resolve, reject) => {
    let portfolio = {}
    if (currentPortfolio.id == portfolioId) {
      Object.assign(portfolio, currentPortfolio)
      resolve(portfolio)
    } else if (portfolioDict[portfolioId] === undefined) {
      api.get(`/portfolio/${portfolioId}`, options).then(response => {
        portfolio = response.data
        portfolio = normalizePortfolio(portfolio)
        resolve(portfolio)
      })
    } else {
      Object.assign(portfolio, portfolioDict[portfolioId])
      resolve(portfolio)
    }
  })
}

function AnnualizeReturns(measurements) {
  let annualized = new Map()
  measurements.forEach( elem => {
      let dt = new Date(elem.time * 1000)
      var curr = annualized.get(dt.getFullYear())
      if (curr === undefined) {
          annualized.set(dt.getFullYear(), (1 + elem.percentReturn))
      } else {
          annualized.set(dt.getFullYear(), curr * (1 + elem.percentReturn))
      }
  })
  return annualized
}

function BestYear(measurements) {
  let annualized = AnnualizeReturns(measurements)
  var yr = 0
  var ret = Number.MIN_SAFE_INTEGER
  annualized.forEach( (v, k) => {
      if (v > ret) {
          yr = k
          ret = v
      }
  })

  ret = (ret - 1)
  return {value: ret, year: yr}
}

function WorstYear(measurements) {
  let annualized = AnnualizeReturns(measurements)
  var yr = 0
  var ret = Number.MAX_SAFE_INTEGER
  annualized.forEach( (v, k) => {
      if (v < ret) {
          yr = k
          ret = v
      }
  })

  ret = (ret - 1)
  return {value: ret, year: yr}
}

// Exported actions

export async function fetchPortfolios ({ commit }) {
  const accessToken = await authPlugin.getTokenSilently()
  api.get('/portfolio', {
    headers: {
        Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    }
  }).then(response => {
      commit('setPortfolios', response.data)
  })
}

export async function fetchBenchmark ({ commit, dispatch, state }, { startDate, endDate } ) {
  // load benchmark
  // TODO allow user to set these parameters
  let benchmarkArgs = {
    ticker: 'VFINX',
    snapToDate: true
  }

  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  api.post(`/benchmark/?startDate=${ymdString(startDate)}&endDate=${ymdString(endDate)}`, benchmarkArgs, options).then(response => {
    let benchmark = response.data
    benchmark.start_date = new Date(benchmark.start_date * 1000)
    benchmark.lastchanged = new Date(benchmark.lastchanged * 1000)

    dispatch('calculateMetrics', {
      performance: benchmark,
      key: 'benchmark'
    })
    commit('setBenchmark', benchmark)
  })
}

export async function fetchPortfolio({ commit, dispatch, state }, portfolioId ) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  let portfolio = await lookupPortfolio(api, options, state.portfolioDict, state.current, portfolioId)

  let now = new Date()
  if (portfolio.id != portfolioId ||
      portfolio.lastfetch === undefined ||
      (now - portfolio.lastfetch) > (15 * 60 * 1000))
  {
    commit('setPortfolioLoading', true)
    commit('setCurrentPortfolio', emptyPortfolio)
    commit('setBenchmark', emptyPerformance)
  } else {
    // don't bother
    return
  }

  // load strategy
  let endpoint = `/strategy/${portfolio.strategy}?startDate=${ymdString(portfolio.start_date)}&endDate=${ymdString(new Date())}`
  api.post(endpoint, portfolio.arguments, options).then(response => {
    let performance = response.data
    try {
      performance.maxDrawDown = performance.metrics.drawDowns[0].lossPercent
    } catch (e) {
      performance.maxDrawDown = 0
    }
    performance.periodStart = new Date(performance.periodStart * 1000)
    performance.periodEnd = new Date(performance.periodEnd * 1000)
    performance.computedOn = new Date(performance.computedOn * 1000)
    portfolio.performance = performance

    dispatch('fetchBenchmark', {
      startDate: performance.periodStart,
      endDate: performance.periodEnd
    })

    // calculate metrics
    dispatch('calculateMetrics', {
      performance: performance,
      key: 'portfolio'
    })

    performance.transactions = performance.transactions.filter(item => {
      let dt = new Date(item.date)
      let now = new Date()
      if (item.kind !== "MARKER" && dt <= now) {
        return item
      }
    })

    portfolio.lastfetch = new Date()
    commit('setCurrentPortfolio', portfolio)
    commit('setPortfolioLoading', false)
  })
}

export async function calculateMetrics({ commit }, { performance, key }) {
  let currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',

    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  let percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  let metric = {
    key: key,
    name: 'finalBalance',
    value: {}
  }

  metric.value[`${key}Value`] = performance.measurements[performance.measurements.length-1].value
  metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.measurements[performance.measurements.length-1].value)

  commit('setMetric', metric)

  metric.key = key
  metric.name = 'totalDeposited'
  metric.value[`${key}Value`] = performance.totalDeposited
  metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.totalDeposited)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'totalWithdrawn'
  metric.value[`${key}Value`] = performance.totalWithdrawn
  metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.totalWithdrawn)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'stdDev'
  metric.value[`${key}Value`] = performance.metrics.stdDev
  metric.value[`${key}FormattedValue`] = percentFormatter.format(performance.metrics.stdDev)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'sharpeRatio'
  metric.value[`${key}Value`] = performance.metrics.sharpeRatio
  metric.value[`${key}FormattedValue`] = performance.metrics.sharpeRatio.toFixed(2)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'sortinoRatio'
  metric.value[`${key}Value`] = performance.metrics.sortinoRatio
  metric.value[`${key}FormattedValue`] = performance.metrics.sortinoRatio.toFixed(2)
  commit('setMetric', metric)

  let bestYear = BestYear(performance.measurements)
  metric.key = key
  metric.name = 'bestYear'
  metric.value[`${key}Value`] = bestYear.value
  metric.value[`${key}FormattedValue`] = percentFormatter.format(bestYear.value)
  metric.value[`${key}Suffix`] = ` (${bestYear.year})`
  commit('setMetric', metric)

  let worstYear = WorstYear(performance.measurements)
  metric.key = key
  metric.name = 'worstYear'
  metric.value[`${key}Value`] = worstYear.value
  metric.value[`${key}FormattedValue`] = percentFormatter.format(worstYear.value)
  metric.value[`${key}Suffix`] = ` (${worstYear.year})`
  commit('setMetric', metric)
}
