<template>
  <highcharts width="100%" height="300" :options="chartOptions"></highcharts>
</template>

<script>
import Highcharts from "highcharts";
import hcHeatmap from "highcharts/modules/heatmap";

hcHeatmap(Highcharts);

export default {
  name: 'ReturnHeatmap',
  props: {
    categories: {
      type: Array,
      default: function () {
          return []
      }
    },
    series: {
      type: Array,
      default: function () {
          return [{
          type: 'area',
          name: 'strategy',
          data: []
        }]
      }
    }
  },
  data() {
    return {
      chartOptions: {
        chart: {
          type: "heatmap",
          marginTop: 40,
          marginBottom: 80,
          plotBorderWidth: 1
        },
        title: {
            text: 'Monthly Returns'
        },
        xAxis: {
            categories: this.categories
        },
        yAxis: {
          categories: [
              "Total", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
          ],
          title: null
        },
        colorAxis: {
          ceiling: 10,
          floor: -10,
          stops: [
            [0.075, "#d43d51"],
            [0.15, "#e0636b"],
            [0.225, "#eb8387"],
            [0.3, "#f3a3a4"],
            [0.375, "#f9c2c1"],

            [0.45, "#fde0e0"],
            [0.5, "#ffffff"],
            [0.55, "#e3ecfa"],

            [0.625, "#c5d9f5"],
            [0.7, "#a7c7ef"],
            [0.775, "#87b5ea"],
            [0.85, "#61a3e4"],
            [1.0, "#2892de"]
          ]
        },
        legend: {
          align: "right",
          layout: "vertical",
          margin: 0,
          verticalAlign: "top",
          y: 25,
          symbolHeight: 280
        },

        credits: {
          enabled: false
        },
        lang: {
          thousandsSep: ','
        },
        tooltip: {
            enabled: true,
          formatter: function() {
              return (
                  "<b>" +
                  this.series.yAxis.categories[this.point.y] + " " + this.series.xAxis.categories[this.point.x] +
                  "</b>: " + this.point.value.toFixed(2) + "%"
              )
          }
        },
        series: this.series,
      }
    }
  }
}
</script>

<style scoped>
</style>
