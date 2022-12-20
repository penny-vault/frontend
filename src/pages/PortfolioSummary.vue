<template>
  <div class="row q-col-gutter-md justify-between items-center">
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="Current Asset" color="secondary" :value="currentAsset" />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="YTD Return" :direction-indicator="true" color="positive" :value="portfolio.performance.PortfolioReturns.MWRRYTD" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="CAGR Since Inception" :direction-indicator="true" color="negative" :value="portfolio.performance.PortfolioReturns.MWRRSinceInception" percent />
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3">
      <stat-card title="Max Draw Down" :direction-indicator="true" color="warning" :value="portfolio.performance.MaxDrawDown" percent />
      </div>
  </div>

  <div class="row q-col-gutter-lg q-pt-lg">
      <div class="col-xs-12 col-lg-8">
      <px-card class="full-height" title="Value Chart">
          <template v-slot:toolbar>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), 0, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">YTD</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 12, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs">1y</q-btn>
            <q-btn @click="eventBus.emit('valueChart:zoom', {from: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth() - 36, 1), to: Date.UTC((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate())})" size="md" color="secondary" dense flat class="q-ml-xs gt-xs">3y</q-btn>
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
                    <q-item-label>Show top 10 draw downs (peak to trough)</q-item-label>
                    </q-item-section>
                    <q-item-section side >
                    <q-toggle color="blue" v-model="showDrawDowns" />
                    </q-item-section>
                </q-item>
                </q-list>
            </q-btn-dropdown>
          </template>
          <value-chart :date-range="dateRange" :log-scale="logScale" :show-draw-downs="showDrawDowns" :measurements="measurements" :draw-downs="portfolio.performance.DrawDowns" />
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
                <tr v-for="ret in returns" :key="ret.title">
                  <td>{{ ret.title }}</td>
                  <td>{{formatPercent(ret.ytd)}}</td>
                  <td>{{formatPercent(ret.oneYear)}}</td>
                  <td>{{formatPercent(ret.threeYear)}}</td>
                  <td>{{formatPercent(ret.fiveYear)}}</td>
                  <td>{{formatPercent(ret.tenYear)}}</td>
                  <td>{{formatPercent(ret.sinceInception)}}</td>
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
    const dateRange = ref({
        min: -1,
        max: -1
    })

    // Computed properties
    const currentAsset = computed(() => {
        var res = new Array()
        portfolio.value.performance.CurrentAssets.forEach((elem) => {
            if (elem.Ticker !== "$CASH") {
                res.push(elem.Ticker)
            }
        })
        return res.join(" ")
    })
    const measurements = computed(() => $store.state.portfolio.measurements)
    const metrics = computed(() => $store.state.portfolio.metrics)
    const portfolio = computed(() => $store.state.portfolio.current)
    const returns = computed(() => {
        var result = []
        result.push({
            title: "Portfolio Time-Weighted Rate of Return",
            ytd: portfolio.value.performance.PortfolioReturns.TWRRYTD,
            oneYear: portfolio.value.performance.PortfolioReturns.TWRROneYear,
            threeYear: portfolio.value.performance.PortfolioReturns.TWRRThreeYear,
            fiveYear: portfolio.value.performance.PortfolioReturns.TWRRFiveYear,
            tenYear: portfolio.value.performance.PortfolioReturns.TWRRTenYear,
            sinceInception: portfolio.value.performance.PortfolioReturns.TWRRSinceInception,
        })
        result.push({
            title: "Benchmark Time-Weighted Rate of Return",
            ytd: portfolio.value.performance.BenchmarkReturns.TWRRYTD,
            oneYear: portfolio.value.performance.BenchmarkReturns.TWRROneYear,
            threeYear: portfolio.value.performance.BenchmarkReturns.TWRRThreeYear,
            fiveYear: portfolio.value.performance.BenchmarkReturns.TWRRFiveYear,
            tenYear: portfolio.value.performance.BenchmarkReturns.TWRRTenYear,
            sinceInception: portfolio.value.performance.BenchmarkReturns.TWRRSinceInception,
        })

        if (((portfolio.value.performance.PortfolioReturns.MWRRYTD).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRRYTD).toFixed(5)) &&
            ((portfolio.value.performance.PortfolioReturns.MWRROneYear).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRROneYear).toFixed(5)) &&
            ((portfolio.value.performance.PortfolioReturns.MWRRThreeYear).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRRThreeYear).toFixed(5)) &&
            ((portfolio.value.performance.PortfolioReturns.MWRRFiveYear).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRRFiveYear).toFixed(5)) &&
            ((portfolio.value.performance.PortfolioReturns.MWRRTenYear).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRRTenYear).toFixed(5)) &&
            ((portfolio.value.performance.PortfolioReturns.MWRRSinceInception).toFixed(5) != (portfolio.value.performance.PortfolioReturns.TWRRSinceInception).toFixed(5))) {
            result.push({
                title: "Portfolio Money-Weighted Rate of Return",
                ytd: portfolio.value.performance.PortfolioReturns.MWRRYTD,
                oneYear: portfolio.value.performance.PortfolioReturns.MWRROneYear,
                threeYear: portfolio.value.performance.PortfolioReturns.MWRRThreeYear,
                fiveYear: portfolio.value.performance.PortfolioReturns.MWRRFiveYear,
                tenYear: portfolio.value.performance.PortfolioReturns.MWRRTenYear,
                sinceInception: portfolio.value.performance.PortfolioReturns.MWRRSinceInception,
            })
            result.push({
                title: "Benchmark Money-Weighted Rate of Return",
                ytd: portfolio.value.performance.BenchmarkReturns.MWRRYTD,
                oneYear: portfolio.value.performance.BenchmarkReturns.MWRROneYear,
                threeYear: portfolio.value.performance.BenchmarkReturns.MWRRThreeYear,
                fiveYear: portfolio.value.performance.BenchmarkReturns.MWRRFiveYear,
                tenYear: portfolio.value.performance.BenchmarkReturns.MWRRTenYear,
                sinceInception: portfolio.value.performance.BenchmarkReturns.MWRRSinceInception,
            })
        }
        return result
    })

    return {
      currentAsset,
      formatPercent,
      metrics,
      measurements,
      portfolio,
      tabModel,
      dateRange,
      logScale,
      returns,
      showDrawDowns,
      eventBus
    }
  }
})
</script>
