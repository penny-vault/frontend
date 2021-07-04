<template>
  <div id="vue-amscatter" class="vue-amscatter"></div>
</template>

<script>
import { defineComponent, toRefs, watch, onMounted, onUnmounted } from 'vue'

import * as am4core from '@amcharts/amcharts4/core'
import * as am4charts from '@amcharts/amcharts4/charts'
import '@amcharts/amcharts4/charts'
import animated from '@amcharts/amcharts4/themes/animated'

export default defineComponent({
  name: 'AmScatterPlot',
  props: {
    data: {
      type: Array,
      required: true
    },
    seriesConfig: {
      type: Array,
      default() {
        return [
          {
            title: 'Series 1',
            valueX: 'x',
            valueY: 'y',
            strokeOpacity: 0,
            symbol: 'circle'
          }
        ]
      }
    },
    labels: {
      type: String,
      default: ""
    },
    xTitle: {
      type: String,
      default: 'X'
    },
    yTitle: {
      type: String,
      default: 'Y'
    }
  },
  setup(props) {
    const { data, labels, seriesConfig, xTitle, yTitle } = toRefs(props)

    var chart = undefined

    // configure amcharts theme
    am4core.useTheme(animated)

    // watch for changes
    watch(data, async (n) => {
      chart.data = n
    })

    // methods

    async function createSeries() {
      let series = new Array()
      seriesConfig.value.forEach((elem, idx) => {
        let lineSeries = chart.series.push(new am4charts.LineSeries())
        lineSeries.dataFields.valueX = elem.valueX || 'x'
        lineSeries.dataFields.valueY = elem.valueY || 'y'
        lineSeries.strokeOpacity = elem.strokeOpacity || 0
        lineSeries.tooltipText = elem.tooltipText || 'X: {valueX} / Y: {valueY}'

        lineSeries.tooltip.background.cornerRadius = 5
        lineSeries.tooltip.background.strokeOpacity = 0
        lineSeries.tooltip.pointerOrientation = "vertical"
        lineSeries.tooltip.label.minWidth = 40
        lineSeries.tooltip.label.minHeight = 40
        lineSeries.tooltip.label.textAlign = "left"
        lineSeries.tooltip.label.textValign = "middle"

        lineSeries.tooltip.getFillFromObject = false
        lineSeries.tooltip.label.fill = am4core.color("black")
        lineSeries.tooltip.background.fill = am4core.color("#FFFFFF")

        // configure symbology
        if (labels.value !== "") {
          let labelBullet = lineSeries.bullets.push(new am4charts.LabelBullet());
          labelBullet.label.text = labels.value
          labelBullet.label.dy = 20
        }

        let bullet = lineSeries.bullets.push(new am4charts.Bullet())
        var symbol
        let symbolName = elem.symbol || 'circle'
        switch(symbolName) {
          case 'circle':
            symbol = bullet.createChild(am4core.Circle)
            break
          case 'triangle':
            symbol = bullet.createChild(am4core.Triangle)
            break
          default:
            console.error(`Unknown symbol in scatter plot series: ${symbolName}`)
            symbol = bullet.createChild(am4core.Circle)
        }

        /*
        EXAMPLE: If you want to enable click events do this

        symbol.events.on("hit", function(ev) {
          console.log("clicked on ", ev.target);
        }, this);
        */

        symbol.horizontalCenter = elem.horizontalCenter || 'middle'
        symbol.verticalCenter = elem.verticalCenter || 'middle'
        symbol.strokeWidth = elem.strokeWidth || 0

        if (elem.color) {
          console
          if (typeof elem.color === 'number') {
            symbol.fill = chart.colors.getIndex(elem.color)
          } else {
            symbol.fill = am4core.color(elem.color)
          }
        } else {
          symbol.fill = chart.colors.getIndex(idx)
        }

        symbol.direction = elem.direction || 'top'
        symbol.width = elem.width || 12
        symbol.height = elem.height || 12

        series.push(lineSeries)
      })
    }

    async function renderChart() {
      if (chart) {
        chart.dispose()
      }
      chart = am4core.create(
        'vue-amscatter',
        am4charts.XYChart
      )

      chart.data = data.value

      // Create axes
      var valueAxisX = chart.xAxes.push(new am4charts.ValueAxis())
      valueAxisX.title.text = xTitle.value
      valueAxisX.renderer.minGridDistance = 40

      // Create value axis
      var valueAxisY = chart.yAxes.push(new am4charts.ValueAxis())
      valueAxisY.title.text = yTitle.value

      // Add cursor and series tooltip support
      chart.cursor = new am4charts.XYCursor()
      chart.cursor.maxTooltipDistance = -1

      am4charts.ValueAxis.prototype.getSeriesDataItem = function(series, position) {
        var key = this.axisFieldName + this.axisLetter;
        var value = this.positionToValue(position);
        const dataItem = series.dataItems.getIndex(series.dataItems.findClosestIndex(value, function(x) {
          return x[key] ? x[key] : undefined;
        }, "any"));
        return dataItem;
      }

      // create the series
      let series = createSeries()
    }

    // creation events
    onMounted(async () => {
      renderChart()
    })

    onUnmounted( async () => {
      if (chart) {
        chart.dispose()
      }
    })

    return {}
  }
})
</script>