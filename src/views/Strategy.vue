<template>
  <b-container>
    <b-row>
        <b-col>
          <strategy-arguments :spec="args" :disabled="Boolean(portfolioId)" @execute="onSubmit"></strategy-arguments>
        </b-col>

        <b-col cols="9" class="left">
          <b-row>
            <b-col>
              <h3>{{ strategy.name }}</h3>
              <h5 v-if="strategyLoaded">{{ periodStart }} - {{ periodEnd }}</h5>
            </b-col>
            <b-col style="text-align: right">
              <b-button v-if="canSave" @click="onSave" size="sm" variant="outline-nav" class="mt-1 mb-2">
                <b-icon icon="bookmark-star-fill" aria-hidden="true"></b-icon> Save
              </b-button>
              <div class="small" v-else-if="portfolioId">Portfolio Id: {{ portfolioId }}</div>
              <div class="small" v-if="strategyLoaded">Computed at {{ this.executedAsOf | formatDate }}</div>
            </b-col>
          </b-row>
          <div v-if="strategyLoaded">
            <b-tabs content-class="mt-3">
                <b-tab title="Summary" active>

                  <b-card-group deck>
                    <stat-card name="Current Asset" :value="currentAsset"></stat-card>
                    <percent-stat-card name="YTD Return" :value="ytdReturn"></percent-stat-card>
                    <percent-stat-card name="CAGR Since Inception" :value="cagrSinceInception"></percent-stat-card>
                  </b-card-group>

                  <value-chart v-bind:series="series" class="mt-3"></value-chart>
                </b-tab>
                <b-tab title="Portfolio">
                  <portfolio v-bind:row-data="holdings"></portfolio>
                </b-tab>
                <b-tab title="Settings">
                  <portfolio-settings :portfolio-id="portfolioId" :portfolio-settings="portfolio"></portfolio-settings>
                </b-tab>
            </b-tabs>
          </div>
          <div v-else-if="strategyLoading">
            <hr/>
            <div class="ml-5 mr-5 mt-5">
            Strategy computing ...
            <b-progress :value="100" variant="primary" striped animated class="mt-2"></b-progress>
            </div>
          </div>
          <div v-else>
            <hr/>
            <h4 class="mt-3">To begin fill out the form and click 'Submit'.</h4>
          </div>
        </b-col>
    </b-row>
  </b-container>
</template>

<script>
import ValueChart from "@/components/ValueChart.vue"
import Portfolio from "@/components/Portfolio.vue"
import PortfolioSettings from "@/components/PortfolioSettings.vue"
import StatCard from "@/components/StatCard.vue"
import PercentStatCard from "@/components/PercentStatCard.vue"
import StrategyArguments from "@/components/StrategyArguments.vue"
import Vue from 'vue'

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

Vue.filter("formatDate", function (value) {
  var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (value !== null) {
    return `${pad(value.getHours(), 2)}:${pad(value.getMinutes(), 2)}, ${month[value.getMonth()]} ${pad(value.getDay(), 2)}, ${value.getFullYear()}`
  }
  return ``;
})

export default {
  name: 'Strategy',
  props: {
    portfolioId: String,
    strategyId: String
  },
  data() {
    return {
      args: [],
      cagrSinceInception: 0.0,
      currentAsset: '',
      executedAsOf: null,
      performance: {},
      periodStart: null,
      periodEnd: null,
      portfolio: null,
      holdings: [],
      series: [{
          type: 'area',
          name: 'strategy',
          data: []
        }],
      strategy: {
        name: "",
        shortcode: ""
      },
      strategyLoaded: false,
      strategyLoading: false,
      ytdReturn: 0.0
    }
  },
  computed: {
    canSave: function() {
      return !this.portfolioId && this.strategyLoaded
    }
  },
  mounted: async function() {
    // Get the access token from the auth wrapper
    const token = await this.$auth.getTokenSilently()

    this.strategy.shortcode = this.strategyId

    // if there is a portfolio id get that first
    try {
      var endpoint = "/portfolio/" + this.portfolioId
      if (this.portfolioId) {
        const { data } = await this.$axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        this.portfolio = data
        this.strategy.shortcode = data.strategy
      }
    } catch(error) {
      this.$bvToast.toast("Failed to load portfolio definition", {
        title: 'Error',
        variant: 'danger',
        autoHideDelay: 5000,
        appendToast: false
      })
      return
    }

    // Load strategy definition
    try {
      endpoint = "/strategy/" + this.strategy.shortcode
      const { data } = await this.$axios.get(endpoint, {
        headers: {
            Authorization: `Bearer ${token}`
        }
      })
      this.strategy = data
    } catch(error) {
        this.$bvToast.toast("Failed to load strategy definition", {
          title: 'Error',
          variant: 'danger',
          autoHideDelay: 5000,
          appendToast: false
        })
        return
      }

    Object.entries(this.strategy.arguments).forEach( elem => {
      const [k, v] = elem
      var item = {
        arg: k,
        name: v.name,
        description: v.description,
        id: v.name + "_id",
        inpid: v.name + "_inp_id",
        inptype: "text",
        inpdefault: v.default,
        required: true
      };

      if (this.portfolio) {
        item.inpdefault = this.portfolio.arguments[k]
      }

      if (v.typecode == "[]string") {
        var val = item.inpdefault
        if (typeof item.inpdefault === "string") {
          val = JSON.parse(val)
        }
        item.inpdefault = val.join(" ");
      }

      this.args.push(item);
    })

    if (this.portfolio !== null) {
      this.executeStrategy(this.portfolio.arguments)
    }
  },
  components: {
    ValueChart, Portfolio, PortfolioSettings, StatCard, PercentStatCard, StrategyArguments
  },
  methods: {
    onSave: async function(e) {
      e.preventDefault()
      var params = {
        name: this.strategy.name,
        arguments: this.strategy.userArgs,
        strategy: this.strategy.shortcode
      }

      // Get the access token from the auth wrapper
      const token = await this.$auth.getTokenSilently()

      // Use Axios to make a call to the API
      try {
        const { data } = await this.$axios.post("/portfolio/", params, {
          headers: {
            Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
          }
        })
        this.$bvToast.toast(`Saved portfolio: ${data.name} (${data.id})`, {
          title: 'Saved',
          variant: 'success',
          autoHideDelay: 5000,
          appendToast: false
        })
        return
      } catch(error) {
        this.$bvToast.toast("Failed to save portfolio", {
          title: 'Error',
          variant: 'danger',
          autoHideDelay: 5000,
          appendToast: false
        })
        return
      }
    },
    onSubmit: async function (form) {
        var stratParams = Object.assign({}, form)
        Object.entries(this.strategy.arguments).forEach( elem => {
          const [k, v] = elem;
          if (v.typecode == '[]string') {
            stratParams[k] = stratParams[k].split(' ');
          }
        })
        this.executeStrategy(stratParams)
    },
    executeStrategy: async function (stratParams) {
        this.strategyLoading = true
        this.strategyLoaded = false

        this.strategy.userArgs = stratParams

        // Get the access token from the auth wrapper
        const token = await this.$auth.getTokenSilently()

        // Use Axios to make a call to the API
        try {
          var endpoint = "/strategy/" + this.strategy.shortcode
          const { data } = await this.$axios.post(endpoint, stratParams, {
            headers: {
              Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
            }
          })
          this.executedAsOf = new Date()
          this.performance = data
        } catch(error) {
          this.$bvToast.toast("Server failed to calculate strategy performance", {
            title: 'Error',
            variant: 'danger',
            autoHideDelay: 5000,
            appendToast: false
          })
          this.strategyLoading = false
          return
        }

        // Reformat value data to match chart
        var chartData = []
        this.holdings = []
        this.performance.value.forEach(elem => {
          chartData.push([elem.time * 1000, elem.value])
          this.holdings.push({
            date: new Date(elem.time * 1000),
            ticker: elem.holdings,
            percentReturn: elem.percentReturn
          })
        })

        this.series = [{
          type: 'area',
          name: 'strategy',
          data: chartData
        }]

        var start = new Date(this.performance.periodStart * 1000)
        var end = new Date(this.performance.periodEnd * 1000)

        var shortMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        this.periodStart = shortMonth[start.getMonth()] + " " + start.getFullYear()
        this.periodEnd = shortMonth[end.getMonth()] + " " + end.getFullYear()

        this.cagrSinceInception = this.performance.cagrSinceInception
        this.ytdReturn = this.performance.ytdReturn
        this.currentAsset = this.performance.currentAsset

        this.strategyLoaded = true
      }
  }
}
</script>

<style lang="scss">
.small {
  font-size: 8pt;
  color: #666;
}
</style>