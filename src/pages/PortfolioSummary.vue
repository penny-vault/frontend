<template>
  <q-page class="q-pa-md">
    <h4 class="q-mt-sm q-mb-sm">{{ portfolio.name }}</h4>
    <q-breadcrumbs class="q-mb-lg">
      <q-breadcrumbs-el icon="home" to="/app" />
      <q-breadcrumbs-el label="My Portfolios" to="/app/portfolios" />
      <q-breadcrumbs-el :label="portfolio.name" />
    </q-breadcrumbs>

    <div class="row items-start q-gutter-md">
      <q-card flat bordered class="my-card">
        <q-card-section>
          3.92%
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'PortfolioSummary',
  props: {
    portfolioId: String
  },
  setup (props) {
    const $store = useStore()

    $store.dispatch('portfolio/fetchPortfolio', props.portfolioId)

    const portfolio = computed({
      get: () => $store.state.portfolio.current,
      set: val => {
        $store.commit('portfolio/setPortfolio', val)
      }
    })

    return {
      portfolio
    }
  }
})
</script>
