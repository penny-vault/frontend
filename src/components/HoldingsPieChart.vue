<template>
  <vue-highchart class="pie" :options="chartOptions"></vue-highchart>
</template>

<script>
import Highcharts from "highcharts";
import { defineComponent, ref, toRefs, watch, onMounted } from 'vue'

var pieColors = (function () {
  var colors = [],
    base = Highcharts.getOptions().colors[0],
    i;

  for (i = 0; i < 10; i += 1) {
    // Start out with a darkened base color (negative brighten), and end
    // up with a much brighter color
    colors.push(Highcharts.color(base).brighten((i - 3) / 7).get());
  }
  return colors;
}());

export default defineComponent({
  name: "HoldingsPieChart",
  props: {
    holdings: {
      type: Array,
      default: function () {
        return []
      }
    },
    width: String,
    height: String
  },
  setup(props) {
    const { holdings } = toRefs(props)

    // reactive data
    const chartOptions = ref({
      chart: {
          plotBackgroundColor: null,
          plotBorderWidth: null,
          plotShadow: false,
          type: "pie"
      },
      title: {
          text: "Frequency Holdings Held"
      },
      tooltip: {
          pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b>"
      },
      accessibility: {
          point: {
          valueSuffix: "%"
          }
      },
      plotOptions: {
          pie: {
          allowPointSelect: true,
          cursor: "pointer",
          colors: pieColors,
          dataLabels: {
              enabled: true,
              format: "<b>{point.name}</b><br>{point.percentage:.1f} %",
              distance: -50,
              filter: {
              property: "percentage",
              operator: ">",
              value: 4
              }
          }
          }
      },
      credits: {
        enabled: false
      },
      series: [{
          name: "Strategy",
          data: []
      }]
    })

    // watch parameters
    watch(holdings, async () => {
      updateData()
    })

    // methods
    async function updateData() {
      var counts = new Map()
      holdings.value.forEach( elem => {
        var h = elem.holdings.split(" ")
        h.forEach( ticker => {
          var curr = counts.get(ticker)
          if (curr === undefined) curr = 0
          counts.set(ticker, curr+1)
        })
      })
      var data = []
      counts.forEach( (v, k) => {
        data.push({
          name: k,
          y: v
        })
      })

      chartOptions.value.series = [
        {
            name: "strategy",
            data: data
        }
      ]
    }

    // creation events
    onMounted(async () => {
      updateData()
    })

    return {
      chartOptions
    }
  }
})
</script>