import { colfer } from "../../assets/colfer.js"
import { emptyPortfolio, emptyPerformance } from './constants'

import { api } from 'boot/axios'
import { authPlugin } from '../../auth'

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

  // load strategy
  let endpoint = `/strategy/${portfolio.strategy}/execute?startDate=${ymdString(portfolio.startDate)}&endDate=${ymdString(new Date())}&arguments=${JSON.stringify(portfolio.arguments)}`
  api.get(endpoint, options).then(response => {
    let performance = response.data
    try {
      performance.maxDrawDown = performance.metrics.drawDowns[0].lossPercent
    } catch (e) {
      performance.maxDrawDown = 0
    }
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

    // remove marker transactions
    performance.transactions = performance.transactions.filter(item => {
      let dt = new Date(item.date)
      let now = new Date()
      if (item.kind !== "MARKER" && dt <= now) {
        return item
      }
    })

    // adjust measurements
    performance.measurements = performance.measurements.map((item, idx, arr) => {
      let next = arr[idx+1]
      if (next !== undefined) {
        item.valueAdjusted = next.value
        item.percentReturnAdjusted = next.percentReturn
      } else {
        item.valueAdjusted = undefined
        item.percentReturnAdjusted = undefined
      }
      return item
    })

    portfolio.lastfetch = new Date()
    commit('setCurrentPortfolio', portfolio)

    Loading.hide()
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
}
