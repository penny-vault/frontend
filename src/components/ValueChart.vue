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
          </b-dropdown-form>
        </b-dropdown>
      </b-col>
    </b-row>
    <b-row no-gutters>
      <b-col cols="12">
        <highcharts ref="valueChart" height="300" :options="chartOptions"></highcharts>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
export default {
  name: 'ValueChart',
  watch: {
    isLog: function(n) {
      if (n) {
        this.chartOptions.yAxis.type = "logarithmic"
      } else {
        this.chartOptions.yAxis.type = "linear"
      }
    },
    measurements: function(n) {
      this.updateSeries(n)
    }
  },
  props: {
    measurements: {
      type: Array,
      default: function () {
        return []
      }
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
  },
  methods: {
    updateSeries: async function(m) {
      var chartData = []
      m.forEach(elem => {
        chartData.push([elem.time * 1000, elem.value])
      })
      this.chartOptions.series = [{
          type: 'area',
          name: 'strategy',
          data: chartData
        }]
    }
  },
  data() {
    return {
      isLog: false,
      chartOptions: {
        chart: {
          zoomType: 'x'
        },
        title: {
          text: undefined
        },
        xAxis: {
            type: 'datetime',
            plotBands: [{
              color: '#d43d51', // Color value
              zIndex: 1,
              from: new Date(2000, 0, 1), // Start of the plot band
              to: new Date(2003, 6, 1) // End of the plot band
            }],
        },
        yAxis: {
          type: 'linear',
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
