<template>
  <b-card
    style="max-width: 10rem;"
    class="p-2"
    no-body
  >
    <b-row no-gutters>
      <b-col md="12" class="metric">
          <b-icon-arrow-up class="green" v-if="value > 0"></b-icon-arrow-up><b-icon-arrow-down class="red" v-if="value < 0"></b-icon-arrow-down>{{value|formatNumber}}%
      </b-col>
    </b-row>
    <b-row no-gutters>
      <b-col md="12" class="label">
          {{name}}
      </b-col>
    </b-row>
  </b-card>
</template>

<script>
import Vue from 'vue'

Vue.filter("formatNumber", function (value) {
    return (value * 100).toFixed(1)
  })

export default {
  name: 'PercentStatCard',
  props: {
    name: String,
    value: Number
  },
}
</script>

<style scoped>
  .metric {
    font-weight: 900;
    font-size: 2rem;
  }

  .green {
    color: green;
  }

  .red {
    color: red;
  }

  .label {
    font-weight: 100;
    font-size: .75rem;
  }
</style>
