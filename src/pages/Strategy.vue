<template>
  <q-page class="q-pa-xs q-px-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg-6 col-sm-4">
        <h4 class="q-mt-sm q-mb-sm">
          <!-- Strategy Name -->
          {{ strategy.name }} <span style="font-size:1rem;" v-if="simulationRun">({{ format(portfolio.performance.periodStart, 'MMM') }} '{{ format(portfolio.performance.periodStart, 'yy') }} to {{ format(portfolio.performance.periodEnd, 'MMM') }} '{{ format(portfolio.performance.periodEnd, 'yy') }})</span>
        </h4>
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
          <q-tab name="description" label="Description" />
          <q-tab :disable="!simulationRun" name="summary" label="Summary" />
          <q-tab :disable="!simulationRun" name="holdings" label="Holdings" />
          <q-tab :disable="!simulationRun" name="transactions" label="Transactions" />
          <q-tab :disable="!simulationRun" name="returns" label="Returns" />
        </q-tabs>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="Strategies" to="/app/strategies" />
          <q-breadcrumbs-el :label="strategy.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row xs q-col-gutter-md">
      <div class="col-xs-12">
        <q-tabs
          dense
          inside-arrows
          active-color="blue"
          indicator-color="blue"
          v-model="tabModel"
        >
          <q-tab name="description" label="Description" />
          <q-tab name="summary" label="Summary" />
          <q-tab name="holdings" label="Holdings" />
          <q-tab name="transactions" label="Transactions" />
          <q-tab name="returns" label="Returns" />
        </q-tabs>
      </div>
    </div>

    <div class="row q-col-gutter-md q-row-gutter-md">
      <div class="col-lg-2 col-md-4 col-sm-12 col-xs-12 q-pl-md">
        <strategy-arguments :strategy="strategy" :begin="simulationStart" :end="simulationEnd" @execute="onSubmit" />
      </div>
      <div class="col-lg-10 col-md-8 col-sm-12 col-xs-12">
        <q-tab-panels
          style="background: rgba(0,0,0,0)!important"
          v-model="tabModel"
          animated
        >
          <q-tab-panel class="q-pt-none" name="description">
            <px-card title="Description">
              <q-markdown :src="strategy.longDescription" />
            </px-card>
          </q-tab-panel>

          <q-tab-panel class="q-pt-none q-px-none" name="summary">
            <portfolio-summary />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none q-pl-sm q-pr-none" name="holdings">
            <portfolio-holdings />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none q-px-none" name="transactions">
            <portfolio-transactions />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none q-px-none" name="returns">
            <portfolio-returns />
          </q-tab-panel>

        </q-tab-panels>
      </div>
    </div>

    <div class="q-mt-lg">
    <span v-if="simulationRun" class="text-grey-6">Computed on: {{ format(portfolio.performance.computedOn, 'eeee, MMM eo yyyy HH:mm:ss') }}</span>
    </div>
  </q-page>
</template>

<script>
import { format, parse } from 'date-fns'
import { defineComponent, computed, ref, watch } from 'vue'
import { useStore } from 'vuex'

import PortfolioHoldings from './PortfolioHoldings.vue'
import PortfolioReturns from './PortfolioReturns.vue'
import PortfolioSummary from './PortfolioSummary.vue'
import PortfolioTransactions from './PortfolioTransactions.vue'
import PxCard from 'components/PxCard.vue'
import StrategyArguments from 'components/StrategyArguments.vue'

export default defineComponent({
  name: 'Strategy',
  props: {
    strategyShortCode: String
  },
  components: {
    PortfolioHoldings,
    PortfolioReturns,
    PortfolioSummary,
    PortfolioTransactions,
    PxCard,
    StrategyArguments
  },
  setup (props) {
    const $store = useStore()

    const simulationStart = ref(new Date(1980,0,1))
    const simulationEnd = ref(new Date())

    const tabModel = ref('description')

    $store.commit('strategy/setSimulationExecuted', false)
    $store.dispatch('strategy/fetchStrategy', props.strategyShortCode)

    const strategy = computed({
      get: () => $store.state.strategy.current,
      set: val => {}
    })

    const simulationRun = computed({
      get: () => $store.state.strategy.simulation.executed,
      set: val => {}
    })

    const portfolio = computed({
      get: () => $store.state.portfolio.current,
      set: val => {}
    })

    // methods

    async function onSubmit({userArgs, begin, end, benchmarkTicker}) {
      $store.dispatch('strategy/executeStrategy', { shortCode: props.strategyShortCode, name: strategy.value.name, stratParams: userArgs, startDate: begin, endDate: end})
    }

    // watchers

    watch(portfolio, () => {
      tabModel.value = 'summary'
    })

    return {
      format,
      portfolio,
      simulationRun,
      simulationStart,
      simulationEnd,
      strategy,
      tabModel,
      onSubmit
    }
  }
})
</script>
