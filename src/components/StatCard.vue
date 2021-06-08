<template>
  <q-card class="my-card">
    <q-card-section>
      <div class="text-h6">{{ title }}</div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      {{ stat }}
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StatCard',
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      required: true
    },
    percent: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    stat() {
      if (typeof this.value === 'string') {
        return this.value
      } else {
        if (this.percent) {
          return `${(this.value * 100).toFixed(2)}%`
        } else {
          return this.value
        }
      }
    }
  }
})
</script>
