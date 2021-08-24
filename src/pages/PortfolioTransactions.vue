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

    const columnDefs = ref([
      { field: 'Date',
        minWidth: 110,
        maxWidth: 150,
        pinned: 'left',
        filter: 'agDateColumnFilter',
        sortable: true,
        sort: 'desc',
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
      { field: 'Kind', headerName: 'Type', width: 100, sortable: false, resizable: true, editable: false},
      { field: 'Ticker', width: 110, sortable: true, resizable: true, editable: false},
      { field: 'Shares', width: 150, sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', {maximumFractionDigits: 5}).format(params.value)
        }
      },
      { field: 'PricePerShare', width: 100, headerName: 'Price', sortable: false, resizable: true, editable: false, valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
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
    const rowData = computed(() => $store.state.portfolio.transactions)

    watch(portfolioId, async (newValue) => {
      $store.dispatch('portfolio/fetchTransactions', { portfolioId: newValue })
    })
    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
      if (portfolioId.value !== undefined) {
        $store.dispatch('portfolio/fetchTransactions', { portfolioId: portfolioId.value })
      }
    })

    // methods
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
