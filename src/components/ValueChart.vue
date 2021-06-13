<template>
    <vue-highchart ref="valueChart" height="250" :options="chartOptions" :redrawOnUpdate="true" :animatedOnUpdate="true" />
</template>

<script>
let eventBus = require('tiny-emitter/instance')

import { defineComponent, watch, ref, onMounted, toRefs } from 'vue'

export default defineComponent({
  name: 'ValueChart',
  props: {
    logScale: {
      type: Boolean,
      default: false
    },
    showDrawDowns: {
      type: Boolean,
      default: false
    },
    minDate: {
      type: Number,
      default: null
    },
    maxDate: {
      type: Number,
      default: null
    },
    measurements: Array,
    benchmark: Array,
    drawDowns: Array
  },
  setup (props) {
    const { logScale, showDrawDowns, measurements, benchmark, drawDowns, minDate, maxDate } = toRefs(props)

    // setup component data
    const chartOptions = ref({
      chart: {
        zoomType: 'x'
      },
      title: {
        text: undefined
      },
      xAxis: {
          type: 'datetime',
          min: null,
          max: null,
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
    })

    // handle events

    eventBus.on('valueChart:zoom', ({from, to}) => {
      minDate.value = from
      maxDate.value = to

      if (from != -1) {
        chartOptions.value.xAxis.min = from
      } else {
        chartOptions.value.xAxis.min = null
      }

      if (to != -1) {
        chartOptions.value.xAxis.max = to
      } else {
        chartOptions.value.xAxis.max = null
      }
    })

    // functions
    function getBenchmarkSeries() {
      var chartData = []
      benchmark.value.forEach(elem => {
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
    }

    function getStrategySeries() {
      var chartData = []
      measurements.value.forEach(elem => {
        chartData.push([elem.time * 1000, elem.value])
      })
      return {
        type: 'area',
        name: 'Strategy',
        data: chartData
      }
    }

    async function updateSeries() {
      chartOptions.value.series = [getStrategySeries(), getBenchmarkSeries()]
    }

    async function updatePlotBands() {
      var plotBands = []
      if (props.showDrawDowns) {
        drawDowns.value.forEach(elem => {
          plotBands.push({
            color: '#d43d5144', // Color value
            zIndex: 1,
            from: new Date(elem.begin * 1000), // Start of the plot band
            to: new Date(elem.end * 1000) // End of the plot band
          })
        })
      }
      chartOptions.value.xAxis.plotBands = plotBands
    }

    function updateLogScale() {
      if (props.logScale) {
        chartOptions.value.yAxis.type = "logarithmic"
      } else {
        chartOptions.value.yAxis.type = "linear"
      }
    }

    // creation hooks
    onMounted(() => {
      updateSeries(measurements)
      updatePlotBands()
    })

    // set watchers
    watch(minDate, async (n) => {
      if (n != -1) {
        chartOptions.value.xAxis.min = n
      } else {
        chartOptions.value.xAxis.min = null
      }
    })

    watch(maxDate, async (n) => {
      if (n != -1) {
        chartOptions.value.xAxis.max = n
      } else {
        chartOptions.value.xAxis.max = null
      }
    })

    watch(logScale, async () => {
      updateLogScale()
    })

    watch(showDrawDowns, async () => {
      updatePlotBands()
    })

    watch(measurements, async () => {
      updateSeries()
      updatePlotBands()
      updateLogScale()
    })

    watch(benchmark, async () => {
      updateSeries()
      updatePlotBands()
      updateLogScale()
    })

    watch(drawDowns, async () => {
      updateSeries()
      updatePlotBands()
    })

    return { chartOptions, getBenchmarkSeries, getStrategySeries, updateSeries, updatePlotBands}
  }
})
</script>