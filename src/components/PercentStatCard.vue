<template>
  <b-card
    style="max-width: 10rem;"
    class="p-2"
    no-body
  >
    <b-row no-gutters>
      <b-col md="12" style="font-weight: 900; font-size: 2rem;">
          <b-icon-arrow-up style="color: green" v-if="value > 0"></b-icon-arrow-up><b-icon-arrow-down style="color: red" v-if="value < 0"></b-icon-arrow-down>{{value|formatNumber}}%
      </b-col>
    </b-row>
    <b-row no-gutters>
      <b-col md="12" style="font-weight: 100; font-size: .75rem;">
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
