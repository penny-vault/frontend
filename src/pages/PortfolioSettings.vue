<template>

  <q-form ref="params" @submit="onSubmit" class="q-gutter-md">

    <!-- portfolio name -->
    <q-input v-model="name" label="Portfolio Name" />

    <!-- notification settings -->
    <div>
      <h6 class="q-mb-none q-mt-lg">Email status frequency</h6>
      <q-toggle class="q-mr-lg" v-for="item in notifications" :key="item.text" v-model="item.state" :label="item.text" />
    </div>

    <!-- save button -->
    <div class="q-pt-lg">
      <q-btn label="Save" type="submit" color="info" />
      <q-btn label="Delete" color="negative" class="q-ml-sm" @click="deletePortfolio" />
    </div>
  </q-form>

</template>
<script>
import { defineComponent, computed, ref, onMounted, watch } from 'vue'

import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import { authPlugin } from '../auth'
import { api } from 'boot/axios'
import { NoNotify, Daily, Weekly, Monthly, Annually } from '../store/portfolio/constants'


export default defineComponent({
  name: 'PortfolioSettings',
  props: {
    portfolioId: {
      type: String,
      required: true
    }
  },
  setup(props, context) {
    const $store = useStore()
    const $q = useQuasar()
    const $router = useRouter()

    // Computed properties
    const portfolio = computed(() => $store.state.portfolio.current)

    // refs
    const confirm = ref(false)
    const name = ref(`${portfolio.value.name}`)
    const notifications = ref({
      daily: { text: 'Daily', value: Daily, state: false },
      weekly: { text: 'Weekly', value: Weekly, state: false },
      monthly: { text: 'Monthly', value: Monthly, state: false },
      annually: { text: 'Annually', value: Annually, state: false }
    })

    // methods
    function unpackNotifications() {
      console.log('unpackNotifications')
      notifications.value.daily.state = (portfolio.value.notifications & Daily) == Daily
      notifications.value.weekly.state = (portfolio.value.notifications & Weekly) == Weekly
      notifications.value.monthly.state = (portfolio.value.notifications & Monthly) == Monthly
      notifications.value.annually.state = (portfolio.value.notifications & Annually) == Annually
    }

    function packNotifications() {
      var notificationCode = NoNotify
      Object.keys(notifications.value).forEach( elem => {
        if (notifications.value[elem].state) {
          notificationCode |= notifications.value[elem].value
        }
      })
      return notificationCode
    }

    async function onSubmit(e) {
      e.preventDefault()
      var notificationCode = packNotifications()
      $store.commit('portfolio/setNotifications', notificationCode)
      $store.commit('portfolio/setPortfolioName', name.value)

      var params = {
        name: name.value,
        notifications: notificationCode
      }

      updatePortfolio(params)
    }

    async function deletePortfolio() {
      // Get the access token from the auth wrapper
      authPlugin.getTokenSilently().then((token) => {
        $q.dialog({
          title: 'Confirm',
          message: 'Please confirm that you want to delete this portfolio.',
          cancel: true,
          persistent: true
        }).onOk(() => {
          // Delete the portfolio
          api.delete("/portfolio/" + props.portfolioId, {
            headers: {
              Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
            }
          }).then( ({ data }) => {
            $q.notify({
              message: `Deleted portfolio`,
              progress: true,
              color: 'positive',
              icon: 'check_circle',
              position: 'top'
            })

            $store.dispatch('portfolio/fetchPortfolios')
            $router.replace("/portfolio/")
          }).catch( err => {
            $q.notify({
              message: `Failed to delete portfolio settings: ${err}`,
              progress: true,
              color: 'negative',
              icon: 'error',
              position: 'top'
            })
          })
        })
      })
    }

    function updatePortfolio(params) {
      // Get the access token from the auth wrapper
      authPlugin.getTokenSilently().then((token) => {
        // Use Axios to make a call to the API
        api.patch("/portfolio/" + props.portfolioId, params, {
          headers: {
            Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
          }
        }).then(({ data }) => {
          $q.notify({
            message: `Saved portfolio settings: ${data.name} (${data.id})`,
            progress: true,
            color: 'positive',
            icon: 'check_circle',
            position: 'top'
          })
          $store.dispatch('portfolio/fetchPortfolios')
        }).catch((reason) => {
          $q.notify({
            message: `Failed to save portfolio settings: ${reason}`,
            progress: true,
            color: 'negative',
            icon: 'error',
            position: 'top'
          })
        })
      })
    }

    // create functions
    onMounted(() => {
      unpackNotifications()
    })

    // watch functions
    watch(portfolio, () => {
      name.value = portfolio.value.name
      unpackNotifications()
    })

    return {
      confirm,
      deletePortfolio,
      name,
      notifications,
      onSubmit,
      portfolio
    }
  }
})
</script>
