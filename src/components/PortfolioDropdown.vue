<template>
  <q-btn-dropdown stretch flat no-icon-animation dropdown-icon="layers">
    <q-list>
      <q-item-label header>My Portfolios</q-item-label>
      <q-item v-for="item in portfolioList" v-bind:key="item.id" clickable>
        <q-item-section>
          <q-item-label>{{ item.name }}</q-item-label>
        </q-item-section>
        <q-item-section side>
           <q-badge color="blue" text-color="white" :label="formatPercent(item.ytd_return)" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../filters'

export default defineComponent({
  name: 'PortfolioDropdown',

  components: {
  },

  setup () {
    const $store = useStore()

    const portfolioList = computed({
      get: () => $store.state.portfolio.portfolios,
      set: val => {
        $store.commit('portfolio/setPortfolios', val)
      }
    })

    $store.dispatch('portfolio/fetchPortfolios')

    return {
      portfolioList,
      formatPercent
    }
  }
})
</script>