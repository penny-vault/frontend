<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg-6 col-sm-4">
        <h4 class="q-mt-sm q-mb-sm">{{ portfolio.name }}</h4>
      </div>
      <div class="col-lg-6 col-sm-8 gt-xs self-end">
        <q-tabs inline-label outside-arrows mobile-arrows align="right" v-model="tabModel">
          <q-tab name="summary" label="Summary" />
          <q-tab name="holdings" label="Holdings" />
          <q-tab name="transactions" label="Transactions" />
          <q-tab name="returns" label="Returns" />
          <q-tab name="settings" label="Settings" />
        </q-tabs>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="My Portfolios" to="/app/portfolios" />
          <q-breadcrumbs-el :label="portfolio.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row q-col-gutter-md justify-between items-center">
      <div class="col-xs-12 col-sm-6 col-lg-3">
        <stat-card title="Current Asset" color="secondary" :value="portfolio.performance.currentAsset" />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
        <stat-card title="YTD Return" color="positive" :value="portfolio.performance.ytdReturn" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
        <stat-card title="CAGR Since Inception" color="negative" :value="portfolio.performance.cagrSinceInception" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
        <stat-card title="Max Draw Down" color="warning" :value="portfolio.performance.maxDrawDown" percent />
      </div>
    </div>

    <div class="row q-col-gutter-lg q-pt-lg">
      <div class="col-xs-12 col-lg-8">
        <px-card class="my-card full-height" title="Value Chart">
          <template v-slot:toolbar>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">YTD</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">1m</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">3m</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">1y</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">3y</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">5y</q-btn>
            <q-btn size="md" color="secondary" dense flat class="q-ml-xs">10y</q-btn>
            <q-btn size="md" icon="menu" dropdown-icon="" class="q-ml-sm" rounded dense flat />
          </template>
          <value-chart v-bind:measurements="portfolio.performance.measurements" v-bind:benchmark="benchmark.measurements" v-bind:draw-downs="portfolio.performance.metrics.drawDowns" />
        </px-card>
      </div>
      <div class="col">
        <px-card class="my-card full-height" title="Metrics">
          <portfolio-metrics :metrics="metrics" />
        </px-card>
      </div>
    </div>

    <div class="row q-pt-md">
      <div class="col-12">
        <px-card title="Trailing Returns">

            <q-markup-table flat>
              <thead>
                <tr>
                  <th></th>
                  <th class="text-left">YTD</th>
                  <th class="text-left">1-Yr</th>
                  <th class="text-left">3-Yr</th>
                  <th class="text-left">5-Yr</th>
                  <th class="text-left">10-Yr</th>
                  <th class="text-left">Since Inception</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Portfolio</td>
                  <td>{{formatPercent(portfolio.performance.ytdReturn)}}</td>
                  <td>{{formatPercent(portfolio.performance.metrics.cagrs["1-yr"])}}</td>
                  <td>{{formatPercent(portfolio.performance.metrics.cagrs["3-yr"])}}</td>
                  <td>{{formatPercent(portfolio.performance.metrics.cagrs["5-yr"])}}</td>
                  <td>{{formatPercent(portfolio.performance.metrics.cagrs["10-yr"])}}</td>
                  <td>{{formatPercent(portfolio.performance.cagrSinceInception)}}</td>
                </tr>
                <tr>
                  <td>Benchmark</td>
                  <td>{{formatPercent(benchmark.ytdReturn)}}</td>
                  <td>{{formatPercent(benchmark.metrics.cagrs["1-yr"])}}</td>
                  <td>{{formatPercent(benchmark.metrics.cagrs["3-yr"])}}</td>
                  <td>{{formatPercent(benchmark.metrics.cagrs["5-yr"])}}</td>
                  <td>{{formatPercent(benchmark.metrics.cagrs["10-yr"])}}</td>
                  <td>{{formatPercent(benchmark.cagrSinceInception)}}</td>
                </tr>
              </tbody>
            </q-markup-table>
        </px-card>
      </div>
    </div>

  </q-page>
</template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../assets/filters'

import PortfolioMetrics from 'components/PortfolioMetrics.vue'
import PxCard from 'components/PxCard.vue'
import StatCard from 'components/StatCard.vue'
import ValueChart from 'components/ValueChart.vue'

export default defineComponent({
  name: 'PortfolioSummary',
  props: {
    portfolioId: String
  },
  components: {
    PxCard,
    PortfolioMetrics,
    StatCard,
    ValueChart
  },
  setup (props) {
    const $store = useStore()

    const tabModel = ref('summary')

    $store.dispatch('portfolio/fetchPortfolio', props.portfolioId)

    const portfolio = computed({
      get: () => $store.state.portfolio.current,
      set: val => {}
    })

    const metrics = computed({
      get: () => $store.state.portfolio.metrics,
      set: val => {}
    })

    const benchmark = computed({
      get: () => $store.state.portfolio.benchmark,
      set: val => {}
    })

    return {
      benchmark,
      formatPercent,
      metrics,
      portfolio,
      tabModel
    }
  }
})
</script>
