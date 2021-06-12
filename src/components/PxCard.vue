<template>
  <q-card class="full-height">
    <q-toolbar>
      <card-title :title="title" />
      <q-space/>
      <div class="col-auto">
        <slot name="toolbar"></slot>
      </div>
    </q-toolbar>
    <q-card-section class="q-pt-none">
      <slot></slot>
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent } from 'vue'

import CardTitle from 'components/CardTitle.vue'

export default defineComponent({
  name: 'PxCard',
  props: {
    title: String
  },
  components: {
    CardTitle
  },
  setup() {

  },
})
</script>
