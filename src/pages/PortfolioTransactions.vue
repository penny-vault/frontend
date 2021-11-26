<template>
  <px-card title="Transactions">
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
</template>

<script>
import { defineComponent, computed, ref, toRefs, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

import { AgGridVue } from 'ag-grid-vue3'
import PxCard from 'components/PxCard.vue'

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

export default defineComponent({
  name: 'PortfolioTransactions',
  components: {
    AgGridVue,
    PxCard
  },
  props: {
    portfolioId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const { portfolioId } = toRefs(props)
    const $store = useStore()

    const weightMap = new Map()
    weightMap.set('DEPOSIT', 0)
    weightMap.set('DIVIDEND', 1)
    weightMap.set('SELL', 2)
    weightMap.set('WITHDRAW', 3)
    weightMap.set('BUY', 4)

    const columnDefs = ref([
      { field: 'Date',
        minWidth: 110,
        maxWidth: 150,
        pinned: 'left',
        filter: 'agDateColumnFilter',
        sortable: true,
        sort: 'desc',
        sortIndex: 1,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          var d = params.value
          const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
          const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
          const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(d)
          return `${da} ${mo} ${ye}`
        }
      },
      {
        headerName: 'Weight',
        hide: true,
        sortable: true,
        sort: 'desc',
        lockVisible: true,
        sortIndex: 2,
        valueGetter: (params) => {
          var d = params.data.Kind
          return weightMap.get(d)
        }
      },
      { field: 'Kind', headerName: 'Kind', filter: 'agSetColumnFilter', width: 110, sortable: false, resizable: true, editable: false},
      { field: 'Ticker', width: 110, sortable: true, resizable: true, editable: false},
      { field: 'Shares', width: 150, sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          if (params.data.Kind === 'DIVIDEND' || params.data.Kind === 'DEPOSIT' || params.data.Kind === 'Withdraw') {
            return ""
          }
          return new Intl.NumberFormat('en-US', {maximumFractionDigits: 5}).format(params.value)
        }
      },
      { field: 'PricePerShare', width: 100, headerName: 'Price', sortable: false, resizable: true, editable: false, valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          if (params.data.Kind === 'DIVIDEND' || params.data.Kind === 'DEPOSIT' || params.data.Kind === 'Withdraw') {
            return ""
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      },
      { field: 'TotalValue', width: 200, headerName: 'Total', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])
    const dynamicColumns = new Map()

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
    const rowData = computed(() => $store.state.portfolio.transactions)

    // watch
    watch(portfolioId, async (newValue) => {
      $store.dispatch('portfolio/fetchTransactions', { portfolioId: newValue })
    })

    watch(rowData, async () => {
      getDynamicColumns()
    })

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
      if (portfolioId.value !== undefined) {
        $store.dispatch('portfolio/fetchTransactions', { portfolioId: portfolioId.value })
      }
      getDynamicColumns()
    })

    // methods
    function getDynamicColumns() {
      if (rowData.value.length > 1) {
        let justificationTmpl = rowData.value[1].Justification
        if (justificationTmpl !== undefined) {
          justificationTmpl.forEach((elem, idx)=> {
            if (!dynamicColumns.has(elem.Key)) {
              dynamicColumns.set(elem.Key, 1)
              columnDefs.value.push({
                headerName: elem.Key,
                valueGetter: (params) => {
                  let v = params.data.Justification[idx]
                  if (v !== undefined) {
                    return v.Value
                  }
                  return ""
                },
                valueFormatter: (params) => {
                  if (typeof params.value === "number") {
                    return params.value.toFixed(2)
                  }
                  return params.value
                },
                hide: true,
                sortable: true,
                resizable: true,
                editable: false
              })
            }
          })
          setTimeout(function() {
            gridApi.setColumnDefs(columnDefs.value)
          }, 0)
        }
      }
    }

    function exportCSV(e) {
      e.preventDefault()
      gridApi.exportDataAsCsv({})
    }

    function onGridReady(params) {
      gridApi.closeToolPanel()
      var defaultSortModel = [
        { colId: 'date', sort: 'desc', sortIndex: 0 },
        { colId: 'kind', sort: 'asc', sortIndex: 1 },
      ];

      columnApi.applyColumnState({ state: defaultSortModel })
    }

    return {
      columnApi,
      columnDefs,
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
