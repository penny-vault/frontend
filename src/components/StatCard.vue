<template>
  <b-card
    style="max-width: 10rem;"
    class="p-2"
    no-body
  >
    <b-row no-gutters>
      <b-col md="12" style="font-weight: 900; font-size: 2rem;">
          {{value}}
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
export default {
  name: 'StatCard',
  props: {
    name: String,
    value: String,
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
