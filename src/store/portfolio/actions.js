import { colfer } from "../../assets/colfer.js"
import { emptyPortfolio, emptyPerformance } from './constants'

import { api } from 'boot/axios'
import { authPlugin } from '../../auth'

import { toHexString } from "../../assets/util.js"

import { Notify } from 'quasar'
import { Loading } from 'quasar'

// Helper functions

function ymdString(dt) {
  return dt.toISOString().split("T")[0]
}

function normalizePortfolio(portfolio) {
  portfolio.startDate = new Date(portfolio.startDate * 1000)
  portfolio.lastChanged = new Date(portfolio.lastChanged * 1000)
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
    clearCacheEntry: true,
    headers: {
        Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    }
  }).then(response => {
      commit('setPortfolios', response.data)
  })
}

export async function fetchBenchmark ({ commit, dispatch, state }, { startDate, endDate, symbol } ) {
  // load benchmark
  if (symbol === undefined || symbol === '') {
    symbol = 'VFINX'
  }

  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  api.get(`/benchmark/${symbol.toLowerCase()}?snapToStart=true&startDate=${ymdString(startDate)}&endDate=${ymdString(endDate)}`, options).then(response => {
    let benchmark = response.data
    benchmark.startDate = new Date(benchmark.startDate * 1000)
    benchmark.lastChanged = new Date(benchmark.lastChanged * 1000)

    dispatch('calculateMetrics', {
      performance: benchmark,
      key: 'benchmark'
    })
    commit('setBenchmark', benchmark)
  })
}

export async function fetchHoldings({ commit }, { portfolioId } ) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    responseType: 'arraybuffer'
  }

  let endpoint = `portfolio/${portfolioId}/holdings`
  api.get(endpoint, options).then(response => {
    let holdings = new colfer.PortfolioHoldingItemList({})
    var uint8View = new Uint8Array(response.data)
    holdings.unmarshal(uint8View)
    commit('setHoldings', holdings)
  })
}

export async function fetchMeasurements({ commit }, { portfolioId, metric1, metric2 } ) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    responseType: 'arraybuffer'
  }

  let endpoint = `portfolio/${portfolioId}/measurements?field1=${metric1}&field2=${metric2}`
  api.get(endpoint, options).then(response => {
    let measurements = new colfer.PerformanceMeasurementItemList({})
    var uint8View = new Uint8Array(response.data)
    measurements.unmarshal(uint8View)
    commit('setMeasurements', measurements)
  })
}

export async function fetchPortfolio({ commit, dispatch, state }, portfolioId ) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  commit('setPortfolioLoaded', false)
  Loading.show()

  let portfolio = await lookupPortfolio(api, options, state.portfolioDict, state.current, portfolioId)
  let now = new Date()
  if (portfolio.id != portfolioId ||
      portfolio.lastfetch === undefined ||
      (now - portfolio.lastfetch) > (15 * 60 * 1000))
  {
    commit('setCurrentPortfolio', emptyPortfolio)
    commit('setBenchmark', emptyPerformance)
  } else {
    // don't bother
    Loading.hide()
    return
  }

  let endpoint = `/portfolio/${portfolioId}/performance`
  console.log("Load portfolio performance")
  api.get(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    },
    responseType: 'arraybuffer'
  }).then(response => {
    let performance = new colfer.Performance({})
    var uint8View = new Uint8Array(response.data)
    performance.unmarshal(uint8View)

    try {
      performance.MaxDrawDown = performance.DrawDowns[0].LossPercent
    } catch (e) {
      performance.MaxDrawDown = 0
    }

    portfolio.performance = performance
    portfolio.performance.measurements = []
    portfolio.id = toHexString(performance.PortfolioID)
    performance.PortfolioID = portfolio.id

    console.log("calling fetch measurements")
    dispatch('portfolio/fetchMeasurements', {
      portfolioId: portfolio.id,
      metric1: "strategy_growth_of_10k",
      metric2: "benchmark_growth_of_10k"
    }, { root: true })

    // calculate metrics
    dispatch('portfolio/calculateMetrics', {
      performance: performance.PortfolioMetrics,
      key: 'portfolio'
    }, { root: true })

    dispatch('portfolio/calculateMetrics', {
      performance: performance.BenchmarkMetrics,
      key: 'benchmark'
    }, { root: true })

    commit('portfolio/setCurrentPortfolio', portfolio, { root: true })
    commit('setPortfolioLoaded', true)
    Loading.hide()
  }).catch(err => {
    Loading.hide()
    Notify.create({
      message: `Failed to fetch portfolio info: ${err}`,
      progress: true,
      color: 'negative',
      icon: 'error',
      position: 'top'
    })
  })
}

export async function fetchTransactions({ commit }, { portfolioId } ) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    responseType: 'arraybuffer'
  }

  let endpoint = `portfolio/${portfolioId}/transactions`
  api.get(endpoint, options).then(response => {
    let trxs = new colfer.PortfolioTransactionList({})
    var uint8View = new Uint8Array(response.data)
    trxs.unmarshal(uint8View)
    commit('setTransactions', trxs)
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

  metric.value[`${key}Value`] = performance.FinalBalance
  metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.FinalBalance)

  commit('setMetric', metric)

  metric.key = key
  metric.name = 'totalDeposited'
  metric.value[`${key}Value`] = performance.TotalDeposited
  if (isNaN(performance.TotalDeposited)) {
    metric.value[`${key}FormattedValue`] = "-"
  } else {
    metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.TotalDeposited)
  }
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'totalWithdrawn'
  metric.value[`${key}Value`] = performance.TotalWithdrawn
  if (isNaN(performance.TotalWithdrawn)) {
    metric.value[`${key}FormattedValue`] = "-"
  } else {
    metric.value[`${key}FormattedValue`] = currencyFormatter.format(performance.TotalWithdrawn)
  }
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'stdDev'
  metric.value[`${key}Value`] = performance.StdDev
  metric.value[`${key}FormattedValue`] = percentFormatter.format(performance.StdDevSinceInception)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'sharpeRatio'
  metric.value[`${key}Value`] = performance.SharpeRatioSinceInception
  metric.value[`${key}FormattedValue`] = performance.SharpeRatioSinceInception.toFixed(2)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'sortinoRatio'
  metric.value[`${key}Value`] = performance.SortinoRatioSinceInception
  metric.value[`${key}FormattedValue`] = performance.SortinoRatioSinceInception.toFixed(2)
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'bestYear'
  metric.value[`${key}Value`] = performance.BestYear.Return
  metric.value[`${key}FormattedValue`] = percentFormatter.format(performance.BestYear.Return)
  metric.value[`${key}Suffix`] = ` (${performance.BestYear.Year})`
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'worstYear'
  metric.value[`${key}Value`] = performance.WorstYear.Return
  metric.value[`${key}FormattedValue`] = percentFormatter.format(performance.WorstYear.Return)
  metric.value[`${key}Suffix`] = ` (${performance.WorstYear.Year})`
  commit('setMetric', metric)

  metric.key = key
  metric.name = 'ulcerIndex'
  metric.value[`${key}Value`] = performance.UlcerIndexP90
  if (isNaN(performance.UlcerIndexP90)) {
    metric.value[`${key}FormattedValue`] = "-"
  } else {
    metric.value[`${key}FormattedValue`] = performance.UlcerIndexP90.toFixed(2)
  }
  metric.value[`${key}Suffix`] = ``
  commit('setMetric', metric)
}
