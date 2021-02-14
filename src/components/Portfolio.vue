<template>
  <div>
  <b-button-toolbar class="mb-1">
    <b-button-group class="mr-1">
      <b-button @click="exportCSV" title="Export CSV" variant="info">
        <b-icon icon="cloud-download" aria-hidden="true"></b-icon>
      </b-button>
    </b-button-group>
  </b-button-toolbar>
  <ag-grid-vue style="width: 100%; height: 500px;"
    class="ag-theme-alpine"
    :columnDefs="columnDefs"
    :rowData="rowData"
    :gridOptions="gridOptions">
  </ag-grid-vue>
  </div>
</template>

<script>
import { AgGridVue } from "ag-grid-vue"

export default {
  name: 'Portfolio',
  props: {
    measurements: Array
  },
  components: {
    AgGridVue
  },
  watch: {
    measurements: async function (n) {
      this.updateData(n)
    }
  },
  data() {
    return {
      rowData: [],
      gridOptions: {},
      gridApi: {},
      gridColumnApi: {},
      columnDefs: [
        { field: 'date', width: 110, filter: 'agDateColumnFilter', sortable: true, sortingOrder: ['desc', 'asc'], sort: 'desc', resizable: true, editable: false, valueFormatter: (params) => {
            var d = params.data.date;
            const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
            //const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d)
            return `${mo} ${ye}`
          }
        },
        { field: 'ticker', width: 90, sortable: true, resizable: true, editable: false},
        { field: 'percentReturn', width: 90, headerName: 'Return', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            var d = (params.data.percentReturn * 100).toFixed(2);
            return `${d}%`
          }
        },
        { field: 'value', width: 150, headerName: 'Value', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.data.value)
          }
        }

      ]
    }
  },
  mounted() {
    this.updateData(this.measurements)
    this.gridApi = this.gridOptions.api;
    this.gridColumnApi = this.gridOptions.columnApi;
  },
  methods: {
    exportCSV: function(e) {
      e.preventDefault()
      this.gridApi.exportDataAsCsv({});
    },
    updateData: async function (data) {
      this.rowData = []
      data.forEach(elem => {
        this.rowData.push({
          date: new Date(elem.time * 1000),
          ticker: elem.holdings,
          value: elem.value,
          percentReturn: elem.percentReturn
        })
      })
    }
  }
}
</script>
