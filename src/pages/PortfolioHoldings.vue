<template>

  <div class="row q-col-gutter-lg">
    <div class="col-lg-8 col-md-12">
      <px-card title="Portfolio Holdings by Month">
        <template v-slot:toolbar>
          <q-btn @click="exportCSV" dense flat size="sm" icon="ion-cloud-download" label="Export CSV" />
        </template>
        <ag-grid-vue style="width: 100%; height: 500px;"
          class="ag-theme-alpine"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          :sideBar="sideBar"
          rowSelection="multiple">
        </ag-grid-vue>
      </px-card>
    </div>

    <div class="col-lg-4 col-md-12">
      <px-card title="Holdings Frequency">
        <holdings-pie-chart width="150" height="150" :holdings="rowData"></holdings-pie-chart>
      </px-card>
    </div>
  </div>

</template>

<script>
import { defineComponent, computed, ref, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../assets/filters'

import { AgGridVue } from 'ag-grid-vue3'
import HoldingsPieChart from 'components/HoldingsPieChart.vue'
import PxCard from 'components/PxCard.vue'

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

export default defineComponent({
  name: 'PortfolioSummary',
  components: {
    AgGridVue,
    HoldingsPieChart,
    PxCard
  },
  setup () {
    const $store = useStore()

    const columnDefs = ref([
      {
        field: 'time',
        headerName: 'Date',
        width: 110,
        filter: 'agDateColumnFilter',
        sortable: true,
        sortingOrder: ['desc', 'asc'],
        sort: 'desc',
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          var d = new Date(params.data.time * 1000)
          // add a few days to the date - data comes from pv-api as month-end
          // but that's misleading in the portfolio table view which only
          // shows month year
          d = d.addDays(5)
          const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
          const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
          return `${mo} ${ye}`
        }
      },
      {
        field: 'holdings',
        width: 150,
        sortable: true,
        resizable: true,
        editable: false,

      },
      {
        field: 'percentReturn',
        minWidth: 100,
        maxWidth: 150,
        headerName: 'Return',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return formatPercent(params.value)
        },
        cellStyle: params => {
          // negative values are red, positive green
          if (params.value > 0) {
            return {color: 'green'}
          } else if (params.value < 0) {
            return {color: 'red'}
          }
          return null
        }
      },
      {
        field: 'value',
        width: 150,
        headerName: 'Value',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.data.value)
        }
      }
    ])
    const dynamicColumns = ref(new Map())

    const gridOptions = ref({
      rowClassRules: {
        'predicted-asset': function(params) {
          var dt = new Date()
          var rowDt = new Date(params.data.time * 1000)
          return (rowDt.getFullYear() === dt.getFullYear()) && (rowDt.getMonth() === dt.getMonth())
        },
      }
    })

    let gridApi = {}
    let columnApi = {}
    const sideBar = ref(true)

    // Computed properties
    const rowData = computed({
      get: () => $store.state.portfolio.current.performance.measurements,
      set: val => {
        $store.commit('portfolio/setPortfolios', val)
      }
    })

    // watch properties
    watch(rowData, async () => {
      getDynamicColumns()
    })

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api;
      columnApi = gridOptions.value.columnApi;
    })

    // methods
    function getDynamicColumns() {
      if (this.rowData.length > 0) {
        let justificationTmpl = this.rowData[0].justification
        if (justificationTmpl !== undefined) {
          Object.keys(justificationTmpl).forEach((k) => {
            if (!this.dynamicColumns.has(k)) {
              this.dynamicColumns.set(k, 1)
              this.columnDefs.push({
                field: k,
                valueGetter: (params) => {
                  return params.data.justification[k]
                },
                valueFormatter: (params) => {
                  if (typeof params.value === "number") {
                    return params.value.toFixed(2)
                  }
                },
                sortable: true,
                resizable: true,
                editable: false
              })
            }
          })
        }
      }
    }

    function exportCSV(e) {
      e.preventDefault()
      gridApi.exportDataAsCsv({})
    }

    function onGridReady(params) {
      gridApi.closeToolPanel()
    }

    return {
      columnApi,
      columnDefs,
      dynamicColumns,
      exportCSV,
      gridApi,
      gridOptions,
      onGridReady,
      rowData,
      sideBar
    }
  }
})
</script>
