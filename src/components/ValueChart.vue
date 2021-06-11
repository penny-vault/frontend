<template>
    <vue-highchart ref="valueChart" height="250" :options="chartOptions" :redrawOnUpdate="true" :animatedOnUpdate="true" />
</template>

<script>
export default {
  name: 'ValueChart',
  props: {
    measurements: Array,
    benchmark: Array,
    drawDowns: Array
  },
  watch: {
    isLog: function(n) {
      if (n) {
        this.chartOptions.yAxis.type = "logarithmic"
      } else {
        this.chartOptions.yAxis.type = "linear"
      }
    },
    measurements: async function() {
      this.updateSeries()
    },
    benchmark: async function() {
      this.updateSeries()
    },
    showDrawDowns: async function () {
      this.updatePlotBands(this.drawDowns)
    },
    drawDowns: async function(n) {
      this.updatePlotBands(n)
    }
  },
  computed: {
    subtitle: function () {
      return document.ontouchstart === undefined ?
        'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
    }
  },
  mounted: async function() {
    this.updateSeries(this.measurements)
    this.updatePlotBands(this.drawDowns)
  },
  methods: {
    getBenchmarkSeries: function() {
      var chartData = []
      if (this.benchmark !== undefined) {
        this.benchmark.forEach(elem => {
          chartData.push([elem.time * 1000, elem.value])
        })
      }
      return {
        type: "line",
        name: "Benchmark",
        dashStyle: "Solid",
        marker: {
          enabled: false
        },
        data: chartData
      }
    },
    getStrategySeries: function() {
      var chartData = []
      this.measurements.forEach(elem => {
        chartData.push([elem.time * 1000, elem.value])
      })
      return {
        type: 'area',
        name: 'Strategy',
        data: chartData
      }
    },
    updateSeries: async function() {
      this.chartOptions.series = [this.getStrategySeries(), this.getBenchmarkSeries()]
    },
    updatePlotBands: async function(d) {
      var plotBands = []
      if (this.showDrawDowns) {
        d.forEach(elem => {
          plotBands.push({
            color: '#d43d5144', // Color value
            zIndex: 1,
            from: new Date(elem.begin * 1000), // Start of the plot band
            to: new Date(elem.end * 1000) // End of the plot band
          })
        })
      }
      this.chartOptions.xAxis.plotBands = plotBands
    }
  },
  data() {
    return {
      isLog: false,
      showDrawDowns: false,
      chartOptions: {
        chart: {
          zoomType: 'x'
        },
        title: {
          text: undefined
        },
        xAxis: {
            type: 'datetime',
            plotBands: [],
        },
        yAxis: {
          type: 'linear',
          title: {
            text: 'Value'
          }
        },
        legend: {
          enabled: true
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
        series: [{type: 'area', name: 'Strategy', data: []}, {type: 'line', name: 'Benchmark', dashStyle: 'Solid', data: []}],
      }
    }
  }
}
</script>