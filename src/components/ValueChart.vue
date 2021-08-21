<template>
  <div id="amcharts-value" class="amcharts-value" style="height: 425px"></div>
</template>

<script>
let eventBus = require('tiny-emitter/instance')

import { defineComponent, watch, ref, onMounted, onUnmounted, toRefs } from 'vue'
import { format, fromUnixTime, parse, add } from 'date-fns'

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
    measurements: {
      type: Object,
      default: () => {
        {
          Items: []
        }
      }
    },
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
    var referenceMarker
    var strategyData = new Map()

    // reactive data
    const { logScale, showDrawDowns, measurements, drawDowns } = toRefs(props)

    let cursorPosition = {
      x: null,
      y: null,
      seriesValue: null,
    }

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

      if (measurements.value !== undefined) {
        chart.data = measurements.value.Items
        fillStrategyData()
      }

      chart.numberFormatter.numberFormat = "#,###.##a"

      // Create axes
      dateAxis = chart.xAxes.push(new am4charts.DateAxis())
      dateAxis.groupData = true
      dateAxis.groupCount = 500

      valueAxis = chart.yAxes.push(new am4charts.ValueAxis())
      valueAxis.logarithmic = logScale.value
      valueAxis.tooltip.disabled = true
      valueAxis.title.text = "Growth of 10k"

      // Add strategy value series
      strategyValueSeries = chart.series.push(new am4charts.LineSeries())
      strategyValueSeries.name = "Strategy"
      strategyValueSeries.dataFields.dateX = "Time"
      strategyValueSeries.dataFields.valueY = "Value1"
      strategyValueSeries.dataItems.template.locations.dateX = 1

      strategyValueSeries.showPercentDiff = false
      strategyValueSeries.referencePercentDiff = NaN

      chart.events.on("hit", function(ev) {
        if (!strategyValueSeries.showPercentDiff) {
          strategyValueSeries.showPercentDiff = true

          // put a line at the reference point
          referenceMarker = dateAxis.axisRanges.create()
          referenceMarker.value = cursorPosition.x
          referenceMarker.grid.above = true
          referenceMarker.grid.stroke = am4core.color('black')
          referenceMarker.grid.strokeDasharray = '3,3'
          referenceMarker.grid.strokeWidth = 2
          referenceMarker.grid.strokeOpacity = 1

          strategyValueSeries.referenceValue = cursorPosition.seriesValue
          strategyValueSeries.referenceDate = format(cursorPosition.x, 'MMM yyyy')
          strategyValueSeries.tooltipText = `[bold]{dateX}[/]\n[${strategyValueSeries.stroke.hex}]●[/] ${strategyValueSeries.name}: \${${strategyValueSeries.dataFields.valueY}.formatNumber("#,###.00")}\n\n[bold]% chg since {referenceDate}[/]: {referencePercentDiff}%`
        } else {
          strategyValueSeries.showPercentDiff = false
          dateAxis.axisRanges.removeValue(referenceMarker)
          strategyValueSeries.referenceValue = NaN
          strategyValueSeries.referencePercentDiff = NaN
          strategyValueSeries.tooltipText = `[bold]{dateX}[/]\n[${strategyValueSeries.stroke.hex}]●[/] ${strategyValueSeries.name}: \${${strategyValueSeries.dataFields.valueY}.formatNumber("#,###.00")}\n`
        }
      }, this);

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
      benchmarkValueSeries.dataFields.dateX = "Time"
      benchmarkValueSeries.dataFields.valueY = "Value2"
      benchmarkValueSeries.stroke = chart.colors.getIndex(2)
      benchmarkValueSeries.strokeWidth = 1

      // setup scrolling
      chart.cursor = new am4charts.XYCursor()
      chart.cursor.lineY.opacity = 0
      chart.scrollbarX = new am4charts.XYChartScrollbar()
      chart.scrollbarX.parent = chart.bottomAxesContainer
      chart.scrollbarX.series.push(strategyValueSeries)

      chart.cursor.events.on("cursorpositionchanged", function(ev) {
        let xAxis = ev.target.chart.xAxes.getIndex(0)
        let yAxis = ev.target.chart.yAxes.getIndex(0)
        cursorPosition.x = dateAxis.positionToDate(xAxis.toAxisPosition(ev.target.xPosition))
        cursorPosition.y = valueAxis.positionToValue(yAxis.toAxisPosition(ev.target.yPosition))
        let val = strategyData.get(format(cursorPosition.x, 'yyyy-MM-dd'))
        // look at up to 31 more dates to try and find a value
        if (val === undefined) {
          for (let i = 0; i < 31; i++) {
            cursorPosition.x = add(cursorPosition.x, { days: 1 })
            val = strategyData.get(format(cursorPosition.x, 'yyyy-MM-dd'))
            if (val !== undefined) {
              break
            }
          }
        }
        cursorPosition.seriesValue = val
        strategyValueSeries.referencePercentDiff = ((cursorPosition.seriesValue / strategyValueSeries.referenceValue - 1) * 100).toFixed(2)
      })

      dateAxis.keepSelection = true

      chart.legend = new am4charts.Legend()
    }

    async function fillStrategyData() {
      strategyData = new Map()
      measurements.value.Items.forEach((elem, idx) => {
        strategyData.set(format(elem.Time, 'yyyy-MM-dd'), elem.Value1)
      })
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
          // NOTE: Adding 2.5 days to make things line up. Note sure why this is necessary
          let begin = parse(format(fromUnixTime(elem.begin + (86400*2.5)), 'yyyy-MM-dd'), 'yyyy-MM-dd', new Date())
          let end = parse(format(fromUnixTime(elem.end + (86400*2.5)), 'yyyy-MM-dd'), 'yyyy-MM-dd', new Date())

          let range = dateAxis.createSeriesRange(strategyValueSeries)

          range.date = begin
          range.endDate = end
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

    onUnmounted(() => {
      if (chart) {
        chart.dispose()
      }
    })

    // set watchers
    watch(logScale, async (n) => {
      if (valueAxis !== undefined) {
        valueAxis.logarithmic = n
      }
    })

    watch(showDrawDowns, async () => {
      updatePlotBands()
    })

    watch(measurements, async () => {
      if (chart !== undefined) {
        chart.data = measurements.value.Items
        fillStrategyData()
        updatePlotBands()
      }
    })

    watch(drawDowns, async () => {
      updatePlotBands()
    })
  }
})
</script>