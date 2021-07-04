<template>
  <div id="amcharts-annual-rets" class="amcharts-annual-rets" :style="{width: chartWidth, height: chartHeight}"></div>
</template>

<script>
import { defineComponent, ref, toRefs, watch, onMounted, onUnmounted } from 'vue'

import * as am4core from '@amcharts/amcharts4/core'
import * as am4charts from '@amcharts/amcharts4/charts'
import '@amcharts/amcharts4/charts'
import animated from '@amcharts/amcharts4/themes/animated'

let AnnualizeReturns = function (measurements) {
    let annualized = new Map()
    measurements.forEach( elem => {
        let dt = new Date(elem.time * 1000)
        var curr = annualized.get(dt.getFullYear())
        if (curr === undefined) {
            annualized.set(dt.getFullYear(), (1 + elem.percentReturn))
        } else {
            annualized.set(dt.getFullYear(), curr * (1 + elem.percentReturn))
        }
    })
    return annualized
}

export default defineComponent({
  name: 'AnnualReturns',
  props: {
    portfolio: {
      type: Array,
      default: function () {
        return []
      }
    },
    benchmark: {
      type: Array,
      default: function () {
        return []
      }
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '425px'
    }
  },
  setup(props) {
    // amcharts setup
    am4core.useTheme(animated)
    var chart
    var strategySeries
    var benchmarkSeries
    var xAxis
    var yAxis

    // reactive data
    const { portfolio, benchmark, width: chartWidth, height: chartHeight } = toRefs(props)

    // watch parameters
    watch(portfolio, async () => {
      chart.data = await buildData()
    })

    watch(benchmark, async () => {
      chart.data = await buildData()
    })

    // methods
    async function renderChart() {
      if (chart) {
        chart.dispose()
      }

      chart = am4core.create(
        'amcharts-annual-rets',
        am4charts.XYChart
      )

      chart.colors.step = 2

      // create the legend
      chart.legend = new am4charts.Legend()
      chart.legend.position = 'bottom'

      // Create axes
      xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
      xAxis.dataFields.category = 'year'
      xAxis.renderer.cellStartLocation = 0.1
      xAxis.renderer.cellEndLocation = 0.9
      xAxis.renderer.grid.template.location = 0

      yAxis = chart.yAxes.push(new am4charts.ValueAxis())
      yAxis.title.text = "Return (%)"

      // Add strategy series
      strategySeries = chart.series.push(new am4charts.ColumnSeries())
      strategySeries.dataFields.valueY = 'strategy'
      strategySeries.dataFields.categoryX = 'year'
      strategySeries.name = 'Strategy'

      strategySeries.columns.template.tooltipY = am4core.percent(0)
      strategySeries.tooltip.getFillFromObject = false
      strategySeries.tooltip.background.cornerRadius = 5
      strategySeries.tooltip.background.strokeOpacity = 0
      strategySeries.tooltip.pointerOrientation = "vertical"
      strategySeries.tooltip.background.fill = am4core.color("#fff")
      strategySeries.tooltip.label.fill = am4core.color("#00")

      strategySeries.events.on("hidden", arrangeColumns)
      strategySeries.events.on("shown", arrangeColumns)

      // Add benchmark series
      benchmarkSeries = chart.series.push(new am4charts.ColumnSeries())
      benchmarkSeries.dataFields.valueY = 'benchmark'
      benchmarkSeries.dataFields.categoryX = 'year'
      benchmarkSeries.name = 'Benchmark'

      benchmarkSeries.columns.template.tooltipY = am4core.percent(0)
      benchmarkSeries.tooltip.getFillFromObject = false
      benchmarkSeries.tooltip.background.cornerRadius = 5
      benchmarkSeries.tooltip.background.strokeOpacity = 0
      benchmarkSeries.tooltip.pointerOrientation = "vertical"
      benchmarkSeries.tooltip.background.fill = am4core.color("#fff")
      benchmarkSeries.tooltip.label.fill = am4core.color("#00")

      benchmarkSeries.events.on("hidden", arrangeColumns)
      benchmarkSeries.events.on("shown", arrangeColumns)

      // setup tooltips
      strategySeries.columns.template.tooltipText = `[bold]{year}[/]\n[${strategySeries.stroke.hex}]●[/] ${strategySeries.name}: {strategy.formatNumber("#,###.")}%\n[${benchmarkSeries.stroke.hex}]●[/] ${benchmarkSeries.name}: {benchmark.formatNumber("#,###.")}%\n`
      benchmarkSeries.columns.template.tooltipText = `[bold]{year}[/]\n[${strategySeries.stroke.hex}]●[/] ${strategySeries.name}: {strategy.formatNumber("#,###.")}%\n[${benchmarkSeries.stroke.hex}]●[/] ${benchmarkSeries.name}: {benchmark.formatNumber("#,###.")}%\n`

      chart.data = await buildData()
    }

    async function buildData() {
      let portfolioRets = AnnualizeReturns(portfolio.value)
      let benchmarkRets = AnnualizeReturns(benchmark.value)

      let data = []

      portfolioRets.forEach( (v, k) => {
        data.push({
          year: `${k}`,
          benchmark: (benchmarkRets.get(k) - 1) * 100,
          strategy: (v - 1) * 100,
        })
      })

      return data
    }

    function arrangeColumns() {
      var series = chart.series.getIndex(0)
      var w = 1 - xAxis.renderer.cellStartLocation - (1 - xAxis.renderer.cellEndLocation)

      if (series.dataItems.length > 1) {
        var x0 = xAxis.getX(series.dataItems.getIndex(0), "categoryX")
        var x1 = xAxis.getX(series.dataItems.getIndex(1), "categoryX")
        var delta = ((x1 - x0) / chart.series.length) * w
        if (am4core.isNumber(delta)) {
          var middle = chart.series.length / 2
          var newIndex = 0

          chart.series.each(function(series) {
            if (!series.isHidden && !series.isHiding) {
              series.dummyData = newIndex
              newIndex++
            } else {
              series.dummyData = chart.series.indexOf(series)
            }
          })

          var visibleCount = newIndex
          var newMiddle = visibleCount / 2

          chart.series.each(function(series) {
            var trueIndex = chart.series.indexOf(series)
            var newIndex = series.dummyData

            var dx = (newIndex - trueIndex + middle - newMiddle) * delta

            series.animate({ property: "dx", to: dx }, series.interpolationDuration, series.interpolationEasing)
          })
        }
      }
    }

    // lifecycle events

    onMounted(async () => {
      renderChart()
    })

    onUnmounted(() => {
      if (chart) {
        chart.dispose()
      }
    })

    return {
      chartHeight,
      chartWidth,
    }
  }
})
</script>