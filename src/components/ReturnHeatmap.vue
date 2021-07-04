<template>
  <div id="amcharts-returns-heatmap" class="amcharts-returns-heatmap" style="width: 100%; height: 425px"></div>
</template>

<script>
import { defineComponent, toRefs, watch, onMounted, onUnmounted } from 'vue'

import { format } from 'date-fns'

import * as am4core from '@amcharts/amcharts4/core'
import * as am4charts from '@amcharts/amcharts4/charts'
import '@amcharts/amcharts4/charts'
import animated from '@amcharts/amcharts4/themes/animated'

export default defineComponent({
  name: 'ReturnHeatmap',
  props: {
    measurements: {
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
      default: '800px'
    }
  },
  setup(props) {
    // amcharts setup
    am4core.useTheme(animated)
    var chart
    var series
    var xAxis
    var yAxis

    // reactive data
    const { measurements, width: chartWidth, height: chartHeight } = toRefs(props)

    // watch parameters
    watch(measurements, async () => {
      chart.data = await buildData()
    })

    // methods
    async function renderChart() {
      if (chart) {
        chart.dispose()
      }

      chart = am4core.create("amcharts-returns-heatmap", am4charts.XYChart)
      chart.maskBullets  = false

      xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
      yAxis = chart.yAxes.push(new am4charts.CategoryAxis())

      xAxis.dataFields.category = "year"
      yAxis.dataFields.category = "month"

      xAxis.renderer.grid.template.disabled = true;
      xAxis.renderer.minGridDistance = 40

      yAxis.renderer.grid.template.disabled = true
      yAxis.renderer.inversed = true
      yAxis.renderer.minGridDistance = 30

      // configure series

      series = chart.series.push(new am4charts.ColumnSeries())
      series.dataFields.categoryX = "year"
      series.dataFields.categoryY = "month"
      series.dataFields.value = "value"
      series.sequencedInterpolation = true
      series.defaultState.transitionDuration = 3000

      const bgColor = new am4core.InterfaceColorSet().getFor("background")

      let columnTemplate = series.columns.template
      columnTemplate.strokeWidth = 1
      columnTemplate.strokeOpacity = 0.2
      columnTemplate.stroke = bgColor
      columnTemplate.tooltipText = '[bold]{month} {year}:[/] {value.formatNumber("#,###.")}%'
      columnTemplate.width = am4core.percent(100)
      columnTemplate.height = am4core.percent(100)

      series.heatRules.push({
        target: columnTemplate,
        property: "fill",
        minValue: -4, // this needs to be equal so the transition point is about 0
        maxValue: 4,
        min: chart.colors.getIndex(8),
        max: chart.colors.getIndex(17)
      })

      // heat legend
      var heatLegend = chart.bottomAxesContainer.createChild(am4charts.HeatLegend)
      heatLegend.width = am4core.percent(100)
      heatLegend.series = series
      heatLegend.maxValue = -4
      heatLegend.minValue = 4
      heatLegend.valueAxis.renderer.labels.template.fontSize = 9
      heatLegend.valueAxis.renderer.minGridDistance = 30

      series.columns.template.events.on("over", function(ev) {
        if (!isNaN(ev.target.dataItem.value)) {
          heatLegend.valueAxis.showTooltipAt(ev.target.dataItem.value)
        }
        else {
          heatLegend.valueAxis.hideTooltip();
        }
      })

      series.columns.template.events.on("out", function(ev) {
        heatLegend.valueAxis.hideTooltip();
      })

      chart.data = await buildData()
    }

    async function buildData() {
      let data = new Array()

      if (measurements.value.length == 0) {
        return
      }

      let started = false
      measurements.value.forEach(elem => {
        let dt = new Date(elem.time * 1000)
        if (!started) {
          if (dt.getMonth() === 0) {
            started = true
          } else {
            return
          }
        }

        data.push({
          year: `${dt.getFullYear()}`,
          month: format(dt, "MMM"),
          value: elem.percentReturn * 100
        })
      })

      return data
    }

    // creation events
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