<template>

  <div class="row q-col-gutter-lg">
    <div class="col-lg-8 col-md-12 col-sm-12 col-xs-12">
      <px-card title="Portfolio Holdings by Month" :class="{'full-screen': fullscreenClass}">
        <template v-slot:toolbar>
          <q-btn @click="exportExcel" dense flat size="sm" icon="ion-cloud-download" label="Export Excel" />
          <q-btn @click="fullscreen" dense flat size="sm" :icon="fullscreenIcon" class="q-ml-md" />
        </template>
        <ag-grid-vue style="width: 100%; height: 600px;"
          class="ag-theme-alpine"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          :sideBar="sideBar"
          rowSelection="single"
          @selection-changed="onSelectionChanged">
        </ag-grid-vue>
      </px-card>
    </div>

    <div class="col-lg-4 col-md-12 col-sm-12 col-xs-12 q-gutter-y-md">
      <div class="row">
        <div class="col-12">
        <px-card :title="format(holdingsDate, '\'Holdings detail for\' MMM yyyy')">
          <ag-grid-vue style="width: 100%; height: 400px"
            class="ag-theme-alpine"
            :columnDefs="holdingsColumnDefs"
            :rowData="holdings">
          </ag-grid-vue>
        </px-card>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
        <px-card title="Holdings Frequency">
          <holdings-pie-chart width="100%" height="250px" :holdings="rowData"></holdings-pie-chart>
        </px-card>
        </div>
      </div>
    </div>
  </div>

</template>

<script>
import { defineComponent, computed, ref, toRefs, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

import { formatPercent, formatNumber } from '../assets/filters'
import { format, addDays } from 'date-fns'

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
  props: {
    portfolioId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const { portfolioId } = toRefs(props)
    const $store = useStore()

    const fullscreenIcon = ref('fullscreen')
    const fullscreenClass = ref(false)

    const columnDefs = ref([
      {
        field: 'Time',
        headerName: 'Date',
        width: 110,
        cellClass: 'dateType',
        pinned: 'left',
        filter: 'agDateColumnFilter',
        sortable: true,
        sortingOrder: ['desc', 'asc'],
        sort: 'desc',
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          var d = params.value
          const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
          const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
          return `${mo} ${ye}`
        }
      },
      {
        headerName: 'Holdings',
        width: 150,
        sortable: true,
        resizable: true,
        editable: false,
        valueGetter: (params) => {
          let res = new Array()
          params.data.Holdings.forEach((item) => {
            if (item.Ticker !== '$CASH') {
              res.push(item.Ticker)
            }
          })
          return res.sort().join(' ')
        }
      },
      {
        field: 'PercentReturn',
        minWidth: 100,
        width: 110,
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
        field: 'Value',
        width: 200,
        headerName: 'Value',
        cellClass: 'currencyType',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])
    const holdingsColumnDefs = ref([
      {
        field: 'Ticker',
        width: 95,
        pinned: 'left',
        sort: 'asc',
        sortable: true,
        resizable: true,
        editable: false,
      },
      {
        field: 'Shares',
        width: 100,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          return formatNumber(params.value)
        }
      },
      {
        field: 'PercentPortfolio',
        headerName: '%',
        width: 85,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return formatPercent(params.value)
        }
      },
      {
        field: 'Value',
        width: 150,
        headerName: 'Value',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])

    const gridOptions = ref({
      rowClassRules: {
        'predicted-asset': function(params) {
          var dt = new Date()
          var rowDt = new Date(params.data.time * 1000)
          return (rowDt.getFullYear() === dt.getFullYear()) && (rowDt.getMonth() === dt.getMonth())
        },
      },
      excelStyles: [
        {
            id: 'numberType',
            numberFormat: {
                format: '0',
            },
        },
        {
          id: 'percentType',
          numberFormat: {
            format: '#,##0.00%'
          }
        },
        {
            id: 'currencyType',
            numberFormat: {
                format: '$#,##0.00',
            },
        },
        {
            id: 'booleanType',
            dataType: 'boolean',
        },
        {
            id: 'stringType',
            dataType: 'String',
        },
        {
            id: 'dateType',
            dataType: 'DateTime',
            numberFormat: {
              format: 'mm/dd/yyy'
            }
        }
      ]
    })

    let gridApi = {}
    let columnApi = {}
    const sideBar = ref(true)
    const holdings = ref([])
    const holdingsDate = ref(new Date())

    // Computed properties
    const rowData = computed(() => $store.state.portfolio.holdings)

    // watch properties
    watch(portfolioId, async (newValue) => {
      $store.dispatch('portfolio/fetchHoldings', { portfolioId: newValue })
    })

    watch(rowData, async () => {
      if (rowData.value.length > 0) {
        let idx = rowData.value.length - 1
        holdings.value = rowData.value[idx].Holdings
      }
    })

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
      $store.dispatch('portfolio/fetchHoldings', { portfolioId: portfolioId.value })
    })

    // methods
    function onSelectionChanged() {
      var selectedRows = gridApi.getSelectedRows()
      if (selectedRows.length === 1) {
        holdings.value = selectedRows[0].Holdings
        holdingsDate.value = addDays(selectedRows[0].Time, 5)
      }
    }

    function fullscreen() {
      if (fullscreenClass.value) {
        fullscreenClass.value = false
        fullscreenIcon.value = 'fullscreen'
      } else {
        fullscreenClass.value = true
        fullscreenIcon.value = 'fullscreen_exit'
      }

      setTimeout(function() {
        var allColumnIds = []
        columnApi.getAllColumns().forEach(function (column) {
          allColumnIds.push(column.colId);
        })

        columnApi.autoSizeColumns(allColumnIds, true)
      }, 500)
    }

    function exportExcel(e) {
      e.preventDefault()
      gridApi.exportDataAsExcel({
        processCellCallback: ({column, value}) => {
          switch (column.colDef.cellClass) {
            case "dateType":
              return value.toISOString()
          }
          return value
        },
      })
    }

    function onGridReady(params) {
      gridApi.closeToolPanel()
    }

    return {
      columnApi,
      columnDefs,
      holdingsColumnDefs,
      exportExcel,
      format,
      fullscreen,
      fullscreenClass,
      fullscreenIcon,
      gridApi,
      gridOptions,
      holdings,
      holdingsDate,
      onGridReady,
      onSelectionChanged,
      rowData,
      sideBar
    }
  }
})
</script>
