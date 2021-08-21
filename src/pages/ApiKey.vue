<template>
  <q-page class="q-pa-xs q-px-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg">
        <h4 class="q-mt-sm q-mb-sm">API Key</h4>
        <px-card title="API Key">
          {{ apiKey }}
        </px-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, computed, ref, watch } from 'vue'
import { useStore } from 'vuex'

import PxCard from 'components/PxCard.vue'

export default defineComponent({
  name: 'ApiKey',
  components: {
    PxCard
  },
  setup (props) {
    const $store = useStore()

    // clear existing state
    $store.dispatch('app/fetchApiKey')

    const apiKey = computed(() => $store.state.app.apiKey)

    return {
      apiKey
    }
  }
})
</script>
