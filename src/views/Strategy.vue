<template>
  <b-container>
    <b-row>
        <b-col>
            <b-card
                header="Strategy Parameters"
                header-bg-variant="primary"
                header-text-variant="white"
                align="left"
                class="ml-0"
            >

            <b-form ref="params" @submit="onSubmit" @reset="onReset">
              <b-form-group v-for="item in args" :label="item.name" :description="item.description" :key="item.id" :label-for="item.inpid">
                <b-form-input
                  :id="item.inpid"
                  v-model="form[item.arg]"
                  :type="item.inptype"
                  :required="item.required"
                ></b-form-input>
              </b-form-group>

              <b-form-group label="Start Date" label-for="simulationBegin">
                <b-form-datepicker id="simulationBegin" v-model="simulationBegin" :date-format-options="{ year: 'numeric', month: 'short'}"></b-form-datepicker>
              </b-form-group>

              <b-form-group label="End Date" label-for="simulationEnd">
                <b-form-datepicker id="simulationEnd" v-model="simulationEnd" :date-format-options="{ year: 'numeric', month: 'short'}"></b-form-datepicker>
              </b-form-group>

              <b-button type="submit" class="mr-2" variant="info">Submit</b-button>
            </b-form>

            </b-card>
        </b-col>

        <b-col cols="9" class="left">
          <h3>{{ strategy.name }}</h3>
          <div v-if="strategyLoaded">
            <h5>{{ periodStart }} - {{ periodEnd }}</h5>
            <b-tabs content-class="mt-3">
                <b-tab title="Summary" active>
                  <value-chart v-bind:series="series"></value-chart>
                </b-tab>
                <b-tab title="Portfolio">
                  <portfolio v-bind:row-data="holdings"></portfolio>
                </b-tab>
            </b-tabs>
          </div>
          <div v-else-if="strategyLoading">
            <hr/>
            <h3>Please wait while the simulation runs</h3>
          </div>
          <div v-else>
            <hr/>
            <h3>To begin fill out the form to the left.</h3>
          </div>
        </b-col>
    </b-row>
  </b-container>
</template>

<script>
import ValueChart from "@/components/ValueChart.vue"
import Portfolio from "@/components/Portfolio.vue"

export default {
  name: 'Strategy',
  data() {
    return {
      args: [],
      form: {},
      performance: {},
      periodStart: null,
      periodEnd: null,
      holdings: [],
      series: [{
          type: 'area',
          name: 'strategy',
          data: []
        }],
      simulationBegin: new Date(1980,0,1),
      simulationEnd: new Date(),
      strategy: {
        name: ""
      },
      strategyLoaded: false,
      strategyLoading: false
    }
  },
  mounted: async function() {
    // Get the access token from the auth wrapper
    const token = await this.$auth.getTokenSilently();

    // Use Axios to make a call to the API
    const { data } = await this.$axios.get("/strategy/" + this.$route.params.id, {
    headers: {
        Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
    }
    });

    this.strategy = data;
    Object.entries(this.strategy.arguments).forEach( elem => {
      const [k, v] = elem;
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

      if (v.typecode == "[]string") {
        item.inpdefault = JSON.parse(v.default).join(" ");
        this.form[item.arg] = JSON.parse(v.default).join(" ");
      } else {
        this.form[item.arg] = v.default;
      }

      this.args.push(item);
    })
  },
  components: {
    ValueChart, Portfolio
  },
  methods: {
      onSubmit: async function (e) {
        e.preventDefault()
        this.strategyLoading = true;
        this.strategyLoaded = false;

        var stratParams = Object.assign({}, this.form)
        Object.entries(this.strategy.arguments).forEach( elem => {
          const [k, v] = elem;
          if (v.typecode == '[]string') {
            stratParams[k] = stratParams[k].split(' ');
          }
        })

        // Get the access token from the auth wrapper
        const token = await this.$auth.getTokenSilently()

        // Use Axios to make a call to the API
        try {
          const { data } = await this.$axios.post("/strategy/" + this.strategy.shortcode, stratParams, {
            headers: {
              Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
            }
          })
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
        this.performance.value.forEach(elem => {
          chartData.push([elem.time * 1000, elem.value])
          this.holdings.push({
            date: new Date(elem.time * 1000),
            ticker: elem.holdings
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

        this.strategyLoaded = true
      },
      onReset: function() {}
  }
}
</script>
