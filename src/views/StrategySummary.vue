<template>
  <div>
    <b-card-group deck>
        <stat-card name="Current Asset" :value="performance.currentAsset"></stat-card>
        <percent-stat-card name="YTD Return" :value="performance.ytdReturn"></percent-stat-card>
        <percent-stat-card name="CAGR Since Inception" :value="performance.cagrSinceInception"></percent-stat-card>
        <percent-stat-card name="Max Draw Down" :value="performance.metrics.drawDowns[0].lossPercent"></percent-stat-card>
    </b-card-group>

    <b-table-lite class="mt-4" small striped borderless hover :items="portfolioItems"></b-table-lite>
    <hr/>
    <value-chart v-bind:measurements="performance.measurements" v-bind:benchmark="benchmark.measurements" v-bind:draw-downs="performance.metrics.drawDowns" class="mt-4"></value-chart>

    <b-table-lite class="mt-4" small striped borderless hover :items="cagrItems"></b-table-lite>
    <hr/>
    <b-table-lite class="mt-4" small striped borderless hover :items="riskRatioItems"></b-table-lite>
  </div>
</template>

<script>
import StatCard from "@/components/StatCard.vue"
import PercentStatCard from "@/components/PercentStatCard.vue"
import ValueChart from "@/components/ValueChart.vue"

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

let BestYear = function (measurements) {
    let annualized = AnnualizeReturns(measurements)
    var yr = 0
    var ret = Number.MIN_SAFE_INTEGER
    annualized.forEach( (v, k) => {
        if (v > ret) {
            yr = k
            ret = v
        }
    })

    ret = (ret - 1) * 100
    return `${ret.toFixed(2)}% (${yr})`
}

let FormatCurrency = function (v) {
    return new Intl.NumberFormat('en-US',
        { style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
          minimumFractionDigits: 0
        }).format(v)
}

let WorstYear = function (measurements) {
    let annualized = AnnualizeReturns(measurements)
    var yr = 0
    var ret = Number.MAX_SAFE_INTEGER
    annualized.forEach( (v, k) => {
        if (v < ret) {
            yr = k
            ret = v
        }
    })

    ret = (ret - 1) * 100
    return `${ret.toFixed(2)}% (${yr})`
}

let GetPortfolioSummaryLine = function (name, data) {
    try {
        let N = data.measurements.length - 1
        return {
            "Portfolio": name,
            "Final Balance": FormatCurrency(data.measurements[N].value),
            "Deposited": FormatCurrency(data.totalDeposited),
            "Withdrawn": FormatCurrency(data.totalWithdrawn),
            "StdDev": `${(data.metrics.stdDev * 100).toFixed(2)}%`,
            "Best Year": BestYear(data.measurements),
            "Worst Year": WorstYear(data.measurements)
        }
    } catch (err) {
        return {
            "Portfolio": name,
            "Final Balance": "",
            "Deposited": "",
            "Withdrawn": "",
            "StdDev": "",
            "Best Year": "",
            "Worst Year": ""
        }
    }
}

let GetCagrItemsLine = function (name, data) {
    try {
        return {
            "Trailing Returns": name,
            "YTD": (data.ytdReturn * 100).toFixed(2) + "%",
            "1-Yr": (data.metrics.cagrs["1-yr"] * 100).toFixed(2) + "%",
            "3-Yr": (data.metrics.cagrs["3-yr"] * 100).toFixed(2) + "%",
            "5-Yr": (data.metrics.cagrs["5-yr"] * 100).toFixed(2) + "%",
            "10-Yr": (data.metrics.cagrs["10-yr"] * 100).toFixed(2) + "%",
            "Since Inception": (data.cagrSinceInception * 100).toFixed(2) + "%"
        }
    } catch (err) {
        return {
            "Trailing Returns": name,
            "YTD": "",
            "1-Yr": "",
            "3-Yr": "",
            "5-Yr": "",
            "10-Yr": "",
            "Since Inception": ""
        }
    }
}

let GetRiskRatioLine = function (name, data) {
    try {
        return {
            "Risk Ratios": name,
            "Sharpe": data.metrics.sharpeRatio.toFixed(2),
            "Sortino": data.metrics.sortinoRatio.toFixed(2)
        }
    } catch (err) {
        return {
            "Risk Ratios": name,
            "Sharpe": "",
            "Sortino": ""
        }
    }
}

export default {
  name: 'StrategySummary',
  props: {
    performance: Object,
    benchmark: {
        type: Object,
        default: function () {
            return {
                measurements: []
            }
        }
    }
  },
  components: {
    StatCard,
    PercentStatCard,
    ValueChart
  },
  watch: {
    performance: async function () {
        this.updateData()
    },
    benchmark: async function () {
        this.updateData()
    }
  },
  data() {
    return {
        cagrItems: [],
        portfolioItems: [],
        riskRatioItems: []
    }
  },
  mounted() {
    this.updateData()
  },
  methods: {
    updateData: async function () {
        this.cagrItems = [
            GetCagrItemsLine("Strategy", this.performance),
            GetCagrItemsLine("Benchmark", this.benchmark)
        ]

        this.portfolioItems = [
            GetPortfolioSummaryLine("Strategy", this.performance),
            GetPortfolioSummaryLine("Benchmark", this.benchmark)
        ]

        this.riskRatioItems = [
            GetRiskRatioLine("Strategy", this.performance),
            GetRiskRatioLine("Benchmark", this.benchmark)
        ]
    }
  }
}
</script>
