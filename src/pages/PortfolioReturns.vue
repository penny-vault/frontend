<template>

  <div class="row q-col-gutter-lg">
    <div class="col">
      <px-card title="Returns by Year">
        <annual-returns :portfolio="portfolio.measurements" :benchmark="benchmark.measurements" />
      </px-card>
    </div>
  </div>

  <div class="row q-col-gutter-lg q-pt-md">
    <div class="col">
      <px-card title="Returns Heatmap">
        <return-heatmap :measurements="portfolio.measurements" />
      </px-card>
    </div>
  </div>

</template>

<script>
import { defineComponent, computed, watch } from 'vue'
import { useStore } from 'vuex'

import AnnualReturns from "components/AnnualReturns.vue"
import ReturnHeatmap from "components/ReturnHeatmap.vue"
import PxCard from "components/PxCard.vue"

export default defineComponent({
  name: 'PortfolioReturns',
  components: {
    AnnualReturns,
    ReturnHeatmap,
    PxCard
  },
  setup () {
    const $store = useStore()

    // Computed properties
    const portfolio = computed({
      get: () => $store.state.portfolio.current.performance,
      set: val => {
        $store.commit('portfolio/setPortfolios', val)
      }
    })

    const benchmark = computed({
      get: () => $store.state.portfolio.benchmark,
      set: val => {
        $store.commit('portfolio/setPortfolios', val)
      }
    })

    return {
      portfolio,
      benchmark
    }
  }
})
</script>
