<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg-6 col-sm-4">
        <h4 class="q-mt-sm q-mb-sm">{{ portfolio.name }}</h4>
      </div>
      <div class="col-lg-6 col-sm-8 gt-xs self-end">
        <q-tabs
          inline-label
          outside-arrows
          mobile-arrows
          align="right"
          active-color="blue"
          indicator-color="blue"
          v-model="tabModel"
        >
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
        <p class="q-mb-sm text-grey-6">Computed at: {{ formatDate(portfolio.performance.computedOn) }}</p>
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="My Portfolios" to="/app/portfolio" />
          <q-breadcrumbs-el :label="portfolio.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <q-tab-panels
      style="background: rgba(0,0,0,0)!important"
      v-model="tabModel"
      animated
      swipeable
    >
      <q-tab-panel name="summary">
        <portfolio-summary />
      </q-tab-panel>

      <q-tab-panel name="holdings">
        <portfolio-holdings />
      </q-tab-panel>

      <q-tab-panel name="transactions">
        <portfolio-transactions />
      </q-tab-panel>

      <q-tab-panel name="returns">
        <portfolio-returns />
      </q-tab-panel>

      <q-tab-panel name="settings">
        <portfolio-settings :portfolio-id="portfolioId" />
      </q-tab-panel>
    </q-tab-panels>

  </q-page>
</template>

<script>
import { defineComponent, computed, ref, watch, toRefs } from 'vue'
import { useStore } from 'vuex'

import { formatDate } from '../assets/filters'

import PortfolioHoldings from './PortfolioHoldings.vue'
import PortfolioReturns from './PortfolioReturns.vue'
import PortfolioSettings from './PortfolioSettings.vue'
import PortfolioSummary from './PortfolioSummary.vue'
import PortfolioTransactions from './PortfolioTransactions.vue'

export default defineComponent({
  name: 'Portfolio',
  props: {
    portfolioId: String
  },
  components: {
    PortfolioHoldings,
    PortfolioReturns,
    PortfolioSettings,
    PortfolioSummary,
    PortfolioTransactions
  },
  setup (props) {
    const $store = useStore()
    const { portfolioId } = toRefs(props)

    const tabModel = ref('summary')

    $store.dispatch('portfolio/fetchPortfolio', props.portfolioId)

    // set a watcher on the Reactive Reference to portfolioId prop
    watch(portfolioId, async (newValue, oldValue) => {
      $store.dispatch('portfolio/fetchPortfolio', newValue)
    })

    const portfolio = computed({
      get: () => $store.state.portfolio.current,
      set: val => {}
    })

    return {
      formatDate,
      portfolio,
      tabModel,
    }
  }
})
</script>
