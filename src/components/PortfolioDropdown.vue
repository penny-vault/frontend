<template>
  <q-btn-dropdown stretch flat no-icon-animation dropdown-icon="layers">
    <q-list>
      <q-item-label header>My Portfolios</q-item-label>
      <q-item v-for="item in portfolioList" v-bind:key="item.id" :to="`/app/portfolio/${item.id}`" clickable>
        <q-item-section>
          <q-item-label>{{ item.name }}</q-item-label>
        </q-item-section>
        <q-item-section side>
           <q-badge color="blue" text-color="white" :label="formatPercent(item.ytdReturn)" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../assets/filters'

export default defineComponent({
  name: 'PortfolioDropdown',
  setup () {
    const $store = useStore()

    const portfolioList = computed(() => $store.state.portfolio.portfolios)

    $store.dispatch('portfolio/fetchPortfolios')

    return {
      portfolioList,
      formatPercent
    }
  }
})
</script>