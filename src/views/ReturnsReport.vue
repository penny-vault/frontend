<template>
  <div>
    <annual-returns-chart v-bind:strategy="performance.measurements" v-bind:benchmark="benchmark.measurements"></annual-returns-chart>
    <return-heatmap v-bind:measurements="performance.measurements" class="mt-3"></return-heatmap>
  </div>
</template>

<script>
import AnnualReturnsChart from "@/components/AnnualReturnsChart.vue"
import ReturnHeatmap from "@/components/ReturnHeatmap.vue"

export default {
  name: 'ReturnsReport',
  props: {
    performance: {
        type: Object,
        default: function () {
            return {
                measurements: []
            }
        }
    },
    benchmark: {
        type: Object,
        default: function () {
            return {
                measurements: []
            }
        }
    }
  },
  components: {
      AnnualReturnsChart,
      ReturnHeatmap
  }
}
</script>
