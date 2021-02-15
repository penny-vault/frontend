<template>
  <b-container class="pl-0 pr-0">
    <b-row>
      <b-col cols="3"></b-col>
      <b-col cols="6" style="text-align: center">
        <h5>Strategy performance over time</h5>
        <h6>{{ subtitle }}</h6>
      </b-col>
      <b-col cols="3" style="text-align: right">
        <b-dropdown size="lg" variant="link" toggle-class="text-decoration-none" no-caret>
          <template #button-content>
            &#x2630;<span class="sr-only">Graph options</span>
          </template>
          <b-dropdown-form>
            <b-form-checkbox v-model="isLog" size="sm" switch>Log Scale</b-form-checkbox>
            <b-form-checkbox v-model="showDrawDowns" size="sm" switch>Show draw downs</b-form-checkbox>
          </b-dropdown-form>
        </b-dropdown>
      </b-col>
    </b-row>
    <b-row no-gutters>
      <b-col cols="12">
        <highcharts ref="valueChart" height="250" :options="chartOptions"></highcharts>
      </b-col>
    </b-row>
  </b-container>
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
      this.benchmark.forEach(elem => {
        chartData.push([elem.time * 1000, elem.value])
      })
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
        series: [{type: 'area', name: 'strategy', data: []}],
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h5 {
  font-family: "Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif;
  font-size: 1.2rem;
  font-weight: 400;
  color: rgb(51, 51, 51);
}

h6 {
  font-family: "Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif;
  font-size: .8rem;
  font-weight: 400;
  color: rgb(102, 102, 102);
}

</style>
