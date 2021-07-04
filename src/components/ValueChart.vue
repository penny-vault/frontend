<template>
  <div id="amcharts-value" class="amcharts-value" style="height: 425px"></div>
</template>

<script>
let eventBus = require('tiny-emitter/instance')

import { defineComponent, watch, ref, onMounted, toRefs } from 'vue'

import * as am4core from '@amcharts/amcharts4/core'
import * as am4charts from '@amcharts/amcharts4/charts'
import '@amcharts/amcharts4/charts'
import animated from '@amcharts/amcharts4/themes/animated'

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
    measurements: Array,
    benchmark: Array,
    drawDowns: Array
  },
  setup (props) {
    // amcharts setup
    am4core.useTheme(animated)
    var chart
    var strategyValueSeries
    var benchmarkValueSeries
    var dateAxis
    var valueAxis

    // reactive data
    const { logScale, showDrawDowns, measurements, benchmark, drawDowns } = toRefs(props)

    // handle events

    eventBus.on('valueChart:zoom', ({from, to}) => {
      if (from === -1) {
        from = dateAxis.min
      }
      if (to === -1) {
        to = dateAxis.max
      }
      dateAxis.zoomToDates(from, to)
    })

    // functions
    async function renderChart() {
      if (chart) {
        chart.dispose()
      }
      chart = am4core.create(
        'amcharts-value',
        am4charts.XYChart
      )

      // Create axes
      dateAxis = chart.xAxes.push(new am4charts.DateAxis())
      valueAxis = chart.yAxes.push(new am4charts.ValueAxis())
      valueAxis.logarithmic = logScale.value
      valueAxis.tooltip.disabled = true
      valueAxis.title.text = "Value"

      // Add strategy value series
      strategyValueSeries = chart.series.push(new am4charts.LineSeries())
      strategyValueSeries.name = "Strategy"
      strategyValueSeries.data = getStrategyValueData()
      strategyValueSeries.dataFields.dateX = "date"
      strategyValueSeries.dataFields.valueY = "value"

      strategyValueSeries.tooltipText = `[bold]{dateX}[/]\n[${strategyValueSeries.stroke.hex}]●[/] ${strategyValueSeries.name}: \${${strategyValueSeries.dataFields.valueY}.formatNumber("#,###.00")}\n`

      strategyValueSeries.tooltip.background.cornerRadius = 5
      strategyValueSeries.tooltip.background.strokeOpacity = 0
      strategyValueSeries.tooltip.pointerOrientation = "right"
      strategyValueSeries.tooltip.label.minWidth = 40
      strategyValueSeries.tooltip.label.minHeight = 40
      strategyValueSeries.tooltip.label.textAlign = "left"
      strategyValueSeries.tooltip.label.textValign = "middle"
      strategyValueSeries.tooltip.getFillFromObject = false
      strategyValueSeries.tooltip.label.fill = am4core.color("black")
      strategyValueSeries.tooltip.background.fill = am4core.color("#FFFFFF")

      strategyValueSeries.fillOpacity = 0.3
      strategyValueSeries.fillOpacity = 1
      let gradient = new am4core.LinearGradient()
      gradient.rotation = 30
      gradient.addColor(chart.colors.getIndex(0), 0.2)
      gradient.addColor(chart.colors.getIndex(0), 0)
      strategyValueSeries.fill = gradient

      strategyValueSeries.strokeWidth = 2

      // Add strategy value series
      benchmarkValueSeries = chart.series.push(new am4charts.LineSeries())
      benchmarkValueSeries.name = "Benchmark"
      benchmarkValueSeries.data = getBenchmarkValueData()
      benchmarkValueSeries.dataFields.dateX = "date"
      benchmarkValueSeries.dataFields.valueY = "value"
      benchmarkValueSeries.stroke = chart.colors.getIndex(2)
      benchmarkValueSeries.strokeWidth = 1

      // setup scrolling
      chart.cursor = new am4charts.XYCursor()
      chart.cursor.lineY.opacity = 0
      chart.scrollbarX = new am4charts.XYChartScrollbar()
      chart.scrollbarX.parent = chart.bottomAxesContainer
      chart.scrollbarX.series.push(strategyValueSeries)

      dateAxis.keepSelection = true

      chart.legend = new am4charts.Legend()
    }

    function getBenchmarkValueData() {
      var chartData = []
      benchmark.value.forEach(elem => {
        chartData.push({
          date: new Date(elem.time * 1000),
          value: elem.value
        })
      })
      return chartData
    }

    function getStrategyValueData() {
      var chartData = []
      measurements.value.forEach(elem => {
        chartData.push({
          date: new Date(elem.time * 1000),
          value: elem.value.toFixed(2)
        })
      })
      return chartData
    }

    async function updatePlotBands() {
      if (dateAxis.axisRanges.length > 0) {
        dateAxis.axisRanges.clear()
        let tmp = strategyValueSeries.defaultState.transitionDuration
        strategyValueSeries.defaultState.transitionDuration = 0
        strategyValueSeries.appear()
        strategyValueSeries.defaultState.transitionDuration = tmp
      }
      if (props.showDrawDowns) {
        drawDowns.value.forEach(elem => {
          let range = dateAxis.createSeriesRange(strategyValueSeries)
          range.date = new Date(elem.begin * 1000)
          range.endDate = new Date(elem.end * 1000)
          range.contents.stroke = am4core.color("#A60017")
          range.contents.fill = am4core.color("#D5001D")
          range.contents.fillOpacity = 0.5
        })
      }
    }

    // creation hooks
    onMounted(() => {
      renderChart()
      updatePlotBands()
    })

    // set watchers
    watch(logScale, async (n) => {
      valueAxis.logarithmic = n
    })

    watch(showDrawDowns, async () => {
      updatePlotBands()
    })

    watch(measurements, async () => {
      strategyValueSeries.data = getStrategyValueData()
      updatePlotBands()
    })

    watch(benchmark, async () => {
      benchmarkValueSeries.data = getBenchmarkValueData()
    })

    watch(drawDowns, async () => {
      updatePlotBands()
    })
  }
})
</script>