import { emptyPerformance } from '../portfolio/constants'
import { api } from 'boot/axios'
import { authPlugin } from '../../auth'
import hash from 'object-hash'

import { Notify } from 'quasar'
import { Loading } from 'quasar'

// Helpers

function ymdString(dt) {
  return dt.toISOString().split("T")[0]
}

// Exported actions

export async function fetchStrategies ({ commit }) {
  const accessToken = await authPlugin.getTokenSilently()
  Loading.show()
  api.get('/strategy', {
    headers: {
        Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    }
  }).then(response => {
      commit('setStrategies', response.data)
      Loading.hide()
  }).catch(err => {
    Loading.hide()
    Notify.create({
      message: `Failed to fetch list of strategies: ${err}`,
      progress: true,
      color: 'negative',
      icon: 'error',
      position: 'top'
    })
  })
}

export async function fetchStrategy ({ commit }, shortCode) {
  const accessToken = await authPlugin.getTokenSilently()
  Loading.show()
  api.get(`/strategy/${shortCode}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    }
  }).then(response => {
    commit('setStrategy', response.data)
    Loading.hide()
  }).catch(err => {
    Loading.hide()
    Notify.create({
      message: `Failed to fetch list of strategies: ${err}`,
      progress: true,
      color: 'negative',
      icon: 'error',
      position: 'top'
    })
  })
}

export async function executeStrategy ({ commit, dispatch }, { shortCode, name, stratParams, startDate, endDate, benchmark } ) {
  const accessToken = await authPlugin.getTokenSilently()
  Loading.show()

  const endpoint = `/strategy/${shortCode}/execute?startDate=${ymdString(startDate)}&endDate=${ymdString(endDate)}&arguments=${JSON.stringify(stratParams)}`
  api.get(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    }
  }).then(response => {
    // Create a mock portfolio
    let performance = response.data
    let portfolio = {
      "id": "",
      "name": name,
      "strategy": shortCode,
      "arguments": stratParams,
      "start_date": startDate,
      "ytd_return": {
        "Float64": 0.0,
        "Valid": false
      },
      "cagr_since_inception": {
        "Float64": 0.0,
        "Valid": false
      },
      "notifications": 0,
      "created": 0,
      "lastchanged": endDate,
      "performance": performance,
      "benchmark": emptyPerformance,
    }

    try {
      performance.maxDrawDown = performance.metrics.drawDowns[0].lossPercent
    } catch (e) {
      performance.maxDrawDown = 0
    }
    performance.periodStart = new Date(performance.periodStart * 1000)
    performance.periodEnd = new Date(performance.periodEnd * 1000)
    performance.computedOn = new Date(performance.computedOn * 1000)
    portfolio.performance = performance

    dispatch('portfolio/fetchBenchmark', {
      startDate: performance.periodStart,
      endDate: performance.periodEnd,
      symbol: benchmark
    }, { root: true })

    // calculate metrics
    dispatch('portfolio/calculateMetrics', {
      performance: performance,
      key: 'portfolio'
    }, { root: true })

    // remove marker transactions
    performance.transactions = performance.transactions.filter(item => {
      let dt = new Date(item.date)
      let now = new Date()
      if (item.kind !== "MARKER" && dt <= now) {
        return item
      }
    })

    // cleanup measurements
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

    commit('portfolio/setCurrentPortfolio', portfolio, { root: true })
    commit('setSimulationExecuted', true)
    Loading.hide()
  }).catch(err => {
    Loading.hide()
    Notify.create({
      message: `Failed to run strategy simulation: ${err}`,
      progress: true,
      color: 'negative',
      icon: 'error',
      position: 'top'
    })
  })
}