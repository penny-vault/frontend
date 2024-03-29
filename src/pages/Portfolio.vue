<template>
  <q-page class="q-pa-xs">
    <div class="row q-col-gutter-md q-pl-sm">
      <div class="col-lg-6 col-md-5 col-sm-4">
        <h4 class="q-mt-sm gt-md q-mb-sm">
          <!-- Strategy Name -->
           {{ portfolio.name }} <span style="font-size:1rem;" v-if="portfolioLoaded">({{ format(portfolio.performance.PeriodStart, 'MMM') }} '{{ format(portfolio.performance.PeriodStart, 'yy') }} to {{ format(portfolio.performance.PeriodEnd, 'MMM') }} '{{ format(portfolio.performance.PeriodEnd, 'yy') }})</span>
        </h4>
        <div class="q-mt-sm lt-lg q-mb-md">
          <!-- Strategy Name -->
          <span style="font-size: 1.25rem">{{ portfolio.name }}</span> <span style="font-size:.75rem;" v-if="portfolio.performance.PeriodStart">({{ format(portfolio.performance.PeriodStart, 'MMM') }} '{{ format(portfolio.performance.PeriodStart, 'yy') }} to {{ format(portfolio.performance.PeriodEnd, 'MMM') }} '{{ format(portfolio.performance.PeriodEnd, 'yy') }})</span>
        </div>
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
          <q-tab :disable="!portfolio.performance.PeriodStart" name="summary" label="Summary" />
          <q-tab :disable="!portfolio.performance.PeriodStart" name="holdings" label="Holdings" />
          <q-tab :disable="!portfolio.performance.PeriodStart" name="transactions" label="Transactions" />
          <q-tab :disable="!portfolio.performance.PeriodStart" name="returns" label="Returns" />
          <q-tab :disable="!portfolio.performance.PeriodStart" name="settings" label="Settings" />
        </q-tabs>
      </div>
    </div>

    <div class="row q-pl-sm">
      <div class="col">
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="My Portfolios" to="/app/portfolio" />
          <q-breadcrumbs-el :label="portfolio.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row xs">
      <div class="col">
        <q-tabs
          dense
          inside-arrows
          align="right"
          active-color="blue"
          indicator-color="blue"
          v-model="tabModel"
        >
          <q-tab :disable="!portfolioLoaded" name="summary" label="Summary" />
          <q-tab :disable="!portfolioLoaded" name="holdings" label="Holdings" />
          <q-tab :disable="!portfolioLoaded" name="transactions" label="Transactions" />
          <q-tab :disable="!portfolioLoaded" name="returns" label="Returns" />
          <q-tab :disable="!portfolioLoaded" name="settings" label="Settings" />
        </q-tabs>
      </div>
    </div>

    <q-tab-panels
      class="transparent"
      v-model="tabModel"
      animated
    >
      <q-tab-panel name="summary">
        <portfolio-summary v-if="portfolioLoaded" />
      </q-tab-panel>

      <q-tab-panel name="holdings">
        <portfolio-holdings :portfolio-id="portfolioId" />
      </q-tab-panel>

      <q-tab-panel name="transactions">
        <portfolio-transactions :portfolio-id="portfolioId" />
      </q-tab-panel>

      <q-tab-panel name="returns">
        <portfolio-returns :portfolio-id="portfolioId" />
      </q-tab-panel>

      <q-tab-panel name="settings">
        <portfolio-settings :portfolio-id="portfolioId" />
      </q-tab-panel>
    </q-tab-panels>

    <span v-if="portfolio.performance.ComputedOn" class="text-center q-ml-md q-mb-sm text-grey-6">Computed on: {{ format(portfolio.performance.ComputedOn, 'eeee, MMM eo yyyy HH:mm:ss') }}</span>

  </q-page>
</template>

<script>
import { defineComponent, computed, ref, watch, toRefs } from 'vue'
import { useStore } from 'vuex'

import { format } from 'date-fns'

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

    // clear existing state
    $store.commit('portfolio/clearCurrentPortfolio')
    $store.commit('portfolio/clearBenchmark')

    $store.dispatch('portfolio/fetchPortfolio', props.portfolioId)

    // set a watcher on the Reactive Reference to portfolioId prop
    watch(portfolioId, async (newValue, oldValue) => {
      $store.dispatch('portfolio/fetchPortfolio', newValue)
    })

    const portfolio = computed(() => $store.state.portfolio.current)
    const portfolioLoaded = computed(() => $store.state.portfolio.loaded)

    return {
      format,
      portfolio,
      portfolioLoaded,
      tabModel,
    }
  }
})
</script>
