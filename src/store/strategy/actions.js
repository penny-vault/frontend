import { emptyPerformance } from '../portfolio/constants'
import { api } from 'boot/axios'
import { authPlugin } from '../../auth'
import { colfer } from "../../assets/colfer.js"
import { toHexString } from "../../assets/util.js"
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

  const endpoint = `/strategy/${shortCode}/execute?startDate=${ymdString(startDate)}&endDate=${ymdString(endDate)}&benchmark=${benchmark}`
  api.post(endpoint, stratParams, {
    headers: {
      Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
    },
    responseType: 'arraybuffer'
  }).then(response => {
    // Create a mock portfolio and fill out the info
    let performance = new colfer.Performance({})
    var uint8View = new Uint8Array(response.data)
    performance.unmarshal(uint8View)
    let portfolio = {
      "id": "",
      "name": name,
      "strategy": shortCode,
      "arguments": stratParams,
      "startDate": startDate,
      "ytdReturn": {
        "Float": 0.0,
        "Status": 0
      },
      "cagrSinceInception": {
        "Float": 0.0,
        "Status": 0
      },
      "notifications": 0,
      "created": 0,
      "lastChanged": endDate,
      "performance": performance,
      "benchmark": emptyPerformance,
    }

    try {
      performance.MaxDrawDown = performance.DrawDowns[0].LossPercent
    } catch (e) {
      performance.MaxDrawDown = 0
    }

    portfolio.performance = performance
    portfolio.id = toHexString(performance.PortfolioID)
    performance.PortfolioID = portfolio.id

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