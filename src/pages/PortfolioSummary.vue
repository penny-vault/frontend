<template>
  <q-page class="q-pa-md">
    <div class="row q-gutter-md">
      <div class="col">
        <h4 class="q-mt-sm q-mb-sm">{{ portfolio.name }}</h4>
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="My Portfolios" to="/app/portfolios" />
          <q-breadcrumbs-el :label="portfolio.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row items-start q-gutter-md">
      <div class="col-xs-12 col">
        <stat-card title="Current Asset" :value="portfolio.performance.currentAsset" />
      </div>
      <div class="col-xs-12 col">
        <stat-card title="YTD Return" :value="portfolio.performance.ytdReturn" percent />
      </div>
      <div class="col-xs-12 col">
        <stat-card title="CAGR Since Inception" :value="portfolio.performance.cagrSinceInception" percent />
      </div>
      <div class="col-xs-12 col">
        <stat-card title="Max Draw Down" :value="portfolio.performance.maxDrawDown" percent />
      </div>
    </div>

    <div class="row q-gutter-md q-pt-md">
      <div class="col-xs-12 col-8">
        <q-card class="my-card">
          <q-card-section>
            <value-chart v-bind:measurements="portfolio.performance.measurements" v-bind:benchmark="benchmark.measurements" v-bind:draw-downs="portfolio.performance.metrics.drawDowns" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col">
        <q-card class="my-card">
          <q-card-section>
            <portfolio-metrics :metrics="metrics" />
          </q-card-section>
        </q-card>
      </div>
    </div>

  </q-page>
</template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import StatCard from 'components/StatCard.vue'
import ValueChart from 'components/ValueChart.vue'
import PortfolioMetrics from 'components/PortfolioMetrics.vue'

export default defineComponent({
  name: 'PortfolioSummary',
  props: {
    portfolioId: String
  },
  components: {
    PortfolioMetrics,
    StatCard,
    ValueChart
  },
  setup (props) {
    const $store = useStore()

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
      metrics,
      portfolio
    }
  }
})
</script>
