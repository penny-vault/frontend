<template>
  <q-page class="q-pa-xs q-px-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg-6 col-md-5 col-sm-4">
        <h4 class="q-mt-sm gt-md q-mb-sm">
          <!-- Strategy Name -->
          {{ strategy.name }} <span style="font-size:1rem;" v-if="simulationRun">({{ format(portfolio.performance.periodStart, 'MMM') }} '{{ format(portfolio.performance.periodStart, 'yy') }} to {{ format(portfolio.performance.periodEnd, 'MMM') }} '{{ format(portfolio.performance.periodEnd, 'yy') }})</span>
        </h4>
        <div class="q-mt-sm lt-lg q-mb-md">
          <!-- Strategy Name -->
          <span style="font-size: 1.25rem">{{ strategy.name }}</span> <span style="font-size:.75rem;" v-if="simulationRun">({{ format(portfolio.performance.periodStart, 'MMM') }} '{{ format(portfolio.performance.periodStart, 'yy') }} to {{ format(portfolio.performance.periodEnd, 'MMM') }} '{{ format(portfolio.performance.periodEnd, 'yy') }})</span>
        </div>
      </div>
      <div class="col-lg-6 col-md-7 col-sm-8 gt-xs self-end">
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

    <div class="row gt-md">
      <div class="col">
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="Strategies" to="/app/strategies" />
          <q-breadcrumbs-el :label="strategy.name" />
        </q-breadcrumbs>
      </div>
    </div>

    <div class="row xs q-col-gutter-md">
      <div class="col-xs-12 q-pb-md" style="padding-top: 4px">
        <q-tabs
          dense
          inside-arrows
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

    <div class="row q-col-gutter-md q-row-gutter-md">
      <div class="col-lg-2 col-md-4 gt-sm q-pl-md">
        <strategy-arguments :strategy="strategy" :begin="simulationStart" :end="simulationEnd" @execute="onSubmit" @save="onSave" />
      </div>
      <div class="col-sm-12 col-xs-12 lt-md q-pl-md">
        <q-expansion-item
          v-model="expandedParameters"
          icon="ion-options"
          label="Parameters"
          dense>

          <strategy-arguments :strategy="strategy" :benchmark-ticker="strategy.benchmark" :begin="simulationStart" :end="simulationEnd" @execute="onSubmit" @save="onSave" />

        </q-expansion-item>
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
    <span v-if="simulationRun" class="text-grey-6">Computed on: {{ format(portfolio.performance.computedOn, 'eeee, MMM do yyyy HH:mm:ss') }}</span>
    </div>
  </q-page>
</template>

<script>
import { format } from 'date-fns'
import { defineComponent, computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { authPlugin } from '../auth'
import { api } from '../boot/axios'

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
    const $q = useQuasar()

    const expandedParameters = ref(true)

    const simulationStart = ref(new Date(1980,0,1))
    const simulationEnd = ref(new Date())

    const tabModel = ref('description')

    // clear existing state
    $store.commit('strategy/setSimulationExecuted', false)
    $store.commit('portfolio/clearCurrentPortfolio')
    $store.commit('portfolio/clearBenchmark')

    $store.dispatch('strategy/fetchStrategy', props.strategyShortCode)

    const strategy = computed(() => $store.state.strategy.current)

    const simulationRun = computed(() => $store.state.strategy.simulation.executed)

    const portfolio = computed(() => $store.state.portfolio.current)

    // methods

    async function onSave({args, begin}) {
      const accessToken = await authPlugin.getTokenSilently()
      var params = {
        name: strategy.value.name,
        arguments: args,
        strategy: strategy.value.shortcode,
        startDate: begin
      }

      const endpoint = `/portfolio/`
      api.post(endpoint, params, {
        headers: {
          Authorization: `Bearer ${accessToken}`    // send the access token through the 'Authorization' header
        }
      }).then(response => {
        $q.notify({
          message: `Saved portfolio`,
          progress: true,
          color: 'positive',
          icon: 'success',
          position: 'top'
        })
      }).catch(err => {
        $q.notify({
          message: `Failed to save portfolio: ${err}`,
          progress: true,
          color: 'negative',
          icon: 'error',
          position: 'top'
        })
      })
    }

    async function onSubmit({userArgs, begin, end, benchmarkTicker}) {
      $store.dispatch('strategy/executeStrategy', { shortCode: props.strategyShortCode, name: strategy.value.name, stratParams: userArgs, startDate: begin, endDate: end, benchmark: benchmarkTicker })
      expandedParameters.value = false
    }

    // watchers

    watch(portfolio, () => {
      tabModel.value = 'summary'
    })

    return {
      expandedParameters,
      format,
      portfolio,
      simulationRun,
      simulationStart,
      simulationEnd,
      strategy,
      tabModel,
      onSave,
      onSubmit
    }
  }
})
</script>
