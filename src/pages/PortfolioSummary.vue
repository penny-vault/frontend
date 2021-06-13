<template>
  <div class="row q-col-gutter-md justify-between items-center">
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="Current Asset" color="secondary" :value="portfolio.performance.currentAsset" />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="YTD Return" :direction-indicator="true" color="positive" :value="portfolio.performance.ytdReturn" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="CAGR Since Inception" :direction-indicator="true" color="negative" :value="portfolio.performance.cagrSinceInception" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="Max Draw Down" :direction-indicator="true" color="warning" :value="portfolio.performance.maxDrawDown" percent />
      </div>
  </div>

  <div class="row q-col-gutter-lg q-pt-lg">
      <div class="col-xs-12 col-lg-8">
      <px-card class="full-height" title="Value Chart">
          <template v-slot:toolbar>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), 0, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">YTD</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 1, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">1m</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 3, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">3m</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 12, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">1y</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 24, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">3y</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 60, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">5y</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 120, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">10y</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: -1, to: -1})" size="md" color="secondary" dense flat class="q-ml-xs">All</q-btn>

            <q-btn-dropdown rounded dense flat dropdown-icon="menu" class="q-ml-sm">
                <q-list>
                <q-item-label header>Chart Settings</q-item-label>

                <q-item tag="label" v-ripple>
                    <q-item-section>
                    <q-item-label>Log Scale</q-item-label>
                    </q-item-section>
                    <q-item-section side >
                    <q-toggle color="blue" v-model="logScale" />
                    </q-item-section>
                </q-item>

                <q-item tag="label" v-ripple>
                    <q-item-section>
                    <q-item-label>Show top 10 draw downs</q-item-label>
                    </q-item-section>
                    <q-item-section side >
                    <q-toggle color="blue" v-model="showDrawDowns" />
                    </q-item-section>
                </q-item>
                </q-list>
            </q-btn-dropdown>
          </template>
          <value-chart :min-date="minDate" :max-date="maxDate" :log-scale="logScale" :show-draw-downs="showDrawDowns" :measurements="portfolio.performance.measurements" :benchmark="benchmark.measurements" :draw-downs="portfolio.performance.metrics.drawDowns" />
      </px-card>
      </div>
      <div class="col">
      <px-card class="full-height" title="Metrics">
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
</template>

<script>
let eventBus = require('tiny-emitter/instance')

import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../assets/filters'

import PortfolioMetrics from 'components/PortfolioMetrics.vue'
import PxCard from 'components/PxCard.vue'
import StatCard from 'components/StatCard.vue'
import ValueChart from 'components/ValueChart.vue'

export default defineComponent({
  name: 'PortfolioSummary',
  components: {
    PxCard,
    PortfolioMetrics,
    StatCard,
    ValueChart
  },
  setup (props) {
    const $store = useStore()

    const tabModel = ref('summary')

    // value chart properties
    const logScale = ref(false)
    const showDrawDowns = ref(false)
    const minDate = ref(-1)
    const maxDate = ref(-1)

    // Computed properties
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
      tabModel,
      maxDate,
      minDate,
      logScale,
      showDrawDowns,
      eventBus
    }
  }
})
</script>
