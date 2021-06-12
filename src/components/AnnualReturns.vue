<template>
  <vue-highchart :options="chartOptions"></vue-highchart>
</template>

<script>
import { defineComponent, ref, toRefs, watch, onMounted } from 'vue'

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
    }
  },
  setup(props) {
    const { portfolio, benchmark } = toRefs(props)

    // reactive data
    const chartOptions = ref({
      chart: {
        type: "column"
      },
      title: {
          text: undefined
      },
      xAxis: {
          categories: []
      },
      yAxis: {
          title: {
              text: 'Return'
          },
          format: "{point.y:,.2f}%"
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
        pointFormat: "{series.name}: <b>{point.y:,.2f}%</b><br/>"
      },
      series: [{name: 'portfolio', data: []}, {name: 'benchmark', data:[]}],
    })

    // watch parameters
    watch(portfolio, async (n) => {
      updateData(n)
    })

    watch(benchmark, async (n) => {
      updateData(n)
    })

    // methods
    async function updateData() {
      let portfolioRets = AnnualizeReturns(portfolio.value)
      let benchmarkRets = AnnualizeReturns(benchmark.value)

      let years = []
      let port = []
      let bench = []

      portfolioRets.forEach( (v, k) => {
          years.push(k)
          port.push((v - 1) * 100)
      })

      benchmarkRets.forEach( v => {
          bench.push((v - 1) * 100)
      })

      chartOptions.value.xAxis.categories = Array.from(years)
      chartOptions.value.series = [{
          name: "Portfolio",
          data: port
      }, {
          name: "Benchmark",
          data: bench
      }]
    }

    // creation events
    onMounted(async () => {
      updateData()
    })

    return {
      chartOptions
    }
  }
})
</script>