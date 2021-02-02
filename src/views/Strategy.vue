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
                  <highcharts ref="valueChart" width="100%" height="300" :options="chartOptions"></highcharts>
                </b-tab>
                <b-tab title="Portfolio">
                  <ag-grid-vue style="width: 100%; height: 500px;"
                    class="ag-theme-alpine"
                    :columnDefs="columnDefs"
                    :rowData="rowData">
                  </ag-grid-vue>
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
import { AgGridVue } from "ag-grid-vue";

export default {
  name: 'Strategy',
  data() {
    return {
      strategy: {
        name: ""
      },
      form: {},
      columnDefs: null,
      rowData: null,
      strategyLoaded: false,
      strategyLoading: false,
      performance: {},
      simulationBegin: new Date(1980,0,1),
      simulationEnd: new Date(),
      periodStart: null,
      periodEnd: null,
      chartOptions: {
        chart: {
          zoomType: 'x'
        },
        title: {
            text: 'Strategy performance over time'
        },
        subtitle: {
            text: document.ontouchstart === undefined ?
                'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
          title: {
            text: 'Value'
          }
        },
        legend: {
          enabled: false
        },
        credits: {
          enabled: false
        },
        lang: {
          thousandsSep: ','
        },
        tooltip: {
          pointFormat: "{series.name}: <b>${point.y:,.2f}</b><br/>"
        },
        plotOptions: {
          area: {
            marker: {
              radius: 2
            },
            lineWidth: 1,
            states: {
              hover: {
                lineWidth: 1
              }
            },
            threshold: null
          }
        },
        series: [{
          type: 'area',
          name: 'strategy',
          data: []
        }],
      },
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
  components: {
    AgGridVue
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
        })

        this.chartOptions.series = [{
          type: 'area',
          name: 'strategy',
          data: chartData
        }]

        var start = new Date(this.performance.periodStart * 1000)
        var end = new Date(this.performance.periodEnd * 1000)

        var shortMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        this.periodStart = shortMonth[start.getMonth()] + " " + start.getFullYear()
        this.periodEnd = shortMonth[end.getMonth()] + " " + end.getFullYear()

        this.columnDefs = [
            { field: 'date' },
            { field: 'ticker' }
        ];

        this.performance.holdingByMonth.forEach( elem => {
          elem.date = new Date(elem.date * 1000)
        })

        this.rowData = this.performance.holdingByMonth

        this.strategyLoaded = true;
      },
      onReset: function() {}
  }
}
</script>
