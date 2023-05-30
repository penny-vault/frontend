<template>
  <div id="amcharts-pie" class="amcharts-pie" :style="{width: chartWidth, height: chartHeight}"></div>
</template>

<script>
import { defineComponent, toRefs, watch, onMounted, onUnmounted } from 'vue'

import * as am4core from '@amcharts/amcharts4/core'
import * as am4charts from '@amcharts/amcharts4/charts'
import '@amcharts/amcharts4/charts'
import animated from '@amcharts/amcharts4/themes/animated'
import * as am4pluginsSliceGrouper from '@amcharts/amcharts4/plugins/sliceGrouper'

export default defineComponent({
  name: 'HoldingsPieChart',
  props: {
    holdings: {
      type: Array,
      default: function () {
        return []
      }
    },
    width: String,
    height: String
  },
  setup (props) {
    // amcharts setup
    am4core.useTheme(animated)
    let chart

    // reactive data
    const { holdings, width: chartWidth, height: chartHeight } = toRefs(props)

    // methods
    async function getTickerData () {
      const counts = new Map()
      holdings.value.forEach(elem => {
        elem.Holdings.forEach(item => {
          const ticker = item.Ticker
          let curr = counts.get(ticker)
          if (curr === undefined || isNaN(curr)) curr = 0
          counts.set(ticker, curr + item.PercentPortfolio)
        })
      })

      // determine which ones have less than 5% of the pie
      // these go into other
      const data = []
      counts.forEach((v, k) => {
        data.push({
          name: k,
          y: v
        })
      })

      return data
    }

    async function renderChart () {
      chart = am4core.create('amcharts-pie', am4charts.PieChart)
      chart.numberFormatter.numberFormat = '#.'

      // create the series
      const pieSeries = chart.series.push(new am4charts.PieSeries())
      pieSeries.dataFields.value = 'y'
      pieSeries.dataFields.category = 'name'

      // Let's cut a hole in our Pie chart the size of 40% the radius
      chart.innerRadius = am4core.percent(40)

      // Put a thick white border around each Slice
      pieSeries.slices.template.stroke = am4core.color('#fff')
      pieSeries.slices.template.strokeWidth = 2
      pieSeries.slices.template.strokeOpacity = 1
      pieSeries.slices.template
        // change the cursor on hover to make it apparent the object can be interacted with
        .cursorOverStyle = [
          {
            property: 'cursor',
            value: 'pointer'
          }
        ]

      pieSeries.slices.template.events.on('hit', function (ev) {
        const series = ev.target.dataItem.component
        series.slices.each(function (item) {
          if (item.isActive && item !== ev.target) {
            item.isActive = false
          }
        })
      })

      pieSeries.labels.template.maxWidth = 75
      pieSeries.labels.template.wrap = true

      const grouper = pieSeries.plugins.push(new am4pluginsSliceGrouper.SliceGrouper())
      grouper.threshold = 5
      grouper.groupName = 'Other'
      grouper.clickBehavior = 'break'

      // Create a base filter effect (as if it's not there) for the hover to return to
      const shadow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter())
      shadow.opacity = 0

      // Create hover state
      const hoverState = pieSeries.slices.template.states.getKey('hover') // normally we have to create the hover state, in this case it already exists

      // Slightly shift the shadow and make it more prominent on hover
      const hoverShadow = hoverState.filters.push(new am4core.DropShadowFilter())
      hoverShadow.opacity = 0.7
      hoverShadow.blur = 5

      chart.data = await getTickerData()
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

    // watchers
    watch(holdings, async () => {
      chart.data = await getTickerData()
    })

    return {
      chartWidth,
      chartHeight
    }
  }
})
</script>
