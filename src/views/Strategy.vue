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
            <h5>Jan 1990 - Dec 2020</h5>
            <p>Tactical asset allocation model results from Jan 1990 to Dec 2020 are based on dual momentum model holding the best performing asset. Absolute momentum based trend following filter is used to switch any selected assets that have a negative excess return over the risk free rate to cash. The model uses a single performance window of 10 calendar month(s). Tactical asset allocation model trades are executed using the end of month close price each month based on the end of month signals. The time period was constrained by the available data for T. Rowe Price International Discovery (PRIDX) [Jan 1989 - Dec 2020].</p>
            <b-tabs content-class="mt-3">
                <b-tab title="Summary" active>
                  <apexchart ref="valueChart" width="100%" height="300" type="area" :options="options" :series="series"></apexchart>
                </b-tab>
            </b-tabs>
          </div>
          <div v-else-if="strategyLoading">
            <h3>Please wait while the simulation runs</h3>
          </div>
          <div v-else>
            <h3>To begin fill out the form to the left.</h3>
          </div>
        </b-col>
    </b-row>
  </b-container>
</template>

<script>
export default {
  name: 'Strategy',
  data() {
    return {
      strategy: {
        name: ""
      },
      form: {},
      strategyLoaded: false,
      strategyLoading: false,
      performance: {},
      simulationBegin: new Date(1980,0,1),
      simulationEnd: new Date(),
      options: {
        chart: {
          id: 'value-chart',
          zoom: {
            type: 'x',
            enabled: true,
            autoScaleYaxis: true
          },
          toolbar: {
            autoSelected: 'zoom'
          }
        },
        dataLabels: {
          enabled: false
        },
        markers: {
          size: 0
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 90, 100]
          }
        },
        yaxis: {
          labels: {
            formatter: function (val) {
              return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(val)
            },
          },
          title: {
            text: 'Price'
          },
//          logarithmic: true
        },
        xaxis: {
          type: 'datetime',
        },
        tooltip: {
          shared: false,
          y: {
            formatter: function (val) {
              return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(val)
            }
          }
        }
      },
      series: [{
        name: 'strategy',
        data: []
      }],
      args: []
    };
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
  components: {},
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
        })

        this.series = [{
          name: 'strategy',
          data: chartData
        }]

        this.strategyLoaded = true;
      },
      onReset: function() {}
  }
}
</script>
