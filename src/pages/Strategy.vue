<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg-6 col-sm-4">
        <h4 class="q-mt-sm q-mb-sm">
          <!-- Strategy Name -->
          {{ strategy.name }}
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
        <p v-if="simulationRun" class="q-mb-sm text-grey-6">Computed at: {{ formatDate(portfolio.performance.computedOn) }}</p>
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="Strategies" to="/app/strategies" />
          <q-breadcrumbs-el :label="strategy.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row">
      <div class="col-2">
        <strategy-arguments :disabled="simulationRun" :strategy="strategy" :begin="simulationStart" :end="simulationEnd" @execute="onSubmit" />
      </div>
      <div class="col-10">
        <q-tab-panels
          style="background: rgba(0,0,0,0)!important"
          v-model="tabModel"
          animated
          swipeable
        >
          <q-tab-panel class="q-pt-none" name="description">
            <px-card title="Description">
              {{ strategy.description }}
            </px-card>
          </q-tab-panel>

          <q-tab-panel class="q-pt-none" name="summary">
            <portfolio-summary />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none" name="holdings">
            <portfolio-holdings />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none" name="transactions">
            <portfolio-transactions />
          </q-tab-panel>

          <q-tab-panel class="q-pt-none" name="returns">
            <portfolio-returns />
          </q-tab-panel>

        </q-tab-panels>
      </div>
    </div>

  </q-page>
</template>

<script>
import { defineComponent, computed, ref, watch } from 'vue'
import { useStore } from 'vuex'

import { formatDate } from '../assets/filters'

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
      formatDate,
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
