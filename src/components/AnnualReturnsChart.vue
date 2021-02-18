<template>
  <highcharts width="100%" height="300" :options="chartOptions"></highcharts>
</template>

<script>

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

export default {
  name: 'AnnualReturnsChart',
  props: {
    strategy: {
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
  watch: {
    strategy: async function () {
      this.updateData()
    },
    benchmark: async function () {
      this.updateData()
    }
  },
  mounted: async function () {
    this.updateData()
  },
  methods: {
    updateData: async function () {
        let strategyRets = AnnualizeReturns(this.strategy)
        let benchmarkRets = AnnualizeReturns(this.benchmark)

        let years = []
        let strat = []
        let bench = []
        strategyRets.forEach( (v, k) => {
            years.push(k)
            strat.push((v - 1) * 100)
        })

        benchmarkRets.forEach( v => {
            bench.push((v - 1) * 100)
        })

        this.chartOptions.xAxis.categories = Array.from(years)
        this.chartOptions.series = [{
            name: "Strategy",
            data: strat
        }, {
            name: "Benchmark",
            data: bench
        }]
    }
  },
  data() {
    return {
      chartOptions: {
        chart: {
          type: "column"
        },
        title: {
            text: 'Annual Returns'
        },
        xAxis: {
            categories: []
        },
        yAxis: {
            min: 0,
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
        series: [{name: 'strategy', data: []}, {name: 'benchmark', data:[]}],
      }
    }
  }
}
</script>

<style scoped>
</style>
