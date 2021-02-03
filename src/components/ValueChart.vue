<template>
  <highcharts ref="valueChart" width="100%" height="300" :options="chartOptions"></highcharts>
</template>

<script>
export default {
  name: 'ValueChart',
  props: {
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
          zoomType: 'x'
        },
        title: {
            text: 'Strategy performance over time'
        },
        subtitle: {
            text: document.ontouchstart === undefined ?
                'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
          title: {
            text: 'Value'
          }
        },
        legend: {
          enabled: false
        },
        credits: {
          enabled: false
        },
        lang: {
          thousandsSep: ','
        },
        tooltip: {
          pointFormat: "{series.name}: <b>${point.y:,.2f}</b><br/>"
        },
        plotOptions: {
          area: {
            marker: {
              radius: 2
            },
            lineWidth: 1,
            states: {
              hover: {
                lineWidth: 1
              }
            },
            threshold: null
          }
        },
        series: this.series,
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
