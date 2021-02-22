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
  </b-container>
</template>

<script>
import { AgGridVue } from "ag-grid-vue"

export default {
  name: 'TransactionsReport',
  props: {
    transactions: Array
  },
  components: {
    AgGridVue
  },
  watch: {
    transactions: async function () {
      this.updateData()
    }
  },
  data() {
    return {
      rowData: [],
      gridOptions: {},
      gridApi: {},
      gridColumnApi: {},
      columnDefs: [
        { field: 'date', width: 125, filter: 'agDateColumnFilter', sortable: true, sort: 'desc', resizable: true, editable: false, valueFormatter: (params) => {
            var d = params.value;
            const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
            const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(d)
            return `${da} ${mo} ${ye}`
          }
        },
        { field: 'kind', headerName: 'Type', width: 100, sortable: false, resizable: true, editable: false},
        { field: 'ticker', width: 90, sortable: true, resizable: true, editable: false},
        { field: 'shares', width: 110, sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            if (isNaN(params.value)) {
              return "-"
            }
            var d = (params.value).toFixed(2);
            return `${d}`
          }
        },
        { field: 'pricePerShare', width: 100, headerName: 'Price', sortable: false, resizable: true, editable: false, valueFormatter: (params) => {
            if (isNaN(params.value)) {
              return "-"
            }
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
          }
        },
        { field: 'totalValue', width: 150, headerName: 'Total', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            if (isNaN(params.value)) {
              return "-"
            }
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
          }
        }
      ]
    }
  },
  mounted() {
    this.gridApi = this.gridOptions.api
    this.gridColumnApi = this.gridOptions.columnApi
    this.updateData()
  },
  methods: {
    exportCSV: function(e) {
      e.preventDefault()
      this.gridApi.exportDataAsCsv({})
    },
    updateData: function() {
        this.rowData = []
        this.transactions.forEach( elem => {
            if (elem.kind !== "MARKER") {
                elem.date = new Date(elem.date)
                if (elem.date <= new Date()) {
                    this.rowData.push(elem)
                }
            }
        })
    }
  }
}
</script>
