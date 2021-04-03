<template>
  <b-container>
    <b-row no-gutters>
      <b-col cols="12">
        <b-button-toolbar class="mb-1">
          <b-button-group class="mr-1">
            <b-button @click="exportCSV" title="Export CSV" variant="info">
              <b-icon icon="cloud-download" aria-hidden="true"></b-icon>
            </b-button>
          </b-button-group>
        </b-button-toolbar>
        <ag-grid-vue style="width: 100%; height: 500px;"
          class="ag-theme-alpine mb-4"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :gridOptions="gridOptions">
        </ag-grid-vue>
      </b-col>
    </b-row>
    <b-row no-gutters>
      <b-col cols="6">
      </b-col>
      <b-col cols="6">
        <holdings-pie-chart width="150" height="150" v-bind:strategy="measurements"></holdings-pie-chart>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { AgGridVue } from "ag-grid-vue"
import HoldingsPieChart from "@/components/HoldingsPieChart.vue"

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

export default {
  name: 'PortfolioReport',
  props: {
    measurements: Array
  },
  components: {
    AgGridVue,
    HoldingsPieChart
  },
  watch: {
    measurements: async function (n) {
      this.updateData(n)
    }
  },
  data() {
    return {
      rowData: [],
      gridOptions: {
        rowClassRules: {
          // apply green to 2008
          'predicted-asset': function(params) {
            var dt = new Date()
            return (params.data.date.getFullYear() === dt.getFullYear()) && (params.data.date.getMonth() === dt.getMonth())
          },
        }
      },
      gridApi: {},
      gridColumnApi: {},
      columnDefs: [
        { field: 'date', width: 110, filter: 'agDateColumnFilter', sortable: true, sortingOrder: ['desc', 'asc'], sort: 'desc', resizable: true, editable: false, valueFormatter: (params) => {
            var d = params.data.date;
            // add a few days to the date - data comes from pv-api as month-end
            // but that's misleading in the portfolio table view which only
            // shows month year
            d = d.addDays(5)
            const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
            return `${mo} ${ye}`
          }
        },
        { field: 'ticker', width: 150, sortable: true, resizable: true, editable: false},
        { field: 'percentReturn', width: 90, headerName: 'Return', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            if (isNaN(params.value)) {
              return "-"
            }
            var d = (params.value * 100).toFixed(2);
            return `${d}%`
          }
        },
        { field: 'value', width: 150, headerName: 'Value', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            if (isNaN(params.value)) {
              return "-"
            }
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.data.value)
          }
        }
      ]
    }
  },
  mounted() {
    this.updateData(this.measurements)
    this.gridApi = this.gridOptions.api
    this.gridColumnApi = this.gridOptions.columnApi
  },
  methods: {
    exportCSV: function(e) {
      e.preventDefault()
      this.gridApi.exportDataAsCsv({})
    },
    updateData: async function (data) {
      this.rowData = []
      var justification = undefined
      data.forEach((elem, ii) => {
        justification = elem.justification
        var line = data[ii+1]
        var value = NaN
        var percentReturn = NaN
        if (line !== undefined) {
          value = line.value
          percentReturn = line.percentReturn
        }
        var row = {
          date: new Date(elem.time * 1000),
          ticker: elem.holdings,
          value: value,
          percentReturn: percentReturn
        }
        Object.keys(justification).forEach(k => row[k] = (row[k] ?? justification[k]))
        this.rowData.push(row)
      })
      if (justification !== undefined) {
        Object.keys(justification).forEach(k => {
          if (typeof(justification[k]) == "number") {
            this.columnDefs.push({
              field: k,
              sortable: true,
              resizable: true,
              width: 120,
              valueFormatter: (params) => {
                return params.value.toFixed(2)
              }
            })
          }
        })
      }
    }
  }
}
</script>

<style>
  .predicted-asset {
    color: #aaa !important;
    font-style: italic !important;
  }
</style>