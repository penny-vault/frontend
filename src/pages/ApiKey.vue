<template>
  <q-page class="q-pa-xs q-px-md">
    <div class="row q-col-gutter-md">
      <div class="col-lg">
        <h4 class="q-mt-sm q-mb-sm">API Key</h4>
        <px-card title="API Key">
          <div class="q-pa-md">
            Your API key can be passed as a bearer token to Penny Vault endpoints in liueu of authentication. Be sure to protect this key like a password.
            NOTE: The API key is regenerated every time this page is visited. However, old API keys will continue to work unless they are revoked.
            <q-input
              label="API Key"
              class="q-mt-md q-mb-md"
              v-model="apiKey"
              type="textarea"
              autogrow
              outlined
              readonly>
              <template v-slot:append>
                <q-btn dense flat icon="far fa-clone">
                  <q-tooltip>Copy</q-tooltip>
                </q-btn>
              </template>
            </q-input>
            <q-btn>Revoke keys</q-btn>
          </div>
        </px-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, computed } from 'vue'
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
