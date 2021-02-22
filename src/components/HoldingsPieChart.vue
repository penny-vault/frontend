<template>
  <highcharts class="pie" :options="chartOptions"></highcharts>
</template>

<script>

import Highcharts from "highcharts";

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

export default {
  name: "HoldingsPieChart",
  props: {
    strategy: {
      type: Array,
      default: function () {
        return []
      }
    },
    width: String,
    height: String
  },
  watch: {
    strategy: async function () {
      this.updateData()
    }
  },
  mounted: async function () {
    this.updateData()
  },
  methods: {
    updateData: async function () {
        var counts = new Map()
        this.strategy.forEach( elem => {
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

        this.chartOptions.series = [
            {
                name: "strategy",
                data: data
            }
        ]
    }
  },
  data() {
    return {
      chartOptions: {
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
      }
    }
  }
}
</script>

<style scoped>
</style>
