<template>
  <q-page class="flex flex-center">
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    >
  </q-page>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';
import { api } from '../boot/axios'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'PageIndex',
  setup() {
    const $q = useQuasar()
    onMounted(async () => {
      // Ping the server to make sure its working
      api.get('/').catch((err) => {
        $q.notify({
          message: `The penny-vault API service is not reachable: ${err}`,
          progress: true,
          color: 'negative',
          icon: 'error',
          position: 'top'
        })
      })
    })

    return {}
  }
})
</script>
